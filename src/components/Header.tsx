'use client';

import { motion } from 'framer-motion';

export default function Header() {
  return (
    <header
      className="relative z-10 border-b"
      style={{
        background: 'linear-gradient(180deg, var(--bg-elevated) 0%, var(--bg-void) 100%)',
        borderColor: 'var(--border-dim)',
      }}
    >
      <div className="max-w-[1440px] mx-auto px-6 py-4 flex items-center justify-between">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-3"
        >
          {/* Logo mark */}
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center font-mono font-bold text-sm"
            style={{
              background: 'linear-gradient(135deg, var(--cyan-solid), var(--green-solid))',
              color: 'var(--bg-void)',
            }}
          >
            DS
          </div>
          <div>
            <h1 className="font-mono text-base font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
              DepScope
            </h1>
            <p className="text-[10px] font-mono tracking-widest uppercase" style={{ color: 'var(--text-tertiary)' }}>
              Dependency Risk Analyzer
            </p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-4"
        >
          <div className="flex items-center gap-2 px-3 py-1.5 rounded" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-dim)' }}>
            <div className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--green-solid)' }} />
            <span className="text-[10px] font-mono" style={{ color: 'var(--text-tertiary)' }}>
              LIVE
            </span>
          </div>
          <span className="text-[10px] font-mono" style={{ color: 'var(--text-tertiary)' }}>
            v1.0.0
          </span>
        </motion.div>
      </div>
    </header>
  );
}
