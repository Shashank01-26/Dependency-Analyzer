'use client';
import { motion } from 'framer-motion';
import { AIInsight } from '@/types';

const CFG: Record<AIInsight['type'], { icon: string; color: string; bg: string; border: string }> = {
  summary:        { icon: '📊', color: 'var(--blue)',  bg: 'rgba(120,117,255,0.14)', border: 'rgba(120,117,255,0.26)' },
  risk:           { icon: '⚠️', color: 'var(--rose)',  bg: 'rgba(255,69,58,0.14)',   border: 'rgba(255,69,58,0.28)'  },
  recommendation: { icon: '💡', color: 'var(--amber)', bg: 'rgba(255,179,64,0.14)',  border: 'rgba(255,179,64,0.28)' },
  alternative:    { icon: '🔄', color: 'var(--green)', bg: 'rgba(52,208,88,0.12)',   border: 'rgba(52,208,88,0.24)'  },
};

export default function InsightsPanel({ insights, loading }: { insights: AIInsight[]; loading?: boolean }) {
  return (
    <div className="card overflow-hidden">
      <div className="flex items-center justify-between px-6 h-16 border-b" style={{ borderColor: 'var(--border)' }}>
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-bold uppercase tracking-wide" style={{ color: 'var(--text-primary)' }}>AI Insights</h3>
          <span className="pill text-xs" style={{ background: 'rgba(120,117,255,0.18)', color: 'var(--accent-light)', border: '1px solid rgba(120,117,255,0.30)' }}>Llama 3.3</span>
        </div>
        {loading && <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full animate-pulse" style={{ background: 'var(--blue)' }} /><span className="text-sm" style={{ color: 'var(--text-3)' }}>Analyzing...</span></div>}
      </div>
      <div className="p-6 space-y-4">
        {loading && insights.length === 0 && [...Array(3)].map((_, i) => (
          <div key={i} className="card p-6"><div className="skeleton h-4 w-1/3 mb-3" /><div className="skeleton h-3 w-full mb-2" /><div className="skeleton h-3 w-2/3" /></div>
        ))}
        {insights.map((ins, i) => {
          const c = CFG[ins.type];
          return (
            <motion.div key={i} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
              className="rounded-xl p-5 transition-all hover:translate-y-[-2px] hover:shadow-lg"
              style={{ background: c.bg, border: `1px solid ${c.border}` }}>
              <div className="flex gap-4">
                <span className="text-2xl shrink-0">{c.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                    <span className="text-sm font-bold" style={{ color: c.color }}>{ins.title}</span>
                    {ins.packageName && <span className="text-xs font-medium px-2 py-0.5 rounded-md" style={{ background: 'rgba(255,255,255,0.09)', color: 'var(--text-secondary)', border: '1px solid rgba(255,255,255,0.12)' }}>{ins.packageName}</span>}
                  </div>
                  <p className="text-sm leading-relaxed" style={{ color: 'var(--text-2)' }}>{ins.description}</p>
                  {ins.alternative && (
                    <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm" style={{ background: 'rgba(52,208,88,0.14)', border: '1px solid rgba(52,208,88,0.26)' }}>
                      <span className="text-xs uppercase font-bold" style={{ color: 'var(--text-3)' }}>Try:</span>
                      <span className="font-bold" style={{ color: 'var(--green)' }}>{ins.alternative}</span>
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
