'use client';

import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface PackageInputProps {
  onSubmit: (json: string) => void;
  loading?: boolean;
}

// Risky: deprecated packages, abandoned repos, known vulns, single maintainers, deep trees
const SAMPLE_RISKY = JSON.stringify({
  name: "legacy-monolith",
  version: "1.0.0",
  dependencies: {
    "request": "^2.88.2",
    "jade": "^1.11.0",
    "node-uuid": "^1.4.8",
    "coffee-script": "^1.12.7",
    "nomnom": "^1.8.1",
    "dominux": "^1.0.0",
    "gulp": "^3.9.1",
    "bower": "^1.8.14",
    "formidable": "^1.2.6",
    "minimist": "^0.2.4"
  },
  devDependencies: {
    "istanbul": "^0.4.5",
    "grunt": "^1.6.1",
    "sails": "^1.5.0"
  }
}, null, 2);

// Safe: actively maintained, popular, well-funded, minimal dep trees, frequent releases
const SAMPLE_SAFE = JSON.stringify({
  name: "modern-stack",
  version: "1.0.0",
  dependencies: {
    "next": "^14.2.0",
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "zod": "^3.23.0",
    "drizzle-orm": "^0.30.0",
    "@tanstack/react-query": "^5.50.0"
  },
  devDependencies: {
    "typescript": "^5.5.0",
    "eslint": "^9.0.0",
    "vitest": "^2.0.0",
    "prettier": "^3.3.0"
  }
}, null, 2);

