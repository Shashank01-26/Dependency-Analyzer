'use client';

import { RiskLevel } from '@/types';

const BADGE_STYLES: Record<RiskLevel, string> = {
  low: 'bg-[var(--green-dim)] text-[var(--green-solid)] border-[var(--green-muted)]',
  medium: 'bg-[var(--amber-dim)] text-[var(--amber-solid)] border-[var(--amber-muted)]',
  high: 'bg-[var(--red-dim)] text-[var(--red-solid)] border-[var(--red-muted)]',
  critical: 'bg-[rgba(255,68,102,0.15)] text-[var(--red-glow)] border-[var(--red-solid)]',
};

export default function RiskBadge({ level, className = '' }: { level: RiskLevel; className?: string }) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded font-mono text-[11px] font-semibold uppercase tracking-wider border ${BADGE_STYLES[level]} ${className}`}
    >
      {level === 'critical' && (
        <span className="w-1.5 h-1.5 rounded-full bg-[var(--red-glow)] mr-1.5 animate-pulse" />
      )}
      {level}
    </span>
  );
}
