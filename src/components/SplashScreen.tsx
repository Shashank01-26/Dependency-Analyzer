'use client';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const LINES = ['DEPSCOPE v1.0', 'Loading risk engine...', 'Connecting to npm...', 'AI: Llama 3.3 70B [OK]', 'Ready.'];

export default function SplashScreen({ onComplete }: { onComplete: () => void }) {
  const [n, setN] = useState(0);
  const [phase, setPhase] = useState<'boot' | 'logo' | 'done'>('boot');

  useEffect(() => {
    const t: NodeJS.Timeout[] = [];
    LINES.forEach((_, i) => t.push(setTimeout(() => setN(i + 1), i * 280)));
    t.push(setTimeout(() => setPhase('logo'), 1600));
    t.push(setTimeout(() => setPhase('done'), 2800));
    t.push(setTimeout(onComplete, 3300));
    return () => t.forEach(clearTimeout);
  }, [onComplete]);

  return (
    <AnimatePresence>
      {phase !== 'done' && (
        <motion.div className="fixed inset-0 z-[100] flex items-center justify-center" style={{ background: 'var(--bg)' }}
          exit={{ opacity: 0 }} transition={{ duration: 0.4 }}>
          {/* Animated gradient orb */}
          <motion.div className="absolute w-[500px] h-[500px] rounded-full opacity-30 blur-[100px]"
            style={{ background: 'linear-gradient(135deg, var(--blue), var(--violet))' }}
            animate={{ scale: [1, 1.2, 1], rotate: [0, 180, 360] }}
            transition={{ duration: 8, repeat: Infinity, ease: 'linear' }} />

          <div className="relative z-10 w-full max-w-sm px-8">
            <AnimatePresence mode="wait">
              {phase === 'boot' && (
                <motion.div key="boot" exit={{ opacity: 0, y: -10 }} className="space-y-1.5">
                  {LINES.slice(0, n).map((line, i) => (
                    <motion.p key={i} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }}
                      className="font-mono text-sm" style={{ color: i === 0 ? 'var(--blue)' : i === LINES.length - 1 ? 'var(--green)' : 'var(--text-3)' }}>
                      {i === 0 ? '▸ ' : '  '}{line}
                    </motion.p>
                  ))}
                  <div className="mt-5 h-1 rounded-full overflow-hidden" style={{ background: 'var(--bg-3)' }}>
                    <motion.div className="h-full rounded-full" style={{ background: 'linear-gradient(90deg, var(--blue), var(--violet))' }}
                      initial={{ width: 0 }} animate={{ width: '100%' }} transition={{ duration: 1.4, ease: 'easeOut' }} />
                  </div>
                </motion.div>
              )}
              {phase === 'logo' && (
                <motion.div key="logo" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 1.05 }} className="text-center">
                  <motion.div initial={{ rotate: -90, scale: 0 }} animate={{ rotate: 0, scale: 1 }}
                    transition={{ type: 'spring', stiffness: 180, damping: 14 }}
                    className="w-20 h-20 mx-auto mb-5 flex items-center justify-center">
                    {/* Shield + dependency tree icon */}
                    <svg viewBox="0 0 64 64" fill="none" className="w-full h-full drop-shadow-[0_0_20px_rgba(79,143,247,0.4)]">
                      <path d="M32 6 L52 16 V34 C52 46 42 54 32 58 C22 54 12 46 12 34 V16 Z"
                        fill="url(#splashShield)" stroke="url(#splashStroke)" strokeWidth="1.5"/>
                      <path d="M32 10 L48 18.5 V33 C48 43.5 39.5 50 32 53.5 C24.5 50 16 43.5 16 33 V18.5 Z"
                        fill="#0c0c0f" opacity="0.85"/>
                      <circle cx="32" cy="22" r="4" fill="url(#splashNode)"/>
                      <circle cx="23" cy="34" r="3" fill="#30d158"/>
                      <circle cx="41" cy="34" r="3" fill="#ff453a"/>
                      <circle cx="32" cy="44" r="2.5" fill="#ffd60a"/>
                      <line x1="32" y1="26" x2="23" y2="31" stroke="#4f8ff7" strokeWidth="1.2" opacity="0.7"/>
                      <line x1="32" y1="26" x2="41" y2="31" stroke="#4f8ff7" strokeWidth="1.2" opacity="0.7"/>
                      <line x1="23" y1="37" x2="32" y2="41.5" stroke="#4f8ff7" strokeWidth="1" opacity="0.5"/>
                      <line x1="41" y1="37" x2="32" y2="41.5" stroke="#4f8ff7" strokeWidth="1" opacity="0.5"/>
                      <circle cx="32" cy="22" r="6" fill="none" stroke="#4f8ff7" strokeWidth="0.8" opacity="0.3"/>
                      <defs>
                        <linearGradient id="splashShield" x1="12" y1="6" x2="52" y2="58">
                          <stop stopColor="#1a1a2e"/><stop offset="1" stopColor="#0c0c0f"/>
                        </linearGradient>
                        <linearGradient id="splashStroke" x1="12" y1="6" x2="52" y2="58">
                          <stop stopColor="#4f8ff7" stopOpacity="0.6"/>
                          <stop offset="0.5" stopColor="#bf5af2" stopOpacity="0.4"/>
                          <stop offset="1" stopColor="#32d6e2" stopOpacity="0.3"/>
                        </linearGradient>
                        <linearGradient id="splashNode" x1="28" y1="18" x2="36" y2="26">
                          <stop stopColor="#4f8ff7"/><stop offset="1" stopColor="#6366f1"/>
                        </linearGradient>
                      </defs>
                    </svg>
                  </motion.div>
                  <h1 className="text-3xl font-extrabold text-white">DepScope</h1>
                  <p className="text-sm mt-2" style={{ color: 'var(--text-3)' }}>Dependency Risk Analyzer</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
