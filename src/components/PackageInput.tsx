'use client';
import { useState, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';

interface Props { onSubmit: (json: string) => void; loading?: boolean; }

const SAMPLE_RISKY = JSON.stringify({ name: "legacy-monolith", version: "1.0.0",
  dependencies: { "request": "^2.88.2", "jade": "^1.11.0", "node-uuid": "^1.4.8", "coffee-script": "^1.12.7", "nomnom": "^1.8.1", "dominux": "^1.0.0", "gulp": "^3.9.1", "bower": "^1.8.14", "formidable": "^1.2.6", "minimist": "^0.2.4" },
  devDependencies: { "istanbul": "^0.4.5", "grunt": "^1.6.1", "sails": "^1.5.0" } }, null, 2);

const SAMPLE_SAFE = JSON.stringify({ name: "modern-stack", version: "1.0.0",
  dependencies: { "next": "^14.2.0", "react": "^18.3.0", "react-dom": "^18.3.0", "zod": "^3.23.0", "drizzle-orm": "^0.30.0", "@tanstack/react-query": "^5.50.0" },
  devDependencies: { "typescript": "^5.5.0", "eslint": "^9.0.0", "vitest": "^2.0.0", "prettier": "^3.3.0" } }, null, 2);

export default function PackageInput({ onSubmit, loading }: Props) {
  const [mode, setMode] = useState<'paste' | 'upload'>('paste');
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPos, setMenuPos] = useState({ top: 0, right: 0 });
  const fileRef = useRef<HTMLInputElement>(null);
  const trigRef = useRef<HTMLButtonElement>(null);

  const validate = useCallback((raw: string) => {
    try { const p = JSON.parse(raw); if (!p.dependencies && !p.devDependencies) { setError('No dependencies found'); return false; } setError(null); return true; }
    catch { setError('Invalid JSON'); return false; }
  }, []);

  const submit = () => { if (validate(text)) onSubmit(text); };
  const handleFile = (f: File) => { const r = new FileReader(); r.onload = e => { const c = e.target?.result as string; setText(c); if (validate(c)) onSubmit(c); }; r.readAsText(f); };
  const drop = (e: React.DragEvent) => { e.preventDefault(); setDragOver(false); if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]); };
  const sample = (t: 'risky' | 'safe') => { setText(t === 'risky' ? SAMPLE_RISKY : SAMPLE_SAFE); setError(null); setMenuOpen(false); };

  return (
    <div className="card overflow-hidden">
      {/* Tabs */}
      <div className="flex items-center border-b" style={{ borderColor: 'var(--border)' }}>
        {(['paste', 'upload'] as const).map(m => (
          <button key={m} onClick={() => setMode(m)}
            className="relative px-6 h-14 text-sm font-semibold transition-colors"
            style={{ color: mode === m ? 'var(--white)' : 'var(--text-3)' }}>
            {m === 'paste' ? '📋 Paste JSON' : '📁 Upload File'}
            {mode === m && <motion.div layoutId="itab" className="absolute bottom-0 inset-x-0 h-[3px] rounded-t-full"
              style={{ background: 'linear-gradient(90deg, var(--blue), var(--violet))' }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }} />}
          </button>
        ))}
        <div className="flex-1" />
        <button ref={trigRef} onClick={() => {
          if (!menuOpen && trigRef.current) { const r = trigRef.current.getBoundingClientRect(); setMenuPos({ top: r.bottom + 8, right: window.innerWidth - r.right }); }
          setMenuOpen(!menuOpen);
        }} className="btn btn-ghost mr-3 !py-2 !px-4 !text-xs !min-h-[36px] !font-semibold">
          Load Sample ▾
        </button>
        {typeof document !== 'undefined' && createPortal(
          <AnimatePresence>{menuOpen && (<>
            <div className="fixed inset-0 z-[60]" onClick={() => setMenuOpen(false)} />
            <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
              className="fixed z-[70] rounded-xl overflow-hidden"
              style={{ top: menuPos.top, right: menuPos.right, width: 290, background: 'var(--bg-3)', border: '1px solid var(--border-2)', boxShadow: '0 20px 50px rgba(0,0,0,0.6)' }}>
              {[
                { t: 'risky' as const, label: 'High Risk Legacy', desc: '13 deprecated & vulnerable', color: 'var(--rose)', bg: 'rgba(255,69,58,0.1)', icon: '⚠️' },
                { t: 'safe' as const, label: 'Low Risk Modern', desc: '10 well-maintained deps', color: 'var(--green)', bg: 'rgba(48,209,88,0.1)', icon: '✅' },
              ].map((s, i) => (
                <button key={s.t} onClick={() => sample(s.t)}
                  className="w-full px-5 py-4 flex items-center gap-3 text-left transition-colors hover:bg-[var(--bg-hover)]"
                  style={{ borderBottom: i === 0 ? '1px solid var(--border)' : undefined }}>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0" style={{ background: s.bg }}>{s.icon}</div>
                  <div><div className="text-sm font-semibold text-white">{s.label}</div><div className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>{s.desc}</div></div>
                </button>
              ))}
            </motion.div>
          </>)}</AnimatePresence>, document.body
        )}
      </div>

      <div className="p-6">
        <AnimatePresence mode="wait">
          {mode === 'paste' ? (
            <motion.div key="p" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <textarea rows={10} value={text} onChange={e => { setText(e.target.value); if (error) setError(null); }}
                placeholder='Paste your package.json here...' className="w-full p-5 resize-y" />
            </motion.div>
          ) : (
            <motion.div key="u" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div onDrop={drop} onDragOver={e => { e.preventDefault(); setDragOver(true); }} onDragLeave={() => setDragOver(false)}
                onClick={() => fileRef.current?.click()}
                className="flex flex-col items-center justify-center py-20 rounded-xl cursor-pointer transition-all"
                style={{ border: `2px dashed ${dragOver ? 'var(--blue)' : 'var(--border)'}`, background: dragOver ? 'rgba(79,143,247,0.05)' : 'var(--bg)' }}>
                <div className="text-5xl mb-4 opacity-40">{dragOver ? '📥' : '📁'}</div>
                <p className="text-base font-medium" style={{ color: 'var(--text-2)' }}>{dragOver ? 'Drop it here' : 'Drop package.json or click to browse'}</p>
                <input ref={fileRef} type="file" accept=".json" className="hidden" onChange={e => { if (e.target.files?.[0]) handleFile(e.target.files[0]); }} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>{error && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="mt-4 px-4 py-3 rounded-lg text-sm font-medium"
            style={{ background: 'rgba(255,69,58,0.1)', color: 'var(--rose)', border: '1px solid rgba(255,69,58,0.2)' }}>{error}</motion.div>
        )}</AnimatePresence>

        <div className="mt-6 flex flex-col sm:flex-row gap-4 items-start sm:items-center">
          <button onClick={submit} disabled={loading || !text.trim()} className="btn btn-primary w-full sm:w-auto">
            {loading ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Analyzing...</> : '🔍 Analyze Dependencies'}
          </button>
          <span className="text-sm" style={{ color: 'var(--text-3)' }}>Live data from npm + GitHub</span>
        </div>
      </div>
    </div>
  );
}
