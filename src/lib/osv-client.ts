import { VulnerabilityInfo } from '@/types';
import { Ecosystem } from '@/types';

// OSV ecosystem names mapped from our internal names
const OSV_ECOSYSTEM: Record<Ecosystem, string | null> = {
  npm: 'npm',
  flutter: 'Pub',
  android: 'Maven',
  python: 'PyPI',
  rust: 'crates.io',
  go: 'Go',
  ruby: 'RubyGems',
  dotnet: 'NuGet',
};

interface OSVSeverity {
  type: string;
  score: string;
}

interface OSVAffectedRange {
  type: string;
  introduced?: string;
  fixed?: string;
}

interface OSVAffected {
  package: { name: string; ecosystem: string };
  ranges?: { type: string; events?: OSVAffectedRange[] }[];
  versions?: string[];
  database_specific?: { severity?: string };
}

interface OSVVulnerability {
  id: string;
  summary?: string;
  details?: string;
  severity?: OSVSeverity[];
  affected?: OSVAffected[];
  references?: { type: string; url: string }[];
  database_specific?: { severity?: string; cvss?: string };
}

interface OSVResponse {
  vulns?: OSVVulnerability[];
}

function parseSeverityLevel(vuln: OSVVulnerability): VulnerabilityInfo['severity'] {
  // Try database_specific.severity first (commonly provided by OSV)
  const dbSev = vuln.database_specific?.severity?.toLowerCase();
  if (dbSev === 'critical') return 'critical';
  if (dbSev === 'high') return 'high';
  if (dbSev === 'moderate' || dbSev === 'medium') return 'moderate';
  if (dbSev === 'low') return 'low';

  // Try CVSS score
  const cvssEntry = vuln.severity?.find(s => s.type === 'CVSS_V3' || s.type === 'CVSS_V2');
  if (cvssEntry?.score) {
    // Score strings are CVSS vectors — parse base score from them or try affected
    // Fall through to affected severity
  }

  // Try affected[0].database_specific.severity
  const affSev = vuln.affected?.[0]?.database_specific?.severity?.toLowerCase();
  if (affSev === 'critical') return 'critical';
  if (affSev === 'high') return 'high';
  if (affSev === 'moderate' || affSev === 'medium') return 'moderate';
  if (affSev === 'low') return 'low';

  return 'moderate';
}

function parseCVSS(vuln: OSVVulnerability): number | undefined {
  const cvssEntry = vuln.severity?.find(s => s.type === 'CVSS_V3');
  if (!cvssEntry) return undefined;
  // CVSS v3 vector: CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H
  // Base score isn't in the vector — skip numeric parsing unless a score field exists
  return undefined;
}

function parseFixedIn(vuln: OSVVulnerability): string | undefined {
  for (const affected of vuln.affected ?? []) {
    for (const range of affected.ranges ?? []) {
      for (const event of range.events ?? []) {
        if ((event as { fixed?: string }).fixed) return (event as { fixed?: string }).fixed;
      }
    }
  }
  return undefined;
}

function parseNVDUrl(vuln: OSVVulnerability): string | undefined {
  const cveRef = vuln.references?.find(r => r.url.includes('nvd.nist.gov'));
  if (cveRef) return cveRef.url;
  const cveId = vuln.id.startsWith('CVE-') ? vuln.id : vuln.aliases?.find?.(a => a.startsWith('CVE-'));
  if (cveId) return `https://nvd.nist.gov/vuln/detail/${cveId}`;
  return undefined;
}

export async function fetchOSVVulnerabilities(
  name: string,
  version: string,
  ecosystem: Ecosystem
): Promise<VulnerabilityInfo[]> {
  const osvEcosystem = OSV_ECOSYSTEM[ecosystem];
  if (!osvEcosystem) return [];

  try {
    const body = {
      version,
      package: { name, ecosystem: osvEcosystem },
    };

    const res = await fetch('https://api.osv.dev/v1/query', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      next: { revalidate: 3600 },
    });

    if (!res.ok) return [];
    const data: OSVResponse & { aliases?: string[] } = await res.json();

    return (data.vulns ?? []).map(vuln => ({
      id: vuln.id,
      title: vuln.summary ?? vuln.id,
      severity: parseSeverityLevel(vuln),
      url: vuln.references?.[0]?.url,
      cvss: parseCVSS(vuln),
      cvssVector: vuln.severity?.find(s => s.type === 'CVSS_V3')?.score,
      fixedIn: parseFixedIn(vuln),
      nvdUrl: parseNVDUrl(vuln),
    }));
  } catch {
    return [];
  }
}

// Augment existing npm audit results with OSV data for richer fields
export async function enrichWithOSV(
  existing: VulnerabilityInfo[],
  name: string,
  version: string,
  ecosystem: Ecosystem
): Promise<VulnerabilityInfo[]> {
  if (ecosystem === 'npm' && existing.length > 0) {
    // For npm, existing npm audit results are good — just try to enrich with fixedIn/nvdUrl
    const osv = await fetchOSVVulnerabilities(name, version, ecosystem);
    const osvById = new Map(osv.map(v => [v.id, v]));
    return existing.map(v => {
      const match = osvById.get(v.id);
      return match ? { ...v, fixedIn: match.fixedIn, nvdUrl: match.nvdUrl, cvssVector: match.cvssVector } : v;
    });
  }
  return fetchOSVVulnerabilities(name, version, ecosystem);
}
