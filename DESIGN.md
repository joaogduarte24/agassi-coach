# Agassi — Design Language

The single source of truth for every visual decision. Referenced before writing any UI code.

**Direction: Premium Sports Editorial**
More breathing room. Editorial hierarchy. Data is impactful when it appears, not constant noise. Reference: The Athletic, ATP Tour match programme aesthetic — but dark.

---

## Typography

Three faces, each with a distinct role. Never mixed within the same role.

| Face | Role | Usage |
|---|---|---|
| **Bebas Neue** | Display | Scores, match results, page titles, big numbers |
| **Inter** | Body | Labels, questions, descriptions, navigation, copy |
| **DM Mono** | Data | Stats, percentages, dates, percentages, badge values |

### Scale

| Token | Size | Weight | Use |
|---|---|---|---|
| `display-xl` | 52px | Bebas Neue | Match score in debrief header |
| `display-lg` | 36px | Bebas Neue | Page titles |
| `display-md` | 22px | Bebas Neue | Match score in card |
| `body-lg` | 16px | Inter 600 | Match opponent name, primary labels |
| `body-md` | 14px | Inter 400/500 | Debrief bullets, body copy |
| `body-sm` | 13px | Inter 500/600 | Journal questions, stat labels, chip text |
| `label` | 11px | Inter 600, +0.5px tracking | Nav tabs, secondary labels |
| `meta` | 11px | DM Mono 400 | Dates, surface, UTR, match meta |
| `section-header` | 10px | Inter 700, +2px tracking, uppercase | Section dividers ("What decided it") |
| `data-lg` | 15px | DM Mono 500 | Stat values in My Game rows |
| `data-sm` | 10px | DM Mono 500 | Badge values, pill text |

---

## Token implementation

Tokens are TypeScript constants exported from [app/lib/helpers.tsx](app/lib/helpers.tsx). Inline styles import them by name (no CSS variables, no Tailwind). The names below match the TS exports — use the import, not the hex.

```ts
import { BG, BG2, GOLD, WHITE, MUTED, FONT_BODY, FONT_DATA, S, RAD } from '@/app/lib/helpers'
```

To enforce: `npm run lint:tokens` counts raw hex literals in `app/components/`. Baseline ratchets down only.

## Colour System

### Background stack — page → mid → card → nested → track
```
BG     #0d0d0d   Page background (also html/body in globals.css)
BG1    #1a1a1a   Mid layer — section panels, raised tiles
BG2    #141414   Cards, panels
BG3    #1c1c1c   Nested elements, hover states
TRACK  #252525   Bar tracks, progress backgrounds
```

### Borders
```
BORDER   #222   Default card border
BORDER2  #2a2a2a  Hover, active, secondary borders
```

### Brand
```
GOLD      #c4a96a   Active tab underline, add button, selected chip border
GOLD_DIM  #8a7348   Subtle gold — card hover borders, muted brand moments, stat anchors
```

### Text — high-contrast → mid → muted → null → ghost
```
WHITE       #f0ece4   Primary text (warm white, not pure)
MUTED_HI    #888     Label text variant — slightly brighter than MUTED
MUTED       #666     Secondary labels, meta, section headers
NULL_STATE  #555     "No data" fallback (from col() helper when val is null)
DIM         #333     Inactive nav, placeholder, ghost elements
```

### Semantic (performance colours — unchanged from existing system)
```
--green:    #4ade80   Good performance
--amber:    #fbbf24   Average / watch
--red:      #f87171   Needs work
--blue:     #60a5fa   Neutral info

--green-bg: rgba(74,222,128,0.08)
--amber-bg: rgba(251,191,36,0.08)
--red-bg:   rgba(248,113,113,0.08)
--blue-bg:  rgba(96,165,250,0.08)
```

---

## Spacing & Layout

Use the `S` scale for padding/margin/gap and `RAD` for borderRadius. Avoid arbitrary numbers.

```ts
S = { xs: 8, sm: 12, md: 16, lg: 20, xl: 28, xxl: 40 }
RAD = { sm: 8, md: 12, lg: 16, pill: 999 }
```

| Use | Token |
|---|---|
| Page horizontal padding | `S.lg` (20) |
| Card padding | `S.lg` (20) |
| Card radius | `RAD.lg` (16) |
| Card-to-card gap | `S.sm` (12) |
| Section gap (major) | `S.xl` (28) |
| Row vertical padding (stat rows, bullets) | `S.md - 2` ≈ 14 |
| Button radius | `RAD.md` (12) |
| Chip / pill radius | `RAD.pill` |
| Content max-width | 390px (mobile-first, centered on desktop) |

---

## Components

### Cards
```
background:    --bg2
border:        1px solid --border
border-radius: 16px
padding:       20px
```
Hover state: border → --border2

