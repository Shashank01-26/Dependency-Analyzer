'use client';
import { motion } from 'framer-motion';

export default function Header() {
  return (
    <motion.header initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
      className="sticky top-0 z-30 border-b"
      style={{ borderColor: 'var(--border)', background: 'rgba(12,12,15,0.8)', backdropFilter: 'blur(16px)' }}>
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 flex items-center justify-center">
            <svg viewBox="0 0 64 64" fill="none" className="w-full h-full">
              <path d="M32 6 L52 16 V34 C52 46 42 54 32 58 C22 54 12 46 12 34 V16 Z" fill="#1a1a2e" stroke="url(#hStroke)" strokeWidth="2"/>
              <path d="M32 10 L48 18.5 V33 C48 43.5 39.5 50 32 53.5 C24.5 50 16 43.5 16 33 V18.5 Z" fill="#0c0c0f" opacity="0.85"/>
              <circle cx="32" cy="22" r="4" fill="#4f8ff7"/><circle cx="23" cy="34" r="3" fill="#30d158"/><circle cx="41" cy="34" r="3" fill="#ff453a"/>
              <line x1="32" y1="26" x2="23" y2="31" stroke="#4f8ff7" strokeWidth="1.5" opacity="0.7"/>
              <line x1="32" y1="26" x2="41" y2="31" stroke="#4f8ff7" strokeWidth="1.5" opacity="0.7"/>
              <defs><linearGradient id="hStroke" x1="12" y1="6" x2="52" y2="58"><stop stopColor="#4f8ff7" stopOpacity="0.5"/><stop offset="1" stopColor="#bf5af2" stopOpacity="0.3"/></linearGradient></defs>
            </svg>
          </div>
          <span className="text-lg font-bold text-white">DepScope</span>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold"
          style={{ background: 'rgba(48,209,88,0.1)', color: 'var(--green)' }}>
          <span className="w-2 h-2 rounded-full bg-[var(--green)] animate-pulse" />
          Online
        </div>
      </div>
    </motion.header>
  );
}
