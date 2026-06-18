import { ScanResult, PolicyConfig, PolicyViolation } from '@/types';

export function evaluatePolicy(scan: ScanResult, policy: PolicyConfig): PolicyViolation[] {
  const violations: PolicyViolation[] = [];

  for (const dep of scan.dependencies) {
    // Max overall score
    if (policy.maxOverallScore !== undefined && dep.score.overall > policy.maxOverallScore) {
      violations.push({
        rule: 'maxOverallScore',
        packageName: dep.name,
        detail: `Score ${dep.score.overall} exceeds allowed maximum of ${policy.maxOverallScore}`,
        severity: dep.riskLevel,
      });
    }

    // Blocked licenses
    if (policy.blockLicenses && policy.blockLicenses.length > 0) {
      const spdx = dep.license?.spdx ?? dep.npm?.license ?? '';
      const blocked = policy.blockLicenses.find(bl =>
        spdx.toUpperCase().includes(bl.toUpperCase())
      );
      if (blocked) {
        violations.push({
          rule: 'blockLicenses',
          packageName: dep.name,
          detail: `License "${spdx}" matches blocked license "${blocked}"`,
          severity: 'high',
        });
      }
    }

    // Max depth
    if (policy.maxDepth !== undefined && dep.depth > policy.maxDepth) {
      violations.push({
        rule: 'maxDepth',
        packageName: dep.name,
        detail: `Dependency depth ${dep.depth} exceeds allowed maximum of ${policy.maxDepth}`,
        severity: 'medium',
      });
    }

    // Require pinned versions
    if (policy.requirePinnedVersions) {
      const version = dep.version;
      if (!version || version === '*' || version === 'any' || /^[\^~>]/.test(version)) {
        violations.push({
          rule: 'requirePinnedVersions',
          packageName: dep.name,
          detail: `Version "${version}" is not pinned to an exact release`,
          severity: 'low',
        });
      }
    }

    // Block single maintainer
    if (policy.blockSingleMaintainer && dep.npm && dep.npm.maintainers <= 1 && !dep.isDev) {
      violations.push({
        rule: 'blockSingleMaintainer',
        packageName: dep.name,
        detail: `Production dependency has only ${dep.npm.maintainers} maintainer — high bus-factor risk`,
        severity: 'medium',
      });
    }

    // Block unmaintained packages older than N days
    if (policy.blockUnmaintainedDays !== undefined && dep.npm?.lastPublish) {
      const daysSince = Math.floor(
        (Date.now() - new Date(dep.npm.lastPublish).getTime()) / (1000 * 60 * 60 * 24)
      );
      if (daysSince > policy.blockUnmaintainedDays) {
        violations.push({
          rule: 'blockUnmaintainedDays',
          packageName: dep.name,
          detail: `Last published ${daysSince} days ago, exceeds allowed ${policy.blockUnmaintainedDays} days`,
          severity: daysSince > 1095 ? 'critical' : 'high',
        });
      }
    }
  }

  return violations;
}

export const DEFAULT_POLICY: PolicyConfig = {
  maxOverallScore: 70,
  blockLicenses: ['GPL-3.0', 'AGPL-3.0'],
  maxDepth: 8,
  requirePinnedVersions: false,
  blockSingleMaintainer: false,
  blockUnmaintainedDays: 730,
};

export function exportPolicyJson(policy: PolicyConfig): string {
  return JSON.stringify({ depanalyzer: { policy } }, null, 2);
}
