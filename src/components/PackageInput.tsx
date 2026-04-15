'use client';
import { useState, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Ecosystem } from '@/types';

interface Props { onSubmit: (raw: string, ecosystem?: Ecosystem) => void; loading?: boolean; }

// ── Samples ──

const SAMPLES: Record<Ecosystem, { risky: { label: string; desc: string; data: string }; safe: { label: string; desc: string; data: string } }> = {
  npm: {
    risky: { label: 'High Risk npm', desc: 'Deprecated, vulnerable, unmaintained', data: JSON.stringify({ name: "legacy-danger-zone", version: "1.0.0",
      dependencies: {
        "request": "^2.88.2",          // DEPRECATED since 2020, massive dep tree (deep-chain + deprecated + unmaintained)
        "jade": "^1.11.0",             // DEPRECATED, renamed to pug (deprecated + unmaintained)
        "node-uuid": "^1.4.8",         // DEPRECATED (deprecated + single-maintainer)
        "coffee-script": "^1.12.7",    // DEPRECATED, abandoned since 2017 (deprecated + unmaintained)
        "bower": "^1.8.14",            // DEPRECATED tool, huge dep tree (deprecated + deep-chain)
        "minimist": "^0.2.4",          // Old version with prototype pollution CVE (vulnerable)
        "qs": "^6.5.2",               // Old version with known CVEs (vulnerable)
        "lodash": "^3.10.1",          // Very old major, known prototype pollution CVEs (vulnerable + stale)
        "tar": "^2.2.2",              // Old version with path traversal CVEs (vulnerable + critical)
        "nomnom": "^1.8.1",           // Abandoned since 2014, ~0 downloads (unmaintained + low-popularity + single-maintainer)
        "left-pad": "^1.3.0",         // Infamous, unmaintained (unmaintained + single-maintainer)
        "dominux": "^1.0.0"           // Near-zero downloads, unknown (low-popularity + single-maintainer)
      },
      devDependencies: {
        "istanbul": "^0.4.5",          // DEPRECATED, replaced by nyc/c8 (deprecated)
        "grunt": "^1.6.1",             // Near-abandoned, very low activity (stale)
        "sails": "^1.5.0"              // Declining maintenance, massive dep tree (deep-chain + stale)
      } }, null, 2) },
    safe: { label: 'Low Risk npm', desc: 'Modern well-maintained stack', data: JSON.stringify({ name: "modern-stack", version: "1.0.0",
      dependencies: { "next": "^14.2.0", "react": "^18.3.0", "react-dom": "^18.3.0", "zod": "^3.23.0", "@tanstack/react-query": "^5.50.0" },
      devDependencies: { "typescript": "^5.5.0", "eslint": "^9.0.0", "vitest": "^2.0.0" } }, null, 2) },
  },
  flutter: {
    risky: { label: 'High Risk Flutter', desc: 'Discontinued, stale & abandoned', data: `name: legacy_flutter_app
version: 1.0.0

dependencies:
  flutter:
    sdk: flutter
  # Discontinued / very old packages
  flutter_swiper: ^1.1.6
  flutter_webview_plugin: ^0.4.0
  flutter_datetime_picker: ^1.5.1
  fluttertoast: ^3.1.0
  progress_dialog: ^1.2.4
  # Stale / unmaintained
  flutter_spinkit: ^4.1.0
  simple_animations: ^1.3.0
  flutter_slidable: ^0.6.0
  # Low popularity
  custom_splash: ^0.0.3
  shimmer_animation: ^1.0.0

dev_dependencies:
  flutter_test:
    sdk: flutter
  build_runner: ^1.12.0
  json_serializable: ^4.1.0` },
    safe: { label: 'Low Risk Flutter', desc: 'Popular well-maintained packages', data: `name: modern_flutter_app
version: 1.0.0

dependencies:
  flutter:
    sdk: flutter
  dio: ^5.4.0
  riverpod: ^2.5.0
  go_router: ^14.0.0
  freezed_annotation: ^2.4.0
  hive: ^2.2.3

dev_dependencies:
  flutter_test:
    sdk: flutter
  freezed: ^2.5.0
  very_good_analysis: ^6.0.0` },
  },
  android: {
    risky: { label: 'High Risk Android', desc: 'Deprecated support libs & old APIs', data: `plugins {
    id 'com.android.application'
}

android {
    namespace 'com.example.legacyapp'
    compileSdk 28
}

dependencies {
    // DEPRECATED: Android Support Library (replaced by AndroidX years ago)
    implementation 'com.android.support:appcompat-v7:28.0.0'
    implementation 'com.android.support:design:28.0.0'
    implementation 'com.android.support:recyclerview-v7:28.0.0'
    implementation 'com.android.support:cardview-v7:28.0.0'
    // Very old versions with known vulnerabilities
    implementation 'com.squareup.okhttp3:okhttp:3.8.0'
    implementation 'com.squareup.retrofit2:retrofit:2.3.0'
    // Abandoned / deprecated libraries
    implementation 'com.jakewharton:butterknife:10.2.3'
    implementation 'org.greenrobot:eventbus:3.0.0'
    implementation 'com.google.code.gson:gson:2.6.2'
    // Very old testing
    testImplementation 'junit:junit:4.10'
}` },
    safe: { label: 'Low Risk Android', desc: 'Modern Jetpack & KTX libraries', data: `plugins {
    id 'com.android.application'
    id 'org.jetbrains.kotlin.android'
}

android {
    namespace 'com.example.modernapp'
    compileSdk 35
}

dependencies {
    implementation 'androidx.core:core-ktx:1.13.0'
    implementation 'androidx.compose.ui:ui:1.7.0'
    implementation 'androidx.compose.material3:material3:1.3.0'
    implementation 'androidx.lifecycle:lifecycle-viewmodel-compose:2.8.0'
    implementation 'com.squareup.retrofit2:retrofit:2.11.0'
    implementation 'com.squareup.okhttp3:okhttp:4.12.0'
    implementation 'io.coil-kt:coil-compose:2.7.0'
    testImplementation 'junit:junit:4.13.2'
    androidTestImplementation 'androidx.test.ext:junit:1.2.0'
}` },
  },
};

