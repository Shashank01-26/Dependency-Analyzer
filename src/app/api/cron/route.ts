import { NextRequest, NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/db/supabase';
import { parseInput } from '@/lib/input-parser';
import { analyzeInput } from '@/lib/analyzer';
import { dbSaveScan } from '@/lib/db/scans';


export const maxDuration = 300;

// Called by Vercel Cron (set in vercel.json): "0 6 * * *" (daily at 6am UTC)
// Secured by CRON_SECRET env var
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const client = getServiceClient();
  if (!client) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 503 });
  }

  // Fetch monitors due for scanning
  const { data: monitors, error } = await client
    .from('monitors')
    .select('id, user_id, repo_url, manifest_path, notify_url')
    .or('last_scanned.is.null,last_scanned.lt.' + new Date(Date.now() - 23 * 60 * 60 * 1000).toISOString());

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const results = [];
  for (const monitor of monitors ?? []) {
    try {
      // Fetch manifest from GitHub
      const rawUrl = monitor.repo_url
        .replace('https://github.com/', 'https://raw.githubusercontent.com/')
        + `/HEAD/${monitor.manifest_path}`;

      const token = process.env.GITHUB_TOKEN;
      const headers: Record<string, string> = { 'User-Agent': 'dep-analyzer-cron/1.0' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(rawUrl, { headers });
      if (!res.ok) {
        results.push({ monitor: monitor.id, status: 'skipped', reason: `HTTP ${res.status}` });
        continue;
      }

      const raw = await res.text();
      const parsed = parseInput(raw);
      const scanResult = await analyzeInput(parsed);

      await dbSaveScan(scanResult, monitor.user_id);

      // Update last_scanned
      await client.from('monitors').update({ last_scanned: new Date().toISOString() }).eq('id', monitor.id);

      // Notify via webhook if configured and new critical deps found
      if (monitor.notify_url && scanResult.criticalCount > 0) {
        await fetch(monitor.notify_url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: `⚠️ ${scanResult.projectName}: ${scanResult.criticalCount} critical deps found (score ${scanResult.overallScore}/100)`,
          }),
        }).catch(() => {});
      }

      results.push({ monitor: monitor.id, status: 'ok', scanId: scanResult.id });
    } catch (err) {
      results.push({ monitor: monitor.id, status: 'error', reason: (err as Error).message });
    }
  }

  return NextResponse.json({ processed: results.length, results });
}
