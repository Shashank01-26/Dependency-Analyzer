import { NextRequest, NextResponse } from 'next/server';
import { ScanResult } from '@/types';

type ExportFormat = 'json' | 'csv' | 'html' | 'spdx' | 'cyclonedx';

export async function POST(req: NextRequest) {
  try {
    const { scan, format = 'json' } = await req.json() as { scan: ScanResult; format?: ExportFormat };

    switch (format) {
      case 'csv':       return exportCsv(scan);
      case 'html':      return exportHtml(scan);
      case 'spdx':      return exportSpdx(scan);
      case 'cyclonedx': return exportCycloneDx(scan);
      default:          return exportJson(scan);
    }
  } catch (err) {
    console.error('Export failed:', err);
    return NextResponse.json({ error: 'Export failed' }, { status: 500 });
  }
}

function exportJson(scan: ScanResult): NextResponse {
  const report = {
    reportId: scan.id,
    generatedAt: scan.timestamp,
    project: scan.projectName,
    ecosystem: scan.ecosystem,
    summary: {
      overallScore: scan.overallScore,
      riskLevel: scan.overallRiskLevel,
      total: scan.totalDependencies,
      direct: scan.directDependencies,
      dev: scan.devDependencies,
      critical: scan.criticalCount,
      high: scan.highCount,
      medium: scan.mediumCount,
      low: scan.lowCount,
    },
    dependencies: scan.dependencies.map(dep => ({
      name: dep.name,
      version: dep.version,
      isDev: dep.isDev,
      riskLevel: dep.riskLevel,
      scores: dep.score,
      flags: dep.flags,
      vulnerabilities: dep.vulnerabilities,
      license: dep.license,
      metadata: {
        weeklyDownloads: dep.npm?.weeklyDownloads,
        maintainers: dep.npm?.maintainers,
        lastPublish: dep.npm?.lastPublish,
        license: dep.npm?.license,
      },
    })),
  };
  return NextResponse.json(report, {
    headers: { 'Content-Disposition': `attachment; filename="dep-risk-${scan.id}.json"` },
  });
}

function exportCsv(scan: ScanResult): NextResponse {
  const header = 'Package,Version,Ecosystem,Risk Score,Risk Level,Maintenance,Security,Popularity,Community,Depth Risk,License,Flags,Vulnerabilities,Weekly Downloads,Maintainers,Dev Dependency\n';
  const rows = scan.dependencies.map(dep => {
    const flags = dep.flags.map(f => f.label).join('; ');
    const vulnSummary = dep.vulnerabilities.map(v => `${v.id}(${v.severity})`).join('; ');
    return [
      `"${dep.name}"`,
      dep.version,
      scan.ecosystem,
      dep.score.overall,
      dep.riskLevel,
      dep.score.maintenance,
      dep.score.security,
      dep.score.popularity,
      dep.score.community,
      dep.score.depthRisk,
      `"${dep.license?.spdx ?? dep.npm?.license ?? ''}"`,
      `"${flags}"`,
      `"${vulnSummary}"`,
      dep.npm?.weeklyDownloads ?? 0,
      dep.npm?.maintainers ?? 0,
      dep.isDev,
    ].join(',');
  });
  const csv = header + rows.join('\n');
  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="dep-risk-${scan.id}.csv"`,
    },
  });
}

function riskColor(level: string): string {
  return ({ critical: '#ef4444', high: '#f97316', medium: '#eab308', low: '#22c55e' })[level] ?? '#6b7280';
}

function exportHtml(scan: ScanResult): NextResponse {
  const rows = scan.dependencies.map(dep => `
    <tr>
      <td>${dep.name}</td>
      <td>${dep.version}</td>
      <td><span style="color:${riskColor(dep.riskLevel)};font-weight:600">${dep.riskLevel.toUpperCase()}</span></td>
      <td>${dep.score.overall}</td>
      <td>${dep.license?.spdx ?? dep.npm?.license ?? '—'}</td>
      <td>${dep.vulnerabilities.length}</td>
      <td>${dep.flags.map(f => f.label).join(', ')}</td>
      <td>${dep.isDev ? 'dev' : 'prod'}</td>
    </tr>`).join('');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Dependency Risk Report — ${scan.projectName}</title>
  <style>
    body { font-family: system-ui, sans-serif; background: #09090b; color: #e4e4e7; margin: 0; padding: 2rem; }
    h1 { font-size: 1.5rem; margin-bottom: 0.25rem; }
    .meta { color: #71717a; font-size: 0.875rem; margin-bottom: 2rem; }
    .stats { display: flex; gap: 1rem; flex-wrap: wrap; margin-bottom: 2rem; }
    .stat { background: #18181b; border: 1px solid #27272a; border-radius: 8px; padding: 1rem 1.5rem; }
    .stat-label { color: #71717a; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em; }
    .stat-value { font-size: 1.5rem; font-weight: 700; margin-top: 0.25rem; }
    table { width: 100%; border-collapse: collapse; font-size: 0.875rem; }
    th { text-align: left; padding: 0.5rem 0.75rem; color: #71717a; font-weight: 500; border-bottom: 1px solid #27272a; }
    td { padding: 0.5rem 0.75rem; border-bottom: 1px solid #18181b; }
    tr:hover td { background: #18181b; }
  </style>
</head>
<body>
  <h1>${scan.projectName}</h1>
  <p class="meta">Generated ${new Date(scan.timestamp).toLocaleString()} · ${scan.ecosystem} · ${scan.totalDependencies} dependencies</p>
  <div class="stats">
    <div class="stat"><div class="stat-label">Overall Score</div><div class="stat-value" style="color:${riskColor(scan.overallRiskLevel)}">${scan.overallScore}/100</div></div>
    <div class="stat"><div class="stat-label">Critical</div><div class="stat-value" style="color:#ef4444">${scan.criticalCount}</div></div>
    <div class="stat"><div class="stat-label">High</div><div class="stat-value" style="color:#f97316">${scan.highCount}</div></div>
    <div class="stat"><div class="stat-label">Medium</div><div class="stat-value" style="color:#eab308">${scan.mediumCount}</div></div>
    <div class="stat"><div class="stat-label">Low</div><div class="stat-value" style="color:#22c55e">${scan.lowCount}</div></div>
  </div>
  <table>
    <thead><tr><th>Package</th><th>Version</th><th>Risk</th><th>Score</th><th>License</th><th>Vulns</th><th>Flags</th><th>Type</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>
</body>
</html>`;

  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html',
      'Content-Disposition': `attachment; filename="dep-risk-${scan.id}.html"`,
    },
  });
}

