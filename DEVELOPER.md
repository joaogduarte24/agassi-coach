# Developer Guide — Agassi Tennis Coach

## Quick Start
```bash
cd ~/projects/agassi
npm install
cp .env.example .env.local   # fill in the 3 env vars
npm run dev                  # http://localhost:3000
```

## Tech Stack
| Layer | Tech | Why |
|-------|------|-----|
| Framework | Next.js 14 (App Router) | Simple deploy to Vercel |
| UI | React 18, inline styles, no CSS framework | Keeps bundle tiny, dark theme fully controlled |
| Database | Supabase (Postgres + JSONB) | Free tier, good SDK, JSONB flexible for stats |
| AI | Anthropic Claude claude-sonnet-4-20250514 | Vision extraction from SwingVision screenshots |
| Fonts | Bebas Neue (headings), DM Mono (numbers) | Loaded via next/font from Google |
| Deployment | Vercel | Auto-deploys on push to main |

## File Map
```
agassi/
├── CLAUDE.md               <- AI assistant context (read this first)
├── DEVELOPER.md            <- This file
├── app/
│   ├── page.tsx            <- Home: state, nav, tab routing only (~150 lines)
│   ├── types.ts            <- All TypeScript interfaces
│   ├── layout.tsx          <- Root layout, font loading
│   ├── lib/
│   │   └── helpers.ts      <- Shared utils: avg, deepMerge, IMPORTANT_FIELDS, colors, ErrorBoundary
│   ├── components/
│   │   ├── MatchDetail.tsx <- Expanded match view with StatBar grids + opponent scout
│   │   ├── StatBar.tsx     <- Reusable bar chart component
│   │   ├── JDStats.tsx     <- Radar chart + stat summary, ATP comparison
│   │   ├── Strategy.tsx    <- Next match strategy engine (weighted stats, opponent profile)
│   │   ├── RadarChart.tsx  <- SVG radar chart (no external library)
│   │   ├── UploadMatch.tsx <- Screenshot upload, completeness check, save flow
│   │   └── FixMatchModal.tsx <- Fill missing stats on existing matches
│   └── api/
│       ├── extract/route.ts  <- POST: Claude vision -> structured Match JSON
│       └── matches/route.ts  <- GET/POST/DELETE: Supabase CRUD
├── lib/
│   ├── atp-players.ts      <- ATP player data for radar chart comparison
│   └── seed.ts             <- Seed matches for empty DB on first load
├── supabase-schema.sql     <- Run this in Supabase SQL editor to set up the DB
└── .env.example            <- Copy to .env.local and fill in values
```

## Adding a New Feature
Every feature follows the 6-gate process defined in `CLAUDE.md`. No code is written until gates 01–03 are approved by JD.

Short version:
1. Read `PRODUCT.md` — understand why this feature matters
2. Read `ROADMAP.md` — confirm it's in scope and prioritised
3. Run gates 01–03 (benchmark, user journey, design + copy) and get sign-off
4. Gate 04: identify which files change, whether DB/types/API need updating
5. Gate 05: implement, `npm run build` clean, screenshot proof
6. Gate 06: update `FEATURES.md` + `ROADMAP.md`, open PR using the template

## Supabase Setup
1. Create project at supabase.com
2. Run `supabase-schema.sql` in the SQL editor
3. Copy project URL and anon key to `.env.local`

## Environment Variables
```
ANTHROPIC_API_KEY=sk-ant-...
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

## Contribution flow
1. Work from `ROADMAP.md` — pick the top NOW item, or the top NEXT item if NOW is clear
2. Follow the 6-gate process — no implementation without approved design
3. Run `npm run build` locally before pushing — never push a broken build
4. Open a PR using `.github/PULL_REQUEST_TEMPLATE.md`
5. After merge: update `ROADMAP.md` (mark item done) and add entry to `FEATURES.md`

## Deployment
Auto-deploys to Vercel on push to `main`. Env vars are set in the Vercel project settings.
To deploy manually: `vercel --prod`

## Key Data Decisions
- **Match ID** = `{date}-{opponent-slug}` — Supabase upserts on this, so re-uploading the same match updates rather than duplicates
- **All stats nullable** — SwingVision only shows what's on screen; Claude returns null for anything not visible
- **deepMerge** = fill-only merge, never overwrites — safe to call multiple times as you add screenshots
- **JSONB arrays quirk** — Supabase sometimes returns `{"0":"a","1":"b"}` instead of `["a","b"]`. Always normalise via `toArr()` / `toSetsArr()` in `dbToMatch()`

## How the Upload Flow Works
1. User selects screenshots -> base64 encoded in browser
2. POST to `/api/extract` with images + oppName/oppUtr/surface
3. Claude vision extracts all fields from screenshots, returns Match JSON
4. `getMissingFields()` checks which IMPORTANT_FIELDS are null
5. If missing fields: show amber alert listing them by section (which SwingVision tab to capture)
6. User can add more screenshots (merged via `deepMerge`) or save anyway
7. POST to `/api/matches` -> Supabase upsert

## Common Debugging
- **App crashes on load** — usually Supabase JSONB array deserialization. Check `toArr()` and `toSetsArr()` in `matches/route.ts`
- **Missing stats after upload** — check which SwingVision tab the screenshot came from (see IMPORTANT_FIELDS sections in helpers.ts)
- **Wrong player stats** — extraction prompt enforces JD vs opponent separation; check the PLAYER IDENTIFICATION section in extract/route.ts
- **Vercel build fails** — run `npm run build` locally first
