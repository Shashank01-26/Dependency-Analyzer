'use client';

import { motion } from 'framer-motion';
import { RiskLevel } from '@/types';

interface ScoreRingProps {
  score: number;
  size?: number;
  strokeWidth?: number;
  riskLevel: RiskLevel;
  label?: string;
  animate?: boolean;
}

const RISK_COLORS: Record<RiskLevel, { stroke: string; glow: string; text: string }> = {
  low: { stroke: '#1acc6e', glow: 'rgba(34,255,136,0.2)', text: '#22ff88' },
  medium: { stroke: '#e09a20', glow: 'rgba(255,187,51,0.2)', text: '#ffbb33' },
  high: { stroke: '#e03050', glow: 'rgba(255,68,102,0.2)', text: '#ff4466' },
  critical: { stroke: '#ff4466', glow: 'rgba(255,68,102,0.35)', text: '#ff4466' },
};

export default function ScoreRing({
  score,
  size = 200,
  strokeWidth = 10,
  riskLevel,
  label,
  animate = true,
}: ScoreRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 100) * circumference;
  const colors = RISK_COLORS[riskLevel];

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Background track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--border-dim)"
          strokeWidth={strokeWidth}
        />
        {/* Glow layer */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={colors.glow}
          strokeWidth={strokeWidth + 8}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={animate ? { strokeDashoffset: circumference } : { strokeDashoffset: circumference - progress }}
          animate={{ strokeDashoffset: circumference - progress }}
          transition={{ duration: 1.5, ease: 'easeOut', delay: 0.3 }}
          style={{ filter: `blur(6px)` }}
        />
        {/* Main arc */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={colors.stroke}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={animate ? { strokeDashoffset: circumference } : { strokeDashoffset: circumference - progress }}
          animate={{ strokeDashoffset: circumference - progress }}
          transition={{ duration: 1.5, ease: 'easeOut', delay: 0.3 }}
        />
      </svg>
      {/* Center content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.span
          className="font-mono font-bold leading-none"
          style={{ fontSize: size * 0.28, color: colors.text }}
          initial={animate ? { opacity: 0, scale: 0.5 } : {}}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.8 }}
        >
          {score}
        </motion.span>
        {label && (
          <span
            className="font-mono text-xs tracking-widest uppercase mt-1"
            style={{ color: 'var(--text-tertiary)', fontSize: size * 0.06 }}
          >
            {label}
          </span>
        )}
      </div>
    </div>
  );
}
