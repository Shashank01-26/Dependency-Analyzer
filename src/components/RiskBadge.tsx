'use client';
import { RiskLevel } from '@/types';

const S: Record<RiskLevel, { bg: string; color: string; border: string }> = {
  low:      { bg: 'rgba(52,199,89,0.10)',  color: '#30A84A', border: 'rgba(52,199,89,0.22)'  },
  medium:   { bg: 'rgba(255,149,0,0.10)',  color: '#CC7700', border: 'rgba(255,149,0,0.22)'  },
  high:     { bg: 'rgba(255,59,48,0.10)',  color: '#D73027', border: 'rgba(255,59,48,0.22)'  },
  critical: { bg: 'rgba(215,0,21,0.10)',   color: '#A8001A', border: 'rgba(215,0,21,0.24)'   },
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
