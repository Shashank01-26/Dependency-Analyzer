'use client';

import { useEffect, useRef, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DependencyTreeNode, RiskLevel } from '@/types';

const COLORS: Record<RiskLevel, string> = {
  low: '#4ade80',
  medium: '#fbbf24',
  high: '#f87171',
  critical: '#ff6b6b',
};

const GLOW: Record<RiskLevel, string> = {
  low: 'rgba(74,222,128,0.3)',
  medium: 'rgba(251,191,36,0.3)',
  high: 'rgba(248,113,113,0.35)',
  critical: 'rgba(255,107,107,0.45)',
};

interface GraphNode {
  id: string;
  name: string;
  riskLevel: RiskLevel;
  score: number;
  depth: number;
  childCount: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  fx?: number | null;
  fy?: number | null;
}

interface GraphLink {
  sourceId: string;
  targetId: string;
}

function flatten(tree: DependencyTreeNode[]): { nodes: GraphNode[]; links: GraphLink[] } {
  const nodes: GraphNode[] = [];
  const links: GraphLink[] = [];
  const seen = new Set<string>();

  function walk(node: DependencyTreeNode, depth: number, parentId: string | null) {
    if (seen.has(node.name)) {
      if (parentId) links.push({ sourceId: parentId, targetId: node.name });
      return;
    }
    seen.add(node.name);

    nodes.push({
      id: node.name,
      name: node.name,
      riskLevel: node.riskLevel,
      score: node.score,
      depth,
      childCount: node.children.length,
      x: 0, y: 0, vx: 0, vy: 0,
    });

    if (parentId) links.push({ sourceId: parentId, targetId: node.name });
    if (depth < 3) {
      node.children.forEach(child => walk(child, depth + 1, node.name));
    }
  }

  tree.forEach(n => walk(n, 0, null));
  return { nodes, links };
}

function getRadius(depth: number): number {
  if (depth === 0) return 24;
  if (depth === 1) return 18;
  return 13;
}

/**
 * Simple force simulation run synchronously (no D3 dependency).
 * Avoids all SSR/DOM issues. Runs a fixed number of iterations.
 */
function runLayout(
  nodes: GraphNode[],
  links: GraphLink[],
  width: number,
  height: number
): GraphNode[] {
  const result = nodes.map((n, i) => ({
    ...n,
    // Initialize in a spread circle so they don't all start at 0,0
    x: width / 2 + Math.cos((i / nodes.length) * Math.PI * 2) * (100 + n.depth * 60),
    y: 80 + n.depth * 150 + (Math.random() - 0.5) * 40,
    vx: 0,
    vy: 0,
  }));

  const nodeMap = new Map(result.map(n => [n.id, n]));
  const ITERATIONS = 120;

  for (let iter = 0; iter < ITERATIONS; iter++) {
    const alpha = 1 - iter / ITERATIONS;
    const decay = alpha * 0.8;

    // Repulsion between all nodes
    for (let i = 0; i < result.length; i++) {
      for (let j = i + 1; j < result.length; j++) {
        const a = result[i], b = result[j];
        let dx = b.x - a.x;
        let dy = b.y - a.y;
        let dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const minDist = getRadius(a.depth) + getRadius(b.depth) + 50;
        if (dist < minDist) {
          const force = ((minDist - dist) / dist) * decay * 0.5;
          const fx = dx * force, fy = dy * force;
          a.vx -= fx; a.vy -= fy;
          b.vx += fx; b.vy += fy;
        }
        // Charge repulsion
        const charge = -200 * decay / (dist * dist + 100);
        a.vx -= dx * charge / dist;
        a.vy -= dy * charge / dist;
        b.vx += dx * charge / dist;
        b.vy += dy * charge / dist;
      }
    }

    // Link attraction
    for (const link of links) {
      const s = nodeMap.get(link.sourceId);
      const t = nodeMap.get(link.targetId);
      if (!s || !t) continue;
      let dx = t.x - s.x;
      let dy = t.y - s.y;
      let dist = Math.sqrt(dx * dx + dy * dy) || 1;
      const targetDist = s.depth === 0 ? 120 : 80;
      const force = (dist - targetDist) * decay * 0.01;
      const fx = (dx / dist) * force, fy = (dy / dist) * force;
      s.vx += fx; s.vy += fy;
      t.vx -= fx; t.vy -= fy;
    }

    // Center gravity
    for (const n of result) {
      n.vx += (width / 2 - n.x) * decay * 0.002;
      // Pull to depth layer
      const targetY = 80 + n.depth * 150;
      n.vy += (targetY - n.y) * decay * 0.02;
    }

    // Apply velocity with damping
    for (const n of result) {
      n.vx *= 0.6;
      n.vy *= 0.6;
      n.x += n.vx;
      n.y += n.vy;
      // Clamp to bounds
      n.x = Math.max(40, Math.min(width - 40, n.x));
      n.y = Math.max(30, Math.min(height - 30, n.y));
    }
  }

  return result;
}

