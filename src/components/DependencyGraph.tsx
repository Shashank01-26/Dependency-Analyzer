'use client';

import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { DependencyTreeNode, RiskLevel } from '@/types';

const RISK_COLORS: Record<RiskLevel, string> = {
  low: '#1acc6e',
  medium: '#e09a20',
  high: '#e03050',
  critical: '#ff4466',
};

const NODE_RADIUS = 24;

interface LayoutNode {
  id: string;
  name: string;
  riskLevel: RiskLevel;
  score: number;
  x: number;
  y: number;
  children: string[];
}

function layoutTree(nodes: DependencyTreeNode[]): { nodes: LayoutNode[]; links: { source: string; target: string }[] } {
  const layoutNodes: LayoutNode[] = [];
  const links: { source: string; target: string }[] = [];
  const seen = new Set<string>();

  const centerX = 500;
  const startY = 60;
  const levelGap = 120;

  // Layout root nodes in a horizontal line
  const rootSpacing = Math.min(140, 900 / Math.max(nodes.length, 1));
  const rootStartX = centerX - ((nodes.length - 1) * rootSpacing) / 2;

  nodes.forEach((node, i) => {
    if (seen.has(node.name)) return;
    seen.add(node.name);

    const x = rootStartX + i * rootSpacing;
    const y = startY;

    layoutNodes.push({
      id: node.name,
      name: node.name,
      riskLevel: node.riskLevel,
      score: node.score,
      x,
      y,
      children: node.children.map(c => c.name),
    });

    // Layout children
    const childSpacing = Math.min(100, 600 / Math.max(node.children.length, 1));
    const childStartX = x - ((node.children.length - 1) * childSpacing) / 2;

    node.children.forEach((child, j) => {
      if (seen.has(child.name)) {
        links.push({ source: node.name, target: child.name });
        return;
      }
      seen.add(child.name);

      const cx = childStartX + j * childSpacing;
      const cy = y + levelGap;

      layoutNodes.push({
        id: child.name,
        name: child.name,
        riskLevel: child.riskLevel,
        score: child.score,
        x: cx,
        y: cy,
        children: child.children.map(c => c.name),
      });

      links.push({ source: node.name, target: child.name });

      // Third level
      child.children.forEach((grandchild, k) => {
        if (seen.has(grandchild.name)) {
          links.push({ source: child.name, target: grandchild.name });
          return;
        }
        seen.add(grandchild.name);

        const gcSpacing = Math.min(80, 400 / Math.max(child.children.length, 1));
        const gcStartX = cx - ((child.children.length - 1) * gcSpacing) / 2;

        layoutNodes.push({
          id: grandchild.name,
          name: grandchild.name,
          riskLevel: grandchild.riskLevel,
          score: grandchild.score,
          x: gcStartX + k * gcSpacing,
          y: cy + levelGap,
          children: [],
        });

        links.push({ source: child.name, target: grandchild.name });
      });
    });
  });

  return { nodes: layoutNodes, links };
}

interface Props {
  tree: DependencyTreeNode[];
}

export default function DependencyGraph({ tree }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [dimensions, setDimensions] = useState({ width: 1000, height: 500 });

  const { nodes, links } = layoutTree(tree);

  useEffect(() => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    setDimensions({ width: rect.width, height: Math.max(500, nodes.length * 25) });
  }, [nodes.length]);

  // Create a map for quick lookups
  const nodeMap = new Map(nodes.map(n => [n.id, n]));

  return (
    <div className="panel overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: 'var(--border-dim)' }}>
        <h3 className="font-mono text-sm font-semibold tracking-wider uppercase" style={{ color: 'var(--text-secondary)' }}>
          Dependency Graph
        </h3>
        <div className="flex items-center gap-4">
          {(['low', 'medium', 'high', 'critical'] as RiskLevel[]).map(level => (
            <div key={level} className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full" style={{ background: RISK_COLORS[level] }} />
              <span className="text-[10px] font-mono uppercase" style={{ color: 'var(--text-tertiary)' }}>
                {level}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div ref={containerRef} className="relative overflow-auto" style={{ background: 'var(--bg-surface)' }}>
        <svg
          width={dimensions.width}
          height={dimensions.height}
          viewBox={`0 0 ${dimensions.width} ${dimensions.height}`}
          className="block"
        >
          {/* Grid pattern */}
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="var(--border-dim)" strokeWidth="0.5" opacity="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />

          {/* Links */}
          {links.map((link, i) => {
            const source = nodeMap.get(link.source);
            const target = nodeMap.get(link.target);
            if (!source || !target) return null;

            const isHighlighted = hoveredNode === link.source || hoveredNode === link.target;

            return (
              <motion.line
                key={i}
                x1={source.x}
                y1={source.y + NODE_RADIUS}
                x2={target.x}
                y2={target.y - NODE_RADIUS}
                stroke={isHighlighted ? 'var(--cyan-solid)' : 'var(--border-subtle)'}
                strokeWidth={isHighlighted ? 2 : 1}
                opacity={hoveredNode ? (isHighlighted ? 1 : 0.15) : 0.6}
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.8, delay: i * 0.02 }}
              />
            );
          })}

          {/* Nodes */}
          {nodes.map((node, i) => {
            const color = RISK_COLORS[node.riskLevel];
            const isHovered = hoveredNode === node.id;
            const dimmed = hoveredNode !== null && !isHovered;

            return (
              <motion.g
                key={node.id}
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: dimmed ? 0.25 : 1, scale: 1 }}
                transition={{ duration: 0.4, delay: i * 0.03 }}
                onMouseEnter={() => setHoveredNode(node.id)}
                onMouseLeave={() => setHoveredNode(null)}
                className="cursor-pointer"
              >
                {/* Glow */}
                {(node.riskLevel === 'high' || node.riskLevel === 'critical') && (
                  <circle
                    cx={node.x}
                    cy={node.y}
                    r={NODE_RADIUS + 8}
                    fill={color}
                    opacity={0.1}
                  />
                )}
                {/* Node circle */}
                <circle
                  cx={node.x}
                  cy={node.y}
                  r={NODE_RADIUS}
                  fill="var(--bg-elevated)"
                  stroke={color}
                  strokeWidth={isHovered ? 3 : 2}
                />
                {/* Score text */}
                <text
                  x={node.x}
                  y={node.y + 1}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fill={color}
                  fontSize="11"
                  fontFamily="'IBM Plex Mono', monospace"
                  fontWeight="600"
                >
                  {node.score}
                </text>
                {/* Name label */}
                <text
                  x={node.x}
                  y={node.y + NODE_RADIUS + 14}
                  textAnchor="middle"
                  fill="var(--text-secondary)"
                  fontSize="9"
                  fontFamily="'IBM Plex Mono', monospace"
                >
                  {node.name.length > 18 ? node.name.slice(0, 16) + '...' : node.name}
                </text>
              </motion.g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
