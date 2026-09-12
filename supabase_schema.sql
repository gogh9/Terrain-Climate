-- Supabase SQL Schema for Terrain & Climate Project
-- Execute this SQL in Supabase Dashboard -> SQL Editor (https://supabase.com/dashboard/project/cjhmsladfnjuomodmeim/sql)

-- 1. Create quiz_submissions table
create table if not exists public.quiz_submissions (
  id uuid default gen_random_uuid() primary key,
  location_id text not null,
  location_title text,
  student_name text default '익명 학생',
  answer_name text,
  answer_feature text,
  score integer default 100,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Enable Row Level Security (RLS)
alter table public.quiz_submissions enable row level security;

-- 3. RLS Policies (Allow Insert & Read for app users)
drop policy if exists "Allow anonymous insert" on public.quiz_submissions;
create policy "Allow anonymous insert" on public.quiz_submissions
  for insert with check (true);

drop policy if exists "Allow public read access" on public.quiz_submissions;
create policy "Allow public read access" on public.quiz_submissions
  for select using (true);
