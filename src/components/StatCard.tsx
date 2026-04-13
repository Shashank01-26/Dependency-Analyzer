'use client';

import { motion } from 'framer-motion';

interface StatCardProps {
  label: string;
  value: string | number;
  accent?: string;
  delay?: number;
  icon?: string;
}

export default function StatCard({ label, value, accent = 'var(--text-primary)', delay = 0, icon }: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      className="panel-inner p-4"
    >
      <div className="flex items-center gap-2 mb-2">
        {icon && <span className="text-sm">{icon}</span>}
        <span className="text-[10px] font-mono uppercase tracking-widest" style={{ color: 'var(--text-tertiary)' }}>
          {label}
        </span>
      </div>
      <span className="text-2xl font-mono font-bold" style={{ color: accent }}>
        {value}
      </span>
    </motion.div>
  );
}
