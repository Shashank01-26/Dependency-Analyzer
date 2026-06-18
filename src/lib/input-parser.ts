import YAML from 'yaml';
import { Ecosystem, ParsedInput } from '@/types';

type Dep = ParsedInput['dependencies'][number];

export function parseInput(raw: string, hintEcosystem?: Ecosystem): ParsedInput {
  const trimmed = raw.trim();
  const ecosystem = hintEcosystem || detectEcosystem(trimmed);

  switch (ecosystem) {
    case 'flutter':   return parsePubspec(trimmed);
    case 'android':   return parseGradle(trimmed);
    case 'python':    return parsePython(trimmed);
    case 'rust':      return parseCargoLock(trimmed);
    case 'go':        return parseGoMod(trimmed);
    case 'ruby':      return parseGemfileLock(trimmed);
    case 'dotnet':    return parseCsproj(trimmed);
    default:          return parseNpm(trimmed);
  }
}

function detectEcosystem(raw: string): Ecosystem {
  // Lock files — check before manifest files
  if (isPackageLockJson(raw)) return 'npm';
  if (isYarnLock(raw)) return 'npm';
  if (isPnpmLock(raw)) return 'npm';
  if (isCargoLock(raw)) return 'rust';
  if (isGoSum(raw)) return 'go';
  if (isGoMod(raw)) return 'go';
  if (isGemfileLock(raw)) return 'ruby';
  if (isPoetryLock(raw)) return 'python';
  if (isRequirementsTxt(raw)) return 'python';
  if (isPyprojectToml(raw)) return 'python';

  // Manifests
  if (raw.includes('sdk: flutter') || raw.includes('pub.dev') ||
      (raw.includes('dependencies:') && !raw.includes('"dependencies"') && !raw.includes('implementation'))) {
    return 'flutter';
  }
  if (raw.includes('implementation') || raw.includes('com.android') || raw.includes('compileSdk') || raw.includes('dependencies {')) {
    return 'android';
  }
  if (raw.includes('<PackageReference') || raw.includes('<Project Sdk=')) return 'dotnet';

  return 'npm';
}

// ─── Ecosystem detectors ──────────────────────────────────────────────────────

function isPackageLockJson(raw: string): boolean {
  try { const p = JSON.parse(raw); return !!p.lockfileVersion && !!p.packages; } catch { return false; }
}
function isYarnLock(raw: string): boolean {
  return raw.startsWith('# yarn lockfile v1') || raw.includes('__metadata:');
}
function isPnpmLock(raw: string): boolean {
  return raw.includes('lockfileVersion:') && raw.includes('packages:') && raw.includes('.yaml');
}
function isCargoLock(raw: string): boolean {
  return raw.includes('[[package]]') && raw.includes('checksum');
}
function isGoSum(raw: string): boolean {
  return /^[a-z][\w.-]+\/[\w./-]+ v[\d.]+/.test(raw.split('\n')[0] ?? '');
}
function isGoMod(raw: string): boolean {
  return raw.startsWith('module ') && raw.includes('go ') && raw.includes('require');
}
function isGemfileLock(raw: string): boolean {
  return raw.includes('GEM') && raw.includes('specs:') && raw.includes('DEPENDENCIES');
}
function isPoetryLock(raw: string): boolean {
  return raw.includes('[[package]]') && raw.includes('python-versions');
}
function isRequirementsTxt(raw: string): boolean {
  return /^[a-zA-Z][\w.-]+[>=<!~]/.test(raw.split('\n').find(l => l.trim() && !l.startsWith('#')) ?? '');
}
function isPyprojectToml(raw: string): boolean {
  return raw.includes('[tool.poetry') || raw.includes('[project]') && raw.includes('dependencies');
}

// ─── npm / Node.js parsers ────────────────────────────────────────────────────

function parseNpm(raw: string): ParsedInput {
  // package-lock.json v2/v3
  try {
    const obj = JSON.parse(raw);
    if (obj.lockfileVersion && obj.packages) return parsePackageLock(obj);
    if (obj.dependencies !== undefined || obj.devDependencies !== undefined) return parsePackageJson(obj);
  } catch { /* not JSON */ }

  // yarn.lock
  if (isYarnLock(raw)) return parseYarnLock(raw);

  // pnpm-lock.yaml
  if (isPnpmLock(raw)) return parsePnpmLock(raw);

  throw new Error('Could not parse npm input. Paste package.json, package-lock.json, yarn.lock, or pnpm-lock.yaml.');
}

