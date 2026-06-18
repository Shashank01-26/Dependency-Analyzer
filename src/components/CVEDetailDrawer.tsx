'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { VulnerabilityInfo } from '@/types';

interface Props {
  vuln: VulnerabilityInfo | null;
  onClose: () => void;
}

const SEVERITY_CFG: Record<string, { bg: string; color: string; border: string }> = {
  critical: { bg: 'rgba(197,0,10,0.08)',  color: '#C5000A', border: 'rgba(197,0,10,0.22)'  },
  high:     { bg: 'rgba(255,59,48,0.08)', color: '#D73027', border: 'rgba(255,59,48,0.22)' },
  moderate: { bg: 'rgba(255,149,0,0.08)', color: '#B36200', border: 'rgba(255,149,0,0.22)' },
  low:      { bg: 'rgba(52,199,89,0.08)', color: '#28904A', border: 'rgba(52,199,89,0.22)' },
};

function cvssColor(score: number): string {
  if (score >= 9) return '#C5000A';
  if (score >= 7) return '#D73027';
  if (score >= 4) return '#B36200';
  return '#28904A';
}

export default function CVEDetailDrawer({ vuln, onClose }: Props) {
  return (
    <AnimatePresence>
      {vuln && (
        <>
          {/* Backdrop — frosted, not black */}
          <motion.div
            className="fixed inset-0 z-40"
            style={{ background: 'rgba(10,8,40,0.24)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Drawer — iOS glass panel */}
          <motion.aside
            className="fixed right-0 top-0 h-full w-full max-w-md z-50 flex flex-col"
            style={{
              background: 'rgba(245,246,252,0.94)',
              backdropFilter: 'blur(60px) saturate(200%) brightness(1.01)',
              WebkitBackdropFilter: 'blur(60px) saturate(200%) brightness(1.01)',
              borderLeft: '1px solid rgba(255,255,255,0.70)',
              boxShadow: '-8px 0 48px rgba(10,8,40,0.14), -2px 0 10px rgba(10,8,40,0.08), inset 1px 0 0 rgba(255,255,255,0.60)',
            }}
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 32 }}
          >
            {/* Header */}
            <div
              className="flex items-start justify-between p-5"
              style={{ borderBottom: '1px solid rgba(10,8,40,0.08)' }}
            >
              <div className="flex-1 min-w-0">
                {/* Severity badge */}
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
                  background: 'rgba(10,8,40,0.07)',
                  border: '1px solid rgba(10,8,40,0.09)',
                  color: 'var(--text-tertiary)',
                  fontSize: 17, lineHeight: 1,
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(10,8,40,0.12)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-primary)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(10,8,40,0.07)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-tertiary)'; }}
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
                    background: 'rgba(255,255,255,0.70)',
                    border: '1px solid rgba(255,255,255,0.72)',
                    boxShadow: 'inset 0 1.5px 0 rgba(255,255,255,0.90), 0 0 0 0.5px rgba(10,8,40,0.08)',
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
                    background: 'rgba(255,255,255,0.70)',
                    border: '1px solid rgba(255,255,255,0.72)',
                    boxShadow: 'inset 0 1.5px 0 rgba(255,255,255,0.90), 0 0 0 0.5px rgba(10,8,40,0.08)',
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
                    background: 'rgba(244,255,249,0.84)',
                    border: '1px solid rgba(255,255,255,0.72)',
                    boxShadow: 'inset 0 1.5px 0 rgba(255,255,255,0.90), 0 0 0 0.5px rgba(52,199,89,0.18)',
                  }}
                >
                  <p style={{ fontFamily: 'var(--sans)', fontSize: 10, fontWeight: 600, color: '#28904A', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
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
                    background: 'rgba(10,8,40,0.04)', padding: '6px 12px', borderRadius: 8,
                    display: 'inline-block',
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
                          background: 'rgba(255,255,255,0.80)', padding: '3px 8px', borderRadius: 6,
                          border: '1px solid rgba(10,8,40,0.09)',
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
                    onMouseEnter={e => (e.currentTarget.style.color = 'var(--accent-deep)')}
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
                    onMouseEnter={e => (e.currentTarget.style.color = 'var(--accent-deep)')}
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
