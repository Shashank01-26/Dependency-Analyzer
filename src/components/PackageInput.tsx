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
    "request": "^2.88.2",          // DEPRECATED since Feb 2020, massive dep tree
    "jade": "^1.11.0",             // DEPRECATED, renamed to pug years ago
    "node-uuid": "^1.4.8",         // DEPRECATED, replaced by uuid
    "coffee-script": "^1.12.7",    // DEPRECATED, abandoned
    "nomnom": "^1.8.1",            // Abandoned since 2014, no maintainers
    "dominux": "^1.0.0",           // Tiny unmaintained package, near-zero downloads
    "gulp": "^3.9.1",              // Very old major version, known vulns
    "bower": "^1.8.14",            // DEPRECATED, entire tool is abandoned
    "formidable": "^1.2.6",        // Old major with known vulns
    "minimist": "^0.2.4"           // Old version range with prototype pollution CVEs
  },
  devDependencies: {
    "istanbul": "^0.4.5",          // DEPRECATED, replaced by nyc/c8
    "grunt": "^1.6.1",             // Near-abandoned, very low activity
    "sails": "^1.5.0"              // Declining maintenance, large dep tree
  }
}, null, 2);

// Safe: actively maintained, popular, well-funded, minimal dep trees, frequent releases
const SAMPLE_SAFE = JSON.stringify({
  name: "modern-stack",
  version: "1.0.0",
  dependencies: {
    "next": "^14.2.0",             // Vercel-backed, weekly releases, huge community
    "react": "^18.3.0",            // Meta-backed, massive ecosystem
    "react-dom": "^18.3.0",        // Same as react
    "zod": "^3.23.0",              // Very active, single-purpose, zero deps
    "drizzle-orm": "^0.30.0",      // Fast-growing, frequent releases
    "@tanstack/react-query": "^5.50.0" // Very popular, active, well-maintained
  },
  devDependencies: {
    "typescript": "^5.5.0",        // Microsoft-backed, monthly releases
    "eslint": "^9.0.0",            // Huge community, active
    "vitest": "^2.0.0",            // Very active, modern, fast releases
    "prettier": "^3.3.0"           // Widely adopted, stable, regular updates
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
    if (validate(text)) {
      onSubmit(text);
    }
  };

  const handleFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      setText(content);
      if (validate(content)) {
        onSubmit(content);
      }
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
    <div className="panel overflow-hidden">
      {/* Tab bar */}
      <div className="flex border-b" style={{ borderColor: 'var(--border-dim)' }}>
        {(['paste', 'upload'] as const).map(m => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className="px-5 py-3 text-xs font-mono uppercase tracking-wider transition-colors relative"
            style={{
              color: mode === m ? 'var(--cyan-solid)' : 'var(--text-tertiary)',
              background: mode === m ? 'var(--bg-surface)' : 'transparent',
            }}
          >
            {m === 'paste' ? 'Paste JSON' : 'Upload File'}
            {mode === m && (
              <motion.div
                layoutId="input-tab"
                className="absolute bottom-0 left-0 right-0 h-[2px]"
                style={{ background: 'var(--cyan-solid)' }}
              />
            )}
          </button>
        ))}
        <div className="flex-1" />

        {/* Sample dropdown */}
        <div className="relative">
          <button
            onClick={() => setSampleMenuOpen(!sampleMenuOpen)}
            className="px-4 py-3 text-[11px] font-mono uppercase tracking-wider transition-colors flex items-center gap-1.5"
            style={{ color: 'var(--text-tertiary)' }}
          >
            Load Sample
            <span className="text-[9px]">{sampleMenuOpen ? '\u25b2' : '\u25bc'}</span>
          </button>
          <AnimatePresence>
            {sampleMenuOpen && (
              <>
                {/* Backdrop to close menu */}
                <div className="fixed inset-0 z-10" onClick={() => setSampleMenuOpen(false)} />
                <motion.div
                  initial={{ opacity: 0, y: -4, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -4, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 top-full mt-1 z-20 rounded-lg overflow-hidden"
                  style={{
                    background: 'var(--bg-elevated)',
                    border: '1px solid var(--border-subtle)',
                    boxShadow: '0 12px 40px rgba(0,0,0,0.5)',
                    minWidth: 220,
                  }}
                >
                  <button
                    onClick={() => loadSample('risky')}
                    className="w-full px-4 py-3 flex items-start gap-3 text-left transition-colors"
                    style={{ borderBottom: '1px solid var(--border-dim)' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <span
                      className="mt-0.5 w-5 h-5 rounded flex items-center justify-center text-[10px] font-mono font-bold flex-shrink-0"
                      style={{ background: 'var(--red-dim)', color: 'var(--red-solid)', border: '1px solid var(--red-muted)' }}
                    >
                      !
                    </span>
                    <div>
                      <div className="text-xs font-mono font-medium" style={{ color: 'var(--text-primary)' }}>
                        High Risk Legacy Project
                      </div>
                      <div className="text-[10px] font-mono mt-0.5 leading-relaxed" style={{ color: 'var(--text-tertiary)' }}>
                        13 deps — deprecated, abandoned, CVEs
                      </div>
                    </div>
                  </button>
                  <button
                    onClick={() => loadSample('safe')}
                    className="w-full px-4 py-3 flex items-start gap-3 text-left transition-colors"
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <span
                      className="mt-0.5 w-5 h-5 rounded flex items-center justify-center text-[10px] font-mono font-bold flex-shrink-0"
                      style={{ background: 'var(--green-dim)', color: 'var(--green-solid)', border: '1px solid var(--green-muted)' }}
                    >
                      &#10003;
                    </span>
                    <div>
                      <div className="text-xs font-mono font-medium" style={{ color: 'var(--text-primary)' }}>
                        Low Risk Modern Stack
                      </div>
                      <div className="text-[10px] font-mono mt-0.5 leading-relaxed" style={{ color: 'var(--text-tertiary)' }}>
                        10 deps — active, backed, zero-day safe
                      </div>
                    </div>
                  </button>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="p-5">
        <AnimatePresence mode="wait">
          {mode === 'paste' ? (
            <motion.div
              key="paste"
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
            >
              <textarea
                rows={14}
                value={text}
                onChange={e => {
                  setText(e.target.value);
                  if (error) setError(null);
                }}
                placeholder='Paste your package.json here...\n\n{\n  "dependencies": {\n    "express": "^4.18.2"\n  }\n}'
                className="w-full p-4"
              />
            </motion.div>
          ) : (
            <motion.div
              key="upload"
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
            >
              <div
                onDrop={handleDrop}
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onClick={() => fileRef.current?.click()}
                className="flex flex-col items-center justify-center py-16 rounded-lg cursor-pointer transition-colors"
                style={{
                  border: `2px dashed ${dragOver ? 'var(--cyan-solid)' : 'var(--border-subtle)'}`,
                  background: dragOver ? 'var(--cyan-dim)' : 'var(--bg-surface)',
                }}
              >
                <div className="text-4xl mb-3" style={{ opacity: 0.4 }}>
                  {dragOver ? '\ud83d\udce5' : '\ud83d\udcc1'}
                </div>
                <p className="text-sm font-mono" style={{ color: 'var(--text-secondary)' }}>
                  {dragOver ? 'Drop it here' : 'Drop package.json or click to browse'}
                </p>
                <p className="text-[11px] font-mono mt-1" style={{ color: 'var(--text-tertiary)' }}>
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
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Error */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-3 px-3 py-2 rounded text-xs font-mono"
              style={{ background: 'var(--red-dim)', color: 'var(--red-solid)', border: '1px solid var(--red-muted)' }}
            >
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Submit */}
        <div className="mt-4 flex items-center gap-3">
          <button
            onClick={handleSubmit}
            disabled={loading || !text.trim()}
            className="px-6 py-2.5 rounded-lg font-mono text-sm font-semibold tracking-wide transition-all disabled:opacity-30"
            style={{
              background: loading ? 'var(--border-subtle)' : 'var(--cyan-solid)',
              color: loading ? 'var(--text-tertiary)' : 'var(--bg-void)',
            }}
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                Analyzing...
              </span>
            ) : (
              'Analyze Dependencies'
            )}
          </button>
          <span className="text-[11px] font-mono" style={{ color: 'var(--text-tertiary)' }}>
            Fetches live data from npm + GitHub
          </span>
        </div>
      </div>
    </div>
  );
}
