'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface SplashScreenProps {
  onComplete: () => void;
}

const BOOT_LINES = [
  { text: 'DEPSCOPE v1.0.0', delay: 0 },
  { text: 'Initializing risk engine...', delay: 200 },
  { text: 'Loading vulnerability database...', delay: 500 },
  { text: 'Connecting to npm registry...', delay: 900 },
  { text: 'AI model: Llama 3.3 70B [READY]', delay: 1300 },
  { text: 'All systems operational.', delay: 1700 },
];

export default function SplashScreen({ onComplete }: SplashScreenProps) {
  const [visibleLines, setVisibleLines] = useState(0);
  const [phase, setPhase] = useState<'boot' | 'logo' | 'exit'>('boot');

  useEffect(() => {
    const timers: NodeJS.Timeout[] = [];

    BOOT_LINES.forEach((line, i) => {
      timers.push(setTimeout(() => setVisibleLines(i + 1), line.delay));
    });

    // Transition to logo phase
    timers.push(setTimeout(() => setPhase('logo'), 2200));

    // Exit
    timers.push(setTimeout(() => setPhase('exit'), 3400));
    timers.push(setTimeout(() => onComplete(), 4000));

    return () => timers.forEach(clearTimeout);
  }, [onComplete]);

  return (
    <AnimatePresence>
      {phase !== 'exit' ? (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center"
          style={{ background: '#050507' }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
        >
          {/* Radial gradient backdrop */}
          <div
            className="absolute inset-0"
            style={{
              background: 'radial-gradient(ellipse 60% 50% at 50% 50%, rgba(125,211,252,0.04) 0%, transparent 70%)',
            }}
          />

          {/* Grid overlay */}
          <div
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage:
                'linear-gradient(rgba(125,211,252,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(125,211,252,0.3) 1px, transparent 1px)',
              backgroundSize: '60px 60px',
            }}
          />

          {/* Horizontal scan line */}
          <motion.div
            className="absolute left-0 right-0 h-[1px]"
            style={{ background: 'linear-gradient(90deg, transparent, rgba(125,211,252,0.3), transparent)' }}
            initial={{ top: '0%' }}
            animate={{ top: '100%' }}
            transition={{ duration: 2.5, ease: 'linear', repeat: Infinity }}
          />

          <div className="relative z-10 w-full max-w-lg px-8">
            <AnimatePresence mode="wait">
              {phase === 'boot' && (
                <motion.div
                  key="boot"
                  exit={{ opacity: 0, y: -20, filter: 'blur(8px)' }}
                  transition={{ duration: 0.4 }}
                >
                  {/* Boot terminal */}
                  <div className="font-mono text-[11px] leading-6 space-y-0">
                    {BOOT_LINES.slice(0, visibleLines).map((line, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.2 }}
                        className="flex items-center gap-2"
                      >
                        <span style={{ color: i === 0 ? '#7dd3fc' : 'rgba(125,211,252,0.35)' }}>
                          {i === 0 ? '>' : '\u00b7'}
                        </span>
                        <span
                          style={{
                            color: i === 0 ? '#e0f2fe' : i === BOOT_LINES.length - 1 ? '#22d3ee' : 'rgba(148,163,184,0.7)',
                          }}
                        >
                          {line.text}
                        </span>
                        {i === visibleLines - 1 && i < BOOT_LINES.length - 1 && (
                          <motion.span
                            animate={{ opacity: [1, 0] }}
                            transition={{ duration: 0.5, repeat: Infinity }}
                            style={{ color: '#7dd3fc' }}
                          >
                            _
                          </motion.span>
                        )}
                      </motion.div>
                    ))}
                  </div>

                  {/* Progress bar */}
                  <div className="mt-6 h-[2px] rounded-full overflow-hidden" style={{ background: 'rgba(125,211,252,0.08)' }}>
                    <motion.div
                      className="h-full rounded-full"
                      style={{ background: 'linear-gradient(90deg, #22d3ee, #7dd3fc)' }}
                      initial={{ width: '0%' }}
                      animate={{ width: '100%' }}
                      transition={{ duration: 2, ease: [0.25, 0.1, 0.25, 1] }}
                    />
                  </div>
                </motion.div>
              )}

              {phase === 'logo' && (
                <motion.div
                  key="logo"
                  initial={{ opacity: 0, scale: 0.9, filter: 'blur(10px)' }}
                  animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
                  exit={{ opacity: 0, scale: 1.05, filter: 'blur(12px)' }}
                  transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
                  className="flex flex-col items-center text-center"
                >
                  {/* Logo mark */}
                  <motion.div
                    initial={{ rotate: -180, scale: 0 }}
                    animate={{ rotate: 0, scale: 1 }}
                    transition={{ type: 'spring', stiffness: 200, damping: 20 }}
                    className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6 relative"
                    style={{
                      background: 'linear-gradient(135deg, rgba(34,211,238,0.15), rgba(125,211,252,0.05))',
                      border: '1px solid rgba(125,211,252,0.2)',
                      boxShadow: '0 0 60px rgba(125,211,252,0.15), inset 0 1px 0 rgba(255,255,255,0.05)',
                    }}
                  >
                    <span className="font-mono text-xl font-bold" style={{ color: '#e0f2fe' }}>DS</span>
                    <div
                      className="absolute -inset-[1px] rounded-2xl"
                      style={{
                        background: 'conic-gradient(from 0deg, transparent, rgba(125,211,252,0.3), transparent)',
                        mask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
                        maskComposite: 'exclude',
                        WebkitMaskComposite: 'xor',
                        padding: '1px',
                        borderRadius: '16px',
                      }}
                    />
                  </motion.div>

                  <motion.h1
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2, duration: 0.4 }}
                    className="text-3xl font-bold tracking-tight"
                    style={{ color: '#e0f2fe', fontFamily: "'Instrument Serif', serif" }}
                  >
                    DepScope
                  </motion.h1>
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.4, duration: 0.4 }}
                    className="font-mono text-[11px] tracking-[0.3em] uppercase mt-2"
                    style={{ color: 'rgba(125,211,252,0.5)' }}
                  >
                    Dependency Risk Analyzer
                  </motion.p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
