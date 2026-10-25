import { createClient, SupabaseClient } from '@supabase/supabase-js';

const env =
  (typeof import.meta !== 'undefined' && (import.meta as any).env) ||
  (typeof globalThis !== 'undefined' && (globalThis as any).process?.env) ||
  {};
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const rawKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
const supabaseKey = rawKey.replace(/^Y(?=sb_)/, '').trim();

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseKey);
export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl!, supabaseKey!)
  : null;
