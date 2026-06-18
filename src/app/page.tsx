'use client';
import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ScanResult, AIInsight } from '@/types';
import SplashScreen from '@/components/SplashScreen';
import Header from '@/components/Header';
import PackageInput from '@/components/PackageInput';
import ScoreRing from '@/components/ScoreRing';
import DependencyTable from '@/components/DependencyTable';
import DependencyGraph from '@/components/DependencyGraph';
import InsightsPanel from '@/components/InsightsPanel';

type Tab = 'table' | 'graph' | 'insights';

/* ── Risk level → iOS color ── */
function riskColor(level: string): string {
  return ({ critical: '#F43F5E', high: '#F87171', medium: '#FBBF24', low: '#34D399' })[level] ?? 'rgba(255,255,255,0.5)';
}

/* ── Risk level → glass tint class ── */
function riskGlass(level: string): string {
  return ({ critical: 'glass-danger', high: 'glass-warn', medium: 'glass-warn', low: 'glass-safe' })[level] ?? '';
}

/* ── Ecosystem display label ── */
function ecoLabel(eco: string): string {
  return ({
    npm: '⬡ npm', flutter: '◈ Flutter', android: '△ Android',
    python: '◆ Python', rust: '◉ Rust', go: '◎ Go', ruby: '◇ Ruby', dotnet: '⬡ .NET',
  })[eco] ?? eco;
}

/* ── Stagger ease ── */
const ease = [0.25, 0.1, 0.25, 1] as const;

