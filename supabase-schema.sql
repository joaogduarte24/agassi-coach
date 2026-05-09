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

-- ─── analyst_runs ─────────────────────────────────────────────────────────────
-- Cached output of the Data Analyst (server-side compute). One row per run,
-- newest flagged with is_latest = true. App reads `where is_latest = true`.
-- Full history kept for audit + future "evolution" features.
create table if not exists analyst_runs (
  id              uuid primary key default gen_random_uuid(),
  generated_at    timestamptz default now(),
  schema_version  integer default 1,
  match_count     integer,
  shot_data_match_count integer,
  payload         jsonb not null,
  is_latest       boolean default false
);

create index if not exists analyst_runs_latest_idx on analyst_runs(is_latest) where is_latest = true;
create index if not exists analyst_runs_generated_idx on analyst_runs(generated_at desc);

alter table analyst_runs enable row level security;
create policy "Allow all" on analyst_runs for all using (true) with check (true);

-- ─── user_profile ─────────────────────────────────────────────────────────────
-- Single-row config for JD (multi-player ready: id is the player slug). Holds
-- manually-entered UTR with a last-updated timestamp.
create table if not exists user_profile (
  id              text primary key,           -- 'jd' for now
  display_name    text,
  utr             numeric,
  utr_updated_at  date,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

alter table user_profile enable row level security;
create policy "Allow all" on user_profile for all using (true) with check (true);

insert into user_profile (id, display_name, utr, utr_updated_at)
  values ('jd', 'JD', 3.2, current_date)
  on conflict (id) do nothing;

-- ─── opponents ────────────────────────────────────────────────────────────────
-- One row per opponent. Stores scouting fields that don't change match-to-match
-- (style, weapon, weakness, freeform notes). Pre-fills in the journal form the
-- next time JD plays that opponent. Surfaces in the pre-match brief.
-- Keyed by opponent_name (trimmed). Updated via PUT /api/opponents.
create table if not exists opponents (
  name         text primary key,
  style        text,
  weapon       text,
  weakness     text,
  notes        text,
  updated_at   timestamptz default now()
);

alter table opponents enable row level security;
create policy "Allow all" on opponents for all using (true) with check (true);

-- ─── Migrations (run if upgrading from an earlier schema) ─────────────────────
alter table matches add column if not exists opp_shots jsonb;
alter table matches add column if not exists journal jsonb;
alter table matches add column if not exists has_shot_data boolean default false;

-- Journal v2 (2026-04-16): opp_* keys moved out of matches.journal into opponents
-- table. Migration is one-off via POST /api/opponents/migrate. "Luck" values in
-- decided_by arrays auto-rewritten to "Close margin" on read (see dbToMatch).

-- Pre-match brief feedback (2026-05-09): journal JSONB gains optional fields
-- `manual_scout_done` (boolean) and `key_numbers_used` (object: { binary, count,
-- action, guardrail }). No DDL change — stored inside existing journal jsonb.
