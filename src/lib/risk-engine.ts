import {
  NpmPackageMetadata,
  GithubMetadata,
  VulnerabilityInfo,
  DependencyRiskScore,
  RiskLevel,
  RiskFlag,
} from '@/types';

// Weights for the composite score
const WEIGHTS = {
  maintenance: 0.25,
  security: 0.30,
  popularity: 0.15,
  community: 0.15,
  depthRisk: 0.15,
};

/**
 * Calculate maintenance risk (0-100, higher = riskier).
 * Signals: last publish date, publish frequency, deprecation.
 */
function calcMaintenanceRisk(npm: NpmPackageMetadata | null): number {
  if (!npm) return 80;

  let score = 0;

  // Days since last publish
  const daysSincePublish = Math.floor(
    (Date.now() - new Date(npm.lastPublish).getTime()) / (1000 * 60 * 60 * 24)
  );

  if (daysSincePublish > 1095) score += 40;       // >3 years
  else if (daysSincePublish > 730) score += 30;    // >2 years
  else if (daysSincePublish > 365) score += 20;    // >1 year
  else if (daysSincePublish > 180) score += 10;    // >6 months
  else score += 0;

  // Publish frequency — infrequent updates are riskier
  if (npm.publishFrequencyDays > 365) score += 20;
  else if (npm.publishFrequencyDays > 180) score += 15;
  else if (npm.publishFrequencyDays > 90) score += 10;
  else if (npm.publishFrequencyDays > 30) score += 5;

  // Deprecation
  if (npm.deprecation) score += 30;

  // Low version count suggests early/abandoned project
  if (npm.versions <= 2) score += 10;

  return Math.min(100, score);
}

/**
 * Calculate security risk (0-100).
 * Signals: known vulnerabilities, severity.
 */
function calcSecurityRisk(vulnerabilities: VulnerabilityInfo[]): number {
  if (vulnerabilities.length === 0) return 0;

  let score = 0;
  for (const vuln of vulnerabilities) {
    switch (vuln.severity) {
      case 'critical': score += 40; break;
      case 'high': score += 25; break;
      case 'moderate': score += 12; break;
      case 'low': score += 5; break;
    }
  }

  return Math.min(100, score);
}

/**
 * Calculate popularity risk (0-100).
 * Low downloads + low stars = higher risk (obscure packages).
 */
function calcPopularityRisk(
  npm: NpmPackageMetadata | null,
  github: GithubMetadata | null
): number {
  if (!npm) return 60;

  let score = 0;

  // Weekly downloads
  if (npm.weeklyDownloads < 100) score += 35;
  else if (npm.weeklyDownloads < 1000) score += 25;
  else if (npm.weeklyDownloads < 10000) score += 15;
  else if (npm.weeklyDownloads < 100000) score += 5;

  // GitHub stars
  if (github) {
    if (github.stars < 10) score += 25;
    else if (github.stars < 100) score += 15;
    else if (github.stars < 1000) score += 8;
    else if (github.stars < 10000) score += 3;
  } else {
    score += 15; // No GitHub repo is a signal
  }

  // Archived repo
  if (github?.archived) score += 20;

  return Math.min(100, score);
}

/**
 * Calculate community risk (0-100).
 * Signals: maintainers, open issues ratio, contributor count.
 */
function calcCommunityRisk(
  npm: NpmPackageMetadata | null,
  github: GithubMetadata | null
): number {
  if (!npm) return 60;

  let score = 0;

  // Single maintainer = bus factor risk
  if (npm.maintainers <= 1) score += 30;
  else if (npm.maintainers <= 2) score += 15;

  // High open issues with low stars = poor maintenance
  if (github) {
    const issueRatio = github.stars > 0
      ? github.openIssues / github.stars
      : github.openIssues > 10 ? 1 : 0;

    if (issueRatio > 0.5) score += 25;
    else if (issueRatio > 0.2) score += 15;
    else if (issueRatio > 0.1) score += 8;

    // Stars vs activity — high stars but no recent commits
    if (github.stars > 1000 && github.lastCommit) {
      const daysSinceCommit = Math.floor(
        (Date.now() - new Date(github.lastCommit).getTime()) / (1000 * 60 * 60 * 24)
      );
      if (daysSinceCommit > 365) score += 20;
    }
  } else {
    score += 15;
  }

  return Math.min(100, score);
}

/**
 * Calculate depth risk (0-100).
 * Deeper dependency chains = higher transitive risk.
 */
