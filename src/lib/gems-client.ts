import { NpmPackageMetadata } from '@/types';

interface GemInfo {
  name: string;
  version: string;
  info?: string;
  licenses?: string[];
  homepage_uri?: string;
  source_code_uri?: string;
  changelog_uri?: string;
  downloads: number;
  version_downloads: number;
  authors?: string;
  dependencies?: {
    runtime?: { name: string; requirements: string }[];
    development?: { name: string; requirements: string }[];
  };
}

interface GemVersionInfo {
  number: string;
  created_at: string;
}

export async function fetchGemsMetadata(name: string): Promise<NpmPackageMetadata | null> {
  try {
    const [gemRes, versionsRes] = await Promise.all([
      fetch(`https://rubygems.org/api/v1/gems/${encodeURIComponent(name)}.json`, {
        headers: { 'Accept': 'application/json' },
        next: { revalidate: 3600 },
      }),
      fetch(`https://rubygems.org/api/v1/versions/${encodeURIComponent(name)}.json`, {
        headers: { 'Accept': 'application/json' },
        next: { revalidate: 3600 },
      }),
    ]);

    if (!gemRes.ok) return null;
    const gem: GemInfo = await gemRes.json();

    let versions: GemVersionInfo[] = [];
    if (versionsRes.ok) {
      versions = await versionsRes.json();
    }

    const sortedVersions = versions.sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );

    const created = sortedVersions[0]?.created_at ?? new Date().toISOString();
    const lastPublish = sortedVersions[sortedVersions.length - 1]?.created_at ?? new Date().toISOString();
    const versionCount = sortedVersions.length || 1;

    const createdMs = new Date(created).getTime();
    const lastMs = new Date(lastPublish).getTime();
    const publishFrequencyDays = versionCount > 1
      ? Math.round((lastMs - createdMs) / (1000 * 60 * 60 * 24) / (versionCount - 1))
      : 999;

    const deps: Record<string, string> = {};
    for (const dep of gem.dependencies?.runtime ?? []) {
      deps[dep.name] = dep.requirements;
    }

    const repository = gem.source_code_uri ?? gem.homepage_uri;

    return {
      name: gem.name,
      version: gem.version,
      description: gem.info,
      lastPublish,
      created,
      maintainers: 1,
      maintainerNames: gem.authors ? [gem.authors] : [],
      weeklyDownloads: gem.version_downloads ?? 0,
      license: gem.licenses?.[0] ?? undefined,
      repository: repository ?? undefined,
      homepage: gem.homepage_uri ?? undefined,
      deprecation: undefined,
      versions: versionCount,
      dependencies: deps,
      publishFrequencyDays,
    };
  } catch {
    return null;
  }
}
