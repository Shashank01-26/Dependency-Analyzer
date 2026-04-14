'use client';
import { RiskLevel } from '@/types';

const S: Record<RiskLevel, { bg: string; color: string }> = {
  low: { bg: 'rgba(48,209,88,0.12)', color: 'var(--green)' },
  medium: { bg: 'rgba(255,214,10,0.12)', color: 'var(--amber)' },
  high: { bg: 'rgba(255,69,58,0.12)', color: 'var(--rose)' },
  critical: { bg: 'rgba(255,45,85,0.15)', color: '#ff2d55' },
};

export default function RiskBadge({ level }: { level: RiskLevel; className?: string }) {
  const s = S[level];
  return (
    <span className="pill" style={{ background: s.bg, color: s.color, textTransform: 'uppercase', fontSize: 11, fontWeight: 700, letterSpacing: '0.04em' }}>
      {level === 'critical' && <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: s.color }} />}
      {level}
    </span>
  );
}
