import {
  PackageJson,
  ParsedInput,
  Ecosystem,
  AnalyzedDependency,
  ScanResult,
  DependencyTreeNode,
  VulnerabilityInfo,
  NpmPackageMetadata,
} from '@/types';
import { fetchNpmMetadata, fetchNpmAudit } from './npm-client';
import { fetchPubMetadata } from './pub-client';
import { fetchMavenMetadata } from './maven-client';
import { fetchPyPIMetadata } from './pypi-client';
import { fetchCratesMetadata } from './crates-client';
import { fetchGoMetadata } from './go-client';
import { fetchGemsMetadata } from './gems-client';
import { fetchNuGetMetadata } from './nuget-client';
import { fetchGithubMetadata } from './github-client';
import { computeRiskScore, getRiskLevel, generateFlags } from './risk-engine';
import { enrichWithOSV, fetchOSVVulnerabilities } from './osv-client';
import { detectSupplyChainRisksAsync } from './supply-chain';
import { classifyLicense } from './license-engine';

const MAX_DEPTH = 3;
const CONCURRENCY = 5;

async function fetchMetadata(name: string, ecosystem: Ecosystem): Promise<NpmPackageMetadata | null> {
  switch (ecosystem) {
    case 'flutter':  return fetchPubMetadata(name);
    case 'android':  return fetchMavenMetadata(name);
    case 'python':   return fetchPyPIMetadata(name);
    case 'rust':     return fetchCratesMetadata(name);
    case 'go':       return fetchGoMetadata(name);
    case 'ruby':     return fetchGemsMetadata(name);
    case 'dotnet':   return fetchNuGetMetadata(name);
    default:         return fetchNpmMetadata(name);
  }
}

async function fetchVulnerabilities(
  name: string,
  version: string,
  ecosystem: Ecosystem,
  npmVersion?: string
): Promise<VulnerabilityInfo[]> {
  if (ecosystem === 'npm') {
    try {
      const rawAudit = await fetchNpmAudit(name, npmVersion || version);
      const npmVulns: VulnerabilityInfo[] = rawAudit.map(a => ({
        id: a.id,
        title: a.title,
        severity: (['low', 'moderate', 'high', 'critical'].includes(a.severity)
          ? a.severity
          : 'moderate') as VulnerabilityInfo['severity'],
        url: a.url,
      }));
      // Enrich npm audit results with OSV data (fixedIn, nvdUrl, cvssVector)
      return enrichWithOSV(npmVulns, name, npmVersion || version, ecosystem);
    } catch {
      return fetchOSVVulnerabilities(name, version, ecosystem);
    }
  }
  return fetchOSVVulnerabilities(name, version, ecosystem);
}

async function batchAsync<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = [];
  for (let i = 0; i < items.length; i += concurrency) {
    const batch = items.slice(i, i + concurrency);
    const batchResults = await Promise.all(batch.map(fn));
    results.push(...batchResults);
  }
  return results;
}

async function buildTree(
  name: string,
  version: string,
  depth: number,
  visited: Set<string>
): Promise<{ tree: DependencyTreeNode; transitiveCount: number; maxDepth: number }> {
  if (depth > MAX_DEPTH || visited.has(name)) {
    return {
      tree: { name, version, riskLevel: 'low', score: 0, children: [] },
      transitiveCount: 0,
      maxDepth: depth,
    };
  }

  visited.add(name);
  const npm = await fetchNpmMetadata(name);
  const deps = npm?.dependencies || {};
  const depEntries = Object.entries(deps);

  let transitiveCount = depEntries.length;
  let maxDepth = depth;
  const children: DependencyTreeNode[] = [];

  for (const [depName, depVersion] of depEntries.slice(0, 15)) {
    const result = await buildTree(depName, String(depVersion), depth + 1, visited);
    transitiveCount += result.transitiveCount;
    maxDepth = Math.max(maxDepth, result.maxDepth);
    children.push(result.tree);
  }

  return {
    tree: { name, version, riskLevel: 'low', score: 0, children },
    transitiveCount,
    maxDepth,
  };
}

