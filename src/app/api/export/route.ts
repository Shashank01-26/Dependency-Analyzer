import { NextRequest, NextResponse } from 'next/server';
import { ScanResult } from '@/types';

export async function POST(req: NextRequest) {
  try {
    const { scan, format } = await req.json() as { scan: ScanResult; format: 'json' | 'csv' };

    if (format === 'csv') {
      const header = 'Package,Version,Risk Score,Risk Level,Maintenance,Security,Popularity,Community,Depth Risk,Flags,Vulnerabilities,Weekly Downloads,Maintainers,Dev Dependency\n';
      const rows = scan.dependencies.map(dep => {
        const flags = dep.flags.map(f => f.label).join('; ');
        return [
          dep.name,
          dep.version,
          dep.score.overall,
          dep.riskLevel,
          dep.score.maintenance,
          dep.score.security,
          dep.score.popularity,
          dep.score.community,
          dep.score.depthRisk,
          `"${flags}"`,
          dep.vulnerabilities.length,
          dep.npm?.weeklyDownloads || 0,
          dep.npm?.maintainers || 0,
          dep.isDev,
        ].join(',');
      });

      const csv = header + rows.join('\n');
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="dep-risk-report-${scan.id}.csv"`,
        },
      });
    }

    // Default: JSON export
    const report = {
      reportId: scan.id,
      generatedAt: scan.timestamp,
      project: scan.projectName,
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
        metadata: {
          weeklyDownloads: dep.npm?.weeklyDownloads,
          maintainers: dep.npm?.maintainers,
          lastPublish: dep.npm?.lastPublish,
          license: dep.npm?.license,
        },
      })),
    };

    return NextResponse.json(report, {
      headers: {
        'Content-Disposition': `attachment; filename="dep-risk-report-${scan.id}.json"`,
      },
    });
  } catch (err) {
    console.error('Export failed:', err);
    return NextResponse.json({ error: 'Export failed' }, { status: 500 });
  }
}
