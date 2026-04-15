export type Ecosystem = 'npm' | 'flutter' | 'android';

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
}

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

export interface RiskFlag {
  type: 'unmaintained' | 'vulnerable' | 'deprecated' | 'low-popularity' | 'deep-chain' | 'single-maintainer' | 'stale';
  label: string;
  severity: RiskLevel;
  detail: string;
}

export interface DependencyRiskScore {
  maintenance: number;      // 0-100 (higher = riskier)
  security: number;         // 0-100
  popularity: number;       // 0-100
  community: number;        // 0-100
  depthRisk: number;        // 0-100
  overall: number;          // 0-100 weighted composite
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
