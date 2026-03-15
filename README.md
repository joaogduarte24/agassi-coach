# Agassi Coach — Tennis Analytics App

Personal tennis dashboard for JD. Upload SwingVision screenshots → Claude extracts all stats → stored permanently in Supabase → accessible from any device.

---

## Deploy in 15 minutes

### Step 1 — Supabase (database)

1. Go to [supabase.com](https://supabase.com) → New project → name it `agassi`
2. Wait for project to spin up (~1 min)
3. Go to **SQL Editor** → New Query → paste contents of `supabase-schema.sql` → Run
4. Go to **Project Settings → API** → copy:
   - `Project URL` → this is your `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → this is your `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### Step 2 — GitHub

1. Create a new repo at [github.com](https://github.com) → name it `agassi-coach`
2. Push this folder:
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/agassi-coach.git
git push -u origin main
```

### Step 3 — Vercel (hosting)

1. Go to [vercel.com](https://vercel.com) → New Project → Import your `agassi-coach` repo
2. Add these **Environment Variables** (Settings → Environment Variables):
   ```
   ANTHROPIC_API_KEY        = sk-ant-...          (from console.anthropic.com)
   NEXT_PUBLIC_SUPABASE_URL = https://xxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY = eyJ...
   ```
3. Click Deploy → wait ~2 min
4. Your app is live at `https://agassi-coach.vercel.app` (or your custom domain)

### Step 4 — Add to iPhone home screen

1. Open your Vercel URL in Safari
2. Tap Share → Add to Home Screen
3. Done — it works like a native app

---

## How it works

- **Upload tab**: Select 1–2 SwingVision screenshots → Claude Vision (server-side, API key never exposed) extracts all stats → saved to Supabase
- **All tabs**: Pull data from Supabase on load — works from any device, any browser
- **Seed data**: First load automatically seeds all 10 existing matches from Jan–Mar 2026

## Stack

- **Next.js 14** (App Router) — framework
- **Vercel** — hosting + serverless API routes
- **Supabase** — Postgres database
- **Anthropic Claude** — screenshot analysis (server-side only)
- **No auth** (single-user app — add Supabase Auth later if needed)
