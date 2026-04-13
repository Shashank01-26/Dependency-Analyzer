'use client';

import { motion } from 'framer-motion';

interface MetricBarProps {
  label: string;
  value: number;
  max?: number;
  delay?: number;
}

function getColor(value: number): string {
  if (value >= 70) return 'var(--red-1)';
  if (value >= 45) return 'var(--amber-1)';
  if (value >= 25) return 'rgba(251,191,36,0.6)';
  return 'var(--green-1)';
}

export default function MetricBar({ label, value, max = 100, delay = 0 }: MetricBarProps) {
  const pct = Math.min((value / max) * 100, 100);
  const color = getColor(value);

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="label">{label}</span>
        <span className="mono text-[11px] font-semibold" style={{ color }}>{value}</span>
      </div>
      <div className="h-[5px] rounded-full overflow-hidden" style={{ background: 'var(--border-1)' }}>
        <motion.div
          className="h-full rounded-full relative"
          style={{ background: color }}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 1, ease: [0.25, 0.1, 0.25, 1], delay }}
        >
          <div
            className="absolute inset-0 rounded-full"
            style={{ background: `linear-gradient(90deg, transparent, rgba(255,255,255,0.2))` }}
          />
        </motion.div>
      </div>
    </div>
  );
}
