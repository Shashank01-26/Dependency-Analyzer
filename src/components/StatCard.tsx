'use client';
import { motion } from 'framer-motion';

export default function StatCard({ label, value, accent = 'var(--white)', delay = 0, icon }: {
  label: string; value: string | number; accent?: string; delay?: number; icon?: string;
}) {
  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay }}
      whileHover={{ y: -3, borderColor: 'var(--border-2)', transition: { duration: 0.2 } }}
      className="card p-5 cursor-default">
      <div className="flex items-center gap-2 mb-2">
        {icon && <span className="text-lg">{icon}</span>}
        <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-3)' }}>{label}</span>
      </div>
      <span className="text-3xl font-extrabold block" style={{ color: accent }}>{value}</span>
    </motion.div>
  );
}
