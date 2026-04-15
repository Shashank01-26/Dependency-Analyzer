import { NpmPackageMetadata } from '@/types';

/**
 * Fetches package metadata from pub.dev (Flutter/Dart registry).
 * Returns data in the same NpmPackageMetadata shape so the risk engine works unchanged.
 */

const cache = new Map<string, NpmPackageMetadata>();

export async function fetchPubMetadata(packageName: string): Promise<NpmPackageMetadata | null> {
  if (cache.has(packageName)) return cache.get(packageName)!;

  try {
    const [pkgRes, scoreRes] = await Promise.all([
      fetch(`https://pub.dev/api/packages/${encodeURIComponent(packageName)}`, {
        headers: { Accept: 'application/json' },
        next: { revalidate: 3600 },
      }),
      fetch(`https://pub.dev/api/packages/${encodeURIComponent(packageName)}/score`, {
        next: { revalidate: 3600 },
      }).catch(() => null),
    ]);

    if (!pkgRes.ok) return null;
    const data = await pkgRes.json();

    const latest = data.latest?.pubspec || {};
    const versions = data.versions || [];
    const versionDates = versions
      .map((v: { published?: string }) => v.published ? new Date(v.published).getTime() : 0)
      .filter((t: number) => t > 0)
      .sort((a: number, b: number) => a - b);

    let publishFrequencyDays = 365;
    if (versionDates.length >= 2) {
      const span = versionDates[versionDates.length - 1] - versionDates[0];
      publishFrequencyDays = Math.round(span / (versionDates.length - 1) / (1000 * 60 * 60 * 24));
    }

    const lastPublish = versionDates.length > 0
      ? new Date(versionDates[versionDates.length - 1]).toISOString()
      : new Date().toISOString();

    // pub.dev score API
    let likes = 0;
    if (scoreRes && scoreRes.ok) {
      try { const s = await scoreRes.json(); likes = s.likeCount || 0; } catch {}
    }

    // Extract repository from pubspec
    let repository: string | undefined;
    if (latest.repository) repository = String(latest.repository);
    else if (latest.homepage?.includes('github.com')) repository = latest.homepage;

    const deps = latest.dependencies || {};
    const maintainerName = latest.author
      ? [String(latest.author).replace(/<[^>]+>/, '').trim()]
      : data.uploaders?.map((u: { email?: string }) => u.email?.split('@')[0] || 'unknown') || [];

    const metadata: NpmPackageMetadata = {
      name: packageName,
      version: latest.version || data.latest?.version || '0.0.0',
      description: latest.description || '',
      lastPublish,
      created: versionDates.length > 0 ? new Date(versionDates[0]).toISOString() : lastPublish,
      maintainers: maintainerName.length || 1,
      maintainerNames: maintainerName.slice(0, 5),
      weeklyDownloads: likes * 50, // pub.dev doesn't expose downloads; rough proxy from likes
      license: latest.license || undefined,
      repository,
      homepage: latest.homepage,
      deprecation: latest.discontinued ? 'This package has been discontinued' : undefined,
      versions: versions.length,
      dependencies: Object.fromEntries(Object.entries(deps).map(([k, v]) => [k, String(v)])),
      publishFrequencyDays,
    };

    cache.set(packageName, metadata);
    return metadata;
  } catch (err) {
    console.error(`Failed to fetch pub.dev metadata for ${packageName}:`, err);
    return null;
  }
}
