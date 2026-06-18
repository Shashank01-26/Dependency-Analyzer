'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { ScanSummary } from '@/types';
import { listScans, deleteScan } from '@/lib/scan-store';

const RISK_CFG: Record<string, { color: string; bg: string; outer: string }> = {
  critical: { color: '#FF2D55', bg: 'rgba(255,45,85,0.14)',  outer: 'rgba(255,45,85,0.28)'  },
  high:     { color: '#FF453A', bg: 'rgba(255,69,58,0.14)',  outer: 'rgba(255,69,58,0.28)'  },
  medium:   { color: '#FFB340', bg: 'rgba(255,179,64,0.14)', outer: 'rgba(255,179,64,0.26)' },
  low:      { color: '#34D058', bg: 'rgba(52,208,88,0.12)',  outer: 'rgba(52,208,88,0.24)'  },
};

const ECOSYSTEM_ICONS: Record<string, string> = {
  npm: '⬡', flutter: '🐦', android: '🤖', python: '🐍',
  rust: '🦀', go: '🐹', ruby: '💎', dotnet: '⬡',
};

const ease = [0.25, 0.1, 0.25, 1] as const;

function ScoreBar({ score }: { score: number }) {
  const color = score >= 70 ? '#FF453A' : score >= 45 ? '#FFB340' : score >= 25 ? '#FFB340' : '#34D058';
  return (
    <div className="w-full rounded-full overflow-hidden" style={{ height: 4, background: 'rgba(255,255,255,0.10)', marginTop: 8 }}>
      <motion.div
        className="h-full rounded-full"
        style={{ background: color, boxShadow: `0 0 8px ${color}60` }}
        initial={{ width: 0 }}
        animate={{ width: `${score}%` }}
        transition={{ duration: 0.8, ease: 'easeOut', delay: 0.2 }}
      />
    </div>
  );
}

