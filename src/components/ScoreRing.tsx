'use client';

import { motion } from 'framer-motion';
import { RiskLevel } from '@/types';

interface ScoreRingProps {
  score: number;
  size?: number;
  strokeWidth?: number;
  riskLevel: RiskLevel;
  label?: string;
}

const RISK_PALETTE: Record<RiskLevel, { main: string; glow: string; bg: string }> = {
  low: { main: '#4ade80', glow: 'rgba(74,222,128,0.25)', bg: 'rgba(74,222,128,0.06)' },
  medium: { main: '#fbbf24', glow: 'rgba(251,191,36,0.25)', bg: 'rgba(251,191,36,0.06)' },
  high: { main: '#f87171', glow: 'rgba(248,113,113,0.25)', bg: 'rgba(248,113,113,0.06)' },
  critical: { main: '#ff6b6b', glow: 'rgba(255,107,107,0.35)', bg: 'rgba(255,107,107,0.08)' },
};

export default function ScoreRing({
  score,
  size = 200,
  strokeWidth = 8,
  riskLevel,
  label,
}: ScoreRingProps) {
  const radius = (size - strokeWidth * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 100) * circumference;
  const palette = RISK_PALETTE[riskLevel];

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      {/* Outer glow pulse */}
      <motion.div
        className="absolute rounded-full"
        style={{
          width: size + 20,
          height: size + 20,
          background: `radial-gradient(circle, ${palette.glow}, transparent 70%)`,
        }}
        animate={{ scale: [1, 1.08, 1], opacity: [0.5, 0.8, 0.5] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
      />

      <svg width={size} height={size} className="transform -rotate-90 relative z-10">
        {/* Background track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--border-1)"
          strokeWidth={strokeWidth}
        />
        {/* Track tick marks */}
        {Array.from({ length: 40 }).map((_, i) => {
          const angle = (i / 40) * 360;
          const rad = (angle * Math.PI) / 180;
          const inner = radius - strokeWidth;
          const outer = radius - strokeWidth / 2;
          return (
            <line
              key={i}
              x1={size / 2 + Math.cos(rad) * inner}
              y1={size / 2 + Math.sin(rad) * inner}
              x2={size / 2 + Math.cos(rad) * outer}
              y2={size / 2 + Math.sin(rad) * outer}
              stroke="var(--border-2)"
              strokeWidth={i % 5 === 0 ? 1.5 : 0.5}
              opacity={i % 5 === 0 ? 0.5 : 0.2}
            />
          );
        })}
        {/* Glow layer */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={palette.glow}
          strokeWidth={strokeWidth + 12}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: circumference - progress }}
          transition={{ duration: 2, ease: [0.25, 0.1, 0.25, 1], delay: 0.5 }}
          style={{ filter: 'blur(8px)' }}
        />
        {/* Main arc */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={palette.main}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: circumference - progress }}
          transition={{ duration: 2, ease: [0.25, 0.1, 0.25, 1], delay: 0.5 }}
        />
      </svg>

      {/* Center content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center z-20">
        <motion.span
          className="mono font-bold leading-none"
          style={{ fontSize: size * 0.3, color: palette.main }}
          initial={{ opacity: 0, scale: 0.3, filter: 'blur(10px)' }}
          animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
          transition={{ duration: 0.8, delay: 1.2, ease: [0.25, 0.1, 0.25, 1] }}
        >
          {score}
        </motion.span>
        {label && (
          <motion.span
            className="label mt-1"
            style={{ fontSize: size * 0.05 }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.5 }}
          >
            {label}
          </motion.span>
        )}
      </div>
    </div>
  );
}
