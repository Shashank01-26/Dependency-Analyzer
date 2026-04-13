'use client';

import { motion } from 'framer-motion';
import { AIInsight } from '@/types';

const TYPE_STYLES: Record<AIInsight['type'], { icon: string; accent: string; bg: string; border: string }> = {
  summary: {
    icon: '\ud83d\udcca',
    accent: 'var(--cyan-solid)',
    bg: 'var(--cyan-dim)',
    border: 'var(--cyan-muted)',
  },
  risk: {
    icon: '\u26a0\ufe0f',
    accent: 'var(--red-solid)',
    bg: 'var(--red-dim)',
    border: 'var(--red-muted)',
  },
  recommendation: {
    icon: '\ud83d\udca1',
    accent: 'var(--amber-solid)',
    bg: 'var(--amber-dim)',
    border: 'var(--amber-muted)',
  },
  alternative: {
    icon: '\ud83d\udd04',
    accent: 'var(--green-solid)',
    bg: 'var(--green-dim)',
    border: 'var(--green-muted)',
  },
};

interface InsightsPanelProps {
  insights: AIInsight[];
  loading?: boolean;
}

export default function InsightsPanel({ insights, loading }: InsightsPanelProps) {
  return (
    <div className="panel overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: 'var(--border-dim)' }}>
        <div className="flex items-center gap-2">
          <h3 className="font-mono text-sm font-semibold tracking-wider uppercase" style={{ color: 'var(--text-secondary)' }}>
            AI Insights
          </h3>
          <span className="px-2 py-0.5 text-[9px] font-mono rounded" style={{
            background: 'var(--cyan-dim)',
            color: 'var(--cyan-solid)',
            border: '1px solid var(--cyan-muted)',
          }}>
            GEMMA 2
          </span>
        </div>
        {loading && (
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: 'var(--cyan-solid)' }} />
            <span className="text-[11px] font-mono" style={{ color: 'var(--text-tertiary)' }}>Analyzing...</span>
          </div>
        )}
      </div>

      <div className="p-4 space-y-3">
        {loading && insights.length === 0 && (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="rounded-lg p-4 animate-pulse" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-dim)' }}>
                <div className="h-3 rounded w-1/3 mb-3" style={{ background: 'var(--border-subtle)' }} />
                <div className="h-2 rounded w-full mb-2" style={{ background: 'var(--border-dim)' }} />
                <div className="h-2 rounded w-2/3" style={{ background: 'var(--border-dim)' }} />
              </div>
            ))}
          </div>
        )}

        {insights.map((insight, i) => {
          const style = TYPE_STYLES[insight.type];
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="rounded-lg p-4"
              style={{
                background: style.bg,
                border: `1px solid ${style.border}`,
              }}
            >
              <div className="flex items-start gap-3">
                <span className="text-lg flex-shrink-0 mt-0.5">{style.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-xs font-semibold" style={{ color: style.accent }}>
                      {insight.title}
                    </span>
                    {insight.packageName && (
                      <span className="px-1.5 py-0.5 text-[9px] font-mono rounded" style={{
                        background: 'var(--bg-panel)',
                        color: 'var(--text-tertiary)',
                        border: '1px solid var(--border-dim)',
                      }}>
                        {insight.packageName}
                      </span>
                    )}
                  </div>
                  <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                    {insight.description}
                  </p>
                  {insight.alternative && (
                    <div className="mt-2 flex items-center gap-1.5">
                      <span className="text-[10px] font-mono" style={{ color: 'var(--text-tertiary)' }}>
                        Try:
                      </span>
                      <span className="font-mono text-[11px] font-semibold" style={{ color: 'var(--green-solid)' }}>
                        {insight.alternative}
                      </span>
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
