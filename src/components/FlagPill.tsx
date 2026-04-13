'use client';

import { RiskFlag } from '@/types';

const ICONS: Record<RiskFlag['type'], string> = {
  unmaintained: '\u26a0',
  vulnerable: '\ud83d\udd25',
  deprecated: '\u26d4',
  'low-popularity': '\u2193',
  'deep-chain': '\ud83d\udd17',
  'single-maintainer': '\u2302',
  stale: '\u23f3',
};

const SEVERITY_COLORS: Record<string, { text: string; border: string }> = {
  low: { text: 'var(--text-2)', border: 'var(--border-2)' },
  medium: { text: 'var(--amber-1)', border: 'rgba(251,191,36,0.15)' },
  high: { text: 'var(--red-1)', border: 'rgba(248,113,113,0.15)' },
  critical: { text: '#ff6b6b', border: 'rgba(255,107,107,0.2)' },
};

export default function FlagPill({ flag }: { flag: RiskFlag }) {
  const c = SEVERITY_COLORS[flag.severity] || SEVERITY_COLORS.low;
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md border mono text-[10px]"
      style={{ color: c.text, borderColor: c.border, background: 'rgba(0,0,0,0.2)' }}
      title={flag.detail}
    >
      <span className="text-[9px]">{ICONS[flag.type]}</span>
      {flag.label}
    </span>
  );
}
