-- Supabase SQL Schema for Terrain & Climate Project
-- Execute this SQL in Supabase Dashboard -> SQL Editor (https://supabase.com/dashboard/project/cjhmsladfnjuomodmeim/sql)

-- 1. Create or update quiz_submissions table with session_id support
create table if not exists public.quiz_submissions (
  id uuid default gen_random_uuid() primary key,
  session_id text default '1',
  location_id text not null,
  location_title text,
  student_name text default '익명 학생',
  answer_name text,
  answer_feature text,
  score integer default 100,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Migration for existing tables: Add session_id if not present
alter table public.quiz_submissions add column if not exists session_id text default '1';

-- Create Index for fast querying
create index if not exists idx_quiz_submissions_session_id on public.quiz_submissions (session_id);
create index if not exists idx_quiz_submissions_created_at on public.quiz_submissions (created_at desc);

-- 2. Enable Row Level Security (RLS)
alter table public.quiz_submissions enable row level security;

-- 3. RLS Policies (Allow Insert, Read, and Delete for app users)
drop policy if exists "Allow anonymous insert" on public.quiz_submissions;
create policy "Allow anonymous insert" on public.quiz_submissions
  for insert with check (true);

drop policy if exists "Allow public read access" on public.quiz_submissions;
create policy "Allow public read access" on public.quiz_submissions
  for select using (true);

drop policy if exists "Allow delete access" on public.quiz_submissions;
create policy "Allow delete access" on public.quiz_submissions
  for delete using (true);
