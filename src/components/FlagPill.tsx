'use client';
import { RiskFlag } from '@/types';

const ICONS: Record<RiskFlag['type'], string> = {
  unmaintained: '⚠', vulnerable: '🔥', deprecated: '⛔', 'low-popularity': '↓',
  'deep-chain': '🔗', 'single-maintainer': '👤', stale: '⏳',
  typosquatting: '🎭', 'install-script': '⚙', 'ownership-transfer': '🔄',
  'unpinned-version': '📌', 'license-risk': '⚖',
};

const COLORS: Record<string, { color: string; bg: string; border: string }> = {
  high:    { color: '#D73027', bg: 'rgba(255,59,48,0.09)',  border: 'rgba(255,59,48,0.20)'  },
  critical:{ color: '#A8001A', bg: 'rgba(215,0,21,0.09)',   border: 'rgba(215,0,21,0.20)'   },
  medium:  { color: '#CC7700', bg: 'rgba(255,149,0,0.09)',  border: 'rgba(255,149,0,0.20)'  },
  low:     { color: 'rgba(15,10,46,0.38)', bg: 'rgba(0,0,0,0.05)', border: 'rgba(0,0,0,0.09)' },
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
