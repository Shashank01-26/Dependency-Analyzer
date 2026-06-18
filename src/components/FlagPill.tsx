'use client';
import { RiskFlag } from '@/types';

const ICONS: Record<RiskFlag['type'], string> = {
  unmaintained: '⚠', vulnerable: '🔥', deprecated: '⛔', 'low-popularity': '↓',
  'deep-chain': '🔗', 'single-maintainer': '👤', stale: '⏳',
  typosquatting: '🎭', 'install-script': '⚙', 'ownership-transfer': '🔄',
  'unpinned-version': '📌', 'license-risk': '⚖',
};

const COLORS: Record<string, { color: string; bg: string; border: string }> = {
  high:    { color: '#F87171', bg: 'rgba(248,113,113,0.10)', border: 'rgba(248,113,113,0.22)' },
  critical:{ color: '#F43F5E', bg: 'rgba(244,63,94,0.10)',   border: 'rgba(244,63,94,0.24)'   },
  medium:  { color: '#FBBF24', bg: 'rgba(251,191,36,0.10)',  border: 'rgba(251,191,36,0.22)'  },
  low:     { color: 'rgba(255,255,255,0.36)', bg: 'rgba(255,255,255,0.05)', border: 'rgba(255,255,255,0.10)' },
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
