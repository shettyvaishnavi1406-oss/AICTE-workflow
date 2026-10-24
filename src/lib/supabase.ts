import { createClient, SupabaseClient } from '@supabase/supabase-js';

const env =
  (typeof import.meta !== 'undefined' && (import.meta as any).env) ||
  (typeof globalThis !== 'undefined' && (globalThis as any).process?.env) ||
  {};
const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseKey = env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseKey);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl!, supabaseKey!)
  : null;
