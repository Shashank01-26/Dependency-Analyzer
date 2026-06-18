'use client';
import Link from 'next/link';
import { motion } from 'framer-motion';

export default function Header() {
  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
      className="sticky top-0 z-30"
      style={{
        background: 'rgba(242,242,247,0.82)',
        backdropFilter: 'blur(36px) saturate(180%)',
        WebkitBackdropFilter: 'blur(36px) saturate(180%)',
        borderBottom: '1px solid rgba(0,0,0,0.07)',
      }}
    >
      <div
        className="max-w-[1440px] mx-auto px-6 flex items-center justify-between"
        style={{ height: 56 }}
      >
        {/* Logo */}
        <div className="flex items-center gap-3">
          {/* Hex mark */}
          <div
            style={{
              width: 34, height: 34,
              borderRadius: 10,
              background: 'rgba(94,92,230,0.10)',
              border: '1px solid rgba(94,92,230,0.18)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 2px 12px rgba(94,92,230,0.14), inset 0 1px 0 rgba(255,255,255,0.90)',
            }}
          >
            <svg viewBox="0 0 32 32" fill="none" width="19" height="19">
              <defs>
                <linearGradient id="hdrHex" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
                  <stop offset="0%"   stopColor="#5E5CE6" stopOpacity="0.90"/>
                  <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.75"/>
                </linearGradient>
              </defs>
              <path
                d="M16 2 L28 9 L28 23 L16 30 L4 23 L4 9 Z"
                stroke="url(#hdrHex)" strokeWidth="1.4" fill="rgba(94,92,230,0.08)"
              />
              <circle cx="16" cy="12.5" r="3" fill="#5E5CE6"/>
              <circle cx="9.5"  cy="22.5" r="2.2" fill="#FF3B30"/>
              <circle cx="22.5" cy="22.5" r="2.2" fill="#34C759"/>
              <line x1="16" y1="15.5" x2="9.5"  y2="20.3" stroke="rgba(15,10,46,0.20)" strokeWidth="1.2"/>
              <line x1="16" y1="15.5" x2="22.5" y2="20.3" stroke="rgba(15,10,46,0.20)" strokeWidth="1.2"/>
            </svg>
          </div>

          {/* Wordmark */}
          <span
            style={{
              fontFamily: 'var(--sans)',
              fontWeight: 800,
              fontSize: 17,
              letterSpacing: '-0.03em',
              lineHeight: 1,
            }}
          >
            <span style={{ color: 'rgba(15,10,46,0.82)' }}>Dep</span>
            <span
              style={{
                background: 'linear-gradient(135deg, #5E5CE6, #3B82F6)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >Scope</span>
          </span>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard"
            style={{
              fontFamily: 'var(--sans)',
              fontSize: 13,
              fontWeight: 500,
              color: 'rgba(10,8,40,0.54)',
              textDecoration: 'none',
              transition: 'color 0.2s',
              letterSpacing: '-0.01em',
            }}
            onMouseEnter={e => (e.currentTarget.style.color = 'rgba(10,8,40,0.88)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'rgba(10,8,40,0.54)')}
          >
            Dashboard
          </Link>

          {/* Status pill */}
          <div
            className="flex items-center gap-2"
            style={{
              padding: '5px 13px',
              borderRadius: 999,
              background: 'rgba(52,199,89,0.10)',
              border: '1px solid rgba(52,199,89,0.22)',
              fontFamily: 'var(--sans)',
              fontSize: 12,
              fontWeight: 600,
              color: '#30A84A',
              letterSpacing: '-0.01em',
            }}
          >
            <span
              className="live-dot"
              style={{ width: 5, height: 5, borderRadius: '50%', background: '#34C759', flexShrink: 0 }}
            />
            Online
          </div>
        </div>
      </div>
    </motion.header>
  );
}
