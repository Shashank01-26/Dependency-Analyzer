'use client';
import { motion } from 'framer-motion';
import { RiskLevel } from '@/types';

const C: Record<RiskLevel, string> = { low: '#30d158', medium: '#ffd60a', high: '#ff453a', critical: '#ff2d55' };

export default function ScoreRing({ score, size = 180, riskLevel, label }: { score: number; size?: number; riskLevel: RiskLevel; label?: string }) {
  const r = (size - 14) / 2, c = 2 * Math.PI * r, color = C[riskLevel];
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--bg-3)" strokeWidth={7} />
        <motion.circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={7} strokeLinecap="round"
          strokeDasharray={c} initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: c - (score / 100) * c }}
          transition={{ duration: 1.5, ease: [0.25, 0.1, 0.25, 1], delay: 0.3 }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.span className="font-extrabold" style={{ fontSize: size * 0.26, color }}
          initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.8, type: 'spring', stiffness: 200 }}>{score}</motion.span>
        {label && <span className="text-xs font-semibold mt-1 uppercase tracking-wider" style={{ color: 'var(--text-3)' }}>{label}</span>}
      </div>
    </div>
  );
}
