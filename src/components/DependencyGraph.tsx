'use client';

import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DependencyTreeNode, RiskLevel } from '@/types';

const COLORS: Record<RiskLevel, string> = {
  low: '#30d158', medium: '#ffd60a', high: '#ff453a', critical: '#ff2d55',
};
const SOFT: Record<RiskLevel, string> = {
  low: 'rgba(48,209,88,0.15)', medium: 'rgba(255,214,10,0.15)', high: 'rgba(255,69,58,0.15)', critical: 'rgba(255,45,85,0.2)',
};

const RISK_LEVELS: RiskLevel[] = ['low', 'medium', 'high', 'critical'];

interface FlatNode {
  id: string;
  name: string;
  riskLevel: RiskLevel;
  score: number;
  depth: number;
  children: DependencyTreeNode[];
  childCount: number;
}

function flattenRoots(tree: DependencyTreeNode[]): FlatNode[] {
  const seen = new Set<string>();
  return tree.filter(n => { if (seen.has(n.name)) return false; seen.add(n.name); return true; })
    .map(n => ({ id: n.name, name: n.name, riskLevel: n.riskLevel, score: n.score, depth: 0, children: n.children, childCount: n.children.length }));
}

function radialPositions(count: number, cx: number, cy: number, radius: number): { x: number; y: number; angle: number }[] {
  return Array.from({ length: count }, (_, i) => {
    const angle = (i / count) * Math.PI * 2 - Math.PI / 2;
    return { x: cx + Math.cos(angle) * radius, y: cy + Math.sin(angle) * radius, angle };
  });
}

