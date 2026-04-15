import { NpmPackageMetadata } from '@/types';

/**
 * Fetches package metadata from Maven Central (Android/Java/Kotlin).
 * Input format: "group:artifact" e.g. "com.google.android.material:material"
 * Returns data in NpmPackageMetadata shape for risk engine compatibility.
 */

const cache = new Map<string, NpmPackageMetadata>();

export async function fetchMavenMetadata(coordinate: string): Promise<NpmPackageMetadata | null> {
  if (cache.has(coordinate)) return cache.get(coordinate)!;

  const [groupId, artifactId] = coordinate.split(':');
  if (!groupId || !artifactId) return null;

  try {
    // Maven Central Search API
    const res = await fetch(
      `https://search.maven.org/solrsearch/select?q=g:"${encodeURIComponent(groupId)}"+AND+a:"${encodeURIComponent(artifactId)}"&rows=1&wt=json&core=gav`,
      { next: { revalidate: 3600 } }
    );

    if (!res.ok) return null;
    const data = await res.json();
    const doc = data.response?.docs?.[0];

    // Also fetch all versions for frequency calculation
    const versionsRes = await fetch(
      `https://search.maven.org/solrsearch/select?q=g:"${encodeURIComponent(groupId)}"+AND+a:"${encodeURIComponent(artifactId)}"&rows=20&wt=json&core=gav`,
      { next: { revalidate: 3600 } }
    ).catch(() => null);

    let versionCount = 1;
    let publishFrequencyDays = 365;
    let lastPublish = new Date().toISOString();
    let created = lastPublish;

    if (doc) {
      lastPublish = new Date(doc.timestamp).toISOString();
    }

    if (versionsRes && versionsRes.ok) {
      const vData = await versionsRes.json();
      const docs = vData.response?.docs || [];
      versionCount = Math.max(docs.length, vData.response?.numFound || 1);

      const timestamps = docs.map((d: { timestamp: number }) => d.timestamp).sort((a: number, b: number) => a - b);
      if (timestamps.length >= 2) {
        publishFrequencyDays = Math.round((timestamps[timestamps.length - 1] - timestamps[0]) / (timestamps.length - 1) / (1000 * 60 * 60 * 24));
        created = new Date(timestamps[0]).toISOString();
        lastPublish = new Date(timestamps[timestamps.length - 1]).toISOString();
      }
    }

    // Try to find GitHub repo from group ID
    let repository: string | undefined;
    if (groupId.includes('github') || groupId.includes('google') || groupId.includes('square')) {
      // Common patterns
      const orgMap: Record<string, string> = {
        'com.google': 'https://github.com/google',
        'com.squareup': 'https://github.com/square',
        'io.coil-kt': 'https://github.com/coil-kt/coil',
        'org.jetbrains.kotlin': 'https://github.com/JetBrains/kotlin',
        'org.jetbrains.kotlinx': 'https://github.com/Kotlin/kotlinx.coroutines',
        'androidx': 'https://github.com/androidx/androidx',
      };
      for (const [prefix, url] of Object.entries(orgMap)) {
        if (groupId.startsWith(prefix)) { repository = url; break; }
      }
    }

    const metadata: NpmPackageMetadata = {
      name: coordinate,
      version: doc?.v || 'latest',
      description: `${groupId}:${artifactId}`,
      lastPublish,
      created,
      maintainers: 1, // Maven doesn't expose this easily
      maintainerNames: [groupId.split('.').pop() || 'unknown'],
      weeklyDownloads: 0, // Maven Central doesn't expose download counts publicly
      license: undefined,
      repository,
      homepage: `https://search.maven.org/artifact/${groupId}/${artifactId}`,
      deprecation: undefined,
      versions: versionCount,
      dependencies: {}, // Maven POM deps would need separate fetch
      publishFrequencyDays,
    };

    cache.set(coordinate, metadata);
    return metadata;
  } catch (err) {
    console.error(`Failed to fetch Maven metadata for ${coordinate}:`, err);
    return null;
  }
}