function parsePackageJson(pkg: Record<string, unknown>): ParsedInput {
  const deps: Dep[] = [];
  for (const [name, version] of Object.entries((pkg.dependencies as Record<string, string>) || {})) {
    deps.push({ name, version: String(version), isDev: false });
  }
  for (const [name, version] of Object.entries((pkg.devDependencies as Record<string, string>) || {})) {
    deps.push({ name, version: String(version), isDev: true });
  }
  if (deps.length === 0) throw new Error('No dependencies found in package.json');
  return { ecosystem: 'npm', name: String(pkg.name || 'Unknown Project'), dependencies: deps };
}

function parsePackageLock(obj: Record<string, unknown>): ParsedInput {
  const deps: Dep[] = [];
  const packages = obj.packages as Record<string, { version?: string; dev?: boolean; devOptional?: boolean }>;
  for (const [path, info] of Object.entries(packages)) {
    if (!path || path === '') continue; // skip root
    const name = path.replace(/^node_modules\//, '').replace(/\/node_modules\//, '/');
    const isDev = !!(info.dev || info.devOptional);
    deps.push({ name, version: info.version ?? '*', isDev });
  }
  if (deps.length === 0) throw new Error('No packages found in package-lock.json');
  const root = packages[''] as { name?: string } | undefined;
  return { ecosystem: 'npm', name: root?.name ?? 'Unknown Project', dependencies: deps };
}

function parseYarnLock(raw: string): ParsedInput {
  const deps: Dep[] = [];
  const seen = new Set<string>();
  // Classic yarn.lock (v1): blocks like `"package@^1.0.0":\n  version "1.2.3"`
  // Yarn berry (v2+): uses `__metadata` + different format
  const blockRegex = /^"?([^@\s"]+)@[^:]+:?\n(?:[^\n]*\n)*?\s+version[: ]+"?([^\s"]+)"?/gm;
  let match;
  while ((match = blockRegex.exec(raw)) !== null) {
    const name = match[1].trim();
    const version = match[2].trim();
    if (!seen.has(name)) {
      seen.add(name);
      deps.push({ name, version, isDev: false });
    }
  }
  if (deps.length === 0) throw new Error('No packages found in yarn.lock');
  return { ecosystem: 'npm', name: 'Unknown Project', dependencies: deps };
}

