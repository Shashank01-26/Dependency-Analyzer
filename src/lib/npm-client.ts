import { NpmPackageMetadata } from '@/types';

const NPM_REGISTRY = 'https://registry.npmjs.org';
const NPM_API = 'https://api.npmjs.org';

const metadataCache = new Map<string, NpmPackageMetadata>();

export async function fetchNpmMetadata(packageName: string): Promise<NpmPackageMetadata | null> {
  if (metadataCache.has(packageName)) {
    return metadataCache.get(packageName)!;
  }

  try {
    const [registryRes, downloadsRes] = await Promise.all([
      fetch(`${NPM_REGISTRY}/${encodeURIComponent(packageName)}`, {
        headers: { Accept: 'application/json' },
        next: { revalidate: 3600 },
      }),
      fetch(
        `${NPM_API}/downloads/point/last-week/${encodeURIComponent(packageName)}`,
        { next: { revalidate: 3600 } }
      ),
    ]);

    if (!registryRes.ok) return null;

    const data = await registryRes.json();
    const downloads = downloadsRes.ok ? await downloadsRes.json() : { downloads: 0 };

    const times = data.time || {};
    const versions = Object.keys(data.versions || {});
    const latestVersion = data['dist-tags']?.latest || versions[versions.length - 1] || '0.0.0';
    const latestData = data.versions?.[latestVersion] || {};

    // Calculate publish frequency
    const timeEntries = Object.entries(times)
      .filter(([k]) => k !== 'created' && k !== 'modified')
      .map(([, v]) => new Date(v as string).getTime())
      .sort((a, b) => a - b);

    let publishFrequencyDays = 365;
    if (timeEntries.length >= 2) {
      const totalSpan = timeEntries[timeEntries.length - 1] - timeEntries[0];
      publishFrequencyDays = Math.round(totalSpan / (timeEntries.length - 1) / (1000 * 60 * 60 * 24));
    }

    // Extract repository URL
    let repository: string | undefined;
    if (latestData.repository) {
      if (typeof latestData.repository === 'string') {
        repository = latestData.repository;
      } else {
        repository = latestData.repository.url;
      }
      if (repository) {
        repository = repository
          .replace(/^git\+/, '')
          .replace(/\.git$/, '')
          .replace(/^ssh:\/\/git@github\.com/, 'https://github.com')
          .replace(/^git:\/\/github\.com/, 'https://github.com');
      }
    }

    const metadata: NpmPackageMetadata = {
      name: packageName,
      version: latestVersion,
      description: data.description || '',
      lastPublish: times.modified || times[latestVersion] || new Date().toISOString(),
      created: times.created || new Date().toISOString(),
      maintainers: (data.maintainers || []).length,
      maintainerNames: (data.maintainers || []).map((m: { name?: string }) => m.name || 'unknown').slice(0, 5),
      weeklyDownloads: downloads.downloads || 0,
      license: latestData.license || data.license || undefined,
      repository,
      homepage: latestData.homepage,
      deprecation: latestData.deprecated || undefined,
      versions: versions.length,
      dependencies: latestData.dependencies || {},
      publishFrequencyDays,
    };

    metadataCache.set(packageName, metadata);
    return metadata;
  } catch (err) {
    console.error(`Failed to fetch npm metadata for ${packageName}:`, err);
    return null;
  }
}

export async function fetchNpmAudit(
  packageName: string,
  version: string
): Promise<Array<{ id: string; title: string; severity: string; url?: string }>> {
  // Use the npm registry advisories endpoint
  try {
    const res = await fetch(`https://registry.npmjs.org/-/npm/v1/security/advisories?package=${encodeURIComponent(packageName)}`, {
      next: { revalidate: 3600 },
    });

    if (!res.ok) return [];

    const data = await res.json();
    return (data.objects || []).map((adv: Record<string, unknown>) => ({
      id: String(adv.id || ''),
      title: String(adv.title || 'Unknown vulnerability'),
      severity: String(adv.severity || 'moderate'),
      url: adv.url ? String(adv.url) : undefined,
    }));
  } catch {
    return [];
  }
}