const ECO_META: Record<Ecosystem, { icon: string; label: string; file: string }> = {
  npm: { icon: '📦', label: 'npm', file: 'package.json' },
  flutter: { icon: '🐦', label: 'Flutter', file: 'pubspec.yaml' },
  android: { icon: '🤖', label: 'Android', file: 'build.gradle' },
};

export default function PackageInput({ onSubmit, loading }: Props) {
  const [mode, setMode] = useState<'paste' | 'upload'>('paste');
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPos, setMenuPos] = useState({ top: 0, right: 0 });
  const [sampleEco, setSampleEco] = useState<Ecosystem>('npm');
  const fileRef = useRef<HTMLInputElement>(null);
  const trigRef = useRef<HTMLButtonElement>(null);

  const validate = useCallback((raw: string) => {
    const t = raw.trim();
    if (!t) { setError('Input is empty'); return false; }
    // Basic checks per format
    if (t.startsWith('{')) {
      try { const p = JSON.parse(t); if (!p.dependencies && !p.devDependencies) { setError('No dependencies found'); return false; } }
      catch { setError('Invalid JSON'); return false; }
    } else if (t.includes('implementation') || t.includes('dependencies {')) {
      if (!/implementation\s/.test(t)) { setError('No implementation dependencies found in Gradle'); return false; }
    } else if (t.includes('dependencies:')) {
      // YAML — basic check
    } else {
      setError('Unrecognized format. Paste a package.json, pubspec.yaml, or build.gradle');
      return false;
    }
    setError(null);
    return true;
  }, []);

  const submit = () => { if (validate(text)) onSubmit(text); };
  const handleFile = (f: File) => {
    const r = new FileReader();
    r.onload = e => { const c = e.target?.result as string; setText(c); if (validate(c)) onSubmit(c); };
    r.readAsText(f);
  };
  const drop = (e: React.DragEvent) => { e.preventDefault(); setDragOver(false); if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]); };
  const loadSample = (eco: Ecosystem, type: 'risky' | 'safe') => { setText(SAMPLES[eco][type].data); setError(null); setMenuOpen(false); };

  return (
    <div className="card overflow-hidden">
      {/* Mode tabs */}
      <div className="flex items-center border-b" style={{ borderColor: 'var(--border)' }}>
        {(['paste', 'upload'] as const).map(m => (
          <button key={m} onClick={() => setMode(m)}
            className="relative px-6 h-14 text-sm font-semibold transition-colors"
            style={{ color: mode === m ? 'var(--white)' : 'var(--text-3)' }}>
            {m === 'paste' ? '📋 Paste Code' : '📁 Upload File'}
            {mode === m && <motion.div layoutId="itab" className="absolute bottom-0 inset-x-0 h-[3px] rounded-t-full"
              style={{ background: 'linear-gradient(90deg, var(--blue), var(--violet))' }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }} />}
          </button>
        ))}
        <div className="flex-1" />

        {/* Load Sample button */}
        <button ref={trigRef} onClick={() => {
          if (!menuOpen && trigRef.current) {
            const r = trigRef.current.getBoundingClientRect();
            setMenuPos({ top: r.bottom + 8, right: window.innerWidth - r.right });
          }
          setMenuOpen(!menuOpen);
        }} className="btn btn-ghost mr-3 !py-2 !px-4 !text-xs !min-h-[36px] !font-semibold">
          Load Sample ▾
        </button>

        {/* Sample dropdown portal */}
        {typeof document !== 'undefined' && createPortal(
          <AnimatePresence>{menuOpen && (<>
            <div className="fixed inset-0 z-[60]" onClick={() => setMenuOpen(false)} />
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
              className="fixed z-[70] rounded-xl overflow-hidden"
              style={{ top: menuPos.top, right: menuPos.right, width: 360, background: 'var(--bg-3)', border: '1px solid var(--border-2)', boxShadow: '0 20px 60px rgba(0,0,0,0.6)' }}>

              {/* Ecosystem tabs */}
              <div className="flex border-b" style={{ borderColor: 'var(--border)' }}>
                {(['npm', 'flutter', 'android'] as Ecosystem[]).map(eco => (
                  <button key={eco} onClick={() => setSampleEco(eco)}
                    className="flex-1 py-3 text-xs font-semibold text-center transition-all relative"
                    style={{ color: sampleEco === eco ? 'var(--white)' : 'var(--text-3)' }}>
                    {ECO_META[eco].icon} {ECO_META[eco].label}
                    {sampleEco === eco && (
                      <motion.div layoutId="sampleTab" className="absolute bottom-0 inset-x-2 h-[2px] rounded-full"
                        style={{ background: 'var(--blue)' }}
                        transition={{ type: 'spring', stiffness: 400, damping: 30 }} />
                    )}
                  </button>
                ))}
              </div>

              {/* Sample options for selected ecosystem */}
              <div>
                {(['risky', 'safe'] as const).map((type, i) => {
                  const s = SAMPLES[sampleEco][type];
                  const isRisky = type === 'risky';
                  return (
                    <button key={type} onClick={() => loadSample(sampleEco, type)}
                      className="w-full px-5 py-4 flex items-center gap-3 text-left transition-colors hover:bg-[var(--bg-hover)]"
                      style={{ borderBottom: i === 0 ? '1px solid var(--border)' : undefined }}>
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0"
                        style={{ background: isRisky ? 'rgba(255,69,58,0.1)' : 'rgba(48,209,88,0.1)' }}>
                        {isRisky ? '⚠️' : '✅'}
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-white">{s.label}</div>
                        <div className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>{s.desc}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          </>)}</AnimatePresence>,
          document.body
        )}
      </div>

      {/* Content */}
      <div className="p-6">
        <AnimatePresence mode="wait">
          {mode === 'paste' ? (
            <motion.div key="p" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <textarea rows={10} value={text}
                onChange={e => { setText(e.target.value); if (error) setError(null); }}
                placeholder={'Paste your package.json, pubspec.yaml, or build.gradle here...'} className="w-full p-5 resize-y" />
            </motion.div>
          ) : (
            <motion.div key="u" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div onDrop={drop} onDragOver={e => { e.preventDefault(); setDragOver(true); }} onDragLeave={() => setDragOver(false)}
                onClick={() => fileRef.current?.click()}
                className="flex flex-col items-center justify-center py-20 rounded-xl cursor-pointer transition-all"
                style={{ border: `2px dashed ${dragOver ? 'var(--blue)' : 'var(--border)'}`, background: dragOver ? 'rgba(79,143,247,0.05)' : 'var(--bg)' }}>
                <div className="text-5xl mb-4 opacity-40">{dragOver ? '📥' : '📁'}</div>
                <p className="text-base font-medium" style={{ color: 'var(--text-2)' }}>
                  {dragOver ? 'Drop it here' : 'Drop package.json, pubspec.yaml, or build.gradle'}
                </p>
                <p className="text-xs mt-2" style={{ color: 'var(--text-dim)' }}>Supports npm, Flutter, and Android</p>
                <input ref={fileRef} type="file" accept=".json,.yaml,.yml,.gradle" className="hidden"
                  onChange={e => { if (e.target.files?.[0]) handleFile(e.target.files[0]); }} />
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
          <span className="text-sm" style={{ color: 'var(--text-3)' }}>Auto-detects npm, Flutter, or Android</span>
        </div>
      </div>
    </div>
  );
}
