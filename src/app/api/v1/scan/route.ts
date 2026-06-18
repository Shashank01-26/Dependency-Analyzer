import { NextRequest, NextResponse } from 'next/server';
import { analyzeInput } from '@/lib/analyzer';
import { parseInput } from '@/lib/input-parser';
import { getServiceClient } from '@/lib/db/supabase';
import { Ecosystem } from '@/types';
import { createHash } from 'crypto';

export const maxDuration = 60;

async function resolveApiKey(key: string): Promise<string | null> {
  const client = getServiceClient();
  if (!client) return null;

  const hash = createHash('sha256').update(key).digest('hex');
  const { data } = await client
    .from('api_keys')
    .select('user_id, id')
    .eq('key_hash', hash)
    .single();

  if (!data) return null;

  // Update last_used timestamp
  await client.from('api_keys').update({ last_used: new Date().toISOString() }).eq('id', data.id);
  return data.user_id as string;
}

export async function POST(req: NextRequest) {
  try {
    // API key auth via Authorization: Bearer <key>
    const authHeader = req.headers.get('authorization') ?? '';
    const apiKey = authHeader.replace(/^Bearer\s+/i, '').trim();
    const userId = apiKey ? await resolveApiKey(apiKey) : null;

    // Allow unauthenticated use (rate limited by Vercel edge naturally)
    const body = await req.json();
    if (!body.raw || typeof body.raw !== 'string') {
      return NextResponse.json({ error: 'Provide raw manifest content in the "raw" field' }, { status: 400 });
    }

    const ecosystem: Ecosystem | undefined = body.ecosystem;
    const parsed = parseInput(body.raw, ecosystem);
    const result = await analyzeInput(parsed);

    // Persist scan if authenticated
    if (userId) {
      const { dbSaveScan } = await import('@/lib/db/scans');
      await dbSaveScan(result, userId).catch(() => {});
    }

    return NextResponse.json({
      scanId: result.id,
      projectName: result.projectName,
      ecosystem: result.ecosystem,
      overallScore: result.overallScore,
      overallRiskLevel: result.overallRiskLevel,
      totalDependencies: result.totalDependencies,
      criticalCount: result.criticalCount,
      highCount: result.highCount,
      mediumCount: result.mediumCount,
      lowCount: result.lowCount,
      dependencies: result.dependencies.map(d => ({
        name: d.name,
        version: d.version,
        isDev: d.isDev,
        riskLevel: d.riskLevel,
        score: d.score.overall,
        flags: d.flags.map(f => ({ type: f.type, label: f.label, severity: f.severity })),
        vulnerabilities: d.vulnerabilities.map(v => ({
          id: v.id,
          title: v.title,
          severity: v.severity,
          fixedIn: v.fixedIn,
          cvss: v.cvss,
        })),
        license: d.license?.spdx,
      })),
      timestamp: result.timestamp,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Analysis failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const scanId = searchParams.get('id');
  if (!scanId) {
    return NextResponse.json({ error: 'Provide ?id=<scanId>' }, { status: 400 });
  }

  const { dbGetScan } = await import('@/lib/db/scans');
  const scan = await dbGetScan(scanId);
  if (!scan) {
    return NextResponse.json({ error: 'Scan not found' }, { status: 404 });
  }
  return NextResponse.json(scan);
}