function exportSpdx(scan: ScanResult): NextResponse {
  const spdx = {
    spdxVersion: 'SPDX-2.3',
    dataLicense: 'CC0-1.0',
    SPDXID: 'SPDXRef-DOCUMENT',
    name: scan.projectName,
    documentNamespace: `https://dep-analyzer.app/sbom/${scan.id}`,
    creationInfo: {
      created: scan.timestamp,
      creators: ['Tool: dep-analyzer'],
    },
    packages: scan.dependencies.map((dep, i) => ({
      SPDXID: `SPDXRef-Package-${i}`,
      name: dep.name,
      versionInfo: dep.version,
      downloadLocation: dep.npm?.homepage ?? dep.npm?.repository ?? 'NOASSERTION',
      filesAnalyzed: false,
      licenseConcluded: dep.license?.spdx ?? dep.npm?.license ?? 'NOASSERTION',
      licenseDeclared: dep.npm?.license ?? 'NOASSERTION',
      copyrightText: 'NOASSERTION',
      comment: dep.flags.length > 0 ? `Risk flags: ${dep.flags.map(f => f.label).join(', ')}` : undefined,
    })),
    relationships: scan.dependencies.map((_, i) => ({
      spdxElementId: 'SPDXRef-DOCUMENT',
      relationshipType: 'DESCRIBES',
      relatedSpdxElement: `SPDXRef-Package-${i}`,
    })),
  };

  return NextResponse.json(spdx, {
    headers: { 'Content-Disposition': `attachment; filename="sbom-spdx-${scan.id}.json"` },
  });
}

function exportCycloneDx(scan: ScanResult): NextResponse {
  const cdx = {
    bomFormat: 'CycloneDX',
    specVersion: '1.5',
    serialNumber: `urn:uuid:${scan.id}`,
    version: 1,
    metadata: {
      timestamp: scan.timestamp,
      tools: [{ vendor: 'dep-analyzer', name: 'dep-analyzer', version: '1.0.0' }],
      component: { type: 'application', name: scan.projectName },
    },
    components: scan.dependencies.map(dep => ({
      type: 'library',
      name: dep.name,
      version: dep.version,
      purl: buildPurl(dep.name, dep.version, scan.ecosystem),
      licenses: dep.license?.spdx && dep.license.spdx !== 'Unknown'
        ? [{ license: { id: dep.license.spdx } }]
        : undefined,
      externalReferences: dep.npm?.repository
        ? [{ type: 'vcs', url: dep.npm.repository }]
        : undefined,
    })),
    vulnerabilities: scan.dependencies.flatMap(dep =>
      dep.vulnerabilities.map(v => ({
        id: v.id,
        source: { name: 'OSV' },
        ratings: [{ severity: v.severity, score: v.cvss }].filter(r => r.score !== undefined),
        affects: [{ ref: buildPurl(dep.name, dep.version, scan.ecosystem) }],
        analysis: v.fixedIn ? { detail: `Fixed in ${v.fixedIn}` } : undefined,
      }))
    ),
  };

  return NextResponse.json(cdx, {
    headers: { 'Content-Disposition': `attachment; filename="sbom-cyclonedx-${scan.id}.json"` },
  });
}

function buildPurl(name: string, version: string, ecosystem: string): string {
  const typeMap: Record<string, string> = {
    npm: 'npm', flutter: 'pub', android: 'maven',
    python: 'pypi', rust: 'cargo', go: 'golang',
    ruby: 'gem', dotnet: 'nuget',
  };
  const type = typeMap[ecosystem] ?? 'generic';
  return `pkg:${type}/${encodeURIComponent(name)}@${encodeURIComponent(version)}`;
}
