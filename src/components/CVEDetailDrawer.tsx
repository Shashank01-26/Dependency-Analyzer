'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { VulnerabilityInfo } from '@/types';

interface Props {
  vuln: VulnerabilityInfo | null;
  onClose: () => void;
}

const SEVERITY_CFG: Record<string, { bg: string; color: string; border: string }> = {
  critical: { bg: 'rgba(255,45,85,0.16)',  color: '#FF2D55', border: 'rgba(255,45,85,0.32)'  },
  high:     { bg: 'rgba(255,69,58,0.16)',  color: '#FF453A', border: 'rgba(255,69,58,0.32)'  },
  moderate: { bg: 'rgba(255,179,64,0.16)', color: '#FFB340', border: 'rgba(255,179,64,0.32)' },
  low:      { bg: 'rgba(52,208,88,0.14)',  color: '#34D058', border: 'rgba(52,208,88,0.28)'  },
};

function cvssColor(score: number): string {
  if (score >= 9) return '#FF2D55';
  if (score >= 7) return '#FF453A';
  if (score >= 4) return '#FFB340';
  return '#34D058';
}

export default function CVEDetailDrawer({ vuln, onClose }: Props) {
  return (
    <AnimatePresence>
      {vuln && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 z-40"
            style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Dark glass drawer */}
          <motion.aside
            className="fixed right-0 top-0 h-full w-full max-w-md z-50 flex flex-col"
            style={{
              background: 'rgba(8,9,26,0.82)',
              backdropFilter: 'blur(68px) saturate(280%) brightness(0.80)',
              WebkitBackdropFilter: 'blur(68px) saturate(280%) brightness(0.80)',
              borderLeft: 'none',
              boxShadow: [
                'inset 1px 0 0 rgba(255,255,255,0.12)',
                '-8px 0 48px rgba(0,0,0,0.60)',
                '-2px 0 10px rgba(0,0,0,0.40)',
              ].join(', '),
            }}
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 32 }}
          >
            {/* Header */}
            <div
              className="flex items-start justify-between p-5"
              style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}
            >
              <div className="flex-1 min-w-0">
                {(() => {
                  const cfg = SEVERITY_CFG[vuln.severity] ?? SEVERITY_CFG.low;
                  return (
                    <div
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-3"
                      style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}
                    >
                      {vuln.severity}
                    </div>
                  );
                })()}
                <h2 style={{ fontFamily: 'var(--sans)', fontWeight: 600, fontSize: 15, color: 'var(--text-primary)', lineHeight: 1.4 }}>
                  {vuln.title}
                </h2>
                <p style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text-tertiary)', marginTop: 5, letterSpacing: '0.02em' }}>
                  {vuln.id}
                </p>
              </div>
              <button
                onClick={onClose}
                className="ml-3 flex items-center justify-center flex-shrink-0 transition-all"
                style={{
                  width: 30, height: 30, borderRadius: '50%',
                  background: 'rgba(255,255,255,0.08)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  color: 'var(--text-tertiary)',
                  fontSize: 17, lineHeight: 1, cursor: 'pointer',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.14)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-primary)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.08)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-tertiary)'; }}
                aria-label="Close"
              >
                ×
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">

              {/* CVSS score */}
              {vuln.cvss !== undefined && (
                <div
                  className="rounded-2xl p-4"
                  style={{
                    background: 'rgba(255,255,255,0.07)',
                    border: '1px solid rgba(255,255,255,0.10)',
                    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.10), 0 0 0 0.5px rgba(0,0,0,0.30)',
                  }}
                >
                  <p style={{ fontFamily: 'var(--sans)', fontSize: 10, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
                    CVSS Score
                  </p>
                  <span style={{ fontFamily: 'var(--sans)', fontSize: 36, fontWeight: 800, letterSpacing: '-0.03em', color: cvssColor(vuln.cvss) }}>
                    {vuln.cvss.toFixed(1)}
                  </span>
                  {vuln.cvssVector && (
                    <p style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--text-quaternary)', marginTop: 4, wordBreak: 'break-all', lineHeight: 1.5 }}>
                      {vuln.cvssVector}
                    </p>
                  )}
                </div>
              )}

              {/* EPSS */}
              {vuln.epss !== undefined && (
                <div
                  className="rounded-2xl p-4"
                  style={{
                    background: 'rgba(255,255,255,0.07)',
                    border: '1px solid rgba(255,255,255,0.10)',
                    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.10), 0 0 0 0.5px rgba(0,0,0,0.30)',
                  }}
                >
                  <p style={{ fontFamily: 'var(--sans)', fontSize: 10, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
                    Exploit Probability (EPSS)
                  </p>
                  <span style={{ fontFamily: 'var(--sans)', fontSize: 30, fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--text-primary)' }}>
                    {(vuln.epss * 100).toFixed(2)}%
                  </span>
                  <p style={{ fontFamily: 'var(--sans)', fontSize: 12, color: 'var(--text-tertiary)', marginTop: 4 }}>
                    Probability of exploitation in the next 30 days
                  </p>
                </div>
              )}

              {/* Fix version */}
              {vuln.fixedIn && (
                <div
                  className="rounded-2xl p-4"
                  style={{
                    background: 'rgba(52,208,88,0.12)',
                    border: '1px solid rgba(52,208,88,0.24)',
                    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08), 0 0 0 0.5px rgba(52,208,88,0.18)',
                  }}
                >
                  <p style={{ fontFamily: 'var(--sans)', fontSize: 10, fontWeight: 600, color: '#34D058', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
                    Fixed In
                  </p>
                  <p style={{ fontFamily: 'var(--mono)', fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>{vuln.fixedIn}</p>
                  <p style={{ fontFamily: 'var(--sans)', fontSize: 12, color: 'var(--text-tertiary)', marginTop: 4 }}>
                    Upgrade to this version or higher to resolve
                  </p>
                </div>
              )}

              {/* Affected range */}
              {vuln.range && (
                <div>
                  <p style={{ fontFamily: 'var(--sans)', fontSize: 10, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
                    Affected Versions
                  </p>
                  <p style={{
                    fontFamily: 'var(--mono)', fontSize: 13, color: 'var(--text-primary)',
                    background: 'rgba(255,255,255,0.07)', padding: '6px 12px', borderRadius: 8,
                    display: 'inline-block', border: '1px solid rgba(255,255,255,0.10)',
                  }}>
                    {vuln.range}
                  </p>
                </div>
              )}

              {/* Transitive path */}
              {vuln.path && vuln.path.length > 0 && (
                <div>
                  <p style={{ fontFamily: 'var(--sans)', fontSize: 10, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
                    Dependency Path
                  </p>
                  <div className="flex flex-wrap items-center gap-1">
                    {vuln.path.map((pkg, i) => (
                      <span key={i} className="flex items-center gap-1">
                        <span style={{
                          fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text-primary)',
                          background: 'rgba(255,255,255,0.08)', padding: '3px 8px', borderRadius: 6,
                          border: '1px solid rgba(255,255,255,0.12)',
                        }}>
                          {pkg}
                        </span>
                        {i < vuln.path!.length - 1 && (
                          <span style={{ color: 'var(--text-quaternary)', fontSize: 11 }}>→</span>
                        )}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Links */}
              <div style={{ paddingTop: 4 }} className="space-y-2">
                {vuln.nvdUrl && (
                  <a
                    href={vuln.nvdUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'var(--sans)', fontSize: 13, color: 'var(--accent)', fontWeight: 500, textDecoration: 'none' }}
                    onMouseEnter={e => (e.currentTarget.style.color = 'var(--accent-light)')}
                    onMouseLeave={e => (e.currentTarget.style.color = 'var(--accent)')}
                  >
                    <span style={{ fontSize: 11 }}>↗</span> View on NVD
                  </a>
                )}
                {vuln.url && vuln.url !== vuln.nvdUrl && (
                  <a
                    href={vuln.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'var(--sans)', fontSize: 13, color: 'var(--accent)', fontWeight: 500, textDecoration: 'none' }}
                    onMouseEnter={e => (e.currentTarget.style.color = 'var(--accent-light)')}
                    onMouseLeave={e => (e.currentTarget.style.color = 'var(--accent)')}
                  >
                    <span style={{ fontSize: 11 }}>↗</span> Advisory Details
                  </a>
                )}
              </div>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
