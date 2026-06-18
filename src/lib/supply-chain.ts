import { NpmPackageMetadata, RiskFlag } from '@/types';

function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

interface NpmSearchResult {
  objects: { package: { name: string; date: string }; downloads: { monthly: number } }[];
}

async function detectTyposquatting(
  name: string,
  ownDownloads: number
): Promise<RiskFlag | null> {
  // Only meaningful for short-to-medium names; very long names rarely typosquatted
  if (name.length < 3 || name.length > 40) return null;

  try {
    // Search npm for packages with similar names
    const res = await fetch(
      `https://registry.npmjs.org/-/v1/search?text=${encodeURIComponent(name)}&size=10&ranking=popularity`,
      { next: { revalidate: 86400 } }
    );
    if (!res.ok) return null;

    const data: NpmSearchResult = await res.json();
    for (const hit of data.objects ?? []) {
      const candidate = hit.package.name;
      if (candidate === name) continue; // same package
      if (Math.abs(candidate.length - name.length) > 3) continue; // too different in length
      const dist = levenshtein(name, candidate);
      if (dist > 0 && dist <= 2) {
        // If the candidate has significantly more downloads it's likely the "real" package
        const candidateDownloads = hit.downloads?.monthly ?? 0;
        if (candidateDownloads > 10_000 && (ownDownloads === 0 || candidateDownloads / Math.max(ownDownloads, 1) > 50)) {
          return {
            type: 'typosquatting',
            label: 'Possible Typosquat',
            severity: 'high',
            detail: `"${name}" is ${dist} edit(s) away from popular package "${candidate}" (${candidateDownloads.toLocaleString()} monthly downloads)`,
          };
        }
      }
    }
  } catch {
    // Non-fatal — skip flag if network fails
  }
  return null;
}

function detectInstallScript(npm: NpmPackageMetadata | null): RiskFlag | null {
  if (!npm?.scripts) return null;
  const dangerous = ['preinstall', 'install', 'postinstall'];
  const found = dangerous.filter(s => npm.scripts![s]);
  if (found.length === 0) return null;
  return {
    type: 'install-script',
    label: 'Install Script',
    severity: 'medium',
    detail: `Runs scripts on install: ${found.join(', ')} — review before trusting`,
  };
}

function detectUnpinnedVersion(version: string): RiskFlag | null {
  if (!version || version === 'any' || version === '*' || version === 'x') {
    return {
      type: 'unpinned-version',
      label: 'Unpinned Version',
      severity: 'low',
      detail: 'No exact version pinned — any compatible version may be installed',
    };
  }
  if (/^[\^~>]/.test(version)) {
    return {
      type: 'unpinned-version',
      label: 'Unpinned Version',
      severity: 'low',
      detail: `Version range "${version}" may resolve to different versions over time`,
    };
  }
  return null;
}

export async function detectSupplyChainRisksAsync(
  name: string,
  version: string,
  npm: NpmPackageMetadata | null
): Promise<RiskFlag[]> {
  const flags: RiskFlag[] = [];

  const [typosquat, installScript, unpinned] = await Promise.all([
    detectTyposquatting(name, npm?.weeklyDownloads ?? 0),
    Promise.resolve(detectInstallScript(npm)),
    Promise.resolve(detectUnpinnedVersion(version)),
  ]);

  if (typosquat) flags.push(typosquat);
  if (installScript) flags.push(installScript);
  if (unpinned) flags.push(unpinned);

  return flags;
}

// Sync version for ecosystems where typosquat check isn't relevant
export function detectSupplyChainRisks(
  name: string,
  version: string,
  npm: NpmPackageMetadata | null
): RiskFlag[] {
  const flags: RiskFlag[] = [];
  const installScript = detectInstallScript(npm);
  if (installScript) flags.push(installScript);
  const unpinned = detectUnpinnedVersion(version);
  if (unpinned) flags.push(unpinned);
  return flags;
}
