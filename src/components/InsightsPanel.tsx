'use client';

import { motion } from 'framer-motion';
import { AIInsight } from '@/types';

const TYPE_CONFIG: Record<AIInsight['type'], { icon: string; accent: string; bg: string; border: string }> = {
  summary: { icon: '\u25c8', accent: 'var(--cyan-1)', bg: 'var(--cyan-3)', border: 'rgba(34,211,238,0.15)' },
  risk: { icon: '\u25b2', accent: 'var(--red-1)', bg: 'var(--red-3)', border: 'rgba(248,113,113,0.15)' },
  recommendation: { icon: '\u2192', accent: 'var(--amber-1)', bg: 'var(--amber-3)', border: 'rgba(251,191,36,0.15)' },
  alternative: { icon: '\u21bb', accent: 'var(--green-1)', bg: 'var(--green-3)', border: 'rgba(74,222,128,0.15)' },
};

export default function InsightsPanel({ insights, loading }: { insights: AIInsight[]; loading?: boolean }) {
  return (
    <div className="glass-lg shine-top overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: 'var(--border-1)' }}>
        <div className="flex items-center gap-3">
          <h3 className="label" style={{ fontSize: 11 }}>AI Insights</h3>
          <span className="mono text-[9px] px-2 py-0.5 rounded-md" style={{ background: 'var(--cyan-3)', color: 'var(--cyan-1)', border: '1px solid rgba(34,211,238,0.15)' }}>
            GEMMA 3
          </span>
        </div>
        {loading && (
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping" style={{ background: 'var(--cyan-1)' }} />
              <span className="relative inline-flex rounded-full h-2 w-2" style={{ background: 'var(--cyan-1)' }} />
            </span>
            <span className="mono text-[10px]" style={{ color: 'var(--text-3)' }}>Analyzing...</span>
          </div>
        )}
      </div>

      <div className="p-5 space-y-3">
        {/* Loading skeletons */}
        {loading && insights.length === 0 && (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="rounded-xl p-5" style={{ background: 'var(--surface)', border: '1px solid var(--border-1)' }}>
                <div className="shimmer-line h-3 rounded w-1/3 mb-3" />
                <div className="shimmer-line h-2 rounded w-full mb-2" />
                <div className="shimmer-line h-2 rounded w-2/3" />
              </div>
            ))}
          </div>
        )}

        {insights.map((insight, i) => {
          const cfg = TYPE_CONFIG[insight.type];
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 12, filter: 'blur(4px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              transition={{ delay: i * 0.08, duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
              className="rounded-xl p-5 hover-lift"
              style={{ background: cfg.bg, border: `1px solid ${cfg.border}` }}
            >
              <div className="flex items-start gap-3">
                {/* Icon */}
                <span
                  className="mono text-sm font-bold flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center mt-0.5"
                  style={{ background: 'rgba(0,0,0,0.2)', color: cfg.accent }}
                >
                  {cfg.icon}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="mono text-[12px] font-semibold" style={{ color: cfg.accent }}>
                      {insight.title}
                    </span>
                    {insight.packageName && (
                      <span className="mono text-[9px] px-1.5 py-0.5 rounded" style={{ background: 'rgba(0,0,0,0.2)', color: 'var(--text-3)' }}>
                        {insight.packageName}
                      </span>
                    )}
                  </div>
                  <p className="text-[12px] leading-relaxed" style={{ color: 'var(--text-2)', fontFamily: 'var(--font-body)' }}>
                    {insight.description}
                  </p>
                  {insight.alternative && (
                    <div className="mt-2.5 flex items-center gap-2 px-3 py-1.5 rounded-lg w-fit" style={{ background: 'rgba(0,0,0,0.2)' }}>
                      <span className="mono text-[9px] uppercase tracking-wider" style={{ color: 'var(--text-3)' }}>Try:</span>
                      <span className="mono text-[11px] font-semibold" style={{ color: 'var(--green-1)' }}>{insight.alternative}</span>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
