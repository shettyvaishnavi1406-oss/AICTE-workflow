import { createClient, SupabaseClient } from '@supabase/supabase-js';

const env: Record<string, string | undefined> =
  (typeof import.meta !== 'undefined' && (import.meta as any).env) ||
  (typeof globalThis !== 'undefined' && (globalThis as any).process?.env) ||
  {};

const supabaseUrl = env.VITE_SUPABASE_URL || '';
const rawKey = env.VITE_SUPABASE_ANON_KEY || '';
const supabaseKey = rawKey.replace(/^Y(?=sb_)/, '').trim();

export const isSupabaseConfigured = Boolean(
  supabaseUrl && supabaseKey && supabaseUrl !== 'https://placeholder.supabase.co'
);

export const supabase: SupabaseClient = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseKey || 'placeholder-anon-key'
);
