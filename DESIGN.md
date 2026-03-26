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

## Colour System

### Background stack
```
--bg:    #0d0d0d   Page background
--bg2:   #141414   Cards, panels
--bg3:   #1c1c1c   Nested elements, hover states
```

### Borders
```
--border:  #222   Default card border
--border2: #2a2a2a  Hover, active, secondary borders
```

### Brand
```
--gold:     #c4a96a   Active tab underline, add button, selected chip border
--gold-dim: #8a7348   Subtle gold — card hover borders, muted brand moments
```

### Text
```
--white:  #f0ece4   Primary text (warm white, not pure)
--muted:  #666     Secondary labels, meta, section headers
--dim:    #333     Inactive nav, placeholder, ghost elements
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

```
Page padding:     20px horizontal
Content max-width: 390px (mobile-first, centered on desktop)
Card padding:     20px
Card radius:      16px
Section gap:      28px between major sections
Card gap:         12px between cards
Row padding:      14px vertical (stat rows, debrief bullets)
```

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