### Chips (journal selectors)
```
Default:   border: 1px solid --border2 · bg: --bg2 · color: --muted
Selected:  border: 1px solid --gold-dim · bg: rgba(196,169,106,0.08) · color: --gold
Size:      padding: 8px 16px · border-radius: 20px  ← pill
Font:      Inter 12px 500
```
Multi-select chips use the same style — selected state is the only difference.

### Pills (match card stat summary)
```
Size:   padding: 4px 10px · border-radius: 20px
Font:   DM Mono 10px 500
Green:  bg --green-bg · color --green
Amber:  bg --amber-bg · color --amber
Red:    bg --red-bg   · color --red
Blue:   bg --blue-bg  · color --blue
Dim:    bg --bg3 · color --muted · border: 1px solid --border  (partial match state)
```

### Badges (W/L record in nav)
```
Same as pills — used for win/loss count in nav bar
```

### Buttons
```
Primary (full-stats, continue):
  border: 1px solid --border2 · bg: none · color: --muted
  hover:  border --gold-dim · color --gold
  radius: 12px · padding: 14px · Inter 12px 600

Destructive (delete):
  color: --dim · hover: --red · bg: none · border: none
```

### Section headers
```
Font:           Inter 10px 700  ← bold Inter, not monospace
Letter-spacing: 2px
Text-transform: uppercase
Color:          --muted (#666)
Margin-bottom:  16px
```

### Nav tabs
```
Font:   Inter 11px 600, +0.5px tracking, uppercase
Active: color --white · border-bottom 2px --gold
Inactive: color --dim
Add tab: color --gold · weight 700
```

---

## Debrief bullets

```
Icon:  14px · flex-shrink: 0
Text:  Inter 14px, color --white, line-height 1.5
Row:   padding 14px 0 · border-bottom 1px --border
Numbers within text: DM Mono 500 (inline span)
```

Bullet icons:
- ✓  Good stat (vs average)
- △  Watch / below average
- →  Neutral / contextual

---

## Motion

Transitions: `all 0.15s` on color/border changes only. No layout animation in v1.

---

## What this replaces

| Old | New |
|---|---|
| `fontFamily: 'monospace'` everywhere | Inter for copy, DM Mono for data only |
| `borderRadius: 12` on cards | 16px |
| `padding: 14px` on cards | 20px |
| `fontSize: 10px` section labels | 10px Inter 700 (same size, better weight/tracking) |
| Journal chips: no clear selected style | Gold border + gold text when selected |
| `#444` for inactive nav | `#333` (--dim) |
| Pure white `#fff` text | Warm white `#f0ece4` |

---

## Screen-level patterns

**One screen, one job.** Each screen has a primary artefact (the Brief, the Match, the Identity, the Journal). Everything else is either input to it, evidence for it, or cut. Adopted 2026-05-09 during the Next Match Strategy redesign.

Concrete rules:
- **Inputs:** sticky-compact at top. Primary control surfaces; secondary controls collapse behind a "Context ▾" chevron. Never gate the primary artefact behind input completion (e.g. UTR is no longer required to render the brief).
- **Hero:** the artefact gets a hero treatment — Bebas display 52px, gold border-left 2px, descriptor in DM Mono. No stats, no badges, no scores in the hero surface itself. Score and W/L history live behind the Evidence chevron, never in the hero. Reason: scores in red 30 minutes before a rematch are weaponising; psych guidance.
- **Hero cards (numbered 1, 2, 3):** the few sections that ARE the artefact get heroic visual weight — Bebas number + accented label + bordered card. Use sparingly: 3 hero cards max per screen.
- **Supporting cards:** lighter visual weight (smaller mono labels, neutral border, no number) for everything that frames or modifies the heroes.
- **Stat anchors:** every claim/instruction in a hero card carries a stat anchor in `GOLD_DIM` mono ("↳ his deuce 1st-in was 61% — you will see plenty of 2nd serves to attack"). Reason: the user trusts the brief because the data path is visible, not assumed.
- **Targets:** every heroic instruction carries a `↳ target` line in green italic — what success looks like. Reason: instructions without targets are abstract.
- **Evidence collapsible:** every claim on the screen has a tap-to-reveal data path. Includes raw stat + linked match. Score, history pills, raw stat tables live ONLY here, never on the surface.
- **Confidence badges:** generated but never surfaced to the user during action moments. Used internally to gate plan generation. Reason: meta-cognition right before action plants doubt.
- **Cut hard:** if a section duplicates content from a hero card or doesn't help complete the screen's one job, delete it — don't fold it behind a chevron.

### Naming voice
- Section labels: imperative caps mono ("EXPECT", "DO", "WHEN YOU ARE RETURNING").
- Mantras and intents: short, second-person, present tense.
- Negation banned in primary instructions ("Don't get baited" → "When he hits unreal shots: smile, reset, next point starts now"). Reason: psych — negation primes the very state you're trying to avoid.

### Card structures must be uniform
Inside a section, every card uses the same shape (label / instruction / stat / target). Mixing layouts per card inside the same group is visual noise — observed and fixed during the SERVE · RETURN STRATEGY iteration.
