import { ScanResult, ScanSummary } from '@/types';

const STORAGE_KEY = 'dep-analyzer:scans';
const MAX_SCANS = 20;

function isClient(): boolean {
  return typeof window !== 'undefined';
}

function readAll(): ScanResult[] {
  if (!isClient()) return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeAll(scans: ScanResult[]): void {
  if (!isClient()) return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(scans));
  } catch {
    // Storage full — evict oldest and retry
    const trimmed = scans.slice(-Math.floor(MAX_SCANS / 2));
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed)); } catch { /* give up */ }
  }
}

export function saveScan(result: ScanResult): void {
  const scans = readAll().filter(s => s.id !== result.id);
  scans.push(result);
  // Evict oldest if over cap
  const trimmed = scans.length > MAX_SCANS ? scans.slice(scans.length - MAX_SCANS) : scans;
  writeAll(trimmed);
}

export function listScans(): ScanSummary[] {
  return readAll()
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .map(s => ({
      id: s.id,
      timestamp: s.timestamp,
      projectName: s.projectName,
      overallScore: s.overallScore,
      overallRiskLevel: s.overallRiskLevel,
      ecosystem: s.ecosystem,
      totalDependencies: s.totalDependencies,
      criticalCount: s.criticalCount,
    }));
}

export function getScan(id: string): ScanResult | null {
  return readAll().find(s => s.id === id) ?? null;
}

export function deleteScan(id: string): void {
  writeAll(readAll().filter(s => s.id !== id));
}

export function getTrend(projectName: string): { timestamp: string; score: number }[] {
  return readAll()
    .filter(s => s.projectName === projectName)
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
    .map(s => ({ timestamp: s.timestamp, score: s.overallScore }));
}