export default function DashboardPage() {
  const [scans, setScans] = useState<ScanSummary[]>([]);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    setScans(listScans());
  }, []);

  function handleDelete(id: string) {
    deleteScan(id);
    setScans(listScans());
  }

  const ecosystems = ['all', ...Array.from(new Set(scans.map(s => s.ecosystem)))];
  const filtered = filter === 'all' ? scans : scans.filter(s => s.ecosystem === filter);

  const byProject = new Map<string, ScanSummary>();
  for (const scan of filtered) {
    if (!byProject.has(scan.projectName)) byProject.set(scan.projectName, scan);
  }
  const projects = Array.from(byProject.values());

  return (
    <div style={{ minHeight: '100vh', padding: '0 0 48px' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 20px' }}>

        {/* Page header */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease }}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 32, marginBottom: 28 }}
        >
          <div>
            <h1 style={{ fontFamily: 'var(--sans)', fontWeight: 800, fontSize: 28, letterSpacing: '-0.03em', color: 'var(--text-primary)', lineHeight: 1.1 }}>
              Dashboard
            </h1>
            <p style={{ fontFamily: 'var(--sans)', fontSize: 13, color: 'var(--text-tertiary)', marginTop: 5 }}>
              {scans.length} scan{scans.length !== 1 ? 's' : ''} · {projects.length} project{projects.length !== 1 ? 's' : ''}
            </p>
          </div>
          <Link
            href="/"
            className="btn btn-primary"
            style={{ fontSize: 13, padding: '10px 22px', minHeight: 40, borderRadius: 12 }}
          >
            + New Scan
          </Link>
        </motion.div>

        {/* Stats row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 24 }}>
          {(['critical', 'high', 'medium', 'low'] as const).map((level, i) => {
            const count = scans.filter(s => s.overallRiskLevel === level).length;
            const cfg = RISK_CFG[level];
            return (
              <motion.div
                key={level}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06, ease }}
                className="glass-cell"
                style={{
                  background: cfg.bg,
                  boxShadow: [
                    'inset 0 1px 0 rgba(255,255,255,0.10)',
                    `0 0 0 0.5px ${cfg.outer}`,
                    '0 2px 8px rgba(0,0,0,0.35)',
                    '0 8px 24px rgba(0,0,0,0.25)',
                  ].join(', '),
                  padding: '20px 22px',
                }}
              >
                <span className="cell-label">{level}</span>
                <span className="cell-number cell-number-lg" style={{ color: cfg.color, marginTop: 8 }}>{count}</span>
                <span style={{ display: 'block', fontFamily: 'var(--sans)', fontSize: 11, color: 'var(--text-tertiary)', marginTop: 4 }}>projects</span>
              </motion.div>
            );
          })}
        </div>

        {/* Ecosystem filter */}
        {ecosystems.length > 2 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.28, ease }}
            style={{ display: 'flex', gap: 6, marginBottom: 20, flexWrap: 'wrap' }}
          >
            {ecosystems.map(eco => {
              const active = filter === eco;
              return (
                <button
                  key={eco}
                  onClick={() => setFilter(eco)}
                  style={{
                    padding: '5px 14px', borderRadius: 999,
                    fontFamily: 'var(--sans)', fontSize: 12, fontWeight: 600,
                    color: active ? '#A8A6FF' : 'var(--text-tertiary)',
                    background: active ? 'rgba(120,117,255,0.18)' : 'rgba(255,255,255,0.07)',
                    border: active ? '1px solid rgba(120,117,255,0.30)' : '1px solid rgba(255,255,255,0.10)',
                    boxShadow: active
                      ? 'inset 0 1px 0 rgba(255,255,255,0.14), 0 0 0 0.5px rgba(120,117,255,0.25)'
                      : 'inset 0 1px 0 rgba(255,255,255,0.08), 0 0 0 0.5px rgba(0,0,0,0.30)',
                    cursor: 'pointer',
                    transition: 'all 0.18s ease',
                  }}
                >
                  {eco === 'all' ? 'All' : `${ECOSYSTEM_ICONS[eco] ?? ''} ${eco}`}
                </button>
              );
            })}
          </motion.div>
        )}

        {/* Project cards */}
        {projects.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, ease }}
            className="glass-cell"
            style={{ padding: '64px 24px', textAlign: 'center' }}
          >
            <p style={{ fontFamily: 'var(--sans)', fontSize: 17, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8 }}>
              No scans yet
            </p>
            <p style={{ fontFamily: 'var(--sans)', fontSize: 14, color: 'var(--text-tertiary)' }}>
              Run a scan from the{' '}
              <Link href="/" style={{ color: 'var(--accent)', textDecoration: 'none', fontWeight: 600 }}>
                home page
              </Link>
            </p>
          </motion.div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 10 }}>
            {projects.map((scan, i) => {
              const projectScans = scans.filter(s => s.projectName === scan.projectName);
              const cfg = RISK_CFG[scan.overallRiskLevel] ?? RISK_CFG.low;
              return (
                <motion.div
                  key={scan.id}
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05, ease }}
                  className="glass-cell group"
                  style={{ padding: 22, cursor: 'default' }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <span style={{ fontSize: 14 }}>{ECOSYSTEM_ICONS[scan.ecosystem] ?? '📦'}</span>
                        <Link
                          href={`/?scan=${scan.id}`}
                          style={{
                            fontFamily: 'var(--sans)', fontWeight: 700, fontSize: 15,
                            color: 'var(--text-primary)', textDecoration: 'none',
                            letterSpacing: '-0.02em',
                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                          }}
                          onMouseEnter={e => ((e.currentTarget as HTMLAnchorElement).style.color = 'var(--accent-light)')}
                          onMouseLeave={e => ((e.currentTarget as HTMLAnchorElement).style.color = 'var(--text-primary)')}
                        >
                          {scan.projectName}
                        </Link>
                      </div>
                      <p style={{ fontFamily: 'var(--sans)', fontSize: 12, color: 'var(--text-tertiary)' }}>
                        {scan.totalDependencies} deps · {new Date(scan.timestamp).toLocaleDateString()}
                      </p>
                    </div>

                    {/* Risk badge */}
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: 5,
                      padding: '4px 11px', borderRadius: 999, flexShrink: 0,
                      fontFamily: 'var(--sans)', fontSize: 11, fontWeight: 700, textTransform: 'capitalize',
                      color: cfg.color, background: cfg.bg,
                      border: `1px solid ${cfg.outer}`,
                      boxShadow: `inset 0 1px 0 rgba(255,255,255,0.10), 0 0 0 0.5px ${cfg.outer}`,
                    }}>
                      {scan.overallRiskLevel}
                    </span>
                  </div>

                  {/* Score */}
                  <div style={{ marginTop: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
                      <span style={{ fontFamily: 'var(--sans)', fontWeight: 800, fontSize: 32, letterSpacing: '-0.04em', color: 'var(--text-primary)', lineHeight: 1 }}>
                        {scan.overallScore}
                      </span>
                      <span style={{ fontFamily: 'var(--sans)', fontSize: 12, color: 'var(--text-quaternary)', marginBottom: 2 }}>
                        / 100
                      </span>
                    </div>
                    <ScoreBar score={scan.overallScore} />
                  </div>

                  {scan.criticalCount > 0 && (
                    <p style={{ fontFamily: 'var(--sans)', fontSize: 12, fontWeight: 600, color: '#FF2D55', marginTop: 10 }}>
                      {scan.criticalCount} critical dep{scan.criticalCount > 1 ? 's' : ''}
                    </p>
                  )}

                  {/* Hover actions */}
                  <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    marginTop: 14, paddingTop: 12,
                    borderTop: '1px solid rgba(255,255,255,0.08)',
                    opacity: 0, transition: 'opacity 0.2s ease',
                  }}
                    className="group-hover:opacity-100"
                  >
                    <p style={{ fontFamily: 'var(--sans)', fontSize: 11, color: 'var(--text-quaternary)' }}>
                      {projectScans.length} scan{projectScans.length > 1 ? 's' : ''}
                    </p>
                    <button
                      onClick={() => handleDelete(scan.id)}
                      style={{
                        fontFamily: 'var(--sans)', fontSize: 11, color: 'var(--text-quaternary)',
                        background: 'none', border: 'none', cursor: 'pointer',
                        transition: 'color 0.15s',
                      }}
                      onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.color = '#FF453A')}
                      onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.color = 'var(--text-quaternary)')}
                    >
                      Delete
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
