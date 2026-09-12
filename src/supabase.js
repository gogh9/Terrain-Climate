import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://cjhmsladfnjuomodmeim.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Prevent startup crash if environment variable is not configured on Vercel
const safeKey = supabaseAnonKey && supabaseAnonKey.trim() !== ''
  ? supabaseAnonKey
  : 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dummy_key_for_safe_initialization';

export const supabase = createClient(supabaseUrl, safeKey);

