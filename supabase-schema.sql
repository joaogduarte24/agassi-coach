-- Agassi — Supabase Schema
-- Run in Supabase Dashboard → SQL Editor → New Query → Run
-- Keep this file in sync with every schema change (gate 06 requirement)

-- ─── matches ──────────────────────────────────────────────────────────────────
create table if not exists matches (
  id              text primary key,
  date            date not null,
  opponent_name   text not null,
  opponent_utr    numeric,
  surface         text,
  score_sets      text,
  score_sets_arr  jsonb,
  score_winner    text,
  serve           jsonb,
  return          jsonb,
  forehand        jsonb,
  backhand        jsonb,
  shot_stats      jsonb,
  opp_shots       jsonb,
  what_worked     jsonb,
  what_didnt      jsonb,
  key_number      text,
  journal         jsonb,
  has_shot_data   boolean default false,
  created_at      timestamptz default now()
);

alter table matches enable row level security;
create policy "Allow all" on matches for all using (true) with check (true);

-- ─── match_shots ──────────────────────────────────────────────────────────────
-- One row per shot (~800+ rows per match). Source: SwingVision xlsx export.
create table if not exists match_shots (
  id            uuid primary key default gen_random_uuid(),
  match_id      text references matches(id) on delete cascade,
  player        text,          -- 'jd' | 'opponent'
  shot_number   integer,
  shot_type     text,          -- 'Serve' | 'Forehand' | 'Backhand' | 'Volley' | etc.
  stroke        text,
  spin          text,          -- 'Flat' | 'Topspin' | 'Slice'
  speed_kmh     numeric,
  point_number  integer,
  game_number   integer,
  set_number    integer,
  bounce_depth  text,
  bounce_zone   text,
  bounce_x      numeric,
  bounce_y      numeric,       -- 0 = near baseline, 23.77 = far baseline
  direction     text,          -- 'cross court' | 'down the line' | 'out wide' | 'down the T' | etc.
  result        text,          -- 'In' | 'Out' | 'Net' | etc.
  hit_x         numeric,
  hit_y         numeric,
  hit_z         numeric,       -- contact height
  shot_context  text,          -- 'first_return' | 'second_return' | 'serve_plus_one' | etc.
  video_time    numeric,
  created_at    timestamptz default now()
);

alter table match_shots enable row level security;
create policy "Allow all" on match_shots for all using (true) with check (true);

-- ─── match_points ─────────────────────────────────────────────────────────────
-- One row per point (~160 rows per match). Source: SwingVision xlsx export.
create table if not exists match_points (
  id               uuid primary key default gen_random_uuid(),
  match_id         text references matches(id) on delete cascade,
  point_number     integer,
  game_number      integer,
  set_number       integer,
  serve_state      text,        -- 'first' | 'second'
  server           text,        -- 'jd' | 'opponent'
  jd_game_score    text,
  opp_game_score   text,
  point_winner     text,        -- 'jd' | 'opponent'
  detail           text,        -- 'Forehand Winner' | 'Backhand Unforced Error' | 'Ace' | etc.
  break_point      boolean default false,
  set_point        boolean default false,
  duration_seconds numeric,
  video_time       numeric,
  created_at       timestamptz default now()
);

alter table match_points enable row level security;
create policy "Allow all" on match_points for all using (true) with check (true);

-- ─── Migrations (run if upgrading from an earlier schema) ─────────────────────
alter table matches add column if not exists opp_shots jsonb;
alter table matches add column if not exists journal jsonb;
alter table matches add column if not exists has_shot_data boolean default false;
