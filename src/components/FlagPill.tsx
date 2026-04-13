'use client';

import { RiskFlag } from '@/types';

const FLAG_ICONS: Record<RiskFlag['type'], string> = {
  unmaintained: '\u26a0',
  vulnerable: '\ud83d\udd25',
  deprecated: '\u26d4',
  'low-popularity': '\ud83d\udcc9',
  'deep-chain': '\ud83d\udd17',
  'single-maintainer': '\ud83d\udc64',
  stale: '\u23f3',
};

export default function FlagPill({ flag }: { flag: RiskFlag }) {
  const severityColor = {
    low: 'border-[var(--green-muted)] text-[var(--text-secondary)]',
    medium: 'border-[var(--amber-muted)] text-[var(--amber-solid)]',
    high: 'border-[var(--red-muted)] text-[var(--red-solid)]',
    critical: 'border-[var(--red-solid)] text-[var(--red-glow)]',
  }[flag.severity];

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[11px] font-mono ${severityColor}`}
      title={flag.detail}
    >
      <span>{FLAG_ICONS[flag.type]}</span>
      {flag.label}
    </span>
  );
}
