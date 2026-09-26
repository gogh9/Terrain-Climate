import { createClient } from '@supabase/supabase-js';
const supabaseUrl = 'https://cjhmsladfnjuomodmeim.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNqaG1zbGFkZm5qdW9tb2RtZWltIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkxODA2NzAsImV4cCI6MjEwNDc1NjY3MH0.11WCpdio7MbccZk8eV2cT47HtnY-EcstEbwT0By21Dc';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function check() {
  const { data, error } = await supabase.from('quiz_submissions')
    .select('*')
    .gte('created_at', '2026-09-20T00:00:00')
    .lte('created_at', '2026-09-21T23:59:59')
    .order('created_at', { ascending: true });
  if (error) { console.error(error); return; }
  console.log('Count on 9/21:', data.length);
  
  const byStudent = {};
  data.forEach(d => {
    if (!byStudent[d.student_name]) byStudent[d.student_name] = [];
    byStudent[d.student_name].push(d);
  });
  
  console.log('Students count:', Object.keys(byStudent).length);
  for (const name of Object.keys(byStudent)) {
    const list = byStudent[name];
    console.log('Student:', name, 'Count:', list.length);
    list.forEach(item => {
      console.log('   loc_id:', item.location_id, 'loc_title:', item.location_title, 'ans_name:', item.answer_name);
    });
  }
}
check();
