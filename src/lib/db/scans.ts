import { ScanResult, ScanSummary } from '@/types';
import { supabase, getServiceClient } from './supabase';

interface DbScan {
  id: string;
  project_name: string;
  ecosystem: string;
  overall_score: number;
  risk_level: string;
  total_deps: number;
  critical_count: number;
  created_at: string;
  result_json: ScanResult;
}

export async function dbSaveScan(result: ScanResult, userId: string): Promise<void> {
  const client = getServiceClient() ?? supabase;
  if (!client) return;

  await client.from('scans').insert({
    id: result.id,
    user_id: userId,
    ecosystem: result.ecosystem,
    project_name: result.projectName,
    overall_score: result.overallScore,
    risk_level: result.overallRiskLevel,
    total_deps: result.totalDependencies,
    direct_deps: result.directDependencies,
    dev_deps: result.devDependencies,
    critical_count: result.criticalCount,
    high_count: result.highCount,
    medium_count: result.mediumCount,
    low_count: result.lowCount,
    result_json: result,
  });
}

export async function dbListScans(userId: string): Promise<ScanSummary[]> {
  if (!supabase) return [];
  const { data } = await supabase
    .from('scans')
    .select('id, project_name, ecosystem, overall_score, risk_level, total_deps, critical_count, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(100);

  return (data as DbScan[] ?? []).map(s => ({
    id: s.id,
    timestamp: s.created_at,
    projectName: s.project_name,
    overallScore: s.overall_score,
    overallRiskLevel: s.risk_level as ScanSummary['overallRiskLevel'],
    ecosystem: s.ecosystem as ScanSummary['ecosystem'],
    totalDependencies: s.total_deps,
    criticalCount: s.critical_count,
  }));
}

export async function dbGetScan(id: string): Promise<ScanResult | null> {
  if (!supabase) return null;
  const { data } = await supabase
    .from('scans')
    .select('result_json')
    .eq('id', id)
    .single();
  return (data as { result_json: ScanResult } | null)?.result_json ?? null;
}

export async function dbDeleteScan(id: string, userId: string): Promise<void> {
  if (!supabase) return;
  await supabase.from('scans').delete().eq('id', id).eq('user_id', userId);
}

export async function dbGetTrend(projectName: string, userId: string): Promise<{ timestamp: string; score: number }[]> {
  if (!supabase) return [];
  const { data } = await supabase
    .from('scans')
    .select('overall_score, created_at')
    .eq('user_id', userId)
    .eq('project_name', projectName)
    .order('created_at', { ascending: true });

  return (data as { overall_score: number; created_at: string }[] ?? []).map(s => ({
    timestamp: s.created_at,
    score: s.overall_score,
  }));
}
