-- Run this in your Supabase SQL Editor to create the matches table
-- Go to: Supabase Dashboard → SQL Editor → New Query → paste this → Run

create table if not exists matches (
  id text primary key,
  date date not null,
  opponent_name text not null,
  opponent_utr numeric,
  surface text,
  score_sets text,
  score_sets_arr jsonb,
  score_winner text,
  serve jsonb,
  return jsonb,
  forehand jsonb,
  backhand jsonb,
  shot_stats jsonb,
  opp_shots jsonb,
  what_worked jsonb,
  what_didnt jsonb,
  key_number text,
  journal jsonb,
  created_at timestamptz default now()
);

-- Enable Row Level Security (open read/write for now — add auth later if needed)
alter table matches enable row level security;
create policy "Allow all" on matches for all using (true) with check (true);

-- Migrations: run these if upgrading from an earlier schema
alter table matches add column if not exists opp_shots jsonb;
alter table matches add column if not exists journal jsonb;