function calcDepthRisk(depth: number, transitiveCount: number): number {
  let score = 0;

  // Depth scoring
  if (depth >= 8) score += 40;
  else if (depth >= 6) score += 30;
  else if (depth >= 4) score += 20;
  else if (depth >= 3) score += 10;

  // Transitive dependency count
  if (transitiveCount > 100) score += 30;
  else if (transitiveCount > 50) score += 20;
  else if (transitiveCount > 20) score += 15;
  else if (transitiveCount > 10) score += 8;

  return Math.min(100, score);
}

/**
 * Compute the full risk score for a dependency.
 */
export function computeRiskScore(
  npm: NpmPackageMetadata | null,
  github: GithubMetadata | null,
  vulnerabilities: VulnerabilityInfo[],
  depth: number,
  transitiveCount: number
): DependencyRiskScore {
  const maintenance = calcMaintenanceRisk(npm);
  const security = calcSecurityRisk(vulnerabilities);
  const popularity = calcPopularityRisk(npm, github);
  const community = calcCommunityRisk(npm, github);
  const depthRisk = calcDepthRisk(depth, transitiveCount);

  const overall = Math.round(
    maintenance * WEIGHTS.maintenance +
    security * WEIGHTS.security +
    popularity * WEIGHTS.popularity +
    community * WEIGHTS.community +
    depthRisk * WEIGHTS.depthRisk
  );

  return { maintenance, security, popularity, community, depthRisk, overall };
}

/**
 * Determine risk level from score.
 */
export function getRiskLevel(score: number): RiskLevel {
  if (score >= 70) return 'critical';
  if (score >= 45) return 'high';
  if (score >= 25) return 'medium';
  return 'low';
}

/**
 * Generate risk flags for a dependency.
 */
export function generateFlags(
  npm: NpmPackageMetadata | null,
  github: GithubMetadata | null,
  vulnerabilities: VulnerabilityInfo[],
  depth: number,
  score: DependencyRiskScore
): RiskFlag[] {
  const flags: RiskFlag[] = [];

  // Deprecation
  if (npm?.deprecation) {
    flags.push({
      type: 'deprecated',
      label: 'Deprecated',
      severity: 'critical',
      detail: npm.deprecation,
    });
  }

  // Unmaintained
  if (npm) {
    const daysSince = Math.floor(
      (Date.now() - new Date(npm.lastPublish).getTime()) / (1000 * 60 * 60 * 24)
    );
    if (daysSince > 730) {
      flags.push({
        type: 'unmaintained',
        label: 'Unmaintained',
        severity: daysSince > 1095 ? 'critical' : 'high',
        detail: `Last published ${Math.floor(daysSince / 365)} years ago`,
      });
    } else if (daysSince > 365) {
      flags.push({
        type: 'stale',
        label: 'Stale',
        severity: 'medium',
        detail: `Last published over a year ago`,
      });
    }
  }

  // Vulnerabilities
  const criticalVulns = vulnerabilities.filter(v => v.severity === 'critical').length;
  const highVulns = vulnerabilities.filter(v => v.severity === 'high').length;
  if (criticalVulns > 0 || highVulns > 0) {
    flags.push({
      type: 'vulnerable',
      label: 'Vulnerable',
      severity: criticalVulns > 0 ? 'critical' : 'high',
      detail: `${vulnerabilities.length} known vulnerabilities (${criticalVulns} critical, ${highVulns} high)`,
    });
  } else if (vulnerabilities.length > 0) {
    flags.push({
      type: 'vulnerable',
      label: 'Has Advisories',
      severity: 'medium',
      detail: `${vulnerabilities.length} known advisories`,
    });
  }

  // Low popularity — neutral severity (informational, not a danger signal)
  if (score.popularity >= 45) {
    flags.push({
      type: 'low-popularity',
      label: 'Low Popularity',
      severity: 'low',
      detail: npm ? `${npm.weeklyDownloads.toLocaleString()} weekly downloads` : 'Unknown download count',
    });
  }

  // Single maintainer
  if (npm && npm.maintainers <= 1) {
    const name = npm.maintainerNames?.[0];
    flags.push({
      type: 'single-maintainer',
      label: name ? `Maintainer: ${name}` : 'Single Maintainer',
      severity: 'medium',
      detail: name ? `Bus factor risk — sole maintainer is "${name}"` : 'Bus factor risk — only 1 maintainer',
    });
  }

  // Deep chain
  if (depth >= 5) {
    flags.push({
      type: 'deep-chain',
      label: 'Deep Chain',
      severity: depth >= 8 ? 'high' : 'medium',
      detail: `Dependency depth of ${depth} levels`,
    });
  }

  // Archived
  if (github?.archived) {
    flags.push({
      type: 'unmaintained',
      label: 'Archived',
      severity: 'critical',
      detail: 'GitHub repository is archived',
    });
  }

  return flags;
}
