import { NpmPackageMetadata } from '@/types';

interface NuGetCatalogEntry {
  version: string;
  description?: string;
  licenseExpression?: string;
  projectUrl?: string;
  repository?: { url?: string };
  published: string;
  authors?: string;
  dependencyGroups?: {
    dependencies?: { id: string; range?: string }[];
  }[];
  listed?: boolean;
  deprecation?: { message?: string };
}

interface NuGetRegistrationPage {
  items: {
    catalogEntry: NuGetCatalogEntry;
  }[];
}

interface NuGetRegistrationResponse {
  items: (NuGetRegistrationPage | { items?: NuGetRegistrationPage['items']; '@id': string })[];
}

export async function fetchNuGetMetadata(name: string): Promise<NpmPackageMetadata | null> {
  try {
    const res = await fetch(
      `https://api.nuget.org/v3/registration5/${name.toLowerCase()}/index.json`,
      { headers: { 'Accept': 'application/json' }, next: { revalidate: 3600 } }
    );
    if (!res.ok) return null;

    const data: NuGetRegistrationResponse = await res.json();

    // Collect all catalog entries across pages
    const entries: NuGetCatalogEntry[] = [];
    for (const page of data.items ?? []) {
      const pageItems = (page as NuGetRegistrationPage).items;
      if (pageItems) {
        for (const item of pageItems) {
          if (item.catalogEntry) entries.push(item.catalogEntry);
        }
      } else {
        // Page items may be in a separate URL — fetch it
        const pageId = (page as { '@id': string })['@id'];
        if (pageId) {
          const pageRes = await fetch(pageId, { next: { revalidate: 3600 } });
          if (pageRes.ok) {
            const pageData: NuGetRegistrationPage = await pageRes.json();
            for (const item of pageData.items ?? []) {
              if (item.catalogEntry) entries.push(item.catalogEntry);
            }
          }
        }
      }
    }

    const listed = entries.filter(e => e.listed !== false);
    if (listed.length === 0) return null;

    const sorted = listed.sort((a, b) => new Date(a.published).getTime() - new Date(b.published).getTime());
    const oldest = sorted[0];
    const latest = sorted[sorted.length - 1];

    const created = oldest.published;
    const lastPublish = latest.published;
    const versionCount = listed.length;

    const createdMs = new Date(created).getTime();
    const lastMs = new Date(lastPublish).getTime();
    const publishFrequencyDays = versionCount > 1
      ? Math.round((lastMs - createdMs) / (1000 * 60 * 60 * 24) / (versionCount - 1))
      : 999;

    const deps: Record<string, string> = {};
    for (const group of latest.dependencyGroups ?? []) {
      for (const dep of group.dependencies ?? []) {
        deps[dep.id] = dep.range ?? '*';
      }
    }

    const repository = latest.repository?.url ?? latest.projectUrl;

    return {
      name,
      version: latest.version,
      description: latest.description,
      lastPublish,
      created,
      maintainers: 1,
      maintainerNames: latest.authors ? [latest.authors] : [],
      weeklyDownloads: 0,
      license: latest.licenseExpression ?? undefined,
      repository: repository ?? undefined,
      homepage: latest.projectUrl ?? undefined,
      deprecation: latest.deprecation?.message ?? undefined,
      versions: versionCount,
      dependencies: deps,
      publishFrequencyDays,
    };
  } catch {
    return null;
  }
}
