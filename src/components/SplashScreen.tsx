'use client';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function SplashScreen({ onComplete }: { onComplete: () => void }) {
  const [phase, setPhase] = useState<'enter' | 'hold' | 'exit'>('enter');

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('hold'), 400);
    const t2 = setTimeout(() => setPhase('exit'), 2000);
    const t3 = setTimeout(onComplete, 2500);
    return () => [t1, t2, t3].forEach(clearTimeout);
  }, [onComplete]);

  return (
    <AnimatePresence>
      {phase !== 'exit' && (
        <motion.div
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center"
          style={{ background: '#080312' }}
          exit={{ opacity: 0, scale: 1.03 }}
          transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
        >
          {/* Calm orbs */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div style={{
              position: 'absolute', width: 700, height: 700, borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(79,70,229,0.22), transparent 62%)',
              top: -200, left: -180,
            }} />
            <div style={{
              position: 'absolute', width: 500, height: 500, borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(56,189,248,0.12), transparent 62%)',
              top: -100, right: -150,
            }} />
          </div>

          {/* Glass card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.88, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.55, ease: [0.34, 1.4, 0.64, 1] }}
            style={{
              position: 'relative',
              padding: '48px 56px',
              borderRadius: 32,
              background: 'rgba(10, 9, 22, 0.90)',
              backdropFilter: 'blur(48px) saturate(180%)',
              WebkitBackdropFilter: 'blur(48px) saturate(180%)',
              border: '1px solid rgba(255,255,255,0.10)',
              boxShadow: '0 32px 80px rgba(0,0,0,0.56), 0 0 0 1px rgba(99,102,241,0.10), inset 0 1px 0 rgba(255,255,255,0.09)',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20,
              minWidth: 280,
            }}
          >
            {/* Hex prism logo mark */}
            <motion.div
              initial={{ scale: 0, rotate: -30 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.15, type: 'spring', stiffness: 240, damping: 18 }}
              style={{
                width: 72, height: 72, borderRadius: 20,
                background: 'rgba(99,102,241,0.14)',
                border: '1px solid rgba(129,140,248,0.24)',
                boxShadow: '0 8px 32px rgba(99,102,241,0.24), inset 0 1px 0 rgba(255,255,255,0.12)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <svg viewBox="0 0 40 40" fill="none" width="38" height="38">
                <defs>
                  <linearGradient id="splHex" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
                    <stop offset="0%"   stopColor="#818CF8" stopOpacity="0.75"/>
                    <stop offset="100%" stopColor="#60A5FA" stopOpacity="0.60"/>
                  </linearGradient>
                </defs>
                {/* Hexagon outline */}
                <path
                  d="M20 3 L34.5 11.5 L34.5 28.5 L20 37 L5.5 28.5 L5.5 11.5 Z"
                  stroke="url(#splHex)" strokeWidth="1.5" fill="rgba(99,102,241,0.07)"
                />
                {/* Center node */}
                <circle cx="20" cy="15" r="4.2" fill="#818CF8"/>
                {/* Halo */}
                <circle cx="20" cy="15" r="7" stroke="rgba(129,140,248,0.20)" strokeWidth="1" fill="none"/>
                {/* Leaf nodes */}
                <circle cx="11.5" cy="28" r="3.2" fill="#F87171"/>
                <circle cx="28.5" cy="28" r="3.2" fill="#34D399"/>
                {/* Edges */}
                <line x1="20" y1="19.2" x2="11.5" y2="24.8" stroke="rgba(255,255,255,0.30)" strokeWidth="1.5"/>
                <line x1="20" y1="19.2" x2="28.5" y2="24.8" stroke="rgba(255,255,255,0.30)" strokeWidth="1.5"/>
              </svg>
            </motion.div>

            {/* Name */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              style={{ textAlign: 'center' }}
            >
              <p style={{
                fontFamily: 'var(--sans)', fontWeight: 800, fontSize: 28,
                letterSpacing: '-0.04em', lineHeight: 1,
              }}>
                <span style={{ color: 'rgba(255,255,255,0.88)' }}>Dep</span>
                <span style={{
                  background: 'linear-gradient(135deg, #818CF8, #60A5FA)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}>Scope</span>
              </p>
              <p style={{
                fontFamily: 'var(--sans)', fontWeight: 400, fontSize: 13,
                color: 'rgba(255,255,255,0.36)', marginTop: 7, letterSpacing: '0.01em',
              }}>
                Dependency Risk Analyzer
              </p>
            </motion.div>

            {/* Progress bar */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              style={{ width: '100%' }}
            >
              <div style={{
                height: 3, width: '100%', borderRadius: 99,
                background: 'rgba(255,255,255,0.07)',
                overflow: 'hidden',
              }}>
                <motion.div
                  initial={{ width: '0%' }}
                  animate={{ width: '100%' }}
                  transition={{ delay: 0.5, duration: 1.2, ease: 'easeInOut' }}
                  style={{
                    height: '100%', borderRadius: 99,
                    background: 'linear-gradient(90deg, #6366F1, #818CF8, #60A5FA)',
                    boxShadow: '0 0 12px rgba(99,102,241,0.55)',
                  }}
                />
              </div>
            </motion.div>
          </motion.div>

          {/* Tagline */}
          <motion.p
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            style={{
              marginTop: 24,
              fontFamily: 'var(--sans)', fontSize: 13, fontWeight: 400,
              color: 'rgba(255,255,255,0.26)', letterSpacing: '0.02em',
            }}
          >
            npm · Rust · Go · Python · Flutter · Android · Ruby · .NET
          </motion.p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
