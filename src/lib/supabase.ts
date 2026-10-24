
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const rawKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
const supabaseKey = rawKey.replace(/^Y(?=sb_)/, '').trim();

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    'Missing Supabase credentials. Check your .env.local file.'
  );
}

export const supabase = createClient(
  supabaseUrl,
  supabaseKey
);
