'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { AnalyzedDependency, VulnerabilityInfo } from '@/types';

interface Props {
  dep: AnalyzedDependency | null;
  onClose: () => void;
  onSelectVuln: (vuln: VulnerabilityInfo) => void;
}

const SEVERITY_DOT: Record<string, string> = {
  critical: 'bg-red-500',
  high: 'bg-orange-500',
  moderate: 'bg-yellow-500',
  low: 'bg-green-500',
};

export default function VulnPathModal({ dep, onClose, onSelectVuln }: Props) {
  if (!dep) return null;

  const vulnsWithPaths = dep.vulnerabilities.filter(v => v.path && v.path.length > 0);
  const vulnsWithoutPaths = dep.vulnerabilities.filter(v => !v.path || v.path.length === 0);

  return (
    <AnimatePresence>
      {dep && (
        <>
          <motion.div
            className="fixed inset-0 bg-black/60 z-40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 400, damping: 35 }}
          >
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col">
              {/* Header */}
              <div className="flex items-center justify-between p-5 border-b border-zinc-800">
                <div>
                  <h2 className="text-white font-semibold">{dep.name}</h2>
                  <p className="text-zinc-500 text-xs mt-0.5">
                    {dep.vulnerabilities.length} vulnerabilit{dep.vulnerabilities.length === 1 ? 'y' : 'ies'} · v{dep.version}
                  </p>
                </div>
                <button onClick={onClose} className="text-zinc-500 hover:text-white text-xl">×</button>
              </div>

              {/* Vuln list */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {dep.vulnerabilities.length === 0 && (
                  <p className="text-zinc-500 text-sm text-center py-8">No vulnerabilities found</p>
                )}

                {dep.vulnerabilities.map(vuln => (
                  <button
                    key={vuln.id}
                    onClick={() => onSelectVuln(vuln)}
                    className="w-full text-left bg-zinc-800/60 hover:bg-zinc-800 border border-zinc-700/50 rounded-lg p-3 transition-colors group"
                  >
                    <div className="flex items-start gap-3">
                      <span className={`mt-1 w-2 h-2 rounded-full flex-shrink-0 ${SEVERITY_DOT[vuln.severity] ?? 'bg-zinc-500'}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm font-medium truncate">{vuln.title}</p>
                        <p className="text-zinc-500 text-xs font-mono mt-0.5">{vuln.id}</p>

                        {/* Path if available */}
                        {vuln.path && vuln.path.length > 0 && (
                          <div className="flex flex-wrap items-center gap-1 mt-2">
                            {vuln.path.map((pkg, i) => (
                              <span key={i} className="flex items-center gap-1">
                                <span className="bg-zinc-700 text-zinc-300 text-xs px-1.5 py-0.5 rounded font-mono">{pkg}</span>
                                {i < vuln.path!.length - 1 && <span className="text-zinc-600 text-[10px]">→</span>}
                              </span>
                            ))}
                          </div>
                        )}

                        <div className="flex items-center gap-3 mt-2">
                          {vuln.fixedIn && (
                            <span className="text-emerald-400 text-xs">Fix: {vuln.fixedIn}</span>
                          )}
                          {vuln.cvss !== undefined && (
                            <span className="text-zinc-400 text-xs">CVSS {vuln.cvss.toFixed(1)}</span>
                          )}
                          <span className="text-blue-400 text-xs opacity-0 group-hover:opacity-100 transition-opacity ml-auto">
                            View details →
                          </span>
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