function parsePnpmLock(raw: string): ParsedInput {
  const deps: Dep[] = [];
  const seen = new Set<string>();
  const doc = YAML.parse(raw);
  const packages = doc?.packages ?? {};
  for (const key of Object.keys(packages)) {
    // Key format: /package-name@1.2.3 or /@scope/pkg@1.0.0
    const match = key.match(/^\/(.+?)@([^(]+)/);
    if (!match) continue;
    const name = match[1];
    const version = match[2];
    if (!seen.has(name)) {
      seen.add(name);
      deps.push({ name, version, isDev: false });
    }
  }
  if (deps.length === 0) throw new Error('No packages found in pnpm-lock.yaml');
  return { ecosystem: 'npm', name: 'Unknown Project', dependencies: deps };
}

// ─── Python parsers ───────────────────────────────────────────────────────────

function parsePython(raw: string): ParsedInput {
  if (isPoetryLock(raw)) return parsePoetryLock(raw);
  if (isPyprojectToml(raw)) return parsePyprojectToml(raw);
  return parseRequirementsTxt(raw);
}

function parseRequirementsTxt(raw: string): ParsedInput {
  const deps: Dep[] = [];
  for (const line of raw.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('-')) continue;
    const match = trimmed.match(/^([A-Za-z0-9_.-]+)\s*(?:[>=<!~^]+\s*([^\s,;#]+))?/);
    if (match) deps.push({ name: match[1], version: match[2] ?? '*', isDev: false });
  }
  if (deps.length === 0) throw new Error('No packages found in requirements.txt');
  return { ecosystem: 'python', name: 'Python Project', dependencies: deps };
}

function parsePoetryLock(raw: string): ParsedInput {
  const deps: Dep[] = [];
  // [[package]] blocks
  const blocks = raw.split('[[package]]').slice(1);
  for (const block of blocks) {
    const nameMatch = block.match(/name\s*=\s*"([^"]+)"/);
    const versionMatch = block.match(/version\s*=\s*"([^"]+)"/);
    const categoryMatch = block.match(/category\s*=\s*"([^"]+)"/);
    if (nameMatch && versionMatch) {
      const isDev = categoryMatch?.[1] === 'dev';
      deps.push({ name: nameMatch[1], version: versionMatch[1], isDev });
    }
  }
  if (deps.length === 0) throw new Error('No packages found in poetry.lock');
  return { ecosystem: 'python', name: 'Python Project', dependencies: deps };
}

function parsePyprojectToml(raw: string): ParsedInput {
  const deps: Dep[] = [];
  // [project] dependencies = ["requests>=2.0", ...]
  const projectDepsMatch = raw.match(/\[project\][^[]*dependencies\s*=\s*\[([^\]]+)\]/);
  if (projectDepsMatch) {
    for (const item of projectDepsMatch[1].matchAll(/"([A-Za-z0-9_.-]+)[^"]*"/g)) {
      deps.push({ name: item[1], version: '*', isDev: false });
    }
  }
  // [tool.poetry.dependencies]
  const poetryDepsMatch = raw.match(/\[tool\.poetry\.dependencies\]([\s\S]*?)(?=\[|$)/);
  if (poetryDepsMatch) {
    for (const line of poetryDepsMatch[1].split('\n')) {
      const match = line.match(/^([a-zA-Z0-9_.-]+)\s*=\s*"([^"]+)"/);
      if (match && match[1] !== 'python') deps.push({ name: match[1], version: match[2], isDev: false });
    }
  }
  if (deps.length === 0) throw new Error('No dependencies found in pyproject.toml');
  return { ecosystem: 'python', name: 'Python Project', dependencies: deps };
}

// ─── Rust / Cargo.lock ────────────────────────────────────────────────────────

function parseCargoLock(raw: string): ParsedInput {
  const deps: Dep[] = [];
  const blocks = raw.split('[[package]]').slice(1);
  for (const block of blocks) {
    const nameMatch = block.match(/name\s*=\s*"([^"]+)"/);
    const versionMatch = block.match(/version\s*=\s*"([^"]+)"/);
    if (nameMatch && versionMatch) {
      deps.push({ name: nameMatch[1], version: versionMatch[1], isDev: false });
    }
  }
  if (deps.length === 0) throw new Error('No packages found in Cargo.lock');
  return { ecosystem: 'rust', name: 'Rust Project', dependencies: deps };
}

// ─── Go parsers ───────────────────────────────────────────────────────────────

function parseGoMod(raw: string): ParsedInput {
  const deps: Dep[] = [];
  const moduleMatch = raw.match(/^module\s+(\S+)/m);
  const projectName = moduleMatch?.[1] ?? 'Go Project';

  // Multi-line require blocks
  const blockMatches = raw.matchAll(/require\s*\(([\s\S]*?)\)/gm);
  for (const block of blockMatches) {
    for (const line of block[1].split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('//')) continue;
      const parts = trimmed.split(/\s+/);
      if (parts.length >= 2) {
        const isDev = line.includes('// indirect');
        deps.push({ name: parts[0], version: parts[1], isDev });
      }
    }
  }

  // Single-line requires
  const singleMatches = raw.matchAll(/^require\s+(\S+)\s+(\S+)/gm);
  for (const m of singleMatches) {
    deps.push({ name: m[1], version: m[2], isDev: false });
  }

  if (deps.length === 0) throw new Error('No dependencies found in go.mod');
  return { ecosystem: 'go', name: projectName, dependencies: deps };
}

// go.sum: each line is "module version hash"
function parseGoSum(raw: string): ParsedInput {
  const deps: Dep[] = [];
  const seen = new Set<string>();
  for (const line of raw.split('\n')) {
    const parts = line.trim().split(/\s+/);
    if (parts.length < 2) continue;
    const name = parts[0];
    const version = parts[1].replace('/go.mod', '');
    if (!seen.has(name)) {
      seen.add(name);
      deps.push({ name, version, isDev: false });
    }
  }
  if (deps.length === 0) throw new Error('No entries found in go.sum');
  return { ecosystem: 'go', name: 'Go Project', dependencies: deps };
}

// ─── Ruby / Gemfile.lock ──────────────────────────────────────────────────────

