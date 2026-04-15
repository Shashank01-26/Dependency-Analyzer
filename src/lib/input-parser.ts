import YAML from 'yaml';
import { Ecosystem, ParsedInput } from '@/types';

/**
 * Detects the ecosystem and parses dependencies from raw input text.
 * Supports: package.json (npm), pubspec.yaml (Flutter), build.gradle (Android)
 */
export function parseInput(raw: string, hintEcosystem?: Ecosystem): ParsedInput {
  const trimmed = raw.trim();

  // Auto-detect ecosystem if no hint
  const ecosystem = hintEcosystem || detectEcosystem(trimmed);

  switch (ecosystem) {
    case 'flutter': return parsePubspec(trimmed);
    case 'android': return parseGradle(trimmed);
    default: return parsePackageJson(trimmed);
  }
}

function detectEcosystem(raw: string): Ecosystem {
  // pubspec.yaml detection
  if (raw.includes('sdk: flutter') || raw.includes('flutter:') || raw.includes('pub.dev') ||
      (raw.includes('dependencies:') && !raw.includes('"dependencies"') && !raw.includes('implementation'))) {
    return 'flutter';
  }

  // build.gradle detection
  if (raw.includes('implementation') || raw.includes('com.android') || raw.includes('build.gradle') ||
      raw.includes('compileSdk') || raw.includes('dependencies {')) {
    return 'android';
  }

  return 'npm';
}

function parsePackageJson(raw: string): ParsedInput {
  const pkg = JSON.parse(raw);
  const deps: ParsedInput['dependencies'] = [];

  for (const [name, version] of Object.entries(pkg.dependencies || {})) {
    deps.push({ name, version: String(version), isDev: false });
  }
  for (const [name, version] of Object.entries(pkg.devDependencies || {})) {
    deps.push({ name, version: String(version), isDev: true });
  }

  if (deps.length === 0) throw new Error('No dependencies found in package.json');

  return { ecosystem: 'npm', name: pkg.name || 'Unknown Project', dependencies: deps };
}

function parsePubspec(raw: string): ParsedInput {
  const doc = YAML.parse(raw);
  const deps: ParsedInput['dependencies'] = [];

  if (doc.dependencies) {
    for (const [name, spec] of Object.entries(doc.dependencies)) {
      if (name === 'flutter') continue; // Skip the Flutter SDK itself
      let version = 'any';
      if (typeof spec === 'string') version = spec;
      else if (spec && typeof spec === 'object' && 'version' in (spec as Record<string, unknown>)) version = String((spec as Record<string, string>).version);
      deps.push({ name, version, isDev: false });
    }
  }

  if (doc.dev_dependencies) {
    for (const [name, spec] of Object.entries(doc.dev_dependencies)) {
      if (name === 'flutter_test' || name === 'flutter_lints') continue;
      let version = 'any';
      if (typeof spec === 'string') version = spec;
      else if (spec && typeof spec === 'object' && 'version' in (spec as Record<string, unknown>)) version = String((spec as Record<string, string>).version);
      deps.push({ name, version, isDev: true });
    }
  }

  if (deps.length === 0) throw new Error('No dependencies found in pubspec.yaml');

  return { ecosystem: 'flutter', name: doc.name || 'Flutter Project', dependencies: deps };
}

function parseGradle(raw: string): ParsedInput {
  const deps: ParsedInput['dependencies'] = [];
  const seen = new Set<string>();

  // Match patterns like:
  //   implementation 'com.google.android.material:material:1.9.0'
  //   implementation "com.squareup.retrofit2:retrofit:2.9.0"
  //   implementation("org.jetbrains.kotlin:kotlin-stdlib:1.9.0")
  //   testImplementation 'junit:junit:4.13.2'
  const patterns = [
    /(?:implementation|api|compileOnly)\s*[\('"]+([^:'"]+):([^:'"]+):([^'")\s]+)/g,
    /(?:testImplementation|androidTestImplementation|debugImplementation)\s*[\('"]+([^:'"]+):([^:'"]+):([^'")\s]+)/g,
  ];

  // Production deps
  const prodPattern = /(?:implementation|api|compileOnly)\s*[\('"]+([^:'"]+):([^:'"]+):([^'")\s]+)/g;
  let match;
  while ((match = prodPattern.exec(raw)) !== null) {
    const coord = `${match[1]}:${match[2]}`;
    if (seen.has(coord)) continue;
    seen.add(coord);
    deps.push({ name: coord, version: match[3], isDev: false });
  }

  // Dev/test deps
  const devPattern = /(?:testImplementation|androidTestImplementation|debugImplementation)\s*[\('"]+([^:'"]+):([^:'"]+):([^'")\s]+)/g;
  while ((match = devPattern.exec(raw)) !== null) {
    const coord = `${match[1]}:${match[2]}`;
    if (seen.has(coord)) continue;
    seen.add(coord);
    deps.push({ name: coord, version: match[3], isDev: true });
  }

  if (deps.length === 0) throw new Error('No dependencies found in build.gradle. Paste the dependencies { } block.');

  // Try to extract project name from namespace or applicationId
  const nameMatch = raw.match(/(?:namespace|applicationId)\s*[=:]\s*['"]([^'"]+)['"]/);
  const name = nameMatch ? nameMatch[1] : 'Android Project';

  return { ecosystem: 'android', name, dependencies: deps };
}