export default function DependencyGraph({ tree }: { tree: DependencyTreeNode[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [containerWidth, setContainerWidth] = useState(900);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const panStart = useRef({ x: 0, y: 0, px: 0, py: 0 });

  const { nodes: rawNodes, links } = useMemo(() => flatten(tree), [tree]);

  useEffect(() => {
    if (!containerRef.current) return;
    const obs = new ResizeObserver(entries => {
      setContainerWidth(entries[0].contentRect.width);
    });
    obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, []);

  const width = Math.max(containerWidth, 800);
  const maxDepth = rawNodes.reduce((m, n) => Math.max(m, n.depth), 0);
  const height = Math.max(500, (maxDepth + 1) * 150 + 120);

  const nodes = useMemo(
    () => runLayout(rawNodes, links, width, height),
    [rawNodes, links, width, height]
  );

  const nodeMap = useMemo(() => new Map(nodes.map(n => [n.id, n])), [nodes]);

  const adjacency = useMemo(() => {
    const adj = new Map<string, Set<string>>();
    links.forEach(l => {
      if (!adj.has(l.sourceId)) adj.set(l.sourceId, new Set());
      if (!adj.has(l.targetId)) adj.set(l.targetId, new Set());
      adj.get(l.sourceId)!.add(l.targetId);
      adj.get(l.targetId)!.add(l.sourceId);
    });
    return adj;
  }, [links]);

  const isRelated = (id: string) => {
    if (!hoveredNode) return true;
    if (id === hoveredNode) return true;
    return adjacency.get(hoveredNode)?.has(id) || false;
  };

  const isLinkActive = (s: string, t: string) => {
    if (!hoveredNode) return false;
    return hoveredNode === s || hoveredNode === t;
  };

  // Pan & zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    setZoom(z => Math.min(2.5, Math.max(0.3, z + (e.deltaY > 0 ? -0.08 : 0.08))));
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    setIsPanning(true);
    panStart.current = { x: e.clientX, y: e.clientY, px: pan.x, py: pan.y };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isPanning) return;
    setPan({
      x: panStart.current.px + (e.clientX - panStart.current.x),
      y: panStart.current.py + (e.clientY - panStart.current.y),
    });
  };

  const handleMouseUp = () => setIsPanning(false);

  const selectedData = selectedNode ? nodeMap.get(selectedNode) : null;

  return (
    <div className="glass-lg shine-top overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: 'var(--border-1)' }}>
        <div className="flex items-center gap-3">
          <h3 className="label" style={{ fontSize: 11 }}>Dependency Graph</h3>
          <span className="mono text-[10px]" style={{ color: 'var(--text-ghost)' }}>
            drag to pan &bull; scroll to zoom
          </span>
        </div>
        <div className="flex items-center gap-4">
          {(['low', 'medium', 'high', 'critical'] as RiskLevel[]).map(level => (
            <div key={level} className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full" style={{ background: COLORS[level] }} />
              <span className="mono text-[9px] uppercase" style={{ color: 'var(--text-3)' }}>{level}</span>
            </div>
          ))}
          <div className="flex items-center gap-1 ml-2 pl-3" style={{ borderLeft: '1px solid var(--border-1)' }}>
            <button
              onClick={() => setZoom(z => Math.min(2.5, z + 0.15))}
              className="w-6 h-6 rounded flex items-center justify-center mono text-xs"
              style={{ background: 'var(--surface)', color: 'var(--text-2)', border: '1px solid var(--border-1)' }}
            >+</button>
            <span className="mono text-[9px] w-9 text-center" style={{ color: 'var(--text-3)' }}>{Math.round(zoom * 100)}%</span>
            <button
              onClick={() => setZoom(z => Math.max(0.3, z - 0.15))}
              className="w-6 h-6 rounded flex items-center justify-center mono text-xs"
              style={{ background: 'var(--surface)', color: 'var(--text-2)', border: '1px solid var(--border-1)' }}
            >-</button>
            <button
              onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }}
              className="ml-1 px-2 h-6 rounded mono text-[9px]"
              style={{ background: 'var(--surface)', color: 'var(--text-3)', border: '1px solid var(--border-1)' }}
            >Reset</button>
          </div>
        </div>
      </div>

      <div className="flex">
        {/* Canvas */}
        <div
          ref={containerRef}
          className="flex-1 relative overflow-hidden"
          style={{ background: 'var(--abyss)', height: Math.min(height * zoom + 40, 650), cursor: isPanning ? 'grabbing' : 'grab' }}
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          <svg
            width={width}
            height={height}
            viewBox={`0 0 ${width} ${height}`}
            className="block"
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              transformOrigin: 'top left',
              transition: isPanning ? 'none' : 'transform 0.15s ease-out',
            }}
          >
            {/* Grid */}
            <defs>
              <pattern id="gg" width="60" height="60" patternUnits="userSpaceOnUse">
                <path d="M 60 0 L 0 0 0 60" fill="none" stroke="rgba(125,211,252,0.025)" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#gg)" />

            {/* Links — curved bezier */}
            {links.map((link, i) => {
              const s = nodeMap.get(link.sourceId);
              const t = nodeMap.get(link.targetId);
              if (!s || !t) return null;

              const active = isLinkActive(link.sourceId, link.targetId);
              const visible = hoveredNode ? active : true;

              const sy = s.y + getRadius(s.depth);
              const ty = t.y - getRadius(t.depth);
              const midY = (sy + ty) / 2;

              return (
                <motion.path
                  key={`${link.sourceId}-${link.targetId}-${i}`}
                  d={`M ${s.x} ${sy} C ${s.x} ${midY}, ${t.x} ${midY}, ${t.x} ${ty}`}
                  fill="none"
                  stroke={active ? COLORS[t.riskLevel] : 'rgba(125,211,252,0.06)'}
                  strokeWidth={active ? 2 : 1}
                  opacity={visible ? (active ? 0.7 : 0.4) : 0.05}
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: visible ? (active ? 0.7 : 0.4) : 0.05 }}
                  transition={{ pathLength: { duration: 0.8, delay: i * 0.02 }, opacity: { duration: 0.2 } }}
                />
              );
            })}

            {/* Nodes */}
            {nodes.map((node, i) => {
              const color = COLORS[node.riskLevel];
              const r = getRadius(node.depth);
              const related = isRelated(node.id);
              const isHovered = hoveredNode === node.id;
              const isSelected = selectedNode === node.id;

              return (
                <motion.g
                  key={node.id}
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: related ? 1 : 0.12, scale: 1 }}
                  transition={{ opacity: { duration: 0.2 }, scale: { duration: 0.4, delay: i * 0.02, type: 'spring', stiffness: 300, damping: 25 } }}
                  style={{ transformOrigin: `${node.x}px ${node.y}px` }}
                  onMouseEnter={() => setHoveredNode(node.id)}
                  onMouseLeave={() => setHoveredNode(null)}
                  onClick={() => setSelectedNode(isSelected ? null : node.id)}
                  className="cursor-pointer"
                >
                  {/* Glow for risky nodes */}
                  {(node.riskLevel === 'high' || node.riskLevel === 'critical') && (
                    <circle cx={node.x} cy={node.y} r={r + 10} fill="none" stroke={GLOW[node.riskLevel]} strokeWidth={6} opacity={isHovered ? 0.8 : 0.4} />
                  )}

                  {/* Selection ring */}
                  {isSelected && (
                    <circle cx={node.x} cy={node.y} r={r + 6} fill="none" stroke="var(--cyan-1)" strokeWidth={1.5} strokeDasharray="4 3" />
                  )}

                  {/* Body */}
                  <circle cx={node.x} cy={node.y} r={r} fill="var(--elevated)" stroke={color} strokeWidth={isHovered || isSelected ? 2.5 : 1.5} />

                  {/* Score */}
                  <text
                    x={node.x} y={node.y + 1}
                    textAnchor="middle" dominantBaseline="central"
                    fill={color}
                    fontSize={node.depth === 0 ? 12 : node.depth === 1 ? 10 : 8}
                    fontFamily="'JetBrains Mono', monospace" fontWeight="600"
                  >
                    {node.score}
                  </text>

                  {/* Label */}
                  {(node.depth <= 1 || isHovered) && (
                    <text
                      x={node.x} y={node.y + r + 13}
                      textAnchor="middle"
                      fill={isHovered ? 'var(--text-1)' : 'var(--text-2)'}
                      fontSize={node.depth === 0 ? 10 : 8}
                      fontFamily="'JetBrains Mono', monospace"
                    >
                      {node.name.length > 18 ? node.name.slice(0, 16) + '\u2026' : node.name}
                    </text>
                  )}

                  {/* Child count badge */}
                  {node.depth === 0 && node.childCount > 0 && (
                    <>
                      <circle cx={node.x + r - 3} cy={node.y - r + 3} r={7} fill="var(--panel)" stroke="var(--border-2)" strokeWidth={1} />
                      <text
                        x={node.x + r - 3} y={node.y - r + 4}
                        textAnchor="middle" dominantBaseline="central"
                        fill="var(--text-3)" fontSize="7" fontFamily="'JetBrains Mono', monospace" fontWeight="600"
                      >
                        {node.childCount}
                      </text>
                    </>
                  )}
                </motion.g>
              );
            })}
          </svg>
        </div>

        {/* Detail sidebar */}
        <AnimatePresence>
          {selectedData && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 260, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] as const }}
              className="overflow-hidden border-l flex-shrink-0"
              style={{ background: 'var(--elevated)', borderColor: 'var(--border-1)' }}
            >
              <div className="p-5 w-[260px]">
                <div className="flex items-center justify-between mb-5">
                  <span className="label">Node Detail</span>
                  <button onClick={() => setSelectedNode(null)} className="mono text-xs" style={{ color: 'var(--text-3)' }}>&times;</button>
                </div>
                <div className="mb-5">
                  <div className="mono text-sm font-semibold mb-2" style={{ color: 'var(--text-1)' }}>{selectedData.name}</div>
                  <div className="flex items-center gap-3">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md mono text-[10px] font-semibold uppercase border"
                      style={{ color: COLORS[selectedData.riskLevel], borderColor: COLORS[selectedData.riskLevel], background: GLOW[selectedData.riskLevel] }}
                    >{selectedData.riskLevel}</span>
                    <span className="mono text-xl font-bold" style={{ color: COLORS[selectedData.riskLevel] }}>{selectedData.score}</span>
                  </div>
                </div>
                <dl className="space-y-3">
                  {[
                    { label: 'Depth', value: `Level ${selectedData.depth}` },
                    { label: 'Children', value: String(selectedData.childCount) },
                    { label: 'Connected', value: `${adjacency.get(selectedData.id)?.size || 0} nodes` },
                  ].map(item => (
                    <div key={item.label} className="flex items-center justify-between">
                      <dt className="label">{item.label}</dt>
                      <dd className="mono text-[11px] font-medium" style={{ color: 'var(--text-2)' }}>{item.value}</dd>
                    </div>
                  ))}
                </dl>
                {adjacency.get(selectedData.id) && (
                  <div className="mt-5 pt-5 border-t" style={{ borderColor: 'var(--border-1)' }}>
                    <span className="label">Connected</span>
                    <div className="mt-3 space-y-1 max-h-52 overflow-y-auto">
                      {Array.from(adjacency.get(selectedData.id) || []).map(id => {
                        const n = nodeMap.get(id);
                        if (!n) return null;
                        return (
                          <button
                            key={id}
                            onClick={() => setSelectedNode(id)}
                            className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-left transition-all"
                            style={{ background: 'var(--surface)' }}
                            onMouseEnter={e => (e.currentTarget.style.background = 'var(--hover)')}
                            onMouseLeave={e => (e.currentTarget.style.background = 'var(--surface)')}
                          >
                            <span className="mono text-[11px] truncate" style={{ color: 'var(--text-2)' }}>{n.name}</span>
                            <span className="mono text-[10px] font-bold ml-2 flex-shrink-0" style={{ color: COLORS[n.riskLevel] }}>{n.score}</span>
                          </button>
                        );
                      })}
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
