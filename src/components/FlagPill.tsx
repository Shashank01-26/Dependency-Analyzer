'use client';
import { RiskFlag } from '@/types';

const ICONS: Record<RiskFlag['type'], string> = {
  unmaintained: '⚠', vulnerable: '🔥', deprecated: '⛔', 'low-popularity': '↓', 'deep-chain': '🔗', 'single-maintainer': '👤', stale: '⏳',
};

export default function FlagPill({ flag }: { flag: RiskFlag }) {
  const color = flag.severity === 'critical' || flag.severity === 'high' ? 'var(--rose)' : flag.severity === 'medium' ? 'var(--amber)' : 'var(--text-3)';
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium"
      style={{ background: 'var(--bg)', color, border: '1px solid var(--border)' }} title={flag.detail}>
      <span>{ICONS[flag.type]}</span>{flag.label}
    </span>
  );
}