export default function DependencyGraph({ tree }: { tree: DependencyTreeNode[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(900);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [hovered, setHovered] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);

  // Zoom & pan
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const panStart = useRef({ x: 0, y: 0, px: 0, py: 0 });

  // Risk filter
  const [visibleLevels, setVisibleLevels] = useState<Set<RiskLevel>>(new Set(RISK_LEVELS));

  const allRoots = useMemo(() => flattenRoots(tree), [tree]);
  const roots = useMemo(() => allRoots.filter(r => visibleLevels.has(r.riskLevel)), [allRoots, visibleLevels]);

  useEffect(() => {
    if (!containerRef.current) return;
    const obs = new ResizeObserver(e => setContainerWidth(e[0].contentRect.width));
    obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, []);

  const size = Math.min(containerWidth, 800);
  const cx = size / 2;
  const cy = size / 2;
  const innerR = Math.min(size * 0.28, 160);
  const outerR = Math.min(size * 0.42, 260);

  const rootPositions = useMemo(() => radialPositions(roots.length, cx, cy, innerR), [roots.length, cx, cy, innerR]);

  const childNodes = useMemo(() => {
    const result: { parent: FlatNode; parentPos: { x: number; y: number; angle: number }; children: { node: DependencyTreeNode; x: number; y: number }[] }[] = [];
    const seen = new Set<string>();

    roots.forEach((root, i) => {
      if (!expanded.has(root.id)) return;
      const pp = rootPositions[i];
      const kids = root.children
        .filter(c => visibleLevels.has(c.riskLevel))
        .filter(c => { if (seen.has(c.name)) return false; seen.add(c.name); return true; });
      if (kids.length === 0) return;

      const spread = Math.min(0.5, (kids.length * 0.08));
      const startAngle = pp.angle - spread;
      const step = kids.length > 1 ? (spread * 2) / (kids.length - 1) : 0;

      result.push({
        parent: root,
        parentPos: pp,
        children: kids.map((child, j) => {
          const a = kids.length === 1 ? pp.angle : startAngle + j * step;
          return { node: child, x: cx + Math.cos(a) * outerR, y: cy + Math.sin(a) * outerR };
        }),
      });
    });
    return result;
  }, [roots, expanded, rootPositions, cx, cy, outerR, visibleLevels]);

  const toggleExpand = (id: string) => {
    setExpanded(prev => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  };

  const toggleLevel = (level: RiskLevel) => {
    setVisibleLevels(prev => {
      const next = new Set(prev);
      if (next.has(level)) { if (next.size > 1) next.delete(level); } // Don't allow empty
      else next.add(level);
      return next;
    });
  };

  // Zoom
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    setZoom(z => Math.min(3, Math.max(0.4, z + (e.deltaY > 0 ? -0.1 : 0.1))));
  }, []);

  // Pan
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    setIsPanning(true);
    panStart.current = { x: e.clientX, y: e.clientY, px: pan.x, py: pan.y };
  }, [pan]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isPanning) return;
    setPan({ x: panStart.current.px + (e.clientX - panStart.current.x), y: panStart.current.py + (e.clientY - panStart.current.y) });
  }, [isPanning]);

  const handleMouseUp = useCallback(() => setIsPanning(false), []);

  const resetView = () => { setZoom(1); setPan({ x: 0, y: 0 }); };

  const selectedRoot = selected ? roots.find(r => r.id === selected) : null;

  // Count per level for filter badges
  const levelCounts = useMemo(() => {
    const counts: Record<RiskLevel, number> = { low: 0, medium: 0, high: 0, critical: 0 };
    allRoots.forEach(r => counts[r.riskLevel]++);
    return counts;
  }, [allRoots]);

  return (
    <div className="card overflow-hidden">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-bold text-white uppercase tracking-wide">Dependency Graph</h3>
          <span className="text-xs" style={{ color: 'var(--text-dim)' }}>
            {roots.length} of {allRoots.length} shown
          </span>
        </div>

        <div className="flex items-center gap-3">
          {/* Risk level filter toggles */}
          {RISK_LEVELS.map(level => {
            const active = visibleLevels.has(level);
            return (
              <button
                key={level}
                onClick={() => toggleLevel(level)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
                style={{
                  background: active ? SOFT[level] : 'transparent',
                  color: active ? COLORS[level] : 'var(--text-dim)',
                  border: `1px solid ${active ? COLORS[level] + '40' : 'var(--border)'}`,
                  opacity: active ? 1 : 0.5,
                }}
              >
                <span className="w-2 h-2 rounded-full" style={{ background: active ? COLORS[level] : 'var(--text-dim)' }} />
                {level}
                <span className="ml-0.5 opacity-70">{levelCounts[level]}</span>
              </button>
            );
          })}

          {/* Separator */}
          <div className="w-px h-6" style={{ background: 'var(--border)' }} />

          {/* Zoom controls */}
          <div className="flex items-center gap-1">
            <button onClick={() => setZoom(z => Math.min(3, z + 0.2))} className="btn btn-ghost !p-0 !w-8 !h-8 !min-h-0 !text-sm">+</button>
            <span className="text-xs font-mono w-12 text-center" style={{ color: 'var(--text-3)' }}>{Math.round(zoom * 100)}%</span>
            <button onClick={() => setZoom(z => Math.max(0.4, z - 0.2))} className="btn btn-ghost !p-0 !w-8 !h-8 !min-h-0 !text-sm">−</button>
            <button onClick={resetView} className="btn btn-ghost !py-1 !px-3 !min-h-0 !text-xs ml-1">Reset</button>
          </div>

          {expanded.size > 0 && (
            <button onClick={() => setExpanded(new Set())} className="btn btn-ghost !py-1 !px-3 !min-h-0 !text-xs">
              Collapse All
            </button>
          )}
        </div>
      </div>

      <div className="flex">
        {/* Graph canvas */}
        <div
          ref={containerRef}
          className="flex-1 relative overflow-hidden"
          style={{ background: 'var(--bg)', minHeight: 520, cursor: isPanning ? 'grabbing' : 'grab' }}
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          <svg
            width={size}
            height={size}
            viewBox={`0 0 ${size} ${size}`}
            className="block mx-auto"
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              transformOrigin: 'center center',
              transition: isPanning ? 'none' : 'transform 0.15s ease-out',
            }}
          >
            {/* Center hub */}
            <circle cx={cx} cy={cy} r={28} fill="var(--bg-3)" stroke="var(--border-2)" strokeWidth={1} />
            <text x={cx} y={cy - 6} textAnchor="middle" fill="var(--white)" fontSize="15" fontWeight="800" fontFamily="var(--sans)">
              {roots.length}
            </text>
            <text x={cx} y={cy + 10} textAnchor="middle" fill="var(--text-3)" fontSize="9" fontWeight="500" fontFamily="var(--sans)">
              packages
            </text>

            {/* Orbit rings */}
            <circle cx={cx} cy={cy} r={innerR} fill="none" stroke="var(--border)" strokeWidth="1" strokeDasharray="4 4" opacity="0.4" />
            {expanded.size > 0 && (
              <circle cx={cx} cy={cy} r={outerR} fill="none" stroke="var(--border)" strokeWidth="1" strokeDasharray="2 6" opacity="0.25" />
            )}

            {/* Child links */}
            {childNodes.map(group => group.children.map((child, j) => (
              <motion.line
                key={`link-${group.parent.id}-${child.node.name}`}
                x1={group.parentPos.x} y1={group.parentPos.y}
                x2={child.x} y2={child.y}
                stroke={COLORS[child.node.riskLevel]}
                strokeWidth={1.5}
                opacity={0.25}
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 0.25 }}
                transition={{ duration: 0.4, delay: j * 0.03 }}
              />
            )))}

            {/* Center-to-root links */}
            {rootPositions.map((pos, i) => (
              <line key={`hub-${i}`} x1={cx} y1={cy} x2={pos.x} y2={pos.y}
                stroke={COLORS[roots[i].riskLevel]} strokeWidth={1}
                opacity={hovered === roots[i].id ? 0.4 : 0.08} />
            ))}

            {/* Child nodes (outer ring) */}
            {childNodes.map(group => group.children.map((child, j) => {
              const color = COLORS[child.node.riskLevel];
              const isHov = hovered === child.node.name;
              return (
                <motion.g key={`child-${group.parent.id}-${child.node.name}`}
                  initial={{ opacity: 0, scale: 0 }} animate={{ opacity: 1, scale: 1 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 20, delay: j * 0.04 }}
                  style={{ transformOrigin: `${child.x}px ${child.y}px` }}
                  onMouseEnter={() => setHovered(child.node.name)}
                  onMouseLeave={() => setHovered(null)}>
                  <circle cx={child.x} cy={child.y} r={13}
                    fill="var(--bg-2)" stroke={color} strokeWidth={isHov ? 2.5 : 1.5} />
                  <text x={child.x} y={child.y + 1} textAnchor="middle" dominantBaseline="central"
                    fill={color} fontSize="8" fontWeight="600" fontFamily="var(--mono)">{child.node.score}</text>
                  {isHov && (
                    <text x={child.x} y={child.y + 24} textAnchor="middle"
                      fill="var(--white)" fontSize="9" fontFamily="var(--sans)" fontWeight="500">
                      {child.node.name.length > 20 ? child.node.name.slice(0, 18) + '…' : child.node.name}
                    </text>
                  )}
                </motion.g>
              );
            }))}

            {/* Root nodes (inner ring) */}
            {roots.map((node, i) => {
              const pos = rootPositions[i];
              const color = COLORS[node.riskLevel];
              const isHov = hovered === node.id;
              const isSel = selected === node.id;
              const isExp = expanded.has(node.id);
              const r = 22;

              const labelAngle = pos.angle;
              const labelR = innerR + 42;
              const lx = cx + Math.cos(labelAngle) * labelR;
              const ly = cy + Math.sin(labelAngle) * labelR;
              const anchor = Math.abs(labelAngle) < 0.3 || Math.abs(labelAngle - Math.PI * 2) < 0.3 ? 'middle' as const
                : labelAngle > -Math.PI / 2 && labelAngle < Math.PI / 2 ? 'start' as const : 'end' as const;

              return (
                <motion.g key={node.id}
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ type: 'spring', stiffness: 250, damping: 20, delay: i * 0.04 }}
                  style={{ transformOrigin: `${pos.x}px ${pos.y}px` }}
                  onMouseEnter={() => setHovered(node.id)}
                  onMouseLeave={() => setHovered(null)}
                  onClick={() => { toggleExpand(node.id); setSelected(isSel ? null : node.id); }}
                  className="cursor-pointer">

                  {(node.riskLevel === 'high' || node.riskLevel === 'critical') && (
                    <circle cx={pos.x} cy={pos.y} r={r + 8} fill={SOFT[node.riskLevel]} opacity={isHov ? 1 : 0.5} />
                  )}

                  {isExp && (
                    <circle cx={pos.x} cy={pos.y} r={r + 5} fill="none" stroke={color} strokeWidth={1} strokeDasharray="3 3" opacity={0.5} />
                  )}

                  <circle cx={pos.x} cy={pos.y} r={r}
                    fill="var(--bg-2)" stroke={color} strokeWidth={isHov || isSel ? 3 : 2} />

                  <text x={pos.x} y={pos.y + 1} textAnchor="middle" dominantBaseline="central"
                    fill={color} fontSize="12" fontWeight="700" fontFamily="var(--mono)">{node.score}</text>

                  {node.childCount > 0 && (
                    <>
                      <circle cx={pos.x + r - 4} cy={pos.y - r + 4} r={8}
                        fill="var(--bg-3)" stroke="var(--border-2)" strokeWidth={1} />
                      <text x={pos.x + r - 4} y={pos.y - r + 5} textAnchor="middle" dominantBaseline="central"
                        fill="var(--text-2)" fontSize="8" fontWeight="600" fontFamily="var(--sans)">{node.childCount}</text>
                    </>
                  )}

                  <text x={lx} y={ly} textAnchor={anchor} dominantBaseline="central"
                    fill={isHov ? 'var(--white)' : 'var(--text-2)'}
                    fontSize="11" fontWeight={isHov ? '600' : '500'} fontFamily="var(--sans)">
                    {node.name.length > 20 ? node.name.slice(0, 18) + '…' : node.name}
                  </text>
                </motion.g>
              );
            })}
          </svg>
        </div>

        {/* Detail sidebar */}
        <AnimatePresence>
          {selectedRoot && (
            <motion.div
              initial={{ width: 0, opacity: 0 }} animate={{ width: 280, opacity: 1 }} exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="overflow-hidden border-l flex-shrink-0"
              style={{ background: 'var(--bg-2)', borderColor: 'var(--border)' }}>
              <div className="p-5 w-[280px]">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--text-3)' }}>Package Detail</span>
                  <button onClick={() => setSelected(null)} className="text-sm" style={{ color: 'var(--text-3)' }}>✕</button>
                </div>

                <div className="mb-5">
                  <div className="text-base font-bold text-white mb-2">{selectedRoot.name}</div>
                  <div className="flex items-center gap-3">
                    <span className="pill" style={{ background: SOFT[selectedRoot.riskLevel], color: COLORS[selectedRoot.riskLevel], fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>
                      {selectedRoot.riskLevel}
                    </span>
                    <span className="text-2xl font-extrabold" style={{ color: COLORS[selectedRoot.riskLevel] }}>
                      {selectedRoot.score}
                    </span>
                  </div>
                </div>

                <dl className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <dt style={{ color: 'var(--text-3)' }}>Direct deps</dt>
                    <dd className="font-semibold" style={{ color: 'var(--text-2)' }}>{selectedRoot.childCount}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt style={{ color: 'var(--text-3)' }}>Depth</dt>
                    <dd className="font-semibold" style={{ color: 'var(--text-2)' }}>Level {selectedRoot.depth}</dd>
                  </div>
                </dl>

                {selectedRoot.children.length > 0 && (
                  <div className="mt-5 pt-4 border-t" style={{ borderColor: 'var(--border)' }}>
                    <div className="text-xs font-bold uppercase tracking-wide mb-3" style={{ color: 'var(--text-3)' }}>
                      Sub-dependencies ({selectedRoot.children.length})
                    </div>
                    <div className="space-y-1 max-h-64 overflow-y-auto">
                      {selectedRoot.children.map(child => (
                        <div key={child.name} className="flex items-center justify-between px-3 py-2 rounded-lg"
                          style={{ background: 'var(--bg)' }}>
                          <span className="text-sm truncate" style={{ color: 'var(--text-2)' }}>{child.name}</span>
                          <span className="text-xs font-bold ml-2 shrink-0" style={{ color: COLORS[child.riskLevel] }}>
                            {child.score}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
