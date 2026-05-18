-- ============================================================================
-- Anumati — God Level Schema (Requests + Faculty + AI + RLS + Realtime)
--
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor → New Query)
-- or via the Supabase CLI: supabase db push
-- ============================================================================

-- 1. Create the Faculty Users Table (For Admin Verification)
create table if not exists public.faculty_users (
  id            uuid default gen_random_uuid() primary key,
  name          text not null,
  role          text not null check (role in ('ADVISOR', 'HOD', 'PRINCIPAL', 'ADMIN')),
  is_verified   boolean default false,
  created_at    timestamptz not null default now()
);

-- 2. Create the requests table (with God Level AI Columns).
create table if not exists public.requests (
  id            text primary key,
  student_id    text not null,
  student_name  text not null,
  type          text not null check (type in ('LEAVE', 'EVENT', 'PROJECT')),
  title         text not null,
  description   text not null default '',
  ai_summary    text,

  -- AI moderation columns
  ai_policy_status text check (ai_policy_status in ('APPROVED', 'WARNING', 'FLAGGED')),
  ai_policy_reason text,
  document_base64  text,
  ai_ocr_verified  boolean default false,

  status        text not null default 'PENDING_ADVISOR'
                  check (status in (
                    'DRAFT',
                    'PENDING_ADVISOR',
                    'PENDING_HOD',
                    'PENDING_PRINCIPAL',
                    'APPROVED',
                    'REJECTED'
                  )),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  history       jsonb not null default '[]'::jsonb
);

-- 3. Index on status for the queue pages (filter by status).
create index if not exists idx_requests_status on public.requests (status);

-- 4. Index on student_name for the student dashboard (filter by name).
create index if not exists idx_requests_student_name on public.requests (student_name);

-- 5. Enable Row Level Security.
alter table public.requests enable row level security;
alter table public.faculty_users enable row level security;

-- 6. Permissive policies for the hackathon demo.
create policy "Allow public read"
  on public.requests for select using (true);

create policy "Allow public insert"
  on public.requests for insert with check (true);

create policy "Allow public update"
  on public.requests for update using (true) with check (true);

create policy "Allow public read faculty"
  on public.faculty_users for select using (true);

create policy "Allow public insert faculty"
  on public.faculty_users for insert with check (true);

create policy "Allow public update faculty"
  on public.faculty_users for update using (true) with check (true);

-- 7. Enable Supabase Realtime on these tables.
alter publication supabase_realtime add table public.requests;
alter publication supabase_realtime add table public.faculty_users;