export default function PackageInput({ onSubmit, loading }: PackageInputProps) {
  const [mode, setMode] = useState<'paste' | 'upload'>('paste');
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [sampleMenuOpen, setSampleMenuOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const validate = useCallback((raw: string): boolean => {
    try {
      const parsed = JSON.parse(raw);
      if (!parsed.dependencies && !parsed.devDependencies) {
        setError('No dependencies or devDependencies found');
        return false;
      }
      setError(null);
      return true;
    } catch {
      setError('Invalid JSON format');
      return false;
    }
  }, []);

  const handleSubmit = () => {
    if (validate(text)) onSubmit(text);
  };

  const handleFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      setText(content);
      if (validate(content)) onSubmit(content);
    };
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const loadSample = (type: 'risky' | 'safe') => {
    setText(type === 'risky' ? SAMPLE_RISKY : SAMPLE_SAFE);
    setError(null);
    setSampleMenuOpen(false);
  };

  return (
    <div className="glass-lg shine-top">
      {/* Tab bar */}
      <div className="flex border-b relative" style={{ borderColor: 'var(--border-1)' }}>
        {(['paste', 'upload'] as const).map(m => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className="px-6 py-3.5 mono text-[11px] uppercase tracking-[0.15em] transition-all relative"
            style={{ color: mode === m ? 'var(--cyan-1)' : 'var(--text-3)' }}
          >
            {m === 'paste' ? 'Paste JSON' : 'Upload File'}
            {mode === m && (
              <motion.div
                layoutId="input-tab-indicator"
                className="absolute bottom-0 left-0 right-0 h-[2px]"
                style={{ background: 'linear-gradient(90deg, var(--cyan-1), var(--cyan-2))' }}
                transition={{ type: 'spring', stiffness: 400, damping: 35 }}
              />
            )}
          </button>
        ))}
        <div className="flex-1" />

        {/* Sample dropdown */}
        <div className="relative">
          <button
            onClick={() => setSampleMenuOpen(!sampleMenuOpen)}
            className="px-5 py-3.5 mono text-[10px] uppercase tracking-[0.15em] transition-colors flex items-center gap-2"
            style={{ color: 'var(--text-3)' }}
          >
            Load Sample
            <motion.span
              animate={{ rotate: sampleMenuOpen ? 180 : 0 }}
              transition={{ duration: 0.2 }}
              className="text-[8px]"
            >
              &#9660;
            </motion.span>
          </button>
          <AnimatePresence>
            {sampleMenuOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setSampleMenuOpen(false)} />
                <motion.div
                  initial={{ opacity: 0, y: -8, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.95 }}
                  transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
                  className="absolute right-0 top-full mt-2 z-20 glass rounded-xl overflow-hidden"
                  style={{
                    minWidth: 260,
                    boxShadow: '0 20px 60px rgba(0,0,0,0.6), 0 0 40px rgba(34,211,238,0.03)',
                  }}
                >
                  <button
                    onClick={() => loadSample('risky')}
                    className="w-full px-5 py-4 flex items-start gap-3 text-left transition-all group"
                    style={{ borderBottom: '1px solid var(--border-1)' }}
                  >
                    <span
                      className="mt-0.5 w-6 h-6 rounded-lg flex items-center justify-center mono text-[10px] font-bold flex-shrink-0 transition-transform group-hover:scale-110"
                      style={{ background: 'var(--red-3)', color: 'var(--red-1)', border: '1px solid rgba(248,113,113,0.2)' }}
                    >
                      !
                    </span>
                    <div>
                      <div className="text-xs font-medium group-hover:text-[var(--text-1)] transition-colors" style={{ color: 'var(--text-2)', fontFamily: 'var(--font-body)' }}>
                        High Risk Legacy Project
                      </div>
                      <div className="mono text-[10px] mt-0.5" style={{ color: 'var(--text-3)' }}>
                        13 deps &mdash; deprecated, abandoned, CVEs
                      </div>
                    </div>
                  </button>
                  <button
                    onClick={() => loadSample('safe')}
                    className="w-full px-5 py-4 flex items-start gap-3 text-left transition-all group"
                  >
                    <span
                      className="mt-0.5 w-6 h-6 rounded-lg flex items-center justify-center mono text-[10px] font-bold flex-shrink-0 transition-transform group-hover:scale-110"
                      style={{ background: 'var(--green-3)', color: 'var(--green-1)', border: '1px solid rgba(74,222,128,0.2)' }}
                    >
                      &#10003;
                    </span>
                    <div>
                      <div className="text-xs font-medium group-hover:text-[var(--text-1)] transition-colors" style={{ color: 'var(--text-2)', fontFamily: 'var(--font-body)' }}>
                        Low Risk Modern Stack
                      </div>
                      <div className="mono text-[10px] mt-0.5" style={{ color: 'var(--text-3)' }}>
                        10 deps &mdash; backed, active, zero-day safe
                      </div>
                    </div>
                  </button>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="p-6">
        <AnimatePresence mode="wait">
          {mode === 'paste' ? (
            <motion.div
              key="paste"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3 }}
            >
              <textarea
                rows={12}
                value={text}
                onChange={e => {
                  setText(e.target.value);
                  if (error) setError(null);
                }}
                placeholder='{\n  "dependencies": {\n    "express": "^4.18.2"\n  }\n}'
                className="w-full p-5"
              />
            </motion.div>
          ) : (
            <motion.div
              key="upload"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3 }}
            >
              <motion.div
                onDrop={handleDrop}
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onClick={() => fileRef.current?.click()}
                animate={{
                  borderColor: dragOver ? 'rgba(34,211,238,0.4)' : 'var(--border-2)',
                  background: dragOver ? 'rgba(34,211,238,0.04)' : 'var(--surface)',
                }}
                className="flex flex-col items-center justify-center py-16 rounded-xl cursor-pointer transition-colors"
                style={{ border: '2px dashed var(--border-2)' }}
              >
                <motion.div
                  animate={{ scale: dragOver ? 1.15 : 1, y: dragOver ? -4 : 0 }}
                  className="text-4xl mb-3 opacity-30"
                >
                  {dragOver ? '\ud83d\udce5' : '\ud83d\udcc1'}
                </motion.div>
                <p className="text-sm" style={{ color: 'var(--text-2)' }}>
                  {dragOver ? 'Drop it here' : 'Drop package.json or click to browse'}
                </p>
                <p className="mono text-[10px] mt-1.5" style={{ color: 'var(--text-3)' }}>
                  Accepts .json files
                </p>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".json"
                  className="hidden"
                  onChange={e => {
                    const file = e.target.files?.[0];
                    if (file) handleFile(file);
                  }}
                />
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Error */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0, y: -4 }}
              animate={{ opacity: 1, height: 'auto', y: 0 }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-4 px-4 py-2.5 rounded-lg mono text-xs"
              style={{ background: 'var(--red-3)', color: 'var(--red-1)', border: '1px solid rgba(248,113,113,0.2)' }}
            >
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Submit */}
        <div className="mt-5 flex items-center gap-4">
          <motion.button
            onClick={handleSubmit}
            disabled={loading || !text.trim()}
            whileHover={{ scale: 1.02, boxShadow: '0 0 30px rgba(34,211,238,0.15)' }}
            whileTap={{ scale: 0.98 }}
            className="px-7 py-3 rounded-xl mono text-sm font-semibold tracking-wide transition-all disabled:opacity-20 disabled:cursor-not-allowed relative overflow-hidden"
            style={{
              background: loading ? 'var(--border-2)' : 'linear-gradient(135deg, var(--cyan-1), #38bdf8)',
              color: loading ? 'var(--text-3)' : 'var(--void)',
            }}
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                Analyzing...
              </span>
            ) : (
              'Analyze Dependencies'
            )}
          </motion.button>
          <span className="mono text-[10px]" style={{ color: 'var(--text-ghost)' }}>
            Live data from npm + GitHub
          </span>
        </div>
      </div>
    </div>
  );
}
