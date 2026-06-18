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
          style={{ background: '#08091A' }}
          exit={{ opacity: 0, scale: 1.04 }}
          transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
        >
          {/* Ambient orbs */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div style={{
              position: 'absolute', width: 720, height: 720, borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(90,86,230,0.62), transparent 60%)',
              top: -220, left: -200,
            }} />
            <div style={{
              position: 'absolute', width: 520, height: 520, borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(48,120,240,0.48), transparent 60%)',
              top: -120, right: -160,
            }} />
            <div style={{
              position: 'absolute', width: 420, height: 420, borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(160,80,240,0.32), transparent 60%)',
              bottom: -120, left: '30%',
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
              background: 'rgba(255,255,255,0.042)',
              backdropFilter: 'blur(68px) saturate(280%) brightness(0.72)',
              WebkitBackdropFilter: 'blur(68px) saturate(280%) brightness(0.72)',
              boxShadow: [
                'inset 0 1px 0 rgba(255,255,255,0.09)',
                'inset 0 8px 20px rgba(255,255,255,0.025)',
                '0 0 0 0.5px rgba(0,0,0,0.65)',
                '0 24px 64px rgba(0,0,0,0.55)',
                '0 6px 18px rgba(0,0,0,0.42)',
              ].join(', '),
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20,
              minWidth: 280, overflow: 'hidden',
            }}
          >
            {/* Gradient border */}
            <div style={{
              position: 'absolute', inset: 0, borderRadius: 32, pointerEvents: 'none', zIndex: 10,
              background: 'linear-gradient(140deg, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0.08) 30%, rgba(255,255,255,0.03) 60%, rgba(255,255,255,0.10) 100%)',
              WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
              WebkitMaskComposite: 'xor',
              maskComposite: 'exclude',
              padding: 1,
            }} />
            {/* Inner sheen */}
            <div style={{
              position: 'absolute', top: 0, left: 0, right: 0, height: '48%',
              pointerEvents: 'none', zIndex: 1,
              borderRadius: '32px 32px 50% 50% / 32px 32px 20px 20px',
              background: 'linear-gradient(180deg, rgba(255,255,255,0.065) 0%, rgba(255,255,255,0.018) 45%, transparent 100%)',
            }} />

            {/* Logo mark */}
            <motion.div
              initial={{ scale: 0, rotate: -30 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.15, type: 'spring', stiffness: 240, damping: 18 }}
              style={{
                width: 72, height: 72, borderRadius: 20,
                background: 'rgba(124,121,255,0.18)',
                border: '1px solid rgba(124,121,255,0.30)',
                boxShadow: '0 8px 32px rgba(124,121,255,0.28), inset 0 1px 0 rgba(255,255,255,0.16)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <svg viewBox="0 0 40 40" fill="none" width="38" height="38">
                <defs>
                  <linearGradient id="splHex" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
                    <stop offset="0%"   stopColor="#A5A3FF" stopOpacity="0.92"/>
                    <stop offset="100%" stopColor="#50AAFF" stopOpacity="0.78"/>
                  </linearGradient>
                </defs>
                <path d="M20 3 L34.5 11.5 L34.5 28.5 L20 37 L5.5 28.5 L5.5 11.5 Z"
                  stroke="url(#splHex)" strokeWidth="1.5" fill="rgba(124,121,255,0.10)" />
                <circle cx="20" cy="15" r="4.2" fill="#A5A3FF"/>
                <circle cx="20" cy="15" r="7" stroke="rgba(124,121,255,0.28)" strokeWidth="1" fill="none"/>
                <circle cx="11.5" cy="28" r="3.2" fill="#FF453A"/>
                <circle cx="28.5" cy="28" r="3.2" fill="#34D058"/>
                <line x1="20" y1="19.2" x2="11.5" y2="24.8" stroke="rgba(255,255,255,0.22)" strokeWidth="1.5"/>
                <line x1="20" y1="19.2" x2="28.5" y2="24.8" stroke="rgba(255,255,255,0.22)" strokeWidth="1.5"/>
              </svg>
            </motion.div>

            {/* Name */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              style={{ textAlign: 'center' }}
            >
              <p style={{ fontFamily: 'var(--sans)', fontWeight: 800, fontSize: 28, letterSpacing: '-0.04em', lineHeight: 1 }}>
                <span style={{ color: 'rgba(255,255,255,0.90)' }}>Dep</span>
                <span style={{
                  background: 'linear-gradient(135deg, #A5A3FF, #50AAFF)',
                  WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
                }}>Scope</span>
              </p>
              <p style={{ fontFamily: 'var(--sans)', fontWeight: 400, fontSize: 13, color: 'rgba(255,255,255,0.46)', marginTop: 7, letterSpacing: '0.01em' }}>
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
              <div style={{ height: 3, width: '100%', borderRadius: 99, background: 'rgba(255,255,255,0.09)', overflow: 'hidden' }}>
                <motion.div
                  initial={{ width: '0%' }}
                  animate={{ width: '100%' }}
                  transition={{ delay: 0.5, duration: 1.2, ease: 'easeInOut' }}
                  style={{
                    height: '100%', borderRadius: 99,
                    background: 'linear-gradient(90deg, #7C79FF, #A5A3FF, #50AAFF)',
                    boxShadow: '0 0 12px rgba(124,121,255,0.52)',
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
            style={{ marginTop: 24, fontFamily: 'var(--sans)', fontSize: 13, fontWeight: 400, color: 'rgba(255,255,255,0.36)', letterSpacing: '0.02em' }}
          >
            npm · Rust · Go · Python · Flutter · Android · Ruby · .NET
          </motion.p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
