'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { VulnerabilityInfo } from '@/types';

interface Props {
  vuln: VulnerabilityInfo | null;
  onClose: () => void;
}

const SEVERITY_COLORS: Record<string, string> = {
  critical: 'text-red-400 bg-red-950/60 border-red-800',
  high: 'text-orange-400 bg-orange-950/60 border-orange-800',
  moderate: 'text-yellow-400 bg-yellow-950/60 border-yellow-800',
  low: 'text-green-400 bg-green-950/60 border-green-800',
};

function cvssColor(score: number): string {
  if (score >= 9) return 'text-red-400';
  if (score >= 7) return 'text-orange-400';
  if (score >= 4) return 'text-yellow-400';
  return 'text-green-400';
}

export default function CVEDetailDrawer({ vuln, onClose }: Props) {
  return (
    <AnimatePresence>
      {vuln && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-black/50 z-40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Drawer */}
          <motion.aside
            className="fixed right-0 top-0 h-full w-full max-w-md bg-zinc-900 border-l border-zinc-800 z-50 flex flex-col shadow-2xl"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          >
            {/* Header */}
            <div className="flex items-start justify-between p-5 border-b border-zinc-800">
              <div className="flex-1 min-w-0">
                <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-semibold uppercase tracking-wide border mb-2 ${SEVERITY_COLORS[vuln.severity] ?? SEVERITY_COLORS.low}`}>
                  {vuln.severity}
                </div>
                <h2 className="text-white font-semibold text-sm leading-snug">{vuln.title}</h2>
                <p className="text-zinc-500 text-xs mt-1 font-mono">{vuln.id}</p>
              </div>
              <button
                onClick={onClose}
                className="ml-3 text-zinc-500 hover:text-white transition-colors text-xl leading-none"
                aria-label="Close"
              >
                ×
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5">

              {/* CVSS score */}
              {vuln.cvss !== undefined && (
                <div className="bg-zinc-800/60 rounded-lg p-4">
                  <p className="text-zinc-400 text-xs uppercase tracking-wide mb-1">CVSS Score</p>
                  <span className={`text-3xl font-bold ${cvssColor(vuln.cvss)}`}>
                    {vuln.cvss.toFixed(1)}
                  </span>
                  {vuln.cvssVector && (
                    <p className="text-zinc-500 text-xs font-mono mt-1 break-all">{vuln.cvssVector}</p>
                  )}
                </div>
              )}

              {/* EPSS */}
              {vuln.epss !== undefined && (
                <div className="bg-zinc-800/60 rounded-lg p-4">
                  <p className="text-zinc-400 text-xs uppercase tracking-wide mb-1">Exploit Probability (EPSS)</p>
                  <span className="text-2xl font-bold text-white">
                    {(vuln.epss * 100).toFixed(2)}%
                  </span>
                  <p className="text-zinc-500 text-xs mt-1">Probability of exploitation in the next 30 days</p>
                </div>
              )}

              {/* Fix version */}
              {vuln.fixedIn && (
                <div className="bg-emerald-950/40 border border-emerald-900 rounded-lg p-4">
                  <p className="text-emerald-400 text-xs uppercase tracking-wide mb-1">Fixed In</p>
                  <p className="text-white font-mono text-sm">{vuln.fixedIn}</p>
                  <p className="text-zinc-400 text-xs mt-1">Upgrade to this version or higher to resolve</p>
                </div>
              )}

              {/* Affected range */}
              {vuln.range && (
                <div>
                  <p className="text-zinc-400 text-xs uppercase tracking-wide mb-1">Affected Versions</p>
                  <p className="text-white font-mono text-sm bg-zinc-800 px-2 py-1 rounded">{vuln.range}</p>
                </div>
              )}

              {/* Transitive path */}
              {vuln.path && vuln.path.length > 0 && (
                <div>
                  <p className="text-zinc-400 text-xs uppercase tracking-wide mb-2">Dependency Path</p>
                  <div className="flex flex-wrap items-center gap-1">
                    {vuln.path.map((pkg, i) => (
                      <span key={i} className="flex items-center gap-1">
                        <span className="bg-zinc-800 text-zinc-200 text-xs px-2 py-0.5 rounded font-mono">{pkg}</span>
                        {i < vuln.path!.length - 1 && <span className="text-zinc-600 text-xs">→</span>}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Links */}
              <div className="space-y-2">
                {vuln.nvdUrl && (
                  <a
                    href={vuln.nvdUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-blue-400 hover:text-blue-300 text-sm transition-colors"
                  >
                    <span>↗</span> View on NVD
                  </a>
                )}
                {vuln.url && vuln.url !== vuln.nvdUrl && (
                  <a
                    href={vuln.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-blue-400 hover:text-blue-300 text-sm transition-colors"
                  >
                    <span>↗</span> Advisory Details
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
