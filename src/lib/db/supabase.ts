import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  // In non-platform mode (no Supabase configured) we export null — callers check before use
}

export const supabase = url && anonKey
  ? createClient(url, anonKey)
  : null;

export const isSupabaseEnabled = !!supabase;

// Server-side client using service role key (bypasses RLS — only use in API routes)
export function getServiceClient() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return null;
  return createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
}
