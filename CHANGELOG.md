# Changelog

User-visible changes to Agassi, in reverse chronological order. Loosely follows [Keep a Changelog](https://keepachangelog.com): grouped by **Added / Changed / Fixed / Removed**, dated. No semver — this is a single-user app, dates are the version.

Updated on every ship per CLAUDE.md gate 06. For full rationale and deferred items, see FEATURES.md.

---

## [Unreleased]

## [2026-05-12] Design system Phase 2: extract Card, Chip, Pill, Button, SectionHeader

### Added
- Five reusable UI components under `app/components/ui/`: `Card`, `Chip`, `Pill`, `Button`, `SectionHeader`. Each follows DESIGN.md spec exactly and imports all values from token helpers.
- `/preview/components` route — every variant + state shown side-by-side with the previous inline versions, plus a composed example to prove they nest correctly.

### Changed
- `app/components/MatchDetail.tsx` — local `Card` helper removed, 6 stat cards (1st/2nd Serve, 1st/2nd Return, Forehand, Backhand) now use `<Card variant="inset" title="…">`. Backgrounds shift from `#1e1e1e` to BG3 `#1c1c1c` — a 2-brightness-point alignment to the documented system.
- `.token-baseline` ratcheted 299 → 297.

## [2026-05-12] Design system Phase 1: token alignment + lint ratchet

### Fixed
- Body background `#0a0a0a` → `#0d0d0d` and primary text `#f0ede8` → `#f0ece4` in `app/globals.css` — aligns to documented DESIGN.md tokens.
- Body font `'DM Sans'` → `'Inter'` in `app/globals.css` — DM Sans was never loaded, so body type was falling back to system-ui.
- 95 instances of `fontFamily: 'monospace'` → `FONT_DATA` across MatchDetail, JDStats, FixMatchModal. Data rows were rendering as system monospace instead of DM Mono.

### Added
- New tokens `BG1`, `TRACK`, `MUTED_HI`, `NULL_STATE` in `app/lib/helpers.tsx` — name the greys that earned their place by repeated use.
- Spacing scale `S = { xs, sm, md, lg, xl, xxl }` and radius scale `RAD = { sm, md, lg, pill }` in `app/lib/helpers.tsx`.
- `npm run lint:tokens` — ratchet script in `scripts/lint-tokens.sh` that counts hex literals in `app/components/` and fails if the count goes up. Baseline: 299.
- Token Implementation section in `DESIGN.md` clarifying tokens live as TS exports, not CSS vars.

### Changed
- `app/components/StatBar.tsx` refactored as the canonical token-consuming example — all colour and font values imported from helpers instead of redefined locally.

---
