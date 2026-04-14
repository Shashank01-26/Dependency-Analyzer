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
  const [sf, setSf] = useState<SortField>('score');
  const [sd, setSd] = useState<SortDir>('desc');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [filter, setFilter] = useState('');
  const [showDev, setShowDev] = useState(true);

  const toggle = (f: SortField) => { if (sf === f) setSd(d => d === 'asc' ? 'desc' : 'asc'); else { setSf(f); setSd('desc'); } };

  const sorted = [...dependencies]
    .filter(d => showDev || !d.isDev)
    .filter(d => !filter || d.name.toLowerCase().includes(filter.toLowerCase()))
    .sort((a, b) => {
      let c = 0;
      if (sf === 'name') c = a.name.localeCompare(b.name);
      else if (sf === 'score') c = a.score.overall - b.score.overall;
      else if (sf === 'downloads') c = (a.npm?.weeklyDownloads || 0) - (b.npm?.weeklyDownloads || 0);
      else c = (a.npm?.maintainers || 0) - (b.npm?.maintainers || 0);
      return sd === 'desc' ? -c : c;
    });

  const rc = (l: string) => l === 'low' ? 'var(--green)' : l === 'medium' ? 'var(--amber)' : 'var(--rose)';

  return (
    <div className="card overflow-hidden">
      <div className="flex items-center justify-between px-6 h-16 border-b" style={{ borderColor: 'var(--border)' }}>
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-bold text-white uppercase tracking-wide">Dependencies</h3>
          <span className="pill text-xs" style={{ background: 'rgba(79,143,247,0.1)', color: 'var(--blue)' }}>{sorted.length}</span>
        </div>
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={showDev} onChange={e => setShowDev(e.target.checked)} className="accent-[var(--blue)] w-4 h-4" />
            <span className="text-sm" style={{ color: 'var(--text-3)' }}>Dev</span>
          </label>
          <input type="text" placeholder="Filter..." value={filter} onChange={e => setFilter(e.target.value)} className="px-4 py-2 text-sm rounded-lg w-40" />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr style={{ background: 'var(--bg-3)' }}>
              {([{ f: 'name' as SortField, l: 'Package' }, { f: 'score' as SortField, l: 'Risk' }, { f: 'downloads' as SortField, l: 'Downloads/wk' }, { f: 'maintainers' as SortField, l: 'Maintainers' }]).map(col => (
                <th key={col.f} onClick={() => toggle(col.f)}
                  className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wide cursor-pointer select-none transition-colors hover:text-white"
                  style={{ color: sf === col.f ? 'var(--blue)' : 'var(--text-3)', borderBottom: '1px solid var(--border)' }}>
                  {col.l} <span className="opacity-40">{sf === col.f ? (sd === 'desc' ? '↓' : '↑') : ''}</span>
                </th>
              ))}
              <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--text-3)', borderBottom: '1px solid var(--border)' }}>Flags</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((dep, i) => (
              <motion.tr key={dep.name} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }}
                className="cursor-pointer transition-colors hover:bg-[var(--bg-3)]"
                style={{ borderBottom: '1px solid var(--border)' }}
                onClick={() => setExpanded(expanded === dep.name ? null : dep.name)}>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-white">{dep.name}</span>
                    <span className="text-xs font-mono" style={{ color: 'var(--text-dim)' }}>{dep.version}</span>
                    {dep.isDev && <span className="pill !py-0 !px-2 !text-[10px]" style={{ background: 'rgba(79,143,247,0.1)', color: 'var(--blue)' }}>DEV</span>}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-16 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--bg)' }}>
                      <div className="h-full rounded-full" style={{ width: `${dep.score.overall}%`, background: rc(dep.riskLevel) }} />
                    </div>
                    <span className="text-sm font-bold w-7 text-right" style={{ color: rc(dep.riskLevel) }}>{dep.score.overall}</span>
                    <RiskBadge level={dep.riskLevel} />
                  </div>
                </td>
                <td className="px-6 py-4 text-sm" style={{ color: 'var(--text-2)' }}>{dep.npm?.weeklyDownloads?.toLocaleString() || '—'}</td>
                <td className="px-6 py-4 text-sm" style={{ color: dep.npm && dep.npm.maintainers <= 1 ? 'var(--amber)' : 'var(--text-2)' }}>{dep.npm?.maintainers ?? '—'}</td>
                <td className="px-6 py-4">
                  <div className="flex flex-wrap gap-1.5">
                    {dep.flags.slice(0, 3).map((f, j) => <FlagPill key={j} flag={f} />)}
                    {dep.flags.length > 3 && <span className="text-xs" style={{ color: 'var(--text-dim)' }}>+{dep.flags.length - 3}</span>}
                  </div>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>

      <AnimatePresence>
        {expanded && (() => {
          const dep = dependencies.find(d => d.name === expanded);
          if (!dep) return null;
          return (
            <motion.div key={expanded} initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden border-t" style={{ borderColor: 'var(--border)', background: 'var(--bg-3)' }}>
              <div className="p-6 grid grid-cols-2 md:grid-cols-4 gap-6">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wide mb-3" style={{ color: 'var(--text-3)' }}>Risk Breakdown</h4>
                  <div className="space-y-3">
                    {(['maintenance', 'security', 'popularity', 'community', 'depthRisk'] as const).map((k, i) => (
                      <MetricBar key={k} label={k === 'depthRisk' ? 'Depth' : k.charAt(0).toUpperCase() + k.slice(1)} value={dep.score[k]} delay={i * 0.05} />
                    ))}
                  </div>
                </div>
                {[
                  { t: 'Package', items: [['Published', dep.npm ? new Date(dep.npm.lastPublish).toLocaleDateString() : '—'], ['Versions', String(dep.npm?.versions ?? '—')], ['License', dep.npm?.license || '—']] },
                  { t: 'GitHub', items: [['Stars', dep.github?.stars?.toLocaleString() ?? '—'], ['Issues', dep.github?.openIssues?.toLocaleString() ?? '—'], ['Archived', dep.github ? (dep.github.archived ? 'Yes' : 'No') : '—']] },
                  { t: 'Tree', items: [['Direct', String(dep.directDeps.length)], ['Transitive', String(dep.transitiveCount)], ['Depth', String(dep.depth)]] },
                ].map(s => (
                  <div key={s.t}>
                    <h4 className="text-xs font-bold uppercase tracking-wide mb-3" style={{ color: 'var(--text-3)' }}>{s.t}</h4>
                    <dl className="space-y-2 text-sm">
                      {s.items.map(([k, v]) => <div key={k} className="flex justify-between"><dt style={{ color: 'var(--text-3)' }}>{k}</dt><dd className="font-medium" style={{ color: 'var(--text-2)' }}>{v}</dd></div>)}
                    </dl>
                  </div>
                ))}
              </div>
            </motion.div>
          );
        })()}
      </AnimatePresence>
    </div>
  );
}
