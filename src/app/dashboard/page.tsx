'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { ScanSummary } from '@/types';
import { listScans, deleteScan } from '@/lib/scan-store';

const RISK_COLORS: Record<string, string> = {
  critical: 'text-red-400 border-red-900 bg-red-950/30',
  high: 'text-orange-400 border-orange-900 bg-orange-950/30',
  medium: 'text-yellow-400 border-yellow-900 bg-yellow-950/30',
  low: 'text-green-400 border-green-900 bg-green-950/30',
};

const ECOSYSTEM_ICONS: Record<string, string> = {
  npm: '⬡', flutter: '🐦', android: '🤖', python: '🐍',
  rust: '🦀', go: '🐹', ruby: '💎', dotnet: '⬡',
};

function ScoreBar({ score }: { score: number }) {
  const color = score >= 70 ? '#ef4444' : score >= 45 ? '#f97316' : score >= 25 ? '#eab308' : '#22c55e';
  return (
    <div className="w-full bg-zinc-800 rounded-full h-1.5 mt-2">
      <div className="h-1.5 rounded-full transition-all" style={{ width: `${score}%`, background: color }} />
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

  // Group by project name, show latest per project
  const byProject = new Map<string, ScanSummary>();
  for (const scan of filtered) {
    if (!byProject.has(scan.projectName)) byProject.set(scan.projectName, scan);
  }
  const projects = Array.from(byProject.values());

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white">Dashboard</h1>
            <p className="text-zinc-500 text-sm mt-1">{scans.length} scans · {projects.length} projects</p>
          </div>
          <Link
            href="/"
            className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white text-sm rounded-lg transition-colors border border-zinc-700"
          >
            + New Scan
          </Link>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {(['critical', 'high', 'medium', 'low'] as const).map(level => {
            const count = scans.filter(s => s.overallRiskLevel === level).length;
            return (
              <div key={level} className={`rounded-xl border p-4 ${RISK_COLORS[level]}`}>
                <p className="text-xs uppercase tracking-wide opacity-70">{level}</p>
                <p className="text-3xl font-bold mt-1">{count}</p>
                <p className="text-xs opacity-60 mt-0.5">projects</p>
              </div>
            );
          })}
        </div>

        {/* Ecosystem filter */}
        {ecosystems.length > 2 && (
          <div className="flex gap-2 mb-6 flex-wrap">
            {ecosystems.map(eco => (
              <button
                key={eco}
                onClick={() => setFilter(eco)}
                className={`px-3 py-1 rounded-full text-sm border transition-colors ${
                  filter === eco
                    ? 'bg-zinc-700 border-zinc-500 text-white'
                    : 'border-zinc-800 text-zinc-400 hover:text-white'
                }`}
              >
                {eco === 'all' ? 'All' : `${ECOSYSTEM_ICONS[eco] ?? ''} ${eco}`}
              </button>
            ))}
          </div>
        )}

        {/* Project cards */}
        {projects.length === 0 ? (
          <div className="text-center py-24 text-zinc-500">
            <p className="text-lg">No scans yet</p>
            <p className="text-sm mt-2">Run a scan from the <Link href="/" className="text-blue-400 hover:underline">home page</Link></p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map((scan, i) => {
              const projectScans = scans.filter(s => s.projectName === scan.projectName);
              return (
                <motion.div
                  key={scan.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 hover:border-zinc-700 transition-colors group"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm">{ECOSYSTEM_ICONS[scan.ecosystem] ?? '📦'}</span>
                        <Link
                          href={`/?scan=${scan.id}`}
                          className="font-semibold text-white truncate hover:underline text-sm"
                        >
                          {scan.projectName}
                        </Link>
                      </div>
                      <p className="text-zinc-500 text-xs mt-0.5">
                        {scan.totalDependencies} deps · {new Date(scan.timestamp).toLocaleDateString()}
                      </p>
                    </div>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded border flex-shrink-0 ${RISK_COLORS[scan.overallRiskLevel]}`}>
                      {scan.overallRiskLevel}
                    </span>
                  </div>

                  <div className="mt-3">
                    <div className="flex items-end justify-between">
                      <span className="text-2xl font-bold text-white">{scan.overallScore}</span>
                      <span className="text-zinc-500 text-xs">/100</span>
                    </div>
                    <ScoreBar score={scan.overallScore} />
                  </div>

                  {scan.criticalCount > 0 && (
                    <p className="text-red-400 text-xs mt-2">{scan.criticalCount} critical dep{scan.criticalCount > 1 ? 's' : ''}</p>
                  )}

                  <div className="flex items-center justify-between mt-4 opacity-0 group-hover:opacity-100 transition-opacity">
                    <p className="text-zinc-600 text-xs">{projectScans.length} scan{projectScans.length > 1 ? 's' : ''}</p>
                    <button
                      onClick={() => handleDelete(scan.id)}
                      className="text-zinc-600 hover:text-red-400 text-xs transition-colors"
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
