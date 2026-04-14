'use client';
import { motion } from 'framer-motion';

function getColor(v: number) { return v >= 70 ? 'var(--rose)' : v >= 45 ? 'var(--amber)' : 'var(--green)'; }

export default function MetricBar({ label, value, max = 100, delay = 0 }: { label: string; value: number; max?: number; delay?: number }) {
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-xs">
        <span className="font-medium" style={{ color: 'var(--text-3)' }}>{label}</span>
        <span className="font-bold" style={{ color: getColor(value) }}>{value}</span>
      </div>
      <div className="h-1.5 rounded-full" style={{ background: 'var(--bg)' }}>
        <motion.div className="h-full rounded-full" style={{ background: getColor(value) }}
          initial={{ width: 0 }} animate={{ width: `${Math.min((value / max) * 100, 100)}%` }}
          transition={{ duration: 0.8, ease: 'easeOut', delay }} />
      </div>
    </div>
  );
}
