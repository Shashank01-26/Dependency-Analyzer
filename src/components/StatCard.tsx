'use client';

import { motion } from 'framer-motion';

interface StatCardProps {
  label: string;
  value: string | number;
  accent?: string;
  delay?: number;
  icon?: string;
}

export default function StatCard({ label, value, accent = 'var(--text-1)', delay = 0, icon }: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, filter: 'blur(6px)' }}
      animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      transition={{ duration: 0.6, delay, ease: [0.25, 0.1, 0.25, 1] }}
      whileHover={{ y: -3, transition: { duration: 0.2 } }}
      className="glass shine-top p-5 group cursor-default"
    >
      <div className="flex items-center gap-2 mb-3">
        {icon && <span className="text-base opacity-60 group-hover:opacity-100 transition-opacity">{icon}</span>}
        <span className="label">{label}</span>
      </div>
      <motion.span
        className="mono text-2xl font-bold block"
        style={{ color: accent }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: delay + 0.3 }}
      >
        {value}
      </motion.span>
      {/* Bottom accent line */}
      <motion.div
        className="absolute bottom-0 left-4 right-4 h-[1px]"
        style={{ background: `linear-gradient(90deg, transparent, ${accent}, transparent)`, opacity: 0.2 }}
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ delay: delay + 0.5, duration: 0.8 }}
      />
    </motion.div>
  );
}
