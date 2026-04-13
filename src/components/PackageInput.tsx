'use client';

import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface PackageInputProps {
  onSubmit: (json: string) => void;
  loading?: boolean;
}

const SAMPLE_PACKAGE_JSON = JSON.stringify({
  name: "example-project",
  version: "1.0.0",
  dependencies: {
    "express": "^4.18.2",
    "lodash": "^4.17.21",
    "axios": "^1.6.0",
    "moment": "^2.29.4",
    "react": "^18.2.0",
    "next": "^14.0.0"
  },
  devDependencies: {
    "typescript": "^5.3.0",
    "eslint": "^8.55.0",
    "jest": "^29.7.0"
  }
}, null, 2);

export default function PackageInput({ onSubmit, loading }: PackageInputProps) {
  const [mode, setMode] = useState<'paste' | 'upload'>('paste');
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
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

  const loadSample = () => {
    setText(SAMPLE_PACKAGE_JSON);
    setError(null);
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
        <button
          onClick={loadSample}
          className="px-4 py-3 text-[11px] font-mono uppercase tracking-wider transition-colors"
          style={{ color: 'var(--text-tertiary)' }}
        >
          Load Sample
        </button>
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
