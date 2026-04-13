'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ScanResult, AIInsight } from '@/types';
import SplashScreen from '@/components/SplashScreen';
import Header from '@/components/Header';
import PackageInput from '@/components/PackageInput';
import ScoreRing from '@/components/ScoreRing';
import StatCard from '@/components/StatCard';
import DependencyTable from '@/components/DependencyTable';
import DependencyGraph from '@/components/DependencyGraph';
import InsightsPanel from '@/components/InsightsPanel';

type Tab = 'table' | 'graph' | 'insights';

// Cinematic stagger variants
const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 24, filter: 'blur(6px)' },
  visible: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { duration: 0.6, ease: [0.25, 0.1, 0.25, 1] as const } },
};

export default function Home() {
  const [splashDone, setSplashDone] = useState(false);
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

      setInsightsLoading(true);
      fetch('/api/insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(result),
      })
        .then(r => r.json())
        .then(data => setInsights(data.insights || []))
        .catch(() => {})
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

  // Splash screen
  if (!splashDone) {
    return <SplashScreen onComplete={() => setSplashDone(true)} />;
  }

  return (
    <div className="flex-1 flex flex-col">
      <Header />

      <main className="flex-1 max-w-[1440px] w-full mx-auto px-8 py-10">
        {/* ============ INPUT VIEW ============ */}
        <AnimatePresence mode="wait">
          {!scan && (
            <motion.div
              key="input"
              initial="hidden"
              animate="visible"
              exit={{ opacity: 0, y: -30, filter: 'blur(10px)', transition: { duration: 0.4 } }}
              variants={stagger}
              className="max-w-3xl mx-auto"
            >
              {/* Hero */}
              <motion.div variants={fadeUp} className="text-center mb-10">
                <h2
                  className="display text-5xl md:text-6xl leading-tight mb-4"
                  style={{ fontStyle: 'italic' }}
                >
                  Know your <span className="text-gradient">dependencies.</span>
                </h2>
                <p className="text-base max-w-md mx-auto leading-relaxed" style={{ color: 'var(--text-2)' }}>
                  Drop your package.json and get a full risk assessment &mdash; maintenance health,
                  security vulnerabilities, and AI-powered insights.
                </p>
              </motion.div>

              <motion.div variants={fadeUp}>
                <PackageInput onSubmit={handleAnalyze} loading={loading} />
              </motion.div>

              {/* Error */}
              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="mt-5 p-4 rounded-xl mono text-sm"
                    style={{ background: 'var(--red-3)', color: 'var(--red-1)', border: '1px solid rgba(248,113,113,0.2)' }}
                  >
                    {error}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Feature highlights */}
              <motion.div variants={fadeUp} className="mt-12 grid grid-cols-3 gap-4">
                {[
                  { icon: '\u25c8', title: 'Risk Scoring', desc: 'Weighted composite of 5 signals' },
                  { icon: '\u25b2', title: 'Vuln Detection', desc: 'Live npm audit + CVE data' },
                  { icon: '\u25cb', title: 'AI Analysis', desc: 'Llama 3.3 70B insights' },
                ].map((f, i) => (
                  <motion.div
                    key={i}
                    variants={fadeUp}
                    className="glass p-5 text-center group hover-lift"
                  >
                    <span className="mono text-lg block mb-2 group-hover:text-[var(--cyan-1)] transition-colors" style={{ color: 'var(--text-3)' }}>
                      {f.icon}
                    </span>
                    <h4 className="mono text-[11px] font-semibold tracking-wider uppercase mb-1" style={{ color: 'var(--text-1)' }}>
                      {f.title}
                    </h4>
                    <p className="text-[11px]" style={{ color: 'var(--text-3)' }}>{f.desc}</p>
                  </motion.div>
                ))}
              </motion.div>
            </motion.div>
          )}

          {/* ============ RESULTS DASHBOARD ============ */}
          {scan && (
            <motion.div
              key="results"
              initial="hidden"
              animate="visible"
              variants={stagger}
            >
              {/* Top bar */}
              <motion.div variants={fadeUp} className="flex items-center justify-between mb-8">
                <motion.button
                  whileHover={{ x: -3 }}
                  onClick={() => { setScan(null); setInsights([]); setActiveTab('table'); }}
                  className="flex items-center gap-2 mono text-[11px] transition-colors"
                  style={{ color: 'var(--text-3)' }}
                >
                  <span>&larr;</span> New Scan
                </motion.button>
                <div className="flex items-center gap-2">
                  {(['json', 'csv'] as const).map(fmt => (
                    <motion.button
                      key={fmt}
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => handleExport(fmt)}
                      className="glass px-4 py-2 mono text-[10px] uppercase tracking-wider transition-all"
                      style={{ color: 'var(--text-2)' }}
                    >
                      Export {fmt.toUpperCase()}
                    </motion.button>
                  ))}
                </div>
              </motion.div>

              {/* Score overview */}
              <motion.div variants={fadeUp} className="grid grid-cols-12 gap-6 mb-10">
                {/* Big score ring */}
                <div className="col-span-12 md:col-span-4 lg:col-span-3 glass-lg shine-top flex flex-col items-center justify-center p-8">
                  <ScoreRing
                    score={scan.overallScore}
                    size={190}
                    riskLevel={scan.overallRiskLevel}
                    label="Project Risk"
                  />
                  <div className="mt-5 text-center">
                    <p className="display text-lg" style={{ color: 'var(--text-1)' }}>
                      {scan.projectName}
                    </p>
                    <p className="mono text-[10px] mt-1" style={{ color: 'var(--text-ghost)' }}>
                      {new Date(scan.timestamp).toLocaleString()}
                    </p>
                  </div>
                </div>

                {/* Stats grid */}
                <div className="col-span-12 md:col-span-8 lg:col-span-9 grid grid-cols-2 lg:grid-cols-4 gap-3">
                  <StatCard label="Total Deps" value={scan.totalDependencies} delay={0.1} icon={'\u25a0'} />
                  <StatCard label="Direct" value={scan.directDependencies} delay={0.15} accent="var(--cyan-1)" icon={'\u2192'} />
                  <StatCard label="Dev Deps" value={scan.devDependencies} delay={0.2} accent="var(--text-2)" icon={'\u2699'} />
                  <StatCard
                    label="Critical"
                    value={scan.criticalCount}
                    delay={0.25}
                    accent={scan.criticalCount > 0 ? '#ff6b6b' : 'var(--green-1)'}
                    icon={'\u25b2'}
                  />
                  <StatCard
                    label="High Risk"
                    value={scan.highCount}
                    delay={0.3}
                    accent={scan.highCount > 0 ? 'var(--red-1)' : 'var(--green-1)'}
                    icon={'\u26a0'}
                  />
                  <StatCard
                    label="Medium Risk"
                    value={scan.mediumCount}
                    delay={0.35}
                    accent={scan.mediumCount > 0 ? 'var(--amber-1)' : 'var(--green-1)'}
                    icon={'\u25cb'}
                  />
                  <StatCard label="Low Risk" value={scan.lowCount} delay={0.4} accent="var(--green-1)" icon={'\u2713'} />
                  <StatCard
                    label="Vulns"
                    value={scan.dependencies.reduce((s, d) => s + d.vulnerabilities.length, 0)}
                    delay={0.45}
                    accent={scan.dependencies.some(d => d.vulnerabilities.length > 0) ? 'var(--red-1)' : 'var(--green-1)'}
                    icon={'\u25c6'}
                  />
                </div>
              </motion.div>

              {/* Tab navigation */}
              <motion.div variants={fadeUp} className="flex items-center gap-1 mb-8 p-1 rounded-xl w-fit glass">
                {([
                  { id: 'table' as Tab, label: 'Dependencies', count: scan.totalDependencies },
                  { id: 'graph' as Tab, label: 'Graph View', count: null },
                  { id: 'insights' as Tab, label: 'AI Insights', count: insights.length || null },
                ]).map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className="relative px-5 py-2.5 rounded-lg mono text-[11px] font-medium transition-all"
                    style={{
                      color: activeTab === tab.id ? 'var(--text-1)' : 'var(--text-3)',
                      background: activeTab === tab.id ? 'var(--panel)' : 'transparent',
                    }}
                  >
                    {activeTab === tab.id && (
                      <motion.div
                        layoutId="active-tab-bg"
                        className="absolute inset-0 rounded-lg"
                        style={{ background: 'var(--panel)', border: '1px solid var(--border-2)' }}
                        transition={{ type: 'spring', stiffness: 400, damping: 35 }}
                      />
                    )}
                    <span className="relative z-10">{tab.label}</span>
                    {tab.count !== null && (
                      <span className="relative z-10 ml-2 px-1.5 py-0.5 text-[9px] rounded" style={{
                        background: activeTab === tab.id ? 'var(--cyan-3)' : 'transparent',
                        color: activeTab === tab.id ? 'var(--cyan-1)' : 'var(--text-3)',
                      }}>
                        {tab.count}
                      </span>
                    )}
                    {tab.id === 'insights' && insightsLoading && (
                      <span className="relative z-10 ml-2">
                        <span className="inline-flex h-1.5 w-1.5 rounded-full animate-ping" style={{ background: 'var(--cyan-1)' }} />
                      </span>
                    )}
                  </button>
                ))}
              </motion.div>

              {/* Tab content */}
              <AnimatePresence mode="wait">
                {activeTab === 'table' && (
                  <motion.div
                    key="table"
                    initial={{ opacity: 0, y: 16, filter: 'blur(4px)' }}
                    animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                    exit={{ opacity: 0, y: -16, filter: 'blur(4px)' }}
                    transition={{ duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
                  >
                    <DependencyTable dependencies={scan.dependencies} />
                  </motion.div>
                )}
                {activeTab === 'graph' && (
                  <motion.div
                    key="graph"
                    initial={{ opacity: 0, y: 16, filter: 'blur(4px)' }}
                    animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                    exit={{ opacity: 0, y: -16, filter: 'blur(4px)' }}
                    transition={{ duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
                  >
                    <DependencyGraph tree={scan.tree} />
                  </motion.div>
                )}
                {activeTab === 'insights' && (
                  <motion.div
                    key="insights"
                    initial={{ opacity: 0, y: 16, filter: 'blur(4px)' }}
                    animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                    exit={{ opacity: 0, y: -16, filter: 'blur(4px)' }}
                    transition={{ duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
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
      <footer className="border-t py-5 px-8" style={{ borderColor: 'var(--border-1)' }}>
        <div className="max-w-[1440px] mx-auto flex items-center justify-between">
          <span className="mono text-[10px]" style={{ color: 'var(--text-ghost)' }}>
            DepScope v1.0 &mdash; Dependency Risk Analyzer
          </span>
          <span className="mono text-[10px]" style={{ color: 'var(--text-ghost)' }}>
            AI powered by Llama 3.3 70B via Groq
          </span>
        </div>
      </footer>
    </div>
  );
}
