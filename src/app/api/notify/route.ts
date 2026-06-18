import { NextRequest, NextResponse } from 'next/server';
import { ScanResult } from '@/types';

interface NotifyBody {
  webhookUrl: string;
  scan: ScanResult;
  platform?: 'slack' | 'discord' | 'generic';
}

function riskEmoji(level: string): string {
  return ({ critical: '🔴', high: '🟠', medium: '🟡', low: '🟢' })[level] ?? '⚪';
}

function buildSlackPayload(scan: ScanResult): object {
  const topRisks = scan.dependencies
    .filter(d => d.riskLevel === 'critical' || d.riskLevel === 'high')
    .slice(0, 5)
    .map(d => `• \`${d.name}@${d.version}\` — ${d.riskLevel} (${d.score.overall}/100): ${d.flags.map(f => f.label).join(', ')}`)
    .join('\n');

  return {
    text: `${riskEmoji(scan.overallRiskLevel)} *Dependency Risk Report: ${scan.projectName}*`,
    blocks: [
      {
        type: 'header',
        text: { type: 'plain_text', text: `${riskEmoji(scan.overallRiskLevel)} ${scan.projectName} — Risk Score: ${scan.overallScore}/100` },
      },
      {
        type: 'section',
        fields: [
          { type: 'mrkdwn', text: `*Ecosystem:*\n${scan.ecosystem}` },
          { type: 'mrkdwn', text: `*Total Deps:*\n${scan.totalDependencies}` },
          { type: 'mrkdwn', text: `*Critical:*\n${scan.criticalCount}` },
          { type: 'mrkdwn', text: `*High:*\n${scan.highCount}` },
        ],
      },
      ...(topRisks ? [{
        type: 'section',
        text: { type: 'mrkdwn', text: `*Top Risks:*\n${topRisks}` },
      }] : []),
      {
        type: 'context',
        elements: [{ type: 'mrkdwn', text: `Scanned at ${new Date(scan.timestamp).toLocaleString()}` }],
      },
    ],
  };
}

function buildDiscordPayload(scan: ScanResult): object {
  const topRisks = scan.dependencies
    .filter(d => d.riskLevel === 'critical' || d.riskLevel === 'high')
    .slice(0, 5)
    .map(d => `• \`${d.name}@${d.version}\` — ${d.riskLevel} (${d.score.overall}/100)`)
    .join('\n');

  const colorMap: Record<string, number> = {
    critical: 0xef4444, high: 0xf97316, medium: 0xeab308, low: 0x22c55e,
  };

  return {
    embeds: [{
      title: `${riskEmoji(scan.overallRiskLevel)} ${scan.projectName} — Risk Score: ${scan.overallScore}/100`,
      color: colorMap[scan.overallRiskLevel] ?? 0x6b7280,
      fields: [
        { name: 'Ecosystem', value: scan.ecosystem, inline: true },
        { name: 'Total Deps', value: String(scan.totalDependencies), inline: true },
        { name: 'Critical', value: String(scan.criticalCount), inline: true },
        { name: 'High', value: String(scan.highCount), inline: true },
        ...(topRisks ? [{ name: 'Top Risks', value: topRisks }] : []),
      ],
      timestamp: scan.timestamp,
    }],
  };
}

export async function POST(req: NextRequest) {
  try {
    const { webhookUrl, scan, platform = 'slack' } = await req.json() as NotifyBody;

    if (!webhookUrl || !scan) {
      return NextResponse.json({ error: 'webhookUrl and scan are required' }, { status: 400 });
    }

    // Basic URL validation — only allow https webhooks
    if (!webhookUrl.startsWith('https://')) {
      return NextResponse.json({ error: 'webhookUrl must be an https URL' }, { status: 400 });
    }

    const payload = platform === 'discord'
      ? buildDiscordPayload(scan)
      : buildSlackPayload(scan);

    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      return NextResponse.json({ error: `Webhook returned ${res.status}: ${text}` }, { status: 502 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Notification failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