function parseGemfileLock(raw: string): ParsedInput {
  const deps: Dep[] = [];
  const seen = new Set<string>();
  // Lines under "  specs:" section: "    gem-name (version)"
  const inSpecs = { value: false };
  for (const line of raw.split('\n')) {
    if (line.trim() === 'specs:') { inSpecs.value = true; continue; }
    if (line.trim() === '' || /^[A-Z]/.test(line)) { inSpecs.value = false; continue; }
    if (!inSpecs.value) continue;
    const match = line.match(/^\s{4}([a-zA-Z0-9_.-]+)\s+\(([^)]+)\)/);
    if (match && !seen.has(match[1])) {
      seen.add(match[1]);
      deps.push({ name: match[1], version: match[2], isDev: false });
    }
  }
  if (deps.length === 0) throw new Error('No gems found in Gemfile.lock');
  return { ecosystem: 'ruby', name: 'Ruby Project', dependencies: deps };
}

// ─── .NET / .csproj ──────────────────────────────────────────────────────────

function parseCsproj(raw: string): ParsedInput {
  const deps: Dep[] = [];
  const matches = raw.matchAll(/<PackageReference\s+Include="([^"]+)"\s+Version="([^"]+)"/g);
  for (const m of matches) {
    deps.push({ name: m[1], version: m[2], isDev: false });
  }
  // Also match self-closing or multi-line forms
  const multiMatches = raw.matchAll(/<PackageReference\s+Include="([^"]+)"[^>]*>\s*<Version>([^<]+)<\/Version>/g);
  const seen = new Set(deps.map(d => d.name));
  for (const m of multiMatches) {
    if (!seen.has(m[1])) deps.push({ name: m[1], version: m[2], isDev: false });
  }
  if (deps.length === 0) throw new Error('No PackageReference entries found in .csproj');
  return { ecosystem: 'dotnet', name: 'dotnet Project', dependencies: deps };
}

// ─── Existing parsers (unchanged) ────────────────────────────────────────────

function parsePubspec(raw: string): ParsedInput {
  const doc = YAML.parse(raw);
  const deps: Dep[] = [];

  if (doc.dependencies) {
    for (const [name, spec] of Object.entries(doc.dependencies)) {
      if (name === 'flutter') continue;
      let version = 'any';
      if (typeof spec === 'string') version = spec;
      else if (spec && typeof spec === 'object' && 'version' in (spec as Record<string, unknown>))
        version = String((spec as Record<string, string>).version);
      deps.push({ name, version, isDev: false });
    }
  }

  if (doc.dev_dependencies) {
    for (const [name, spec] of Object.entries(doc.dev_dependencies)) {
      if (name === 'flutter_test' || name === 'flutter_lints') continue;
      let version = 'any';
      if (typeof spec === 'string') version = spec;
      else if (spec && typeof spec === 'object' && 'version' in (spec as Record<string, unknown>))
        version = String((spec as Record<string, string>).version);
      deps.push({ name, version, isDev: true });
    }
  }

  if (deps.length === 0) throw new Error('No dependencies found in pubspec.yaml');
  return { ecosystem: 'flutter', name: doc.name || 'Flutter Project', dependencies: deps };
}

function parseGradle(raw: string): ParsedInput {
  const deps: Dep[] = [];
  const seen = new Set<string>();

  const prodPattern = /(?:implementation|api|compileOnly)\s*[\('"]+([^:'"]+):([^:'"]+):([^'")\s]+)/g;
  let match;
  while ((match = prodPattern.exec(raw)) !== null) {
    const coord = `${match[1]}:${match[2]}`;
    if (seen.has(coord)) continue;
    seen.add(coord);
    deps.push({ name: coord, version: match[3], isDev: false });
  }

  const devPattern = /(?:testImplementation|androidTestImplementation|debugImplementation)\s*[\('"]+([^:'"]+):([^:'"]+):([^'")\s]+)/g;
  while ((match = devPattern.exec(raw)) !== null) {
    const coord = `${match[1]}:${match[2]}`;
    if (seen.has(coord)) continue;
    seen.add(coord);
    deps.push({ name: coord, version: match[3], isDev: true });
  }

  if (deps.length === 0) throw new Error('No dependencies found in build.gradle.');
  const nameMatch = raw.match(/(?:namespace|applicationId)\s*[=:]\s*['"]([^'"]+)['"]/);
  return { ecosystem: 'android', name: nameMatch ? nameMatch[1] : 'Android Project', dependencies: deps };
}

// Export individual parsers for direct use in tests/API
export { parseGoSum };
