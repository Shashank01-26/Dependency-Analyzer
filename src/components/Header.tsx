'use client';

import { motion } from 'framer-motion';

export default function Header() {
  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
      className="relative z-20 border-b"
      style={{ borderColor: 'var(--border-1)', background: 'rgba(5,5,7,0.6)', backdropFilter: 'blur(16px)' }}
    >
      <div className="max-w-[1440px] mx-auto px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          {/* Logo */}
          <motion.div
            whileHover={{ scale: 1.05, rotate: 2 }}
            transition={{ type: 'spring', stiffness: 400, damping: 20 }}
            className="w-9 h-9 rounded-xl flex items-center justify-center relative"
            style={{
              background: 'linear-gradient(135deg, rgba(34,211,238,0.12), rgba(125,211,252,0.04))',
              border: '1px solid rgba(125,211,252,0.15)',
              boxShadow: '0 0 24px rgba(34,211,238,0.08)',
            }}
          >
            <span className="mono text-sm font-bold" style={{ color: 'var(--text-1)' }}>DS</span>
          </motion.div>

          <div>
            <h1 className="text-lg font-semibold tracking-tight" style={{ fontFamily: 'var(--font-display)', color: 'var(--text-1)' }}>
              DepScope
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-5">
          {/* Status indicator */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full"
            style={{ background: 'var(--green-3)', border: '1px solid rgba(74,222,128,0.15)' }}
          >
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping" style={{ background: 'var(--green-1)' }} />
              <span className="relative inline-flex rounded-full h-2 w-2" style={{ background: 'var(--green-1)' }} />
            </span>
            <span className="mono text-[10px] font-medium" style={{ color: 'var(--green-1)' }}>
              Systems Online
            </span>
          </motion.div>

          <span className="mono text-[10px]" style={{ color: 'var(--text-ghost)' }}>v1.0</span>
        </div>
      </div>
    </motion.header>
  );
}
