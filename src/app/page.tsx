'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ScanResult, AIInsight } from '@/types';
import Header from '@/components/Header';
import PackageInput from '@/components/PackageInput';
import ScoreRing from '@/components/ScoreRing';
import StatCard from '@/components/StatCard';
import DependencyTable from '@/components/DependencyTable';
import DependencyGraph from '@/components/DependencyGraph';
import InsightsPanel from '@/components/InsightsPanel';

type Tab = 'table' | 'graph' | 'insights';

export default function Home() {
  const [scan, setScan] = useState<ScanResult | null>(null);
  const [insights, setInsights] = useState<AIInsight[]>([]);
  const [loading, setLoading] = useState(false);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('table');
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = useCallback(async (raw: string) => {
    setLoading(true);
    setError(null);
    setScan(null);
    setInsights([]);

    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ raw }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Analysis failed');
      }

      const result: ScanResult = await res.json();
      setScan(result);

      // Fetch AI insights in background
      setInsightsLoading(true);
      fetch('/api/insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(result),
      })
        .then(r => r.json())
        .then(data => {
          setInsights(data.insights || []);
        })
        .catch(() => {
          // Insights are non-critical
        })
        .finally(() => setInsightsLoading(false));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleExport = async (format: 'json' | 'csv') => {
    if (!scan) return;

    const res = await fetch('/api/export', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scan, format }),
    });

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `depscope-report-${scan.id.slice(0, 8)}.${format}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex-1 flex flex-col" style={{ background: 'var(--bg-void)' }}>
      <Header />

      <main className="flex-1 max-w-[1440px] w-full mx-auto px-6 py-8">
        {/* Input Section */}
        {!scan && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-3xl mx-auto"
          >
            {/* Hero */}
            <div className="text-center mb-8">
              <motion.h2
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="text-3xl font-bold mb-3"
                style={{ color: 'var(--text-primary)', fontFamily: "'DM Sans', sans-serif" }}
              >
                Know your dependencies.
              </motion.h2>
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-sm max-w-lg mx-auto"
                style={{ color: 'var(--text-secondary)' }}
              >
                Drop your package.json and get a full risk assessment — maintenance health,
                security vulnerabilities, dependency depth, and AI-powered recommendations.
              </motion.p>
            </div>

            <PackageInput onSubmit={handleAnalyze} loading={loading} />

            {/* Error */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="mt-4 p-3 rounded-lg text-sm font-mono"
                  style={{ background: 'var(--red-dim)', color: 'var(--red-solid)', border: '1px solid var(--red-muted)' }}
                >
                  {error}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}

        {/* Results Dashboard */}
        <AnimatePresence>
          {scan && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
            >
              {/* Top bar */}
              <div className="flex items-center justify-between mb-6">
                <button
                  onClick={() => { setScan(null); setInsights([]); }}
                  className="flex items-center gap-2 text-xs font-mono transition-colors"
                  style={{ color: 'var(--text-tertiary)' }}
                >
                  <span>&larr;</span> New Scan
                </button>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleExport('json')}
                    className="px-3 py-1.5 rounded text-[11px] font-mono transition-colors"
                    style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)' }}
                  >
                    Export JSON
                  </button>
                  <button
                    onClick={() => handleExport('csv')}
                    className="px-3 py-1.5 rounded text-[11px] font-mono transition-colors"
                    style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)' }}
                  >
                    Export CSV
                  </button>
                </div>
              </div>

              {/* Score overview row */}
              <div className="grid grid-cols-12 gap-6 mb-8">
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.1 }}
                  className="col-span-12 md:col-span-4 lg:col-span-3 panel flex flex-col items-center justify-center p-8"
                >
                  <ScoreRing
                    score={scan.overallScore}
                    size={180}
                    riskLevel={scan.overallRiskLevel}
                    label="Project Risk"
                  />
                  <div className="mt-4 text-center">
                    <p className="text-xs font-mono" style={{ color: 'var(--text-tertiary)' }}>
                      {scan.projectName}
                    </p>
                    <p className="text-[10px] font-mono mt-1" style={{ color: 'var(--text-tertiary)' }}>
                      Scanned {new Date(scan.timestamp).toLocaleString()}
                    </p>
                  </div>
                </motion.div>

                <div className="col-span-12 md:col-span-8 lg:col-span-9 grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <StatCard label="Total Deps" value={scan.totalDependencies} delay={0.15} icon={'\ud83d\udce6'} />
                  <StatCard label="Direct" value={scan.directDependencies} delay={0.2} accent="var(--cyan-solid)" icon={'\u27a1\ufe0f'} />
                  <StatCard label="Dev Deps" value={scan.devDependencies} delay={0.25} accent="var(--text-secondary)" icon={'\ud83d\udd27'} />
                  <StatCard
                    label="Critical"
                    value={scan.criticalCount}
                    delay={0.3}
                    accent={scan.criticalCount > 0 ? 'var(--red-glow)' : 'var(--green-solid)'}
                    icon={'\ud83d\udea8'}
                  />
                  <StatCard
                    label="High Risk"
                    value={scan.highCount}
                    delay={0.35}
                    accent={scan.highCount > 0 ? 'var(--red-solid)' : 'var(--green-solid)'}
                    icon={'\u26a0\ufe0f'}
                  />
                  <StatCard
                    label="Medium Risk"
                    value={scan.mediumCount}
                    delay={0.4}
                    accent={scan.mediumCount > 0 ? 'var(--amber-solid)' : 'var(--green-solid)'}
                    icon={'\ud83d\udfe1'}
                  />
                  <StatCard
                    label="Low Risk"
                    value={scan.lowCount}
                    delay={0.45}
                    accent="var(--green-solid)"
                    icon={'\u2705'}
                  />
                  <StatCard
                    label="Vulnerabilities"
                    value={scan.dependencies.reduce((sum, d) => sum + d.vulnerabilities.length, 0)}
                    delay={0.5}
                    accent={scan.dependencies.some(d => d.vulnerabilities.length > 0) ? 'var(--red-solid)' : 'var(--green-solid)'}
                    icon={'\ud83d\udd12'}
                  />
                </div>
              </div>

              {/* Tab navigation */}
              <div className="flex items-center gap-1 mb-6 p-1 rounded-lg w-fit" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-dim)' }}>
                {([
                  { id: 'table' as Tab, label: 'Dependencies', count: scan.totalDependencies },
                  { id: 'graph' as Tab, label: 'Graph View', count: null },
                  { id: 'insights' as Tab, label: 'AI Insights', count: insights.length || null },
                ]).map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className="relative px-4 py-2 rounded-md text-xs font-mono font-medium transition-colors"
                    style={{
                      color: activeTab === tab.id ? 'var(--text-primary)' : 'var(--text-tertiary)',
                      background: activeTab === tab.id ? 'var(--bg-panel)' : 'transparent',
                    }}
                  >
                    {tab.label}
                    {tab.count !== null && (
                      <span className="ml-1.5 px-1.5 py-0.5 text-[9px] rounded" style={{
                        background: activeTab === tab.id ? 'var(--cyan-dim)' : 'var(--bg-surface)',
                        color: activeTab === tab.id ? 'var(--cyan-solid)' : 'var(--text-tertiary)',
                      }}>
                        {tab.count}
                      </span>
                    )}
                    {tab.id === 'insights' && insightsLoading && (
                      <span className="ml-1.5 w-2 h-2 rounded-full animate-pulse inline-block" style={{ background: 'var(--cyan-solid)' }} />
                    )}
                  </button>
                ))}
              </div>

              {/* Tab content */}
              <AnimatePresence mode="wait">
                {activeTab === 'table' && (
                  <motion.div
                    key="table"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                  >
                    <DependencyTable dependencies={scan.dependencies} />
                  </motion.div>
                )}
                {activeTab === 'graph' && (
                  <motion.div
                    key="graph"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                  >
                    <DependencyGraph tree={scan.tree} />
                  </motion.div>
                )}
                {activeTab === 'insights' && (
                  <motion.div
                    key="insights"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                  >
                    <InsightsPanel insights={insights} loading={insightsLoading} />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="border-t py-4 px-6" style={{ borderColor: 'var(--border-dim)' }}>
        <div className="max-w-[1440px] mx-auto flex items-center justify-between">
          <span className="text-[10px] font-mono" style={{ color: 'var(--text-tertiary)' }}>
            DepScope v1.0 — Dependency Risk Analyzer
          </span>
          <span className="text-[10px] font-mono" style={{ color: 'var(--text-tertiary)' }}>
            AI powered by Gemma 3 via Groq
          </span>
        </div>
      </footer>
    </div>
  );
}
