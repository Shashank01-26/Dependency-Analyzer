'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AnalyzedDependency } from '@/types';
import RiskBadge from './RiskBadge';
import FlagPill from './FlagPill';
import MetricBar from './MetricBar';

type SortField = 'name' | 'score' | 'downloads' | 'maintainers';
type SortDir = 'asc' | 'desc';

export default function DependencyTable({ dependencies }: { dependencies: AnalyzedDependency[] }) {
  const [sortField, setSortField] = useState<SortField>('score');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [filter, setFilter] = useState('');
  const [showDev, setShowDev] = useState(true);

  const toggleSort = (field: SortField) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('desc'); }
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

  const SortArrow = ({ field }: { field: SortField }) => (
    <span className="ml-1 text-[9px] opacity-40" style={{ color: sortField === field ? 'var(--cyan-1)' : undefined }}>
      {sortField === field ? (sortDir === 'desc' ? '\u25bc' : '\u25b2') : '\u25bc'}
    </span>
  );

  const riskColor = (level: string) =>
    level === 'low' ? 'var(--green-1)' :
    level === 'medium' ? 'var(--amber-1)' :
    level === 'high' ? 'var(--red-1)' : '#ff6b6b';

  return (
    <div className="glass-lg shine-top overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: 'var(--border-1)' }}>
        <div className="flex items-center gap-3">
          <h3 className="label" style={{ fontSize: 11 }}>Dependencies</h3>
          <span className="mono text-[10px] px-2 py-0.5 rounded-md" style={{ background: 'var(--cyan-3)', color: 'var(--cyan-1)' }}>
            {sorted.length}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 cursor-pointer group">
            <input
              type="checkbox"
              checked={showDev}
              onChange={e => setShowDev(e.target.checked)}
              className="accent-[var(--cyan-1)] w-3.5 h-3.5"
            />
            <span className="mono text-[10px] group-hover:text-[var(--text-2)] transition-colors" style={{ color: 'var(--text-3)' }}>Dev deps</span>
          </label>
          <input
            type="text"
            placeholder="Filter..."
            value={filter}
            onChange={e => setFilter(e.target.value)}
            className="px-3 py-1.5 mono text-[11px] rounded-lg"
            style={{ background: 'var(--surface)', border: '1px solid var(--border-2)', color: 'var(--text-1)' }}
          />
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr>
              {([
                { field: 'name' as SortField, label: 'Package', w: '' },
                { field: 'score' as SortField, label: 'Risk', w: '' },
                { field: 'downloads' as SortField, label: 'Downloads/wk', w: '' },
                { field: 'maintainers' as SortField, label: 'Maintainers', w: '' },
              ]).map(col => (
                <th
                  key={col.field}
                  onClick={() => toggleSort(col.field)}
                  className="px-6 py-3 text-left label cursor-pointer select-none hover:text-[var(--text-2)] transition-colors"
                  style={{ borderBottom: '1px solid var(--border-1)', background: 'rgba(0,0,0,0.15)' }}
                >
                  {col.label}<SortArrow field={col.field} />
                </th>
              ))}
              <th
                className="px-6 py-3 text-left label"
                style={{ borderBottom: '1px solid var(--border-1)', background: 'rgba(0,0,0,0.15)' }}
              >
                Flags
              </th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((dep, i) => (
              <motion.tr
                key={dep.name}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.025, duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
                className="group cursor-pointer transition-colors"
                style={{ borderBottom: '1px solid var(--border-1)' }}
                onClick={() => setExpandedRow(expandedRow === dep.name ? null : dep.name)}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(125,211,252,0.02)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <td className="px-6 py-3.5">
                  <div className="flex items-center gap-2.5">
                    <span className="mono text-[13px] font-medium" style={{ color: 'var(--text-1)' }}>
                      {dep.name}
                    </span>
                    <span className="mono text-[10px]" style={{ color: 'var(--text-ghost)' }}>{dep.version}</span>
                    {dep.isDev && (
                      <span className="mono text-[8px] px-1.5 py-0.5 rounded" style={{ background: 'var(--cyan-3)', color: 'var(--cyan-2)' }}>
                        DEV
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-3.5">
                  <div className="flex items-center gap-3">
                    {/* Mini score bar */}
                    <div className="w-14 h-[4px] rounded-full overflow-hidden" style={{ background: 'var(--border-1)' }}>
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${dep.score.overall}%`, background: riskColor(dep.riskLevel) }}
                      />
                    </div>
                    <span className="mono text-[13px] font-bold w-6 text-right" style={{ color: riskColor(dep.riskLevel) }}>
                      {dep.score.overall}
                    </span>
                    <RiskBadge level={dep.riskLevel} />
                  </div>
                </td>
                <td className="px-6 py-3.5">
                  <span className="mono text-[12px]" style={{ color: 'var(--text-2)' }}>
                    {dep.npm?.weeklyDownloads?.toLocaleString() || '\u2014'}
                  </span>
                </td>
                <td className="px-6 py-3.5">
                  <span className="mono text-[12px]" style={{ color: dep.npm && dep.npm.maintainers <= 1 ? 'var(--amber-1)' : 'var(--text-2)' }}>
                    {dep.npm?.maintainers ?? '\u2014'}
                  </span>
                </td>
                <td className="px-6 py-3.5">
                  <div className="flex flex-wrap gap-1.5">
                    {dep.flags.slice(0, 3).map((flag, j) => (
                      <FlagPill key={j} flag={flag} />
                    ))}
                    {dep.flags.length > 3 && (
                      <span className="mono text-[10px]" style={{ color: 'var(--text-3)' }}>+{dep.flags.length - 3}</span>
                    )}
                  </div>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Expanded detail */}
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
              transition={{ duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
              className="overflow-hidden border-t"
              style={{ borderColor: 'var(--border-1)', background: 'rgba(0,0,0,0.2)' }}
            >
              <div className="p-6 grid grid-cols-2 md:grid-cols-4 gap-6">
                <div>
                  <h4 className="label mb-3">Risk Breakdown</h4>
                  <div className="space-y-3">
                    <MetricBar label="Maintenance" value={dep.score.maintenance} delay={0} />
                    <MetricBar label="Security" value={dep.score.security} delay={0.08} />
                    <MetricBar label="Popularity" value={dep.score.popularity} delay={0.16} />
                    <MetricBar label="Community" value={dep.score.community} delay={0.24} />
                    <MetricBar label="Depth Risk" value={dep.score.depthRisk} delay={0.32} />
                  </div>
                </div>
                <div>
                  <h4 className="label mb-3">Package Info</h4>
                  <dl className="space-y-2.5 mono text-[11px]">
                    {[
                      ['Last Published', dep.npm ? new Date(dep.npm.lastPublish).toLocaleDateString() : '\u2014'],
                      ['Versions', String(dep.npm?.versions ?? '\u2014')],
                      ['License', dep.npm?.license || '\u2014'],
                      ['Publish Freq', dep.npm ? `~${dep.npm.publishFrequencyDays}d` : '\u2014'],
                    ].map(([k, v]) => (
                      <div key={k} className="flex justify-between">
                        <dt style={{ color: 'var(--text-3)' }}>{k}</dt>
                        <dd style={{ color: 'var(--text-2)' }}>{v}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
                <div>
                  <h4 className="label mb-3">GitHub</h4>
                  <dl className="space-y-2.5 mono text-[11px]">
                    {[
                      ['Stars', dep.github?.stars?.toLocaleString() ?? '\u2014'],
                      ['Open Issues', dep.github?.openIssues?.toLocaleString() ?? '\u2014'],
                      ['Forks', dep.github?.forks?.toLocaleString() ?? '\u2014'],
                      ['Archived', dep.github ? (dep.github.archived ? 'Yes' : 'No') : '\u2014'],
                    ].map(([k, v]) => (
                      <div key={k} className="flex justify-between">
                        <dt style={{ color: 'var(--text-3)' }}>{k}</dt>
                        <dd style={{ color: k === 'Archived' && v === 'Yes' ? 'var(--red-1)' : 'var(--text-2)' }}>{v}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
                <div>
                  <h4 className="label mb-3">Dependency Tree</h4>
                  <dl className="space-y-2.5 mono text-[11px]">
                    {[
                      ['Direct', String(dep.directDeps.length)],
                      ['Transitive', String(dep.transitiveCount)],
                      ['Max Depth', String(dep.depth)],
                    ].map(([k, v]) => (
                      <div key={k} className="flex justify-between">
                        <dt style={{ color: 'var(--text-3)' }}>{k}</dt>
                        <dd style={{ color: k === 'Max Depth' && dep.depth >= 5 ? 'var(--amber-1)' : 'var(--text-2)' }}>{v}</dd>
                      </div>
                    ))}
                  </dl>
                  {dep.vulnerabilities.length > 0 && (
                    <div className="mt-4 pt-3 border-t" style={{ borderColor: 'var(--border-1)' }}>
                      <h4 className="label mb-2" style={{ color: 'var(--red-1)' }}>
                        Vulnerabilities ({dep.vulnerabilities.length})
                      </h4>
                      {dep.vulnerabilities.slice(0, 3).map((v, i) => (
                        <div key={i} className="mono text-[10px] py-1" style={{ color: 'var(--text-2)' }}>
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
