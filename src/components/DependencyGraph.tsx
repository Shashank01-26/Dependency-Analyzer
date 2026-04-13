'use client';

import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DependencyTreeNode, RiskLevel } from '@/types';

const RISK_COLORS: Record<RiskLevel, string> = {
  low: '#1acc6e',
  medium: '#e09a20',
  high: '#e03050',
  critical: '#ff4466',
};

const RISK_GLOW: Record<RiskLevel, string> = {
  low: 'rgba(26,204,110,0.25)',
  medium: 'rgba(224,154,32,0.25)',
  high: 'rgba(224,48,80,0.3)',
  critical: 'rgba(255,68,102,0.4)',
};

interface FlatNode {
  id: string;
  name: string;
  riskLevel: RiskLevel;
  score: number;
  depth: number;
  parentId: string | null;
  childCount: number;
  x: number;
  y: number;
}

interface Link {
  source: string;
  target: string;
}

/**
 * Tidied tree layout using a layered approach.
 * - Level 0 (roots) spread horizontally across the top
 * - Each subsequent level is positioned below its parent
 * - Subtrees are spaced to avoid overlaps using a width accumulator
 */
function computeLayout(
  tree: DependencyTreeNode[],
  canvasWidth: number
): { nodes: FlatNode[]; links: Link[] } {
  const nodes: FlatNode[] = [];
  const links: Link[] = [];
  const seen = new Set<string>();

  const LEVEL_HEIGHT = 140;
  const NODE_MIN_WIDTH = 120;
  const PADDING_X = 80;

  // First pass: compute subtree widths
  function subtreeWidth(node: DependencyTreeNode, depth: number): number {
    if (seen.has(node.name) || depth > 3) return NODE_MIN_WIDTH;
    // Temporarily mark to handle cycles
    const unseenChildren = node.children.filter(c => !seen.has(c.name));
    if (unseenChildren.length === 0) return NODE_MIN_WIDTH;

    const tempSeen = new Set(seen);
    tempSeen.add(node.name);

    let total = 0;
    for (const child of unseenChildren) {
      if (tempSeen.has(child.name)) {
        total += NODE_MIN_WIDTH;
      } else {
        tempSeen.add(child.name);
        const childUnseen = child.children.filter(c => !tempSeen.has(c.name));
        if (childUnseen.length === 0) {
          total += NODE_MIN_WIDTH;
        } else {
          total += childUnseen.length * NODE_MIN_WIDTH;
        }
      }
    }
    return Math.max(NODE_MIN_WIDTH, total);
  }

  // Compute root-level widths to distribute them properly
  const rootWidths = tree.map(t => subtreeWidth(t, 0));
  const totalRootWidth = rootWidths.reduce((s, w) => s + w, 0);
  const scale = totalRootWidth > (canvasWidth - PADDING_X * 2)
    ? (canvasWidth - PADDING_X * 2) / totalRootWidth
    : 1;

  // Second pass: place nodes
  function placeNode(
    node: DependencyTreeNode,
    depth: number,
    leftX: number,
    allocatedWidth: number,
    parentId: string | null
  ) {
    if (seen.has(node.name)) {
      // Still add link for cross-references
      if (parentId) links.push({ source: parentId, target: node.name });
      return;
    }
    seen.add(node.name);

    const x = leftX + allocatedWidth / 2;
    const y = 60 + depth * LEVEL_HEIGHT;

    const childrenToPlace = node.children.filter(c => !seen.has(c.name));

    nodes.push({
      id: node.name,
      name: node.name,
      riskLevel: node.riskLevel,
      score: node.score,
      depth,
      parentId,
      childCount: node.children.length,
      x,
      y,
    });

    if (parentId) {
      links.push({ source: parentId, target: node.name });
    }

    if (childrenToPlace.length === 0 || depth >= 3) return;

    // Distribute children across allocated width
    const childWidth = allocatedWidth / childrenToPlace.length;
    childrenToPlace.forEach((child, i) => {
      placeNode(child, depth + 1, leftX + i * childWidth, childWidth, node.name);
    });
  }

  let cursor = PADDING_X;
  tree.forEach((rootNode, i) => {
    const w = rootWidths[i] * scale;
    placeNode(rootNode, 0, cursor, w, null);
    cursor += w;
  });

  return { nodes, links };
}

interface Props {
  tree: DependencyTreeNode[];
}

