import { NpmPackageMetadata } from '@/types';

interface PyPIRelease {
  upload_time: string;
}

interface PyPIInfo {
  name: string;
  version: string;
  summary?: string;
  license?: string;
  home_page?: string;
  project_urls?: Record<string, string>;
  requires_dist?: string[];
  yanked?: boolean;
  yanked_reason?: string;
}

interface PyPIResponse {
  info: PyPIInfo;
  releases: Record<string, PyPIRelease[]>;
  urls: PyPIRelease[];
}

export async function fetchPyPIMetadata(name: string): Promise<NpmPackageMetadata | null> {
  try {
    const res = await fetch(`https://pypi.org/pypi/${encodeURIComponent(name)}/json`, {
      headers: { 'Accept': 'application/json' },
      next: { revalidate: 3600 },
    });
    if (!res.ok) return null;

    const data: PyPIResponse = await res.json();
    const info = data.info;

    const allReleases = Object.entries(data.releases)
      .flatMap(([, files]) => files)
      .filter(f => f.upload_time)
      .sort((a, b) => new Date(a.upload_time).getTime() - new Date(b.upload_time).getTime());

    const created = allReleases[0]?.upload_time ?? new Date().toISOString();
    const lastPublish = data.urls[0]?.upload_time ?? allReleases[allReleases.length - 1]?.upload_time ?? new Date().toISOString();
    const versions = Object.keys(data.releases).length;

    const createdMs = new Date(created).getTime();
    const lastMs = new Date(lastPublish).getTime();
    const publishFrequencyDays = versions > 1
      ? Math.round((lastMs - createdMs) / (1000 * 60 * 60 * 24) / (versions - 1))
      : 999;

    // Parse dependencies from requires_dist (e.g. "requests>=2.0")
    const deps: Record<string, string> = {};
    for (const req of info.requires_dist ?? []) {
      const match = req.match(/^([A-Za-z0-9_.-]+)/);
      if (match) deps[match[1]] = '*';
    }

    // Extract source repo from project_urls
    const repoUrl = info.project_urls?.['Source'] ?? info.project_urls?.['Repository'] ?? info.project_urls?.['Homepage'] ?? info.home_page;

    return {
      name: info.name,
      version: info.version,
      description: info.summary,
      lastPublish,
      created,
      maintainers: 1,
      maintainerNames: [],
      weeklyDownloads: 0,
      license: info.license ?? undefined,
      repository: repoUrl ?? undefined,
      homepage: info.home_page ?? undefined,
      deprecation: info.yanked ? (info.yanked_reason ?? 'Yanked from PyPI') : undefined,
      versions,
      dependencies: deps,
      publishFrequencyDays,
    };
  } catch {
    return null;
  }
}