export default function Home() {
  const [splashDone, setSplashDone]           = useState(false);
  const [scan, setScan]                       = useState<ScanResult | null>(null);
  const [insights, setInsights]               = useState<AIInsight[]>([]);
  const [loading, setLoading]                 = useState(false);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [tab, setTab]                         = useState<Tab>('table');
  const [error, setError]                     = useState<string | null>(null);

  const analyze = useCallback(async (raw: string) => {
    setLoading(true); setError(null); setScan(null); setInsights([]);
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ raw }),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Analysis failed');
      const result: ScanResult = await res.json();
      setScan(result);
      setInsightsLoading(true);
      fetch('/api/insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(result),
      })
        .then(r => r.json())
        .then(d => setInsights(d.insights || []))
        .catch(() => {})
        .finally(() => setInsightsLoading(false));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Analysis failed');
    } finally {
      setLoading(false);
    }
  }, []);

  const exportReport = async (fmt: string) => {
    if (!scan) return;
    const res = await fetch('/api/export', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scan, format: fmt }),
    });
    const b = await res.blob();
    const u = URL.createObjectURL(b);
    const a = document.createElement('a');
    a.href = u; a.download = `depscope-${scan.id.slice(0, 8)}.${fmt}`; a.click();
    URL.revokeObjectURL(u);
  };

  if (!splashDone) return <SplashScreen onComplete={() => setSplashDone(true)} />;

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Header />

      <main style={{
        flex: 1, position: 'relative', zIndex: 10,
        maxWidth: 1440, width: '100%', margin: '0 auto',
        padding: '20px 20px 0',
      }}>
        <AnimatePresence mode="wait">

          {/* ════════════════════════════════════════
              INPUT  SCREEN
          ════════════════════════════════════════ */}
          {!scan && (
            <motion.div key="input"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.4, ease }}>

              {/* Error banner */}
              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                    className="glass-cell glass-danger mb-3 flex items-center gap-3 px-5 py-3">
                    <span style={{ fontSize: 16 }}>⚠</span>
                    <span style={{ fontFamily: 'var(--sans)', fontSize: 14, color: '#F87171', fontWeight: 500 }}>
                      {error}
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* ── GLASS BENTO GRID ── */}
              <div className="bento-grid" style={{ gridTemplateRows: 'auto auto auto auto' }}>

                {/* Main hero input card — col 1-8, rows 1-3 */}
                <motion.div className="glass-cell"
                  style={{ gridColumn: '1 / 9', gridRow: '1 / 4', minHeight: 500 }}
                  initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: 0.05, ease }}>
                  <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '36px 40px', gap: 28 }}>
                    {/* Eyebrow */}
                    <div>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 18 }}>
                        <span style={{
                          padding: '4px 14px', borderRadius: 999,
                          background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.22)',
                          fontFamily: 'var(--sans)', fontSize: 12, fontWeight: 600,
                          color: '#818CF8', letterSpacing: '0.01em',
                        }}>
                          Dependency Intelligence
                        </span>
                      </div>
                      <h1 className="display-heading">
                        Know what<br />
                        <span style={{
                          background: 'linear-gradient(135deg, #818CF8 0%, #6366F1 50%, #60A5FA 100%)',
                          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                          backgroundClip: 'text',
                        }}>
                          you ship.
                        </span>
                      </h1>
                      <p style={{
                        fontFamily: 'var(--sans)', fontSize: 15, color: 'rgba(255,255,255,0.48)',
                        lineHeight: 1.65, marginTop: 16, maxWidth: 460, fontWeight: 400,
                      }}>
                        Multi-ecosystem scanner across npm, Rust, Go, Python, Flutter, Android,
                        Ruby and .NET. Detect vulnerabilities, license conflicts, and supply chain
                        threats before they reach production.
                      </p>
                    </div>
                    <div style={{ flex: 1 }}>
                      <PackageInput onSubmit={analyze} loading={loading} />
                    </div>
                  </div>
                </motion.div>

                {/* Right stat widgets */}
                {[
                  { label: 'Ecosystems', value: '8+',   sub: 'npm · Rust · Go · Python · Flutter', col: '9 / 11',  row: 1, delay: 0.12, tint: 'glass-blue' },
                  { label: 'CVE Engine', value: 'OSV',  sub: 'Open source vulnerability intel',    col: '11 / 13', row: 1, delay: 0.16, tint: '' },
                  { label: 'AI Engine',  value: 'LLM',  sub: 'Llama 3.3 70B via Groq',            col: '9 / 11',  row: 2, delay: 0.20, tint: '' },
                  { label: 'Response',   value: '<60s', sub: 'Full scan with transitive graph',    col: '11 / 13', row: 2, delay: 0.24, tint: '' },
                ].map(s => (
                  <motion.div key={s.label} className={`glass-cell ${s.tint}`}
                    style={{ gridColumn: s.col, gridRow: String(s.row), padding: 24, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}
                    initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: s.delay, ease }}>
                    <span className="cell-label">{s.label}</span>
                    <div>
                      <span className="cell-number cell-number-md" style={{ color: '#818CF8', marginBottom: 6 }}>{s.value}</span>
                      <span className="cell-label" style={{ color: 'rgba(255,255,255,0.22)' }}>{s.sub}</span>
                    </div>
                  </motion.div>
                ))}

                {/* Supply chain promo — col 9-12, row 3 */}
                <motion.div className="glass-cell"
                  style={{ gridColumn: '9 / 13', gridRow: '3', padding: 24 }}
                  initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.28, ease }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                    <span style={{ fontSize: 15 }}>🔗</span>
                    <span className="cell-label" style={{ color: 'rgba(129,140,248,0.75)' }}>Supply Chain</span>
                  </div>
                  <p style={{ fontFamily: 'var(--sans)', fontSize: 13, color: 'rgba(255,255,255,0.38)', lineHeight: 1.65, fontWeight: 400 }}>
                    Typosquatting detection, install-script flags, license compliance,
                    SBOM export (SPDX 2.3 + CycloneDX 1.5), CI policy engine.
                  </p>
                </motion.div>

                {/* Feature cells — row 4 */}
                {[
                  { icon: '📦', label: 'Multi-Ecosystem',    desc: 'Paste any manifest or lock file — package.json, Cargo.lock, go.mod, requirements.txt, pubspec.yaml and more.', col: '1 / 5' },
                  { icon: '🔒', label: 'Vulnerability Scan', desc: 'OSV + npm audit. CVSS scores, fix versions, transitive dependency paths, EPSS exploit prediction.',             col: '5 / 9' },
                  { icon: '✨', label: 'AI Intelligence',    desc: 'LLM-powered analysis identifies upgrade paths, safer alternatives, and provides context-aware risk assessment.',  col: '9 / 13' },
                ].map((f, i) => (
                  <motion.div key={f.label} className="glass-cell"
                    style={{ gridColumn: f.col, gridRow: '4', padding: 24 }}
                    initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.38 + i * 0.07, ease }}>
                    <div style={{ display: 'flex', gap: 14 }}>
                      <span style={{ fontSize: 22, lineHeight: 1, flexShrink: 0, marginTop: 1 }}>{f.icon}</span>
                      <div>
                        <p style={{ fontFamily: 'var(--sans)', fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.75)', marginBottom: 6 }}>{f.label}</p>
                        <p style={{ fontFamily: 'var(--sans)', fontSize: 13, color: 'rgba(255,255,255,0.38)', lineHeight: 1.65, fontWeight: 400 }}>{f.desc}</p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {/* ════════════════════════════════════════
              RESULTS  SCREEN
          ════════════════════════════════════════ */}
          {scan && (
            <motion.div key="results"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}>

              {/* Action bar */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <button className="btn-ghost" style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                  onClick={() => { setScan(null); setInsights([]); setTab('table'); }}>
                  ← New Scan
                </button>
                <div style={{ display: 'flex', gap: 6 }}>
                  {(['json', 'csv', 'html', 'spdx', 'cyclonedx'] as const).map(f => (
                    <button key={f} className="btn-ghost" style={{ fontSize: 11 }} onClick={() => exportReport(f)}>
                      {f.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              {/* ── RESULTS GLASS GRID ── */}
              <div className="bento-grid" style={{ gridTemplateRows: '196px 124px 76px auto' }}>

                {/* Score — col 1-4, row 1-2 */}
                <motion.div className="glass-cell glass-score"
                  style={{ gridColumn: '1 / 5', gridRow: '1 / 3', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14 }}
                  initial={{ opacity: 0, scale: 0.93 }} animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.08, type: 'spring', stiffness: 180, damping: 20 }}>
                  <span className="cell-label">Risk Score</span>
                  <ScoreRing score={scan.overallScore} size={150} riskLevel={scan.overallRiskLevel} />
                  <span style={{
                    fontFamily: 'var(--sans)', fontSize: 13, fontWeight: 700,
                    color: riskColor(scan.overallRiskLevel), letterSpacing: '0.02em',
                    padding: '5px 16px', borderRadius: 999,
                    background: `${riskColor(scan.overallRiskLevel)}18`,
                    border: `1px solid ${riskColor(scan.overallRiskLevel)}30`,
                    textTransform: 'capitalize',
                  }}>
                    {scan.overallRiskLevel} Risk
                  </span>
                </motion.div>

                {/* Project info — col 5-9, row 1 */}
                <motion.div className="glass-cell"
                  style={{ gridColumn: '5 / 9', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '24px 28px' }}
                  initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.13, ease }}>
                  <span className="cell-label">Project</span>
                  <div>
                    <span className="cell-number" style={{ fontSize: 'clamp(20px, 2.5vw, 32px)', marginBottom: 12, color: 'rgba(255,255,255,0.92)' }}>
                      {scan.projectName}
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                      <span style={{
                        padding: '5px 14px', borderRadius: 999,
                        background: 'rgba(99,102,241,0.10)', border: '1px solid rgba(99,102,241,0.20)',
                        fontFamily: 'var(--sans)', fontSize: 12, fontWeight: 600, color: '#818CF8',
                      }}>
                        {ecoLabel(scan.ecosystem)}
                      </span>
                      <span style={{ fontFamily: 'var(--sans)', fontSize: 12, color: 'rgba(255,255,255,0.28)', fontWeight: 400 }}>
                        {new Date(scan.timestamp).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </motion.div>

                {/* Critical — col 9-13, row 1 */}
                <motion.div className={`glass-cell ${scan.criticalCount > 0 ? 'glass-danger' : ''}`}
                  style={{ gridColumn: '9 / 13', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '22px 24px' }}
                  initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.16, ease }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span className="cell-label">Critical</span>
                  </div>
                  <div>
                    <span className="cell-number cell-number-xl"
                      style={{ color: scan.criticalCount > 0 ? '#F87171' : 'rgba(255,255,255,0.18)' }}>
                      {scan.criticalCount}
                    </span>
                    <span className="cell-label" style={{ marginTop: 4 }}>critical risk deps</span>
                  </div>
                </motion.div>

                {/* Row 2: stat quartet — col 5-12 */}
                {[
                  { label: 'Total Deps', value: scan.totalDependencies, color: 'rgba(255,255,255,0.85)', col: '5 / 7' },
                  { label: 'High Risk',  value: scan.highCount,         color: scan.highCount   > 0 ? '#F87171' : 'rgba(255,255,255,0.28)', col: '7 / 9' },
                  { label: 'Medium',     value: scan.mediumCount,       color: scan.mediumCount > 0 ? '#FBBF24' : 'rgba(255,255,255,0.28)', col: '9 / 11' },
                  { label: 'Low Risk',   value: scan.lowCount,          color: '#34D399',                col: '11 / 13' },
                ].map((m, i) => (
                  <motion.div key={m.label} className="glass-cell"
                    style={{ gridColumn: m.col, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '18px 22px' }}
                    initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.20 + i * 0.04, ease }}>
                    <span className="cell-label">{m.label}</span>
                    <span className="cell-number cell-number-md" style={{ color: m.color }}>{m.value}</span>
                  </motion.div>
                ))}

                {/* Row 3: detail strip — col 1-12 */}
                {[
                  { label: 'Direct',          value: scan.directDependencies,    col: '1 / 4',   color: 'rgba(255,255,255,0.7)' },
                  { label: 'Dev Deps',        value: scan.devDependencies,       col: '4 / 7',   color: 'rgba(255,255,255,0.4)' },
                  { label: 'Vulnerabilities', value: scan.dependencies.reduce((s, d) => s + d.vulnerabilities.length, 0),
                    col: '7 / 10', color: scan.dependencies.some(d => d.vulnerabilities.length > 0) ? '#F87171' : '#34D399' },
                  { label: 'Ecosystem',       value: ecoLabel(scan.ecosystem),   col: '10 / 13', color: '#818CF8', mono: true },
                ].map((m, i) => (
                  <motion.div key={m.label} className="glass-cell"
                    style={{ gridColumn: m.col, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 22px' }}
                    initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.34 + i * 0.04, ease }}>
                    <span className="cell-label">{m.label}</span>
                    <span style={{
                      fontFamily: 'mono' in m && m.mono ? 'var(--mono)' : 'var(--sans)',
                      fontWeight: 'mono' in m && m.mono ? 500 : 800,
                      fontSize: 'mono' in m && m.mono ? 13 : 24,
                      letterSpacing: 'mono' in m && m.mono ? undefined : '-0.03em',
                      color: m.color,
                    }}>{m.value}</span>
                  </motion.div>
                ))}

                {/* Tabs + Content — col 1-12, row 4 */}
                <motion.div className="glass-cell" style={{ gridColumn: '1 / 13', overflow: 'hidden' }}
                  initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.46, ease }}>

                  {/* iOS-style segment tab bar */}
                  <div style={{ display: 'flex', alignItems: 'flex-end', borderBottom: '1px solid rgba(255,255,255,0.08)', padding: '0 6px' }}>
                    {([
                      { id: 'table'    as Tab, label: 'Dependencies',  count: scan.totalDependencies },
                      { id: 'graph'    as Tab, label: 'Graph' },
                      { id: 'insights' as Tab, label: 'AI Insights', count: insights.length || undefined, pulsing: insightsLoading },
                    ]).map(t => {
                      const active = tab === t.id;
                      return (
                        <button key={t.id} onClick={() => setTab(t.id)}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 8,
                            padding: '14px 20px', background: 'none', border: 'none',
                            borderBottom: active ? '2px solid #818CF8' : '2px solid transparent',
                            marginBottom: -1, cursor: 'pointer', transition: 'all 0.2s ease',
                            fontFamily: 'var(--sans)', fontSize: 13, fontWeight: active ? 600 : 500,
                            letterSpacing: '-0.01em',
                            color: active ? '#818CF8' : 'rgba(255,255,255,0.35)',
                          }}>
                          {t.label}
                          {t.count != null && (
                            <span style={{
                              fontFamily: 'var(--sans)', fontSize: 11, fontWeight: 600,
                              padding: '2px 8px', borderRadius: 999,
                              background: active ? 'rgba(99,102,241,0.12)' : 'rgba(255,255,255,0.07)',
                              color: active ? '#818CF8' : 'rgba(255,255,255,0.28)',
                            }}>{t.count}</span>
                          )}
                          {t.pulsing && (
                            <span className="live-dot" style={{ width: 6, height: 6, borderRadius: '50%', background: '#818CF8', flexShrink: 0 }} />
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* Tab content */}
                  <AnimatePresence mode="wait">
                    {tab === 'table' && (
                      <motion.div key="tbl" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}>
                        <DependencyTable dependencies={scan.dependencies} />
                      </motion.div>
                    )}
                    {tab === 'graph' && (
                      <motion.div key="gph" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}>
                        <DependencyGraph tree={scan.tree} />
                      </motion.div>
                    )}
                    {tab === 'insights' && (
                      <motion.div key="ins" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}>
                        <InsightsPanel insights={insights} loading={insightsLoading} />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>

              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer style={{
        position: 'relative', zIndex: 10, marginTop: 32,
        borderTop: '1px solid rgba(255,255,255,0.07)', padding: '14px 24px',
      }}>
        <div style={{
          maxWidth: 1440, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          fontFamily: 'var(--sans)', fontSize: 12, color: 'rgba(255,255,255,0.22)', fontWeight: 400,
        }}>
          <span>DepScope v2.0</span>
          <span>AI: Llama 3.3 70B · Groq · OSV · npm audit</span>
        </div>
      </footer>
    </div>
  );
}