export default function DependencyGraph({ tree }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [containerWidth, setContainerWidth] = useState(1200);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const panStart = useRef({ x: 0, y: 0, panX: 0, panY: 0 });

  useEffect(() => {
    if (!containerRef.current) return;
    const obs = new ResizeObserver(entries => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width);
      }
    });
    obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, []);

  const width = Math.max(containerWidth, tree.length * 130 + 200);
  const { nodes, links } = useMemo(() => computeLayout(tree, width), [tree, width]);
  const maxDepth = nodes.reduce((m, n) => Math.max(m, n.depth), 0);
  const height = Math.max(500, (maxDepth + 1) * 140 + 100);

  const nodeMap = useMemo(() => new Map(nodes.map(n => [n.id, n])), [nodes]);

  // Build adjacency for hover highlighting
  const adjacency = useMemo(() => {
    const adj = new Map<string, Set<string>>();
    for (const link of links) {
      if (!adj.has(link.source)) adj.set(link.source, new Set());
      if (!adj.has(link.target)) adj.set(link.target, new Set());
      adj.get(link.source)!.add(link.target);
      adj.get(link.target)!.add(link.source);
    }
    return adj;
  }, [links]);

  const isRelated = useCallback((nodeId: string) => {
    if (!hoveredNode) return true;
    if (nodeId === hoveredNode) return true;
    return adjacency.get(hoveredNode)?.has(nodeId) || false;
  }, [hoveredNode, adjacency]);

  const isLinkHighlighted = useCallback((source: string, target: string) => {
    if (!hoveredNode) return false;
    return (hoveredNode === source || hoveredNode === target);
  }, [hoveredNode]);

  // Pan & zoom handlers
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.08 : 0.08;
    setZoom(z => Math.min(2, Math.max(0.3, z + delta)));
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    setIsPanning(true);
    panStart.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y };
  }, [pan]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isPanning) return;
    setPan({
      x: panStart.current.panX + (e.clientX - panStart.current.x),
      y: panStart.current.panY + (e.clientY - panStart.current.y),
    });
  }, [isPanning]);

  const handleMouseUp = useCallback(() => setIsPanning(false), []);

  const resetView = () => { setZoom(1); setPan({ x: 0, y: 0 }); };

  const selectedData = selectedNode ? nodeMap.get(selectedNode) : null;

  return (
    <div className="panel overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: 'var(--border-dim)' }}>
        <h3 className="font-mono text-sm font-semibold tracking-wider uppercase" style={{ color: 'var(--text-secondary)' }}>
          Dependency Graph
        </h3>
        <div className="flex items-center gap-5">
          {/* Legend */}
          <div className="flex items-center gap-3">
            {(['low', 'medium', 'high', 'critical'] as RiskLevel[]).map(level => (
              <div key={level} className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full" style={{ background: RISK_COLORS[level] }} />
                <span className="text-[10px] font-mono uppercase" style={{ color: 'var(--text-tertiary)' }}>
                  {level}
                </span>
              </div>
            ))}
          </div>
          {/* Zoom controls */}
          <div className="flex items-center gap-1" style={{ borderLeft: '1px solid var(--border-dim)', paddingLeft: 12 }}>
            <button
              onClick={() => setZoom(z => Math.min(2, z + 0.15))}
              className="w-6 h-6 rounded flex items-center justify-center text-xs font-mono"
              style={{ background: 'var(--bg-surface)', color: 'var(--text-secondary)', border: '1px solid var(--border-dim)' }}
            >
              +
            </button>
            <span className="text-[10px] font-mono w-10 text-center" style={{ color: 'var(--text-tertiary)' }}>
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={() => setZoom(z => Math.max(0.3, z - 0.15))}
              className="w-6 h-6 rounded flex items-center justify-center text-xs font-mono"
              style={{ background: 'var(--bg-surface)', color: 'var(--text-secondary)', border: '1px solid var(--border-dim)' }}
            >
              -
            </button>
            <button
              onClick={resetView}
              className="ml-1 px-2 h-6 rounded flex items-center justify-center text-[10px] font-mono"
              style={{ background: 'var(--bg-surface)', color: 'var(--text-tertiary)', border: '1px solid var(--border-dim)' }}
            >
              Reset
            </button>
          </div>
        </div>
      </div>

      <div className="flex">
        {/* Graph canvas */}
        <div
          ref={containerRef}
          className="flex-1 relative overflow-hidden"
          style={{ background: 'var(--bg-surface)', height: Math.min(height * zoom + 40, 700), cursor: isPanning ? 'grabbing' : 'grab' }}
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
              <pattern id="graphGrid" width="50" height="50" patternUnits="userSpaceOnUse">
                <path d="M 50 0 L 0 0 0 50" fill="none" stroke="var(--border-dim)" strokeWidth="0.4" opacity="0.4" />
              </pattern>
              {/* Glow filters */}
              {(['low', 'medium', 'high', 'critical'] as RiskLevel[]).map(level => (
                <filter key={level} id={`glow-${level}`} x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="4" result="blur" />
                  <feFlood floodColor={RISK_COLORS[level]} floodOpacity="0.3" />
                  <feComposite in2="blur" operator="in" />
                  <feMerge>
                    <feMergeNode />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              ))}
            </defs>
            <rect width="100%" height="100%" fill="url(#graphGrid)" />

            {/* Links — curved bezier paths */}
            {links.map((link, i) => {
              const source = nodeMap.get(link.source);
              const target = nodeMap.get(link.target);
              if (!source || !target) return null;

              const highlighted = isLinkHighlighted(link.source, link.target);
              const visible = hoveredNode ? highlighted : true;

              // Curved path from bottom of source to top of target
              const sy = source.y + 22;
              const ty = target.y - 22;
              const midY = (sy + ty) / 2;

              return (
                <motion.path
                  key={`${link.source}-${link.target}-${i}`}
                  d={`M ${source.x} ${sy} C ${source.x} ${midY}, ${target.x} ${midY}, ${target.x} ${ty}`}
                  fill="none"
                  stroke={highlighted ? RISK_COLORS[target.riskLevel] : 'var(--border-subtle)'}
                  strokeWidth={highlighted ? 2 : 1}
                  opacity={visible ? (highlighted ? 0.8 : 0.35) : 0.06}
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 0.6, delay: i * 0.015 }}
                />
              );
            })}

            {/* Nodes */}
            {nodes.map((node, i) => {
              const color = RISK_COLORS[node.riskLevel];
              const related = isRelated(node.id);
              const isHovered = hoveredNode === node.id;
              const isSelected = selectedNode === node.id;
              const r = node.depth === 0 ? 22 : node.depth === 1 ? 18 : 14;

              return (
                <motion.g
                  key={node.id}
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: related ? 1 : 0.12, scale: 1 }}
                  transition={{ duration: 0.35, delay: i * 0.02, type: 'spring', stiffness: 300, damping: 25 }}
                  onMouseEnter={() => setHoveredNode(node.id)}
                  onMouseLeave={() => setHoveredNode(null)}
                  onClick={(e) => { e.stopPropagation(); setSelectedNode(isSelected ? null : node.id); }}
                  className="cursor-pointer"
                  style={{ transformOrigin: `${node.x}px ${node.y}px` }}
                >
                  {/* Outer glow ring for high/critical */}
                  {(node.riskLevel === 'high' || node.riskLevel === 'critical') && (
                    <circle
                      cx={node.x}
                      cy={node.y}
                      r={r + 10}
                      fill="none"
                      stroke={RISK_GLOW[node.riskLevel]}
                      strokeWidth={6}
                      opacity={isHovered ? 0.8 : 0.4}
                    />
                  )}

                  {/* Selection ring */}
                  {isSelected && (
                    <circle
                      cx={node.x}
                      cy={node.y}
                      r={r + 6}
                      fill="none"
                      stroke="var(--cyan-solid)"
                      strokeWidth={2}
                      strokeDasharray="4 3"
                    />
                  )}

                  {/* Node body */}
                  <circle
                    cx={node.x}
                    cy={node.y}
                    r={r}
                    fill="var(--bg-elevated)"
                    stroke={color}
                    strokeWidth={isHovered || isSelected ? 2.5 : 1.5}
                  />

                  {/* Score */}
                  <text
                    x={node.x}
                    y={node.y + 1}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fill={color}
                    fontSize={node.depth === 0 ? 11 : node.depth === 1 ? 10 : 8}
                    fontFamily="'IBM Plex Mono', monospace"
                    fontWeight="600"
                  >
                    {node.score}
                  </text>

                  {/* Label — only show for depth 0-1, or on hover */}
                  {(node.depth <= 1 || isHovered) && (
                    <text
                      x={node.x}
                      y={node.y + r + 12}
                      textAnchor="middle"
                      fill={isHovered ? 'var(--text-primary)' : 'var(--text-secondary)'}
                      fontSize={node.depth === 0 ? 10 : 9}
                      fontFamily="'IBM Plex Mono', monospace"
                      fontWeight={node.depth === 0 ? '500' : '400'}
                    >
                      {node.name.length > 20 ? node.name.slice(0, 18) + '\u2026' : node.name}
                    </text>
                  )}

                  {/* Child count badge for depth 0 nodes with children */}
                  {node.depth === 0 && node.childCount > 0 && (
                    <>
                      <circle
                        cx={node.x + r - 2}
                        cy={node.y - r + 2}
                        r={7}
                        fill="var(--bg-panel)"
                        stroke="var(--border-subtle)"
                        strokeWidth={1}
                      />
                      <text
                        x={node.x + r - 2}
                        y={node.y - r + 3}
                        textAnchor="middle"
                        dominantBaseline="central"
                        fill="var(--text-tertiary)"
                        fontSize="7"
                        fontFamily="'IBM Plex Mono', monospace"
                        fontWeight="600"
                      >
                        {node.childCount}
                      </text>
                    </>
                  )}
                </motion.g>
              );
            })}
          </svg>

          {/* Depth level labels */}
          {Array.from({ length: maxDepth + 1 }, (_, d) => (
            <div
              key={d}
              className="absolute left-3 font-mono text-[9px] uppercase tracking-widest"
              style={{
                top: (60 + d * 140) * zoom + pan.y - 8,
                color: 'var(--text-tertiary)',
                opacity: 0.5,
                transform: `scale(${zoom})`,
                transformOrigin: 'left center',
              }}
            >
              {d === 0 ? 'Direct' : d === 1 ? 'Level 1' : d === 2 ? 'Level 2' : `Level ${d}`}
            </div>
          ))}
        </div>

        {/* Detail sidebar when a node is selected */}
        <AnimatePresence>
          {selectedData && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 260, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="overflow-hidden border-l flex-shrink-0"
              style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border-dim)' }}
            >
              <div className="p-4 w-[260px]">
                <div className="flex items-center justify-between mb-4">
                  <span className="font-mono text-[10px] uppercase tracking-widest" style={{ color: 'var(--text-tertiary)' }}>
                    Node Detail
                  </span>
                  <button
                    onClick={() => setSelectedNode(null)}
                    className="text-xs font-mono"
                    style={{ color: 'var(--text-tertiary)' }}
                  >
                    &times;
                  </button>
                </div>

                <div className="mb-4">
                  <div className="font-mono text-sm font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
                    {selectedData.name}
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className="inline-flex items-center px-2 py-0.5 rounded font-mono text-[10px] font-semibold uppercase border"
                      style={{
                        color: RISK_COLORS[selectedData.riskLevel],
                        borderColor: RISK_COLORS[selectedData.riskLevel],
                        background: RISK_GLOW[selectedData.riskLevel],
                      }}
                    >
                      {selectedData.riskLevel}
                    </span>
                    <span className="font-mono text-lg font-bold" style={{ color: RISK_COLORS[selectedData.riskLevel] }}>
                      {selectedData.score}
                    </span>
                  </div>
                </div>

                <dl className="space-y-2.5">
                  {[
                    { label: 'Depth', value: `Level ${selectedData.depth}` },
                    { label: 'Direct Children', value: String(selectedData.childCount) },
                    { label: 'Connected To', value: `${adjacency.get(selectedData.id)?.size || 0} nodes` },
                  ].map(item => (
                    <div key={item.label} className="flex items-center justify-between">
                      <dt className="text-[10px] font-mono uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>
                        {item.label}
                      </dt>
                      <dd className="text-xs font-mono font-medium" style={{ color: 'var(--text-secondary)' }}>
                        {item.value}
                      </dd>
                    </div>
                  ))}
                </dl>

                {/* Connected nodes list */}
                {adjacency.get(selectedData.id) && (
                  <div className="mt-4 pt-4 border-t" style={{ borderColor: 'var(--border-dim)' }}>
                    <span className="text-[10px] font-mono uppercase tracking-widest" style={{ color: 'var(--text-tertiary)' }}>
                      Connected
                    </span>
                    <div className="mt-2 space-y-1 max-h-48 overflow-y-auto">
                      {Array.from(adjacency.get(selectedData.id) || []).map(id => {
                        const n = nodeMap.get(id);
                        if (!n) return null;
                        return (
                          <button
                            key={id}
                            onClick={() => setSelectedNode(id)}
                            className="w-full flex items-center justify-between px-2 py-1.5 rounded text-left transition-colors"
                            style={{ background: 'var(--bg-surface)' }}
                            onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
                            onMouseLeave={e => (e.currentTarget.style.background = 'var(--bg-surface)')}
                          >
                            <span className="text-[11px] font-mono truncate" style={{ color: 'var(--text-secondary)' }}>
                              {n.name}
                            </span>
                            <span className="text-[10px] font-mono font-semibold ml-2 flex-shrink-0" style={{ color: RISK_COLORS[n.riskLevel] }}>
                              {n.score}
                            </span>
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