async function analyzeDependency(
  name: string,
  version: string,
  isDev: boolean,
  visited: Set<string>,
  ecosystem: Ecosystem = 'npm'
): Promise<AnalyzedDependency> {
  const [npm, treeResult] = await Promise.all([
    fetchMetadata(name, ecosystem),
    ecosystem === 'npm'
      ? buildTree(name, version, 1, new Set(visited))
      : Promise.resolve({ tree: { name, version, riskLevel: 'low' as const, score: 0, children: [] }, transitiveCount: 0, maxDepth: 1 }),
  ]);

  const github = await fetchGithubMetadata(npm?.repository);
  const vulnerabilities = await fetchVulnerabilities(name, version, ecosystem, npm?.version);

  // Supply chain analysis (runs in parallel with above — cheap, local)
  const supplyChainFlags = await detectSupplyChainRisksAsync(name, version, npm);

  // License classification
  const license = npm?.license ? classifyLicense(npm.license) : undefined;

  const score = computeRiskScore(
    npm,
    github,
    vulnerabilities,
    treeResult.maxDepth,
    treeResult.transitiveCount
  );

  const riskLevel = getRiskLevel(score.overall);
  const baseFlags = generateFlags(npm, github, vulnerabilities, treeResult.maxDepth, score);
  const flags = [...baseFlags, ...supplyChainFlags];

  treeResult.tree.score = score.overall;
  treeResult.tree.riskLevel = riskLevel;

  return {
    name,
    version: npm?.version || version,
    isDev,
    npm,
    github,
    vulnerabilities,
    score,
    riskLevel,
    flags,
    depth: treeResult.maxDepth,
    directDeps: Object.keys(npm?.dependencies || {}),
    transitiveCount: treeResult.transitiveCount,
    license,
  };
}

function buildTopLevelTree(analyzed: AnalyzedDependency[]): DependencyTreeNode[] {
  return analyzed.map(dep => ({
    name: dep.name,
    version: dep.version,
    riskLevel: dep.riskLevel,
    score: dep.score.overall,
    children: dep.directDeps.map(childName => {
      const child = analyzed.find(d => d.name === childName);
      return {
        name: childName,
        version: child?.version ?? '*',
        riskLevel: child?.riskLevel ?? 'low',
        score: child?.score.overall ?? 0,
        children: [],
      };
    }),
  }));
}

function computeProjectScore(analyzed: AnalyzedDependency[]): number {
  const totalWeight = analyzed.reduce((s, d) => s + (d.isDev ? 0.5 : 1), 0);
  const weightedSum = analyzed.reduce((s, d) => s + d.score.overall * (d.isDev ? 0.5 : 1), 0);
  return totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 0;
}

export async function analyzePackageJson(input: PackageJson): Promise<ScanResult> {
  const deps = Object.entries(input.dependencies || {}).map(([name, version]) => ({ name, version, isDev: false }));
  const devDeps = Object.entries(input.devDependencies || {}).map(([name, version]) => ({ name, version, isDev: true }));
  const allDeps = [...deps, ...devDeps];
  const visited = new Set<string>();

  const analyzed = await batchAsync(allDeps, CONCURRENCY, dep =>
    analyzeDependency(dep.name, dep.version, dep.isDev, visited)
  );

  const overallScore = computeProjectScore(analyzed);

  return {
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    ecosystem: 'npm',
    projectName: input.name || 'Unknown Project',
    overallScore,
    overallRiskLevel: getRiskLevel(overallScore),
    totalDependencies: allDeps.length,
    directDependencies: deps.length,
    devDependencies: devDeps.length,
    criticalCount: analyzed.filter(d => d.riskLevel === 'critical').length,
    highCount: analyzed.filter(d => d.riskLevel === 'high').length,
    mediumCount: analyzed.filter(d => d.riskLevel === 'medium').length,
    lowCount: analyzed.filter(d => d.riskLevel === 'low').length,
    dependencies: analyzed,
    tree: buildTopLevelTree(analyzed),
  };
}

export async function analyzeInput(input: ParsedInput): Promise<ScanResult> {
  if (input.ecosystem === 'npm') {
    const pkg: PackageJson = {
      name: input.name,
      dependencies: Object.fromEntries(input.dependencies.filter(d => !d.isDev).map(d => [d.name, d.version])),
      devDependencies: Object.fromEntries(input.dependencies.filter(d => d.isDev).map(d => [d.name, d.version])),
    };
    const result = await analyzePackageJson(pkg);
    result.ecosystem = 'npm';
    return result;
  }

  const visited = new Set<string>();
  const analyzed = await batchAsync(input.dependencies, CONCURRENCY, dep =>
    analyzeDependency(dep.name, dep.version, dep.isDev, visited, input.ecosystem)
  );

  const prodDeps = input.dependencies.filter(d => !d.isDev);
  const devDeps = input.dependencies.filter(d => d.isDev);
  const overallScore = computeProjectScore(analyzed);

  return {
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    ecosystem: input.ecosystem,
    projectName: input.name,
    overallScore,
    overallRiskLevel: getRiskLevel(overallScore),
    totalDependencies: input.dependencies.length,
    directDependencies: prodDeps.length,
    devDependencies: devDeps.length,
    criticalCount: analyzed.filter(d => d.riskLevel === 'critical').length,
    highCount: analyzed.filter(d => d.riskLevel === 'high').length,
    mediumCount: analyzed.filter(d => d.riskLevel === 'medium').length,
    lowCount: analyzed.filter(d => d.riskLevel === 'low').length,
    dependencies: analyzed,
    tree: buildTopLevelTree(analyzed),
  };
}
