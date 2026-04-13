import {
  PackageJson,
  AnalyzedDependency,
  ScanResult,
  DependencyTreeNode,
  VulnerabilityInfo,
} from '@/types';
import { fetchNpmMetadata, fetchNpmAudit } from './npm-client';
import { fetchGithubMetadata } from './github-client';
import { computeRiskScore, getRiskLevel, generateFlags } from './risk-engine';

const MAX_DEPTH = 3; // Limit transitive resolution to avoid API abuse
const CONCURRENCY = 5;

/**
 * Run batched async operations with concurrency limit.
 */
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

/**
 * Build a dependency tree up to MAX_DEPTH, collecting transitive deps.
 */
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

/**
 * Analyze a single dependency: fetch metadata, compute score, generate flags.
 */
async function analyzeDependency(
  name: string,
  version: string,
  isDev: boolean,
  visited: Set<string>
): Promise<AnalyzedDependency> {
  const [npm, treeResult] = await Promise.all([
    fetchNpmMetadata(name),
    buildTree(name, version, 1, new Set(visited)),
  ]);

  const github = await fetchGithubMetadata(npm?.repository);

  // Fetch vulnerabilities
  let vulnerabilities: VulnerabilityInfo[] = [];
  try {
    const rawAudit = await fetchNpmAudit(name, npm?.version || version);
    vulnerabilities = rawAudit.map(a => ({
      id: a.id,
      title: a.title,
      severity: (['low', 'moderate', 'high', 'critical'].includes(a.severity)
        ? a.severity
        : 'moderate') as VulnerabilityInfo['severity'],
      url: a.url,
    }));
  } catch {
    // Silently continue if audit fails
  }

  const score = computeRiskScore(
    npm,
    github,
    vulnerabilities,
    treeResult.maxDepth,
    treeResult.transitiveCount
  );

  const riskLevel = getRiskLevel(score.overall);
  const flags = generateFlags(npm, github, vulnerabilities, treeResult.maxDepth, score);

  // Update tree node scores
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
  };
}

/**
 * Main analysis entry point: takes a package.json, returns full scan result.
 */
export async function analyzePackageJson(input: PackageJson): Promise<ScanResult> {
  const deps = Object.entries(input.dependencies || {}).map(([name, version]) => ({
    name,
    version,
    isDev: false,
  }));

  const devDeps = Object.entries(input.devDependencies || {}).map(([name, version]) => ({
    name,
    version,
    isDev: true,
  }));

  const allDeps = [...deps, ...devDeps];
  const visited = new Set<string>();

  const analyzed = await batchAsync(allDeps, CONCURRENCY, (dep) =>
    analyzeDependency(dep.name, dep.version, dep.isDev, visited)
  );

  // Build top-level tree
  const tree: DependencyTreeNode[] = analyzed.map((dep) => ({
    name: dep.name,
    version: dep.version,
    riskLevel: dep.riskLevel,
    score: dep.score.overall,
    children: dep.directDeps.map((childName) => {
      const child = analyzed.find((d) => d.name === childName);
      return {
        name: childName,
        version: child?.version || '*',
        riskLevel: child?.riskLevel || 'low',
        score: child?.score.overall || 0,
        children: [],
      };
    }),
  }));

  // Compute overall project score (weighted average, critical deps count more)
  const totalWeight = analyzed.reduce((sum, dep) => {
    const weight = dep.isDev ? 0.5 : 1;
    return sum + weight;
  }, 0);

  const weightedSum = analyzed.reduce((sum, dep) => {
    const weight = dep.isDev ? 0.5 : 1;
    return sum + dep.score.overall * weight;
  }, 0);

  const overallScore = totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 0;
  const overallRiskLevel = getRiskLevel(overallScore);

  return {
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    projectName: input.name || 'Unknown Project',
    overallScore,
    overallRiskLevel,
    totalDependencies: allDeps.length,
    directDependencies: deps.length,
    devDependencies: devDeps.length,
    criticalCount: analyzed.filter((d) => d.riskLevel === 'critical').length,
    highCount: analyzed.filter((d) => d.riskLevel === 'high').length,
    mediumCount: analyzed.filter((d) => d.riskLevel === 'medium').length,
    lowCount: analyzed.filter((d) => d.riskLevel === 'low').length,
    dependencies: analyzed,
    tree,
  };
}
