-- ============================================================================
-- Anumati — requests table + RLS + realtime
--
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor → New Query)
-- or via the Supabase CLI: supabase db push
-- ============================================================================

-- 1. Create the table.
create table if not exists public.requests (
  id            text primary key,
  student_id    text not null,
  student_name  text not null,
  type          text not null check (type in ('LEAVE', 'EVENT', 'PROJECT')),
  title         text not null,
  description   text not null default '',
  ai_summary    text,
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

-- 2. Index on status for the queue pages (filter by status).
create index if not exists idx_requests_status on public.requests (status);

-- 3. Index on student_name for the student dashboard (filter by name).
create index if not exists idx_requests_student_name on public.requests (student_name);

-- 4. Enable Row Level Security.
alter table public.requests enable row level security;

-- 5. Permissive policies for the hackathon demo.
--    In production you'd scope these to authenticated users and their own rows.

-- Anyone can read all requests (needed for faculty queues + student tracking).
create policy "Allow public read"
  on public.requests
  for select
  using (true);

-- Anyone can insert (students submit new requests).
create policy "Allow public insert"
  on public.requests
  for insert
  with check (true);

-- Anyone can update (faculty approve/reject/forward).
create policy "Allow public update"
  on public.requests
  for update
  using (true)
  with check (true);

-- 6. Enable Supabase Realtime on this table.
--    This makes INSERT and UPDATE events flow to subscribed clients.
alter publication supabase_realtime add table public.requests;
