'use client';
import { RiskLevel } from '@/types';

const S: Record<RiskLevel, { bg: string; color: string; border: string }> = {
  low:      { bg: 'rgba(52,208,88,0.13)',  color: '#34D058', border: 'rgba(52,208,88,0.26)'  },
  medium:   { bg: 'rgba(255,179,64,0.13)', color: '#FFB340', border: 'rgba(255,179,64,0.26)' },
  high:     { bg: 'rgba(255,69,58,0.15)',  color: '#FF453A', border: 'rgba(255,69,58,0.28)'  },
  critical: { bg: 'rgba(255,45,85,0.15)',  color: '#FF2D55', border: 'rgba(255,45,85,0.30)'  },
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
