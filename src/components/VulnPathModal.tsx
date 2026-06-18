'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { AnalyzedDependency, VulnerabilityInfo } from '@/types';

interface Props {
  dep: AnalyzedDependency | null;
  onClose: () => void;
  onSelectVuln: (vuln: VulnerabilityInfo) => void;
}

const SEVERITY_DOT: Record<string, string> = {
  critical: '#C5000A',
  high:     '#D73027',
  moderate: '#B36200',
  low:      '#28904A',
};

const SEVERITY_BG: Record<string, string> = {
  critical: 'rgba(197,0,10,0.10)',
  high:     'rgba(255,59,48,0.10)',
  moderate: 'rgba(255,149,0,0.10)',
  low:      'rgba(52,199,89,0.10)',
};

export default function VulnPathModal({ dep, onClose, onSelectVuln }: Props) {
  if (!dep) return null;

  return (
    <AnimatePresence>
      {dep && (
        <>
          {/* Frosted backdrop */}
          <motion.div
            className="fixed inset-0 z-40"
            style={{ background: 'rgba(10,8,40,0.22)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Modal — iOS glass card */}
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0, scale: 0.94, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 12 }}
            transition={{ type: 'spring', stiffness: 380, damping: 32 }}
          >
            <div
              className="w-full max-w-lg max-h-[80vh] flex flex-col"
              style={{
                background: 'rgba(246,247,252,0.94)',
                backdropFilter: 'blur(60px) saturate(200%) brightness(1.01)',
                WebkitBackdropFilter: 'blur(60px) saturate(200%) brightness(1.01)',
                borderRadius: 24,
                border: '1px solid rgba(255,255,255,0.72)',
                boxShadow: [
                  'inset 0 1.5px 0 rgba(255,255,255,0.92)',
                  '0 0 0 0.5px rgba(10,8,40,0.09)',
                  '0 8px 32px rgba(10,8,40,0.12)',
                  '0 24px 64px rgba(10,8,40,0.08)',
                ].join(', '),
              }}
              onClick={e => e.stopPropagation()}
            >
              {/* Header */}
              <div
                className="flex items-center justify-between p-5"
                style={{ borderBottom: '1px solid rgba(10,8,40,0.08)' }}
              >
                <div>
                  <h2 style={{ fontFamily: 'var(--sans)', fontWeight: 700, fontSize: 16, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
                    {dep.name}
                  </h2>
                  <p style={{ fontFamily: 'var(--sans)', fontSize: 12, color: 'var(--text-tertiary)', marginTop: 3 }}>
                    {dep.vulnerabilities.length} vulnerabilit{dep.vulnerabilities.length === 1 ? 'y' : 'ies'} · v{dep.version}
                  </p>
                </div>
                <button
                  onClick={onClose}
                  className="flex items-center justify-center transition-all"
                  style={{
                    width: 30, height: 30, borderRadius: '50%',
                    background: 'rgba(10,8,40,0.07)',
                    border: '1px solid rgba(10,8,40,0.09)',
                    color: 'var(--text-tertiary)',
                    fontSize: 17,
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(10,8,40,0.12)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-primary)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(10,8,40,0.07)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-tertiary)'; }}
                >
                  ×
                </button>
              </div>

              {/* Vuln list */}
              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {dep.vulnerabilities.length === 0 && (
                  <p style={{ fontFamily: 'var(--sans)', fontSize: 14, color: 'var(--text-tertiary)', textAlign: 'center', padding: '32px 0' }}>
                    No vulnerabilities found
                  </p>
                )}

                {dep.vulnerabilities.map(vuln => {
                  const dotColor = SEVERITY_DOT[vuln.severity] ?? SEVERITY_DOT.low;
                  const bgColor  = SEVERITY_BG[vuln.severity]  ?? SEVERITY_BG.low;
                  return (
                    <button
                      key={vuln.id}
                      onClick={() => onSelectVuln(vuln)}
                      className="w-full text-left group transition-all"
                      style={{
                        background: 'rgba(255,255,255,0.68)',
                        border: '1px solid rgba(255,255,255,0.72)',
                        borderRadius: 14,
                        padding: '12px 14px',
                        boxShadow: 'inset 0 1.5px 0 rgba(255,255,255,0.90), 0 0 0 0.5px rgba(10,8,40,0.07)',
                        transition: 'all 0.18s ease',
                      }}
                      onMouseEnter={e => {
                        (e.currentTarget as HTMLButtonElement).style.background = bgColor;
                        (e.currentTarget as HTMLButtonElement).style.boxShadow = `inset 0 1.5px 0 rgba(255,255,255,0.90), 0 0 0 0.5px ${dotColor}30, 0 4px 12px rgba(10,8,40,0.07)`;
                        (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-1px)';
                      }}
                      onMouseLeave={e => {
                        (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.68)';
                        (e.currentTarget as HTMLButtonElement).style.boxShadow = 'inset 0 1.5px 0 rgba(255,255,255,0.90), 0 0 0 0.5px rgba(10,8,40,0.07)';
                        (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)';
                      }}
                    >
                      <div className="flex items-start gap-3">
                        {/* Severity dot */}
                        <span
                          className="mt-1 flex-shrink-0 rounded-full"
                          style={{ width: 8, height: 8, background: dotColor, boxShadow: `0 0 6px ${dotColor}60` }}
                        />
                        <div className="flex-1 min-w-0">
                          <p style={{ fontFamily: 'var(--sans)', fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {vuln.title}
                          </p>
                          <p style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--text-quaternary)', marginTop: 2, letterSpacing: '0.02em' }}>
                            {vuln.id}
                          </p>

                          {/* Path if available */}
                          {vuln.path && vuln.path.length > 0 && (
                            <div className="flex flex-wrap items-center gap-1 mt-2">
                              {vuln.path.map((pkg, i) => (
                                <span key={i} className="flex items-center gap-1">
                                  <span style={{
                                    fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--text-secondary)',
                                    background: 'rgba(10,8,40,0.05)', padding: '2px 6px', borderRadius: 5,
                                    border: '1px solid rgba(10,8,40,0.08)',
                                  }}>
                                    {pkg}
                                  </span>
                                  {i < vuln.path!.length - 1 && (
                                    <span style={{ color: 'var(--text-quaternary)', fontSize: 9 }}>→</span>
                                  )}
                                </span>
                              ))}
                            </div>
                          )}

                          <div className="flex items-center gap-3 mt-2">
                            {vuln.fixedIn && (
                              <span style={{ fontFamily: 'var(--sans)', fontSize: 11, color: '#28904A', fontWeight: 500 }}>
                                Fix: {vuln.fixedIn}
                              </span>
                            )}
                            {vuln.cvss !== undefined && (
                              <span style={{ fontFamily: 'var(--sans)', fontSize: 11, color: 'var(--text-tertiary)' }}>
                                CVSS {vuln.cvss.toFixed(1)}
                              </span>
                            )}
                            <span style={{
                              fontFamily: 'var(--sans)', fontSize: 11, color: 'var(--accent)', fontWeight: 500,
                              marginLeft: 'auto', opacity: 0, transition: 'opacity 0.15s',
                            }}
                              className="group-hover:opacity-100"
                            >
                              View details →
                            </span>
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
