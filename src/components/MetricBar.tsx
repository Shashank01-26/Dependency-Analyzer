'use client';

import { motion } from 'framer-motion';

interface MetricBarProps {
  label: string;
  value: number;
  max?: number;
  delay?: number;
}

function getBarColor(value: number): string {
  if (value >= 70) return 'var(--red-solid)';
  if (value >= 45) return 'var(--amber-solid)';
  if (value >= 25) return 'var(--amber-muted)';
  return 'var(--green-solid)';
}

export default function MetricBar({ label, value, max = 100, delay = 0 }: MetricBarProps) {
  const pct = Math.min((value / max) * 100, 100);

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-mono uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>
          {label}
        </span>
        <span className="text-[11px] font-mono font-semibold" style={{ color: 'var(--text-secondary)' }}>
          {value}
        </span>
      </div>
      <div className="h-1.5 rounded-full" style={{ background: 'var(--bg-panel)' }}>
        <motion.div
          className="h-full rounded-full"
          style={{ background: getBarColor(value) }}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: 'easeOut', delay }}
        />
      </div>
    </div>
  );
}
