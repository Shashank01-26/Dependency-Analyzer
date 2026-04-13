'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AnalyzedDependency } from '@/types';
import RiskBadge from './RiskBadge';
import FlagPill from './FlagPill';
import MetricBar from './MetricBar';

type SortField = 'name' | 'score' | 'downloads' | 'maintainers';
type SortDir = 'asc' | 'desc';

interface DependencyTableProps {
  dependencies: AnalyzedDependency[];
}

export default function DependencyTable({ dependencies }: DependencyTableProps) {
  const [sortField, setSortField] = useState<SortField>('score');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>('');
  const [showDev, setShowDev] = useState(true);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  };

  const sorted = [...dependencies]
    .filter(d => showDev || !d.isDev)
    .filter(d => !filter || d.name.toLowerCase().includes(filter.toLowerCase()))
    .sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case 'name': cmp = a.name.localeCompare(b.name); break;
        case 'score': cmp = a.score.overall - b.score.overall; break;
        case 'downloads': cmp = (a.npm?.weeklyDownloads || 0) - (b.npm?.weeklyDownloads || 0); break;
        case 'maintainers': cmp = (a.npm?.maintainers || 0) - (b.npm?.maintainers || 0); break;
      }
      return sortDir === 'desc' ? -cmp : cmp;
    });

  const SortIcon = ({ field }: { field: SortField }) => (
    <span className="ml-1 text-[10px]" style={{ color: sortField === field ? 'var(--cyan-solid)' : 'var(--text-tertiary)' }}>
      {sortField === field ? (sortDir === 'desc' ? '\u25bc' : '\u25b2') : '\u25bc'}
    </span>
  );

  return (
    <div className="panel overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: 'var(--border-dim)' }}>
        <h3 className="font-mono text-sm font-semibold tracking-wider uppercase" style={{ color: 'var(--text-secondary)' }}>
          Dependencies ({sorted.length})
        </h3>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showDev}
              onChange={e => setShowDev(e.target.checked)}
              className="accent-[var(--cyan-solid)]"
            />
            <span className="text-xs font-mono" style={{ color: 'var(--text-tertiary)' }}>Show dev</span>
          </label>
          <input
            type="text"
            placeholder="Filter..."
            value={filter}
            onChange={e => setFilter(e.target.value)}
            className="px-3 py-1.5 text-xs font-mono rounded"
            style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-primary)',
              outline: 'none',
            }}
          />
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr style={{ background: 'var(--bg-surface)' }}>
              {[
                { field: 'name' as SortField, label: 'Package' },
                { field: 'score' as SortField, label: 'Risk Score' },
                { field: 'downloads' as SortField, label: 'Downloads/wk' },
                { field: 'maintainers' as SortField, label: 'Maintainers' },
              ].map(col => (
                <th
                  key={col.field}
                  onClick={() => toggleSort(col.field)}
                  className="px-4 py-3 text-left text-[11px] font-mono font-semibold uppercase tracking-wider cursor-pointer select-none"
                  style={{ color: 'var(--text-tertiary)', borderBottom: '1px solid var(--border-dim)' }}
                >
                  {col.label}
                  <SortIcon field={col.field} />
                </th>
              ))}
              <th
                className="px-4 py-3 text-left text-[11px] font-mono font-semibold uppercase tracking-wider"
                style={{ color: 'var(--text-tertiary)', borderBottom: '1px solid var(--border-dim)' }}
              >
                Flags
              </th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((dep, i) => (
              <motion.tr
                key={dep.name}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.02 }}
                className="group cursor-pointer"
                style={{ borderBottom: '1px solid var(--border-dim)' }}
                onClick={() => setExpandedRow(expandedRow === dep.name ? null : dep.name)}
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                      {dep.name}
                    </span>
                    <span className="text-[10px] font-mono" style={{ color: 'var(--text-tertiary)' }}>
                      {dep.version}
                    </span>
                    {dep.isDev && (
                      <span className="px-1.5 py-0.5 text-[9px] font-mono rounded" style={{ background: 'var(--cyan-dim)', color: 'var(--cyan-solid)', border: '1px solid var(--cyan-muted)' }}>
                        DEV
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-16 h-1.5 rounded-full" style={{ background: 'var(--bg-panel)' }}>
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${dep.score.overall}%`,
                          background: dep.riskLevel === 'low' ? 'var(--green-solid)'
                            : dep.riskLevel === 'medium' ? 'var(--amber-solid)'
                            : 'var(--red-solid)',
                        }}
                      />
                    </div>
                    <span className="font-mono text-sm font-semibold" style={{
                      color: dep.riskLevel === 'low' ? 'var(--green-solid)'
                        : dep.riskLevel === 'medium' ? 'var(--amber-solid)'
                        : dep.riskLevel === 'high' ? 'var(--red-solid)'
                        : 'var(--red-glow)',
                    }}>
                      {dep.score.overall}
                    </span>
                    <RiskBadge level={dep.riskLevel} />
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className="font-mono text-xs" style={{ color: 'var(--text-secondary)' }}>
                    {dep.npm?.weeklyDownloads?.toLocaleString() || '—'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className="font-mono text-xs" style={{ color: dep.npm && dep.npm.maintainers <= 1 ? 'var(--amber-solid)' : 'var(--text-secondary)' }}>
                    {dep.npm?.maintainers ?? '—'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {dep.flags.slice(0, 3).map((flag, j) => (
                      <FlagPill key={j} flag={flag} />
                    ))}
                    {dep.flags.length > 3 && (
                      <span className="text-[11px] font-mono" style={{ color: 'var(--text-tertiary)' }}>
                        +{dep.flags.length - 3}
                      </span>
                    )}
                  </div>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Expanded detail row */}
      <AnimatePresence>
        {expandedRow && (() => {
          const dep = dependencies.find(d => d.name === expandedRow);
          if (!dep) return null;
          return (
            <motion.div
              key={expandedRow}
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden border-t"
              style={{ borderColor: 'var(--border-dim)', background: 'var(--bg-surface)' }}
            >
              <div className="p-6 grid grid-cols-2 md:grid-cols-4 gap-6">
                <div>
                  <h4 className="text-[11px] font-mono uppercase tracking-wider mb-3" style={{ color: 'var(--text-tertiary)' }}>
                    Risk Breakdown
                  </h4>
                  <div className="space-y-2.5">
                    <MetricBar label="Maintenance" value={dep.score.maintenance} delay={0} />
                    <MetricBar label="Security" value={dep.score.security} delay={0.1} />
                    <MetricBar label="Popularity" value={dep.score.popularity} delay={0.2} />
                    <MetricBar label="Community" value={dep.score.community} delay={0.3} />
                    <MetricBar label="Depth Risk" value={dep.score.depthRisk} delay={0.4} />
                  </div>
                </div>
                <div>
                  <h4 className="text-[11px] font-mono uppercase tracking-wider mb-3" style={{ color: 'var(--text-tertiary)' }}>
                    Package Info
                  </h4>
                  <dl className="space-y-2 text-xs font-mono">
                    <div className="flex justify-between">
                      <dt style={{ color: 'var(--text-tertiary)' }}>Last Published</dt>
                      <dd style={{ color: 'var(--text-secondary)' }}>
                        {dep.npm ? new Date(dep.npm.lastPublish).toLocaleDateString() : '—'}
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt style={{ color: 'var(--text-tertiary)' }}>Versions</dt>
                      <dd style={{ color: 'var(--text-secondary)' }}>{dep.npm?.versions ?? '—'}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt style={{ color: 'var(--text-tertiary)' }}>License</dt>
                      <dd style={{ color: 'var(--text-secondary)' }}>{dep.npm?.license || '—'}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt style={{ color: 'var(--text-tertiary)' }}>Publish Freq</dt>
                      <dd style={{ color: 'var(--text-secondary)' }}>
                        {dep.npm ? `~${dep.npm.publishFrequencyDays}d` : '—'}
                      </dd>
                    </div>
                  </dl>
                </div>
                <div>
                  <h4 className="text-[11px] font-mono uppercase tracking-wider mb-3" style={{ color: 'var(--text-tertiary)' }}>
                    GitHub
                  </h4>
                  <dl className="space-y-2 text-xs font-mono">
                    <div className="flex justify-between">
                      <dt style={{ color: 'var(--text-tertiary)' }}>Stars</dt>
                      <dd style={{ color: 'var(--text-secondary)' }}>
                        {dep.github?.stars?.toLocaleString() ?? '—'}
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt style={{ color: 'var(--text-tertiary)' }}>Open Issues</dt>
                      <dd style={{ color: 'var(--text-secondary)' }}>
                        {dep.github?.openIssues?.toLocaleString() ?? '—'}
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt style={{ color: 'var(--text-tertiary)' }}>Forks</dt>
                      <dd style={{ color: 'var(--text-secondary)' }}>
                        {dep.github?.forks?.toLocaleString() ?? '—'}
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt style={{ color: 'var(--text-tertiary)' }}>Archived</dt>
                      <dd style={{ color: dep.github?.archived ? 'var(--red-solid)' : 'var(--text-secondary)' }}>
                        {dep.github ? (dep.github.archived ? 'Yes' : 'No') : '—'}
                      </dd>
                    </div>
                  </dl>
                </div>
                <div>
                  <h4 className="text-[11px] font-mono uppercase tracking-wider mb-3" style={{ color: 'var(--text-tertiary)' }}>
                    Dependencies
                  </h4>
                  <dl className="space-y-2 text-xs font-mono">
                    <div className="flex justify-between">
                      <dt style={{ color: 'var(--text-tertiary)' }}>Direct</dt>
                      <dd style={{ color: 'var(--text-secondary)' }}>{dep.directDeps.length}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt style={{ color: 'var(--text-tertiary)' }}>Transitive</dt>
                      <dd style={{ color: 'var(--text-secondary)' }}>{dep.transitiveCount}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt style={{ color: 'var(--text-tertiary)' }}>Max Depth</dt>
                      <dd style={{ color: dep.depth >= 5 ? 'var(--amber-solid)' : 'var(--text-secondary)' }}>
                        {dep.depth}
                      </dd>
                    </div>
                  </dl>
                  {dep.vulnerabilities.length > 0 && (
                    <div className="mt-4">
                      <h4 className="text-[11px] font-mono uppercase tracking-wider mb-2" style={{ color: 'var(--red-solid)' }}>
                        Vulnerabilities ({dep.vulnerabilities.length})
                      </h4>
                      {dep.vulnerabilities.slice(0, 3).map((v, i) => (
                        <div key={i} className="text-[11px] font-mono py-1" style={{ color: 'var(--text-secondary)' }}>
                          <span className={`risk-${v.severity}`}>[{v.severity}]</span> {v.title}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })()}
      </AnimatePresence>
    </div>
  );
}
