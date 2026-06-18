'use client';
import { motion } from 'framer-motion';

export default function StatCard({ label, value, accent = 'rgba(255,255,255,0.94)', delay = 0 }: {
  label: string; value: string | number; accent?: string; delay?: number; icon?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay, ease: [0.25, 0.1, 0.25, 1] }}
      className="glass-cell"
      style={{ padding: 20, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: 100 }}
    >
      <span className="cell-label">{label}</span>
      <span className="cell-number cell-number-md" style={{ color: accent, marginTop: 10 }}>{value}</span>
    </motion.div>
  );
}
