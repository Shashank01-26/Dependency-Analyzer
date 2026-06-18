import { NpmPackageMetadata } from '@/types';

interface GoProxyInfo {
  Version: string;
  Time: string;
}

interface GoProxyList {
  versions: string[];
}

export async function fetchGoMetadata(module: string): Promise<NpmPackageMetadata | null> {
  try {
    // Go module paths use slash-encoded form for proxy
    const encoded = encodeURIComponent(module).replace(/%2F/g, '/');

    const [latestRes, listRes] = await Promise.all([
      fetch(`https://proxy.golang.org/${encoded}/@latest`, { next: { revalidate: 3600 } }),
      fetch(`https://proxy.golang.org/${encoded}/@v/list`, { next: { revalidate: 3600 } }),
    ]);

    if (!latestRes.ok) return null;
    const latest: GoProxyInfo = await latestRes.json();

    let versions: string[] = [];
    if (listRes.ok) {
      const text = await listRes.text();
      versions = text.trim().split('\n').filter(Boolean);
    }
    if (!versions.includes(latest.Version)) versions.unshift(latest.Version);

    // Fetch oldest version timestamp for created date
    let created = latest.Time;
    if (versions.length > 1) {
      const oldestRes = await fetch(
        `https://proxy.golang.org/${encoded}/@v/${encodeURIComponent(versions[versions.length - 1])}.info`,
        { next: { revalidate: 3600 } }
      );
      if (oldestRes.ok) {
        const oldest: GoProxyInfo = await oldestRes.json();
        created = oldest.Time;
      }
    }

    const createdMs = new Date(created).getTime();
    const lastMs = new Date(latest.Time).getTime();
    const publishFrequencyDays = versions.length > 1
      ? Math.round((lastMs - createdMs) / (1000 * 60 * 60 * 24) / (versions.length - 1))
      : 999;

    // Parse GitHub repo from module path
    const githubMatch = module.match(/^github\.com\/([^/]+\/[^/]+)/);
    const repository = githubMatch ? `https://github.com/${githubMatch[1]}` : undefined;

    return {
      name: module,
      version: latest.Version,
      description: undefined,
      lastPublish: latest.Time,
      created,
      maintainers: 1,
      maintainerNames: [],
      weeklyDownloads: 0,
      license: undefined,
      repository,
      homepage: repository,
      deprecation: undefined,
      versions: versions.length,
      dependencies: {},
      publishFrequencyDays,
    };
  } catch {
    return null;
  }
}
