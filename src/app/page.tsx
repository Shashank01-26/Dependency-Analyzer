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

export default function Home() {
  const [splashDone, setSplashDone] = useState(false);
  const [scan, setScan] = useState<ScanResult | null>(null);
  const [insights, setInsights] = useState<AIInsight[]>([]);
  const [loading, setLoading] = useState(false);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [tab, setTab] = useState<Tab>('table');
  const [error, setError] = useState<string | null>(null);

  const analyze = useCallback(async (raw: string) => {
    setLoading(true); setError(null); setScan(null); setInsights([]);
    try {
      const res = await fetch('/api/analyze', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ raw }) });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed');
      const result: ScanResult = await res.json();
      setScan(result);
      setInsightsLoading(true);
      fetch('/api/insights', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(result) })
        .then(r => r.json()).then(d => setInsights(d.insights || [])).catch(() => {}).finally(() => setInsightsLoading(false));
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed'); }
    finally { setLoading(false); }
  }, []);

  const exportReport = async (fmt: 'json' | 'csv') => {
    if (!scan) return;
    const res = await fetch('/api/export', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ scan, format: fmt }) });
    const b = await res.blob(); const u = URL.createObjectURL(b);
    const a = document.createElement('a'); a.href = u; a.download = `depscope-${scan.id.slice(0, 8)}.${fmt}`; a.click(); URL.revokeObjectURL(u);
  };

  if (!splashDone) return <SplashScreen onComplete={() => setSplashDone(true)} />;

  return (
    <div className="flex-1 flex flex-col">
      <Header />
      <main className="flex-1 max-w-6xl w-full mx-auto px-6 py-10">
        <AnimatePresence mode="wait">
          {/* ═══ INPUT ═══ */}
          {!scan && (
            <motion.div key="input" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
              className="max-w-2xl mx-auto">
              <div className="text-center mb-10">
                <motion.h2 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                  className="text-4xl md:text-5xl font-extrabold text-white leading-tight mb-4">
                  Know your{' '}<span className="gradient-text">dependencies.</span>
                </motion.h2>
                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
                  className="text-lg" style={{ color: 'var(--text-2)' }}>
                  Scan npm, Flutter, or Android dependencies for risk, vulnerabilities, and AI-powered insights.
                </motion.p>
              </div>

              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                <PackageInput onSubmit={analyze} loading={loading} />
              </motion.div>

              <AnimatePresence>{error && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="mt-5 p-4 rounded-xl text-sm font-medium"
                  style={{ background: 'rgba(255,69,58,0.1)', color: 'var(--rose)', border: '1px solid rgba(255,69,58,0.2)' }}>{error}</motion.div>
              )}</AnimatePresence>

              {/* Features */}
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
                className="mt-14 grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                  { icon: '📦', title: 'Multi-Ecosystem', desc: 'npm, Flutter & Android support', color: 'var(--blue)' },
                  { icon: '🔒', title: 'Vuln Detection', desc: 'Registry + CVE scanning', color: 'var(--rose)' },
                  { icon: '🤖', title: 'AI Analysis', desc: 'Llama 3.3 70B insights', color: 'var(--violet)' },
                ].map((f, i) => (
                  <motion.div key={i} whileHover={{ y: -4, borderColor: 'var(--border-2)' }}
                    className="card p-6 text-center cursor-default transition-shadow hover:shadow-lg hover:shadow-[rgba(79,143,247,0.05)]">
                    <span className="text-3xl block mb-3">{f.icon}</span>
                    <h4 className="text-sm font-bold text-white mb-1">{f.title}</h4>
                    <p className="text-sm" style={{ color: 'var(--text-3)' }}>{f.desc}</p>
                  </motion.div>
                ))}
              </motion.div>
            </motion.div>
          )}

          {/* ═══ DASHBOARD ═══ */}
          {scan && (
            <motion.div key="results" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <div className="flex items-center justify-between mb-8">
                <button onClick={() => { setScan(null); setInsights([]); setTab('table'); }} className="btn btn-ghost">← New Scan</button>
                <div className="flex gap-2">
                  {(['json', 'csv'] as const).map(f => <button key={f} onClick={() => exportReport(f)} className="btn btn-ghost">Export {f.toUpperCase()}</button>)}
                </div>
              </div>

              {/* Score + Stats */}
              <div className="grid grid-cols-12 gap-5 mb-10">
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                  className="col-span-12 md:col-span-4 lg:col-span-3 card-glow">
                  <div className="bg-[var(--bg-2)] rounded-[17px] flex flex-col items-center justify-center p-8">
                    <ScoreRing score={scan.overallScore} size={180} riskLevel={scan.overallRiskLevel} label="Risk Score" />
                    <p className="text-lg font-bold text-white mt-4">{scan.projectName}</p>
                    <div className="flex items-center justify-center gap-2 mt-2">
                      <span className="pill !text-[10px]" style={{ background: 'rgba(79,143,247,0.1)', color: 'var(--blue)' }}>
                        {scan.ecosystem === 'flutter' ? '🐦 Flutter' : scan.ecosystem === 'android' ? '🤖 Android' : '📦 npm'}
                      </span>
                      <span className="text-xs" style={{ color: 'var(--text-dim)' }}>{new Date(scan.timestamp).toLocaleString()}</span>
                    </div>
                  </div>
                </motion.div>
                <div className="col-span-12 md:col-span-8 lg:col-span-9 grid grid-cols-2 lg:grid-cols-4 gap-3">
                  <StatCard label="Total" value={scan.totalDependencies} icon="📦" delay={0.05} />
                  <StatCard label="Direct" value={scan.directDependencies} icon="→" accent="var(--blue)" delay={0.1} />
                  <StatCard label="Dev" value={scan.devDependencies} icon="⚙" accent="var(--text-2)" delay={0.15} />
                  <StatCard label="Critical" value={scan.criticalCount} icon="🚨" accent={scan.criticalCount > 0 ? 'var(--rose)' : 'var(--green)'} delay={0.2} />
                  <StatCard label="High" value={scan.highCount} icon="⚠" accent={scan.highCount > 0 ? 'var(--rose)' : 'var(--green)'} delay={0.25} />
                  <StatCard label="Medium" value={scan.mediumCount} icon="●" accent={scan.mediumCount > 0 ? 'var(--amber)' : 'var(--green)'} delay={0.3} />
                  <StatCard label="Low" value={scan.lowCount} icon="✓" accent="var(--green)" delay={0.35} />
                  <StatCard label="Vulns" value={scan.dependencies.reduce((s, d) => s + d.vulnerabilities.length, 0)} icon="🔒"
                    accent={scan.dependencies.some(d => d.vulnerabilities.length > 0) ? 'var(--rose)' : 'var(--green)'} delay={0.4} />
                </div>
              </div>

              {/* Tabs */}
              <div className="flex gap-1 mb-8 p-1 rounded-xl w-fit" style={{ background: 'var(--bg-2)', border: '1px solid var(--border)' }}>
                {([
                  { id: 'table' as Tab, label: '📋 Dependencies', count: scan.totalDependencies },
                  { id: 'graph' as Tab, label: '🕸 Graph' },
                  { id: 'insights' as Tab, label: '🤖 AI Insights', count: insights.length || undefined },
                ]).map(t => (
                  <button key={t.id} onClick={() => setTab(t.id)}
                    className="relative px-5 h-11 rounded-lg text-sm font-semibold transition-all"
                    style={{ color: tab === t.id ? 'white' : 'var(--text-3)' }}>
                    {tab === t.id && <motion.div layoutId="tabBg" className="absolute inset-0 rounded-lg"
                      style={{ background: 'var(--bg-4)', border: '1px solid var(--border-2)' }}
                      transition={{ type: 'spring', stiffness: 400, damping: 30 }} />}
                    <span className="relative z-10 flex items-center gap-2">
                      {t.label}
                      {'count' in t && t.count != null && <span className="text-xs px-2 py-0.5 rounded-full"
                        style={{ background: tab === t.id ? 'rgba(79,143,247,0.1)' : 'transparent', color: tab === t.id ? 'var(--blue)' : 'var(--text-dim)' }}>{t.count}</span>}
                      {t.id === 'insights' && insightsLoading && <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: 'var(--blue)' }} />}
                    </span>
                  </button>
                ))}
              </div>

              <AnimatePresence mode="wait">
                {tab === 'table' && <motion.div key="t" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}><DependencyTable dependencies={scan.dependencies} /></motion.div>}
                {tab === 'graph' && <motion.div key="g" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}><DependencyGraph tree={scan.tree} /></motion.div>}
                {tab === 'insights' && <motion.div key="i" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}><InsightsPanel insights={insights} loading={insightsLoading} /></motion.div>}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <footer className="border-t py-5 px-6" style={{ borderColor: 'var(--border)' }}>
        <div className="max-w-6xl mx-auto flex justify-between text-xs" style={{ color: 'var(--text-dim)' }}>
          <span>DepScope v1.0</span><span>AI powered by Llama 3.3 70B via Groq</span>
        </div>
      </footer>
    </div>
  );
}
