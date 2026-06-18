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
          style={{ background: '#F2F2F7' }}
          exit={{ opacity: 0, scale: 1.03 }}
          transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
        >
          {/* Soft orbs */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div style={{
              position: 'absolute', width: 700, height: 700, borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(94,92,230,0.13), transparent 62%)',
              top: -200, left: -180,
            }} />
            <div style={{
              position: 'absolute', width: 500, height: 500, borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(59,130,246,0.09), transparent 62%)',
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
              background: 'rgba(248,251,255,0.68)',
              backdropFilter: 'blur(72px) saturate(260%) brightness(1.02)',
              WebkitBackdropFilter: 'blur(72px) saturate(260%) brightness(1.02)',
              border: 'none',
              boxShadow: [
                'inset 0 1.5px 0 rgba(255,255,255,0.95)',
                'inset 0 10px 22px rgba(255,255,255,0.16)',
                '0 0 0 0.5px rgba(10,8,40,0.09)',
                '0 24px 64px rgba(10,8,40,0.14)',
                '0 6px 18px rgba(10,8,40,0.08)',
              ].join(', '),
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20,
              minWidth: 280,
              overflow: 'hidden',
            }}
          >
            {/* Gradient border overlay — simulates the ::before gradient border trick for inline elements */}
            <div style={{
              position: 'absolute', inset: 0, borderRadius: 32, pointerEvents: 'none', zIndex: 10,
              background: 'linear-gradient(135deg, rgba(255,255,255,0.96) 0%, rgba(255,255,255,0.62) 20%, rgba(255,255,255,0.22) 55%, rgba(255,255,255,0.46) 100%)',
              WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
              WebkitMaskComposite: 'xor',
              maskComposite: 'exclude',
              padding: 1,
            }} />
            {/* Inner sheen */}
            <div style={{
              position: 'absolute', top: 0, left: 0, right: 0, height: '55%', pointerEvents: 'none', zIndex: 1,
              borderRadius: '32px 32px 50% 50% / 32px 32px 20px 20px',
              background: 'linear-gradient(180deg, rgba(255,255,255,0.28) 0%, rgba(255,255,255,0.08) 40%, transparent 100%)',
            }} />
            {/* Hex prism logo mark */}
            <motion.div
              initial={{ scale: 0, rotate: -30 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.15, type: 'spring', stiffness: 240, damping: 18 }}
              style={{
                width: 72, height: 72, borderRadius: 20,
                background: 'rgba(94,92,230,0.09)',
                border: '1px solid rgba(94,92,230,0.18)',
                boxShadow: '0 8px 32px rgba(94,92,230,0.18), inset 0 1px 0 rgba(255,255,255,1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <svg viewBox="0 0 40 40" fill="none" width="38" height="38">
                <defs>
                  <linearGradient id="splHex" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
                    <stop offset="0%"   stopColor="#5E5CE6" stopOpacity="0.90"/>
                    <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.75"/>
                  </linearGradient>
                </defs>
                <path
                  d="M20 3 L34.5 11.5 L34.5 28.5 L20 37 L5.5 28.5 L5.5 11.5 Z"
                  stroke="url(#splHex)" strokeWidth="1.5" fill="rgba(94,92,230,0.07)"
                />
                <circle cx="20" cy="15" r="4.2" fill="#5E5CE6"/>
                <circle cx="20" cy="15" r="7" stroke="rgba(94,92,230,0.20)" strokeWidth="1" fill="none"/>
                <circle cx="11.5" cy="28" r="3.2" fill="#FF3B30"/>
                <circle cx="28.5" cy="28" r="3.2" fill="#34C759"/>
                <line x1="20" y1="19.2" x2="11.5" y2="24.8" stroke="rgba(15,10,46,0.22)" strokeWidth="1.5"/>
                <line x1="20" y1="19.2" x2="28.5" y2="24.8" stroke="rgba(15,10,46,0.22)" strokeWidth="1.5"/>
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
                <span style={{ color: 'rgba(15,10,46,0.82)' }}>Dep</span>
                <span style={{
                  background: 'linear-gradient(135deg, #5E5CE6, #3B82F6)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}>Scope</span>
              </p>
              <p style={{
                fontFamily: 'var(--sans)', fontWeight: 400, fontSize: 13,
                color: 'rgba(10,8,40,0.52)', marginTop: 7, letterSpacing: '0.01em',
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
                background: 'rgba(15,10,46,0.07)',
                overflow: 'hidden',
              }}>
                <motion.div
                  initial={{ width: '0%' }}
                  animate={{ width: '100%' }}
                  transition={{ delay: 0.5, duration: 1.2, ease: 'easeInOut' }}
                  style={{
                    height: '100%', borderRadius: 99,
                    background: 'linear-gradient(90deg, #5E5CE6, #818CF8, #3B82F6)',
                    boxShadow: '0 0 12px rgba(94,92,230,0.45)',
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
              color: 'rgba(10,8,40,0.46)', letterSpacing: '0.02em',
            }}
          >
            npm · Rust · Go · Python · Flutter · Android · Ruby · .NET
          </motion.p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
