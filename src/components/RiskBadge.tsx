'use client';
import { RiskLevel } from '@/types';

const S: Record<RiskLevel, { bg: string; color: string; border: string }> = {
  low:      { bg: 'rgba(52,211,153,0.10)',  color: '#34D399', border: 'rgba(52,211,153,0.22)'  },
  medium:   { bg: 'rgba(251,191,36,0.10)',  color: '#FBBF24', border: 'rgba(251,191,36,0.22)'  },
  high:     { bg: 'rgba(248,113,113,0.10)', color: '#F87171', border: 'rgba(248,113,113,0.22)' },
  critical: { bg: 'rgba(244,63,94,0.12)',   color: '#F43F5E', border: 'rgba(244,63,94,0.26)'   },
};

export default function RiskBadge({ level }: { level: RiskLevel; className?: string }) {
  const s = S[level];
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '4px 11px', borderRadius: 999,
      background: s.bg, border: `1px solid ${s.border}`,
      fontFamily: 'var(--sans)', fontSize: 11, fontWeight: 700,
      color: s.color, textTransform: 'capitalize',
      backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
    }}>
      {level === 'critical' && (
        <span style={{ width: 5, height: 5, borderRadius: '50%', background: s.color, animation: 'pulseBlue 1.2s ease-in-out infinite' }} />
      )}
      {level}
    </span>
  );
}
