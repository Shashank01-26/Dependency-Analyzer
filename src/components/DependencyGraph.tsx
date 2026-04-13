'use client';

import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as d3 from 'd3';
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

interface SimNode extends d3.SimulationNodeDatum {
  id: string;
  name: string;
  riskLevel: RiskLevel;
  score: number;
  depth: number;
  childCount: number;
}

interface SimLink extends d3.SimulationLinkDatum<SimNode> {
  source: string | SimNode;
  target: string | SimNode;
}

function flatten(tree: DependencyTreeNode[]): { nodes: SimNode[]; links: SimLink[] } {
  const nodes: SimNode[] = [];
  const links: SimLink[] = [];
  const seen = new Set<string>();

  function walk(node: DependencyTreeNode, depth: number, parentId: string | null) {
    if (seen.has(node.name)) {
      if (parentId) links.push({ source: parentId, target: node.name });
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
    });

    if (parentId) links.push({ source: parentId, target: node.name });

    if (depth < 3) {
      node.children.forEach(child => walk(child, depth + 1, node.name));
    }
  }

  tree.forEach(n => walk(n, 0, null));
  return { nodes, links };
}

export default function DependencyGraph({ tree }: { tree: DependencyTreeNode[] }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [dimensions, setDimensions] = useState({ width: 900, height: 600 });
  const simRef = useRef<d3.Simulation<SimNode, SimLink> | null>(null);

  const { nodes: rawNodes, links: rawLinks } = useMemo(() => flatten(tree), [tree]);

  // Build adjacency set for highlighting
  const adjacency = useMemo(() => {
    const adj = new Map<string, Set<string>>();
    rawLinks.forEach(l => {
      const s = typeof l.source === 'string' ? l.source : l.source.id;
      const t = typeof l.target === 'string' ? l.target : l.target.id;
      if (!adj.has(s)) adj.set(s, new Set());
      if (!adj.has(t)) adj.set(t, new Set());
      adj.get(s)!.add(t);
      adj.get(t)!.add(s);
    });
    return adj;
  }, [rawLinks]);

  useEffect(() => {
    if (!containerRef.current) return;
    const obs = new ResizeObserver(entries => {
      const { width } = entries[0].contentRect;
      setDimensions({ width, height: 600 });
    });
    obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (!svgRef.current || rawNodes.length === 0) return;

    const { width, height } = dimensions;
    const svg = d3.select(svgRef.current);

    // Clone nodes/links for simulation
    const simNodes: SimNode[] = rawNodes.map(n => ({ ...n }));
    const simLinks: SimLink[] = rawLinks.map(l => ({
      source: typeof l.source === 'string' ? l.source : l.source.id,
      target: typeof l.target === 'string' ? l.target : l.target.id,
    }));

    // Clear previous
    svg.selectAll('*').remove();

    // Defs for glow filters
    const defs = svg.append('defs');

    // Grid pattern
    const pattern = defs.append('pattern')
      .attr('id', 'forcegrid')
      .attr('width', 60).attr('height', 60)
      .attr('patternUnits', 'userSpaceOnUse');
    pattern.append('path')
      .attr('d', 'M 60 0 L 0 0 0 60')
      .attr('fill', 'none')
      .attr('stroke', 'rgba(125,211,252,0.03)')
      .attr('stroke-width', 0.5);

    // Glow filters
    Object.entries(COLORS).forEach(([level, color]) => {
      const filter = defs.append('filter')
        .attr('id', `nodeglow-${level}`)
        .attr('x', '-100%').attr('y', '-100%')
        .attr('width', '300%').attr('height', '300%');
      filter.append('feGaussianBlur').attr('stdDeviation', '6').attr('result', 'blur');
      filter.append('feFlood').attr('flood-color', color).attr('flood-opacity', 0.3);
      filter.append('feComposite').attr('in2', 'blur').attr('operator', 'in');
      const merge = filter.append('feMerge');
      merge.append('feMergeNode');
      merge.append('feMergeNode').attr('in', 'SourceGraphic');
    });

    svg.append('rect').attr('width', width).attr('height', height).attr('fill', 'url(#forcegrid)');

    const g = svg.append('g');

    // Zoom behavior
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.3, 3])
      .on('zoom', (event) => g.attr('transform', event.transform));
    svg.call(zoom);
    svg.call(zoom.transform, d3.zoomIdentity.translate(width / 2, height / 2).scale(0.85).translate(-width / 2, -height / 2));

    // Force simulation
    const sim = d3.forceSimulation(simNodes)
      .force('link', d3.forceLink<SimNode, SimLink>(simLinks).id(d => d.id).distance(d => {
        const s = d.source as SimNode;
        return s.depth === 0 ? 120 : 80;
      }).strength(0.6))
      .force('charge', d3.forceManyBody().strength(d => (d as SimNode).depth === 0 ? -400 : -200))
      .force('center', d3.forceCenter(width / 2, height / 2).strength(0.05))
      .force('collision', d3.forceCollide().radius(d => getRadius(d as SimNode) + 20))
      .force('y', d3.forceY<SimNode>().y(d => 100 + d.depth * 160).strength(0.15))
      .force('x', d3.forceX(width / 2).strength(0.02));

    simRef.current = sim;

    // Links
    const linkGroup = g.append('g');
    const linkSelection = linkGroup.selectAll('path')
      .data(simLinks)
      .join('path')
      .attr('fill', 'none')
      .attr('stroke', 'rgba(125,211,252,0.08)')
      .attr('stroke-width', 1);

    // Node groups
    const nodeGroup = g.append('g');
    const nodeSelection = nodeGroup.selectAll<SVGGElement, SimNode>('g')
      .data(simNodes, d => d.id)
      .join('g')
      .attr('cursor', 'pointer')
      .call(d3.drag<SVGGElement, SimNode>()
        .on('start', (event, d) => {
          if (!event.active) sim.alphaTarget(0.3).restart();
          d.fx = d.x;
          d.fy = d.y;
        })
        .on('drag', (event, d) => {
          d.fx = event.x;
          d.fy = event.y;
        })
        .on('end', (event, d) => {
          if (!event.active) sim.alphaTarget(0);
          d.fx = null;
          d.fy = null;
        })
      );

    // Node background glow
    nodeSelection.append('circle')
      .attr('r', d => getRadius(d) + 10)
      .attr('fill', d => GLOW[d.riskLevel])
      .attr('opacity', d => (d.riskLevel === 'high' || d.riskLevel === 'critical') ? 0.5 : 0);

    // Node circle
    nodeSelection.append('circle')
      .attr('r', d => getRadius(d))
      .attr('fill', 'var(--elevated)')
      .attr('stroke', d => COLORS[d.riskLevel])
      .attr('stroke-width', 1.5);

    // Score text
    nodeSelection.append('text')
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'central')
      .attr('fill', d => COLORS[d.riskLevel])
      .attr('font-size', d => d.depth === 0 ? 12 : 10)
      .attr('font-family', "'JetBrains Mono', monospace")
      .attr('font-weight', '600')
      .text(d => d.score);

    // Name label
    nodeSelection.append('text')
      .attr('text-anchor', 'middle')
      .attr('y', d => getRadius(d) + 14)
      .attr('fill', 'var(--text-2)')
      .attr('font-size', d => d.depth === 0 ? 10 : 8)
      .attr('font-family', "'JetBrains Mono', monospace")
      .attr('font-weight', '400')
      .text(d => d.name.length > 16 ? d.name.slice(0, 14) + '\u2026' : d.name);

    // Child count badge for root nodes
    nodeSelection.filter(d => d.depth === 0 && d.childCount > 0).each(function(d) {
      const g = d3.select(this);
      const r = getRadius(d);
      g.append('circle')
        .attr('cx', r - 3).attr('cy', -r + 3).attr('r', 8)
        .attr('fill', 'var(--panel)').attr('stroke', 'var(--border-2)').attr('stroke-width', 1);
      g.append('text')
        .attr('x', r - 3).attr('y', -r + 4)
        .attr('text-anchor', 'middle').attr('dominant-baseline', 'central')
        .attr('fill', 'var(--text-3)')
        .attr('font-size', 8).attr('font-family', "'JetBrains Mono', monospace").attr('font-weight', 600)
        .text(d.childCount);
    });

    // Hover/click interactions on nodeSelection
    nodeSelection
      .on('mouseenter', function(_, d) {
        setHoveredNode(d.id);
        d3.select(this).select('circle:nth-child(2)')
          .transition().duration(200)
          .attr('stroke-width', 3);
      })
      .on('mouseleave', function() {
        setHoveredNode(null);
        d3.select(this).select('circle:nth-child(2)')
          .transition().duration(200)
          .attr('stroke-width', 1.5);
      })
      .on('click', (_, d) => {
        setSelectedNode(prev => prev === d.id ? null : d.id);
      });

    // Tick function
    sim.on('tick', () => {
      linkSelection.attr('d', d => {
        const s = d.source as SimNode;
        const t = d.target as SimNode;
        const dx = (t.x || 0) - (s.x || 0);
        const dy = (t.y || 0) - (s.y || 0);
        const dr = Math.sqrt(dx * dx + dy * dy) * 1.5;
        return `M${s.x},${s.y}A${dr},${dr} 0 0,1 ${t.x},${t.y}`;
      });
      nodeSelection.attr('transform', d => `translate(${d.x},${d.y})`);
    });

    // Entrance animation — start with alpha burst
    sim.alpha(1).restart();

    return () => { sim.stop(); };
  }, [rawNodes, rawLinks, dimensions]);

  // Update link/node opacity on hover
  useEffect(() => {
    if (!svgRef.current) return;
    const svg = d3.select(svgRef.current);

    svg.selectAll<SVGPathElement, SimLink>('path')
      .transition().duration(200)
      .attr('stroke', d => {
        if (!hoveredNode) return 'rgba(125,211,252,0.08)';
        const s = typeof d.source === 'string' ? d.source : (d.source as SimNode).id;
        const t = typeof d.target === 'string' ? d.target : (d.target as SimNode).id;
        if (s === hoveredNode || t === hoveredNode) {
          const targetNode = rawNodes.find(n => n.id === t);
          return targetNode ? COLORS[targetNode.riskLevel] : 'var(--cyan-1)';
        }
        return 'rgba(125,211,252,0.02)';
      })
      .attr('stroke-width', d => {
        if (!hoveredNode) return 1;
        const s = typeof d.source === 'string' ? d.source : (d.source as SimNode).id;
        const t = typeof d.target === 'string' ? d.target : (d.target as SimNode).id;
        return (s === hoveredNode || t === hoveredNode) ? 2 : 0.5;
      })
      .attr('opacity', d => {
        if (!hoveredNode) return 1;
        const s = typeof d.source === 'string' ? d.source : (d.source as SimNode).id;
        const t = typeof d.target === 'string' ? d.target : (d.target as SimNode).id;
        return (s === hoveredNode || t === hoveredNode) ? 0.7 : 0.1;
      });

    svg.selectAll<SVGGElement, SimNode>('g > g')
      .transition().duration(200)
      .attr('opacity', d => {
        if (!hoveredNode) return 1;
        if (d.id === hoveredNode) return 1;
        return adjacency.get(hoveredNode)?.has(d.id) ? 0.9 : 0.15;
      });
  }, [hoveredNode, rawNodes, adjacency]);

  const selectedData = selectedNode ? rawNodes.find(n => n.id === selectedNode) : null;

  return (
    <div className="glass-lg shine-top overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: 'var(--border-1)' }}>
        <div className="flex items-center gap-3">
          <h3 className="label" style={{ fontSize: 11 }}>Dependency Graph</h3>
          <span className="mono text-[10px]" style={{ color: 'var(--text-ghost)' }}>
            drag to rearrange &bull; scroll to zoom
          </span>
        </div>
        <div className="flex items-center gap-4">
          {(['low', 'medium', 'high', 'critical'] as RiskLevel[]).map(level => (
            <div key={level} className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full" style={{ background: COLORS[level] }} />
              <span className="mono text-[9px] uppercase" style={{ color: 'var(--text-3)' }}>{level}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex">
        <div
          ref={containerRef}
          className="flex-1 relative"
          style={{ background: 'var(--abyss)', height: 600 }}
        >
          <svg
            ref={svgRef}
            width={dimensions.width}
            height={dimensions.height}
            className="block"
          />
        </div>

        {/* Detail sidebar */}
        <AnimatePresence>
          {selectedData && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 260, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
              className="overflow-hidden border-l flex-shrink-0"
              style={{ background: 'var(--elevated)', borderColor: 'var(--border-1)' }}
            >
              <div className="p-5 w-[260px]">
                <div className="flex items-center justify-between mb-5">
                  <span className="label">Node Detail</span>
                  <button onClick={() => setSelectedNode(null)} className="mono text-xs" style={{ color: 'var(--text-3)' }}>&times;</button>
                </div>

                <div className="mb-5">
                  <div className="mono text-sm font-semibold mb-2" style={{ color: 'var(--text-1)' }}>
                    {selectedData.name}
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className="inline-flex items-center px-2 py-0.5 rounded-md mono text-[10px] font-semibold uppercase border"
                      style={{ color: COLORS[selectedData.riskLevel], borderColor: COLORS[selectedData.riskLevel], background: GLOW[selectedData.riskLevel] }}
                    >
                      {selectedData.riskLevel}
                    </span>
                    <span className="mono text-xl font-bold" style={{ color: COLORS[selectedData.riskLevel] }}>
                      {selectedData.score}
                    </span>
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
                        const n = rawNodes.find(nn => nn.id === id);
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

function getRadius(d: SimNode): number {
  if (d.depth === 0) return 24;
  if (d.depth === 1) return 18;
  return 13;
}
