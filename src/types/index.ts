export type Ecosystem = 'npm' | 'flutter' | 'android' | 'python' | 'rust' | 'go' | 'ruby' | 'dotnet';

export interface PackageJson {
  name?: string;
  version?: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}

export interface ParsedInput {
  ecosystem: Ecosystem;
  name: string;
  dependencies: { name: string; version: string; isDev: boolean }[];
}

export interface NpmPackageMetadata {
  name: string;
  version: string;
  description?: string;
  lastPublish: string;
  created: string;
  maintainers: number;
  maintainerNames: string[];
  weeklyDownloads: number;
  license?: string;
  repository?: string;
  homepage?: string;
  deprecation?: string;
  versions: number;
  dependencies: Record<string, string>;
  publishFrequencyDays: number;
  // Supply chain fields
  hasInstallScript?: boolean;
  scripts?: Record<string, string>;
}

export interface GithubMetadata {
  stars: number;
  forks: number;
  openIssues: number;
  lastCommit: string;
  contributors: number;
  archived: boolean;
  license?: string;
  watchers: number;
}

export interface VulnerabilityInfo {
  id: string;
  title: string;
  severity: 'low' | 'moderate' | 'high' | 'critical';
  url?: string;
  range?: string;
  // Enhanced CVE fields
  cvss?: number;
  cvssVector?: string;
  fixedIn?: string;
  nvdUrl?: string;
  epss?: number;
  // Transitive path: package names from root to vulnerable dep
  path?: string[];
}

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

export interface RiskFlag {
  type:
    | 'unmaintained'
    | 'vulnerable'
    | 'deprecated'
    | 'low-popularity'
    | 'deep-chain'
    | 'single-maintainer'
    | 'stale'
    | 'typosquatting'
    | 'install-script'
    | 'ownership-transfer'
    | 'unpinned-version'
    | 'license-risk';
  label: string;
  severity: RiskLevel;
  detail: string;
}

export interface DependencyRiskScore {
  maintenance: number;
  security: number;
  popularity: number;
  community: number;
  depthRisk: number;
  overall: number;
}

export interface LicenseInfo {
  spdx: string;
  category: 'permissive' | 'weak-copyleft' | 'strong-copyleft' | 'unknown';
  compatible: boolean;
}

export interface AnalyzedDependency {
  name: string;
  version: string;
  isDev: boolean;
  npm: NpmPackageMetadata | null;
  github: GithubMetadata | null;
  vulnerabilities: VulnerabilityInfo[];
  score: DependencyRiskScore;
  riskLevel: RiskLevel;
  flags: RiskFlag[];
  depth: number;
  directDeps: string[];
  transitiveCount: number;
  license?: LicenseInfo;
}

export interface PolicyConfig {
  maxOverallScore?: number;
  blockLicenses?: string[];
  maxDepth?: number;
  requirePinnedVersions?: boolean;
  blockSingleMaintainer?: boolean;
  blockUnmaintainedDays?: number;
}

export interface PolicyViolation {
  rule: string;
  packageName: string;
  detail: string;
  severity: RiskLevel;
}

export interface ScanResult {
  id: string;
  timestamp: string;
  ecosystem: Ecosystem;
  projectName: string;
  overallScore: number;
  overallRiskLevel: RiskLevel;
  totalDependencies: number;
  directDependencies: number;
  devDependencies: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  dependencies: AnalyzedDependency[];
  tree: DependencyTreeNode[];
  policyViolations?: PolicyViolation[];
}

export interface DependencyTreeNode {
  name: string;
  version: string;
  riskLevel: RiskLevel;
  score: number;
  children: DependencyTreeNode[];
}

export interface AIInsight {
  packageName?: string;
  type: 'risk' | 'recommendation' | 'alternative' | 'summary';
  title: string;
  description: string;
  severity?: RiskLevel;
  alternative?: string;
}

export interface ScanSummary {
  id: string;
  timestamp: string;
  projectName: string;
  overallScore: number;
  overallRiskLevel: RiskLevel;
  ecosystem: Ecosystem;
  totalDependencies: number;
  criticalCount: number;
}
