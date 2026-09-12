import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://cjhmsladfnjuomodmeim.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNqaG1zbGFkZm5qdW9tb2RtZWltIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkxODA2NzAsImV4cCI6MjEwNDc1NjY3MH0.11WCpdio7MbccZk8eV2cT47HtnY-EcstEbwT0By21Dc';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);


