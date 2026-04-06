# Design Reference Library

This is the visual library the `product-design-lead` skill consults BEFORE designing anything. It exists because designing from memory of "what Whoop probably does" produces underwhelming, generic output. The skill should look at real screenshots, tagged by the pattern they demonstrate.

## How to use

When designing a component:
1. Identify the pattern type you need (see Patterns Index below)
2. Read the entries under that pattern
3. **WebFetch the URL** to see the actual reference (or open the local image if one exists)
4. Pull 2-4 references into the design conversation as evidence of the pattern

If a pattern you need has no entries here, **add some** before designing — search the web (Mobbin, Dribbble, app marketing pages), screenshot the best examples, drop them into the right folder, and add an entry below.

## Folder layout

```
design-references/
├── INDEX.md                 ← this file
├── whoop/ strava/ linear/ things/ arc/ raycast/
├── swingvision/ athletic/ robinhood/ duolingo/ apple-health/
└── mobbin-saves/            ← saved patterns from Mobbin/Dribbble
```

Filename convention for local screenshots: `{app}-{component}-{state}.png` (e.g. `whoop-recovery-card-low.png`).

---

## Patterns Index

Each entry: **App — what's shown** · *why it's a strong reference* · `URL` (or local file)

### 1. Data density on mobile
*Many numbers without dashboard feel. Editorial pacing.*
- **WHOOP — Overview screen.** Sleep / Recovery / Strain dials stacked with contextual metrics below each. Dense numeric data broken into vertical "chapters" with generous spacing — each dial earns its own breathing room. Dark background lets numbers be the visual event. → https://www.whoop.com/us/en/thelocker/your-key-whoop-metrics-all-in-one-place/
- **The Athletic — Mobile feed.** Oversized headlines, quiet metadata, editorial hierarchy. The visual grammar Agassi wants: long-form rhythm on a phone, typography does the density work, no chrome, no chart junk. → https://www.designrush.com/best-designs/apps/the-athletic

### 2. Comparison layout (you vs benchmark)
*Visualising "where you sit" against an average, target, or baseline.*
- **WHOOP — Recovery detail.** HRV/RHR/respiratory rate plotted against personal baseline band. The baseline *band* (not a single number) is the move — "where you sit vs your normal." Directly maps to JD-vs-average. → https://support.whoop.com/s/article/WHOOP-Recovery
- **Strava — Activity analysis.** Activity metrics compared against personal best efforts and past attempts. "Performance vs past attempts" framing — exactly the comparison vocabulary Agassi needs for stroke stats vs season average. → https://support.strava.com/hc/en-us/articles/216919157-Viewing-Activities

### 3. Empty state that sells the value
*The empty state is a pitch, not an apology.*
- **Linear — Empty inbox/views.** Monochrome illustration + one-line pitch + primary CTA. Treats empty as a moment, not a gap. Copy is confident and short. → https://www.saasui.design/pattern/empty-state/linear
- **Mobbin — Empty state gallery.** Real product empty states across apps. Quick reference for "pitch the value" vs "placeholder apology" approaches. → https://mobbin.com/glossary/empty-state

### 4. Progressive disclosure
*Headline → key evidence → full detail on a single scroll.*
- **WHOOP — Strain detail.** Big score at top, contributing factors mid-screen, time-series detail below. Perfect three-layer hierarchy. Answers "what" before "why" before "how." → https://support.whoop.com/WHOOP_Basics/Navigating_the_Mobile_Web_Apps/Strain_and_Recovery_Details_Screens
- **Robinhood — Stock detail.** Price + delta → chart → stats grid → news. Ruthless top-down hierarchy. The headline number is massive; supporting data quietly cascades underneath. → https://pageflows.com/ios/products/robinhood/

### 5. Frame before data
*Diagnosis or verdict at the top, supporting numbers below.*
- **WHOOP — Recovery score card.** Plain-language verdict ("ready for strain") sits above the metrics. Coach voice, not data voice. → https://www.whoop.com/us/en/thelocker/the-all-new-whoop-home-screen/
- **Strava — Monthly recap.** Narrative framing ("Your strongest week") leading into supporting totals. Editorial framing — tells you what to feel before showing the data that justifies it. → https://support.strava.com/hc/en-us/articles/360057807412-Monthly-Recap

### 6. Spatial / positional viz
*Bars, sparklines, court diagrams, sliders. Space, not digits.*
- **SwingVision — Shot placement / court heatmap.** Court diagrams with shot bounce locations and zones. Domain-exact reference. Position on court communicates more than "72% DTL." → https://apps.apple.com/us/app/swingvision-a-i-tennis-app/id1475928956
- **Apple Health — Trends cards.** Sparklines + small range bars inside compact cards. How to encode change and range in tiny mobile real estate without labels. → https://support.apple.com/guide/iphone/view-your-health-data-iphe3d379c32/ios

### 7. Outcome-aware emotional design
*Same component, different mood for win/loss or good/bad day.*
- **WHOOP — Red/Yellow/Green recovery states.** Same dial recoloured + rephrased for good/ok/bad days. One component, three moods — colour and copy shift without layout changes. Exactly JD's win/loss need. → https://support.whoop.com/s/article/WHOOP-Recovery
- **Robinhood — Red/green market state.** Background flood-colours by portfolio state; post-market shifts tone. Emotional state baked into the canvas itself — not a badge, the whole screen breathes with outcome. → https://medium.com/canvs/robinhood-5-reasons-the-stock-trading-app-has-cracked-application-design-2e2c727f0735

### 8. Pre-event briefing
*Pre-match/workout/meeting prep at a glance.*
- **WHOOP — Daily outlook ("Ready for strain").** Morning card: recovery + recommended strain target + one-line guidance. Glanceable morning prep. "Here's what you've got, here's what to aim for" — same shape as a pre-match brief. → https://www.whoop.com/us/en/thelocker/the-all-new-whoop-home-screen/
- **Things 3 — Today view.** Single-screen "today" with heading, key items, quiet metadata. Editorial calm for pre-event prep — no dashboard, just what matters in the next hours. → https://culturedcode.com/things/

### 9. Post-event recap
*Post-workout/match summary, reflection mode.*
- **Strava — Post-activity summary.** Map/route + headline stats + analysis tabs (elevation, pace, HR). Template post-event recap — celebratory headline number, then drillable evidence. → https://support.strava.com/hc/en-us/articles/216919157-Viewing-Activities
- **WHOOP — Sleep recap card.** Morning sleep recap: performance score + stages + one-line verdict. Reflection-mode design: dense but calm, gives you a verdict to walk away with. → https://www.whoop.com/us/en/thelocker/your-key-whoop-metrics-all-in-one-place/

### 10. Trend over time
*Sparklines, weekly/monthly progressions.*
- **Apple Health — Trends section.** "Resting heart rate is trending up over 90 days" style cards with inline chart. Each trend is a sentence + a chart. Language-first, chart as evidence — not a chart library dump. → https://leancrew.com/all-this/2024/11/apple-health-trends/
- **Strava — Progress summary chart.** Weekly/monthly bars for distance/time/elevation with toggle. Clean weekly-progression bar chart, minimal axis chrome — proof you can ship trend viz without a full charting system. → https://support.strava.com/hc/en-us/articles/28437860016141-Progress-Summary-Chart

---

## Adding new references

When JD reacts strongly to a pattern (positive or negative) in another app, screenshot it and add it here. When the design skill searches for a reference and doesn't find one, it should add what it finds. **The library compounds.**

Every entry should explain *why* the example is in the library — what specifically makes it worth referencing. A bare URL is not a reference.
