'use client';

import { RiskLevel } from '@/types';

const STYLES: Record<RiskLevel, { bg: string; text: string; border: string }> = {
  low: { bg: 'var(--green-3)', text: 'var(--green-1)', border: 'rgba(74,222,128,0.2)' },
  medium: { bg: 'var(--amber-3)', text: 'var(--amber-1)', border: 'rgba(251,191,36,0.2)' },
  high: { bg: 'var(--red-3)', text: 'var(--red-1)', border: 'rgba(248,113,113,0.2)' },
  critical: { bg: 'rgba(255,107,107,0.12)', text: '#ff6b6b', border: 'rgba(255,107,107,0.25)' },
};

export default function RiskBadge({ level, className = '' }: { level: RiskLevel; className?: string }) {
  const s = STYLES[level];
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-md mono text-[10px] font-semibold uppercase tracking-wider border ${className}`}
      style={{ background: s.bg, color: s.text, borderColor: s.border }}
    >
      {level === 'critical' && (
        <span className="relative flex h-1.5 w-1.5 mr-1.5">
          <span className="absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping" style={{ background: s.text }} />
          <span className="relative inline-flex rounded-full h-1.5 w-1.5" style={{ background: s.text }} />
        </span>
      )}
      {level}
    </span>
  );
}
