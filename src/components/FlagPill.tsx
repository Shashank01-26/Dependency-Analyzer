'use client';
import { RiskFlag } from '@/types';

const ICONS: Record<RiskFlag['type'], string> = {
  unmaintained: '⚠', vulnerable: '🔥', deprecated: '⛔', 'low-popularity': '↓',
  'deep-chain': '🔗', 'single-maintainer': '👤', stale: '⏳',
  typosquatting: '🎭', 'install-script': '⚙', 'ownership-transfer': '🔄',
  'unpinned-version': '📌', 'license-risk': '⚖',
};

const COLORS: Record<string, { color: string; bg: string; border: string }> = {
  high:    { color: '#FF453A', bg: 'rgba(255,69,58,0.14)',  border: 'rgba(255,69,58,0.28)'  },
  critical:{ color: '#FF2D55', bg: 'rgba(255,45,85,0.14)',  border: 'rgba(255,45,85,0.28)'  },
  medium:  { color: '#FFB340', bg: 'rgba(255,179,64,0.14)', border: 'rgba(255,179,64,0.28)' },
  low:     { color: 'rgba(255,255,255,0.56)', bg: 'rgba(255,255,255,0.07)', border: 'rgba(255,255,255,0.14)' },
};

export default function FlagPill({ flag }: { flag: RiskFlag }) {
  const isNeutral = flag.type === 'low-popularity';
  const key = isNeutral ? 'low' : flag.severity ?? 'low';
  const { color, bg, border } = COLORS[key] ?? COLORS.low;

  return (
    <span
      title={flag.detail}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 5,
        padding: '4px 10px', borderRadius: 999,
        background: bg, border: `1px solid ${border}`,
        fontFamily: 'var(--sans)', fontSize: 11, fontWeight: 600, color,
        letterSpacing: '0.01em', whiteSpace: 'nowrap',
        backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
      }}
    >
      <span style={{ fontSize: 11 }}>{ICONS[flag.type]}</span>
      {flag.label}
    </span>
  );
}
