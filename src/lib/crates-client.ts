import { NpmPackageMetadata } from '@/types';

interface CrateVersion {
  num: string;
  created_at: string;
  updated_at: string;
  yanked: boolean;
  license?: string;
}

interface CrateData {
  id: string;
  name: string;
  description?: string;
  homepage?: string;
  repository?: string;
  newest_version: string;
  downloads: number;
  recent_downloads: number;
  created_at: string;
  updated_at: string;
}

interface CratesResponse {
  crate: CrateData;
  versions: CrateVersion[];
}

interface CrateDepsResponse {
  dependencies: { crate_id: string; req: string; kind: string }[];
}

export async function fetchCratesMetadata(name: string): Promise<NpmPackageMetadata | null> {
  try {
    const [crateRes, depsRes] = await Promise.all([
      fetch(`https://crates.io/api/v1/crates/${encodeURIComponent(name)}`, {
        headers: { 'User-Agent': 'dep-analyzer/1.0', 'Accept': 'application/json' },
        next: { revalidate: 3600 },
      }),
      fetch(`https://crates.io/api/v1/crates/${encodeURIComponent(name)}/dependencies`, {
        headers: { 'User-Agent': 'dep-analyzer/1.0', 'Accept': 'application/json' },
        next: { revalidate: 3600 },
      }),
    ]);

    if (!crateRes.ok) return null;
    const data: CratesResponse = await crateRes.json();
    const crate = data.crate;
    const versions = data.versions ?? [];

    const nonYanked = versions.filter(v => !v.yanked);
    const latestVersion = nonYanked[0];
    const oldestVersion = nonYanked[nonYanked.length - 1];

    const created = oldestVersion?.created_at ?? crate.created_at;
    const lastPublish = latestVersion?.updated_at ?? crate.updated_at;
    const versionCount = nonYanked.length;

    const createdMs = new Date(created).getTime();
    const lastMs = new Date(lastPublish).getTime();
    const publishFrequencyDays = versionCount > 1
      ? Math.round((lastMs - createdMs) / (1000 * 60 * 60 * 24) / (versionCount - 1))
      : 999;

    const deps: Record<string, string> = {};
    if (depsRes.ok) {
      const depsData: CrateDepsResponse = await depsRes.json();
      for (const dep of depsData.dependencies ?? []) {
        if (dep.kind === 'normal') deps[dep.crate_id] = dep.req;
      }
    }

    const yankedVersion = versions.find(v => v.num === crate.newest_version && v.yanked);

    return {
      name: crate.name,
      version: crate.newest_version,
      description: crate.description,
      lastPublish,
      created,
      maintainers: 1,
      maintainerNames: [],
      weeklyDownloads: crate.recent_downloads ?? 0,
      license: latestVersion?.license ?? undefined,
      repository: crate.repository ?? undefined,
      homepage: crate.homepage ?? undefined,
      deprecation: yankedVersion ? 'Yanked from crates.io' : undefined,
      versions: versionCount,
      dependencies: deps,
      publishFrequencyDays,
    };
  } catch {
    return null;
  }
}
