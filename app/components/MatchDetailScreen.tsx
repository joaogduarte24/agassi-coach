'use client'
import { useState, useEffect, useRef, useMemo } from 'react'
import { G, R, A, B, col, fmtDate, matchState, FONT_BODY, FONT_DATA, FONT_DISPLAY, BG, BG2, BG3, BORDER, BORDER2, WHITE, MUTED, DIM, GOLD } from '@/app/lib/helpers'
import type { Match, Avgs, Opponent } from '@/app/types'
import { diagnoseMatch } from '@/app/lib/signals/diagnosis'
import { pickKeyStats } from '@/app/lib/signals/keyStats'
import { computeSignals } from '@/app/lib/signals/compute'
import { selectForDebrief } from '@/app/lib/signals/select'
import CoachesRead from './CoachesRead'
import StatBar from './StatBar'

const FB = FONT_BODY, FD = FONT_DATA, FX = FONT_DISPLAY

// ─── SECTION HEADER ──────────────────────────────────────────────────────────
const SH = ({ children }: { children: React.ReactNode }) => (
  <div style={{ fontSize: 10, fontFamily: FB, fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: MUTED, marginBottom: 12 }}>{children}</div>
)

// ─── COUNT CARD (UE, Winners, Aces, DF — key stats grid) ─────────────────────
function CountCard({ label, tag, tagColor, jd, opp, avg, good }: {
  label: string; tag?: string; tagColor?: string; jd: number; opp?: number; avg: number; good: boolean
}) {
  const jdColor = good ? G : R
  const delta = jd - avg
  const deltaStr = delta > 0 ? `+${delta}` : `${delta}`
  return (
    <div style={{ background: BG2, border: `1px solid ${BORDER}`, borderRadius: 12, padding: '12px 14px' }}>
      {tag && <div style={{ fontSize: 9, fontFamily: FB, fontWeight: 600, color: tagColor || MUTED, marginBottom: 4, letterSpacing: '0.5px' }}>{tag}</div>}
      <div style={{ fontSize: 10, fontFamily: FB, fontWeight: 600, color: '#888', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: 8 }}>{label}</div>
      <div style={{ textAlign: 'center', marginBottom: 8 }}>
        <span style={{ fontSize: 32, fontFamily: FD, fontWeight: 700, color: jdColor, lineHeight: 1 }}>{jd}</span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', gap: 10, fontSize: 10, fontFamily: FD }}>
        <span style={{ color: '#555' }}>avg {avg} <span style={{ color: jdColor }}>{deltaStr}</span></span>
        {opp != null && <><span style={{ color: '#555' }}>·</span><span style={{ color: '#555' }}>opp <span style={{ color: 'rgba(96,165,250,0.6)' }}>{opp}</span></span></>}
      </div>
    </div>
  )
}

// ─── BAR CARD (percentages — key stats grid) ─────────────────────────────────
function BarCard({ label, tag, tagColor, val, valStr, avg, opp, oppStr, gThresh, aThresh, max, lower }: {
  label: string; tag?: string; tagColor?: string; val: number; valStr: string; avg: number
  opp?: number; oppStr?: string; gThresh: number; aThresh: number; max: number; lower?: boolean
}) {
  const c = lower ? (val <= gThresh ? G : val <= aThresh ? A : R) : col(val, gThresh, aThresh)
  const scale = max || 100
  const valPct = lower ? 100 - Math.min((val / scale) * 100, 100) : Math.min((val / scale) * 100, 100)
  const avgPct = lower ? 100 - Math.min((avg / scale) * 100, 100) : Math.min((avg / scale) * 100, 100)
  const oppPct = opp != null ? (lower ? 100 - Math.min((opp / scale) * 100, 100) : Math.min((opp / scale) * 100, 100)) : null

  return (
    <div style={{ background: BG2, border: `1px solid ${BORDER}`, borderRadius: 12, padding: '12px 14px' }}>
      {tag && <div style={{ fontSize: 9, fontFamily: FB, fontWeight: 600, color: tagColor || MUTED, marginBottom: 4, letterSpacing: '0.5px' }}>{tag}</div>}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
        <span style={{ fontSize: 10, fontFamily: FB, fontWeight: 600, color: '#888', letterSpacing: '1.5px', textTransform: 'uppercase' }}>{label}</span>
        <span style={{ fontSize: 14, fontFamily: FD, fontWeight: 600, color: c }}>{valStr}</span>
      </div>
      <div style={{ fontSize: 10, fontFamily: FD, color: '#555', marginBottom: 6 }}>
        avg {avg}{opp != null && <><span style={{ color: '#444' }}> · </span>opp <span style={{ color: 'rgba(96,165,250,0.6)' }}>{oppStr ?? opp}</span></>}
      </div>
      <div style={{ position: 'relative', height: 6, background: '#252525', borderRadius: 3 }}>
        <div style={{ position: 'absolute', ...(lower ? { right: 0 } : { left: 0 }), top: 0, height: 6, borderRadius: 3, width: `${valPct}%`, background: c }} />
        <div style={{ position: 'absolute', left: `${avgPct}%`, top: -4, width: 1.5, height: 14, background: 'rgba(255,255,255,0.55)', borderRadius: 1 }} />
        {oppPct != null && <div style={{ position: 'absolute', left: `${oppPct}%`, top: '50%', width: 6, height: 6, background: B, borderRadius: 1, transform: 'translateX(-50%) translateY(-50%) rotate(45deg)' }} />}
      </div>
    </div>
  )
}

// ─── COUNT ROW (full stats list) ─────────────────────────────────────────────
function CountRow({ label, jd, opp, avg, good }: { label: string; jd: number; opp?: number; avg: number; good: boolean }) {
  const c = good ? G : R
  const delta = jd - avg
  const deltaStr = delta > 0 ? `+${delta}` : `${delta}`
  return (
    <div style={{ padding: '10px 0', borderBottom: '1px solid #1a1a1a', display: 'flex', alignItems: 'center' }}>
      <span style={{ fontSize: 12, color: '#888', flex: 1 }}>{label}</span>
      <span style={{ fontSize: 14, fontFamily: FD, fontWeight: 500, color: c }}>{jd}</span>
      <span style={{ fontSize: 10, fontFamily: FD, color: c, marginLeft: 4, minWidth: 28 }}>{deltaStr}</span>
      {opp != null && <span style={{ fontSize: 11, fontFamily: FD, color: 'rgba(96,165,250,0.6)', marginLeft: 10, minWidth: 32, textAlign: 'right' }}>opp {opp}</span>}
    </div>
  )
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────
function avgAll(matches: Match[], fn: (m: Match) => number | null | undefined): number | null {
  const vals = matches.map(fn).filter((v): v is number => v != null && !isNaN(v))
  return vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : null
}

function h2h(matches: Match[], oppName: string) {
  const vs = matches.filter(m => m.opponent?.name === oppName)
  const w = vs.filter(m => m.score?.winner === 'JD').length
  return { w, l: vs.length - w, total: vs.length }
}

// ─── MAIN COMPONENT ─────────────────────────────────────────────────────────
interface Props {
  match: Match
  avgs: Avgs
  allMatches: Match[]
  onBack: () => void
  onFix: () => void
  onDelete: () => void
}

export default function MatchDetailScreen({ match: m, avgs, allMatches, onBack, onFix, onDelete }: Props) {
  const [showStats, setShowStats] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [opponent, setOpponent] = useState<Opponent | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  const isWin = m.score?.winner === 'JD'
  const sc = isWin ? G : (m.score?.winner ? R : MUTED)
  const state = matchState(m)
  const hasStats = state === 'complete' || state === 'stats-only'
  const hasJournal = state === 'complete' || state === 'journal-only'
  const s = m.shot_stats || {} as any
  const opp = m.opp_shots as any
  const j = m.journal
  const record = h2h(allMatches, m.opponent?.name || '')

  // Fetch opponent scouting profile (style/weapon/weakness/notes). Source of
  // truth after journal v2 — formerly lived on match.journal.opp_*.
  useEffect(() => {
    const name = m.opponent?.name?.trim()
    if (!name) return
    let cancelled = false
    fetch(`/api/opponents?name=${encodeURIComponent(name)}`)
      .then(r => r.json())
      .then(d => { if (!cancelled) setOpponent(d?.opponent ?? null) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [m.opponent?.name])

  const diagnosis = useMemo(() => diagnoseMatch(m, allMatches), [m, allMatches])
  const signals = useMemo(() => computeSignals(allMatches), [allMatches])
  const keyStats = useMemo(() => hasStats ? pickKeyStats(m, allMatches, signals.correlations) : [], [m, allMatches, signals, hasStats])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const handleScroll = () => setScrolled(el.scrollTop > 80)
    el.addEventListener('scroll', handleScroll)
    return () => el.removeEventListener('scroll', handleScroll)
  }, [])

  // Opponent averages helper
  const oppAvg = (fn: (o: any) => number | null | undefined) => {
    const vals = allMatches.map(m => { const o = m.opp_shots as any; return o ? fn(o) : null }).filter((v): v is number => v != null)
    return vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : null
  }

  return (
    <div ref={scrollRef} style={{ position: 'fixed', inset: 0, zIndex: 200, background: BG, overflowY: 'auto', color: WHITE, fontFamily: FB }}>
      <div style={{ maxWidth: 390, margin: '0 auto' }}>

        {/* ── Sticky Nav ──────────────────────────────────────────────── */}
        <div style={{ position: 'sticky', top: 0, zIndex: 10, background: BG, borderBottom: `1px solid ${BORDER}`, padding: '10px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span onClick={onBack} style={{ cursor: 'pointer', fontSize: 18, color: WHITE }}>←</span>
            <div>
              <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.5px' }}>vs {m.opponent?.name || 'Unknown'}</span>
              {record.total > 0 && <span style={{ fontSize: 10, fontFamily: FD, color: MUTED, marginLeft: 8 }}>{record.w}W {record.l}L</span>}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {scrolled && <span style={{ fontFamily: FX, fontSize: 18, color: sc, letterSpacing: '1px' }}>{m.score?.sets || '—'}</span>}
            <div style={{ position: 'relative' }}>
              <span onClick={() => setShowMenu(!showMenu)} style={{ fontSize: 18, color: MUTED, cursor: 'pointer' }}>···</span>
              {showMenu && (
                <div style={{ position: 'absolute', right: 0, top: 28, background: BG2, border: `1px solid ${BORDER}`, borderRadius: 10, padding: 4, minWidth: 140, zIndex: 20 }}>
                  {[
                    { label: 'Fix stats', action: () => { setShowMenu(false); onFix() } },
                    { label: 'Delete match', action: () => { setShowMenu(false); onDelete() }, color: R },
                  ].map(item => (
                    <div key={item.label} onClick={item.action} style={{ padding: '10px 14px', fontSize: 12, color: item.color || WHITE, cursor: 'pointer', borderRadius: 8 }}
                      onMouseEnter={e => (e.target as any).style.background = BG3}
                      onMouseLeave={e => (e.target as any).style.background = 'transparent'}>
                      {item.label}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div style={{ padding: '0 20px 80px' }}>

          {/* ── 1. Score ──────────────────────────────────────────────── */}
          <div style={{ textAlign: 'center', padding: '20px 0 24px' }}>
            <div style={{ fontFamily: FX, fontSize: 44, letterSpacing: '2px', color: sc, lineHeight: 1 }}>{m.score?.sets || '—'}</div>
            <div style={{ fontSize: 11, fontFamily: FD, color: MUTED, marginTop: 6 }}>
              {m.surface}{j?.match_type ? ` · ${j.match_type}` : ''} · {fmtDate(m.date)}
            </div>
          </div>

          {/* ── 1.5 Coach's read (AI) ─────────────────────────────────── */}
          {/* Renders only for matches with stats. The component itself
              handles loading (subtle placeholder), error/empty (hidden),
              and success (1-2 in-match adjustments). */}
          {hasStats && <CoachesRead mode="debrief" match={m} allMatches={allMatches} />}

          {/* ── 2. Diagnosis ──────────────────────────────────────────── */}
          {diagnosis && hasStats && (
            <div style={{
              background: isWin ? '#121a14' : '#1a1215',
              border: `1px solid ${isWin ? '#1a2a1a' : '#2a1a1a'}`,
              borderRadius: 16, padding: '16px 20px', marginBottom: 24,
            }}>
              <SH>{diagnosis.type === 'win' ? 'What won it' : 'Diagnosis'}</SH>
              <div style={{ fontFamily: FX, fontSize: 26, color: sc, lineHeight: 1, marginBottom: 10 }}>{diagnosis.headline}</div>
              <ul style={{ margin: 0, padding: 0, listStyle: 'none', fontSize: 13, color: '#bbb', lineHeight: 1.5 }}>
                {diagnosis.bullets.map((t, i) => <li key={i} style={{ marginBottom: 4 }}>• {t}</li>)}
              </ul>
              <div style={{ borderTop: `1px solid ${isWin ? '#1a2a1a' : '#2a1a1a'}`, marginTop: 12, paddingTop: 10 }}>
                <span style={{ fontSize: 9, fontFamily: FB, fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: MUTED }}>{diagnosis.cueLabel}</span>
                <div style={{ fontSize: 12, color: isWin ? G : GOLD, marginTop: 4, lineHeight: 1.4 }}>{diagnosis.cue}</div>
              </div>
            </div>
          )}

          {/* Stats-only fallback when no diagnosis */}
          {!hasStats && (
            <div style={{ background: BG2, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 16, marginBottom: 24 }}>
              <div style={{ fontSize: 13, color: MUTED }}>Upload SwingVision stats to unlock the coaching breakdown.</div>
            </div>
          )}

          {/* ── 3. Key Stats ──────────────────────────────────────────── */}
          {keyStats.length > 0 && (
            <div style={{ marginBottom: 24 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 }}>
                <SH>Key stats</SH>
                <div style={{ display: 'flex', gap: 10, fontSize: 9, fontFamily: FD, color: '#444' }}>
                  <span><span style={{ display: 'inline-block', width: 8, height: 1.5, background: 'rgba(255,255,255,0.55)', verticalAlign: 'middle', marginRight: 3 }} />avg</span>
                  <span><span style={{ display: 'inline-block', width: 5, height: 5, background: B, transform: 'rotate(45deg)', verticalAlign: 'middle', marginRight: 3, borderRadius: 1 }} />opp</span>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {keyStats.map(ks => ks.isCount ? (
                  <CountCard key={ks.label} label={ks.label} tag={ks.tag} tagColor={ks.tagColor} jd={ks.val} opp={ks.opp} avg={ks.avg} good={ks.good} />
                ) : (
                  <BarCard key={ks.label} label={ks.label} tag={ks.tag} tagColor={ks.tagColor} val={ks.val} valStr={ks.valStr} avg={ks.avg} opp={ks.opp} oppStr={ks.oppStr} gThresh={ks.gThresh} aThresh={ks.aThresh} max={ks.max} lower={ks.lower} />
                ))}
              </div>
            </div>
          )}

          {/* ── 4. Coach's Read ────────────────────────────────────────── */}
          {(m.what_worked?.length || m.what_didnt?.length || m.key_number) && (
            <div style={{ marginBottom: 24 }}>
              <SH>Coach&apos;s read</SH>
              {m.what_worked?.map((t, i) => (
                <div key={`w${i}`} style={{ display: 'flex', gap: 10, padding: '9px 0', borderBottom: `1px solid ${BORDER}`, alignItems: 'flex-start' }}>
                  <span style={{ fontSize: 12, color: G, flexShrink: 0, marginTop: 1 }}>✓</span>
                  <span style={{ fontSize: 13, color: WHITE, lineHeight: 1.4 }}>{t}</span>
                </div>
              ))}
              {m.what_didnt?.map((t, i) => (
                <div key={`d${i}`} style={{ display: 'flex', gap: 10, padding: '9px 0', borderBottom: `1px solid ${BORDER}`, alignItems: 'flex-start' }}>
                  <span style={{ fontSize: 12, color: A, flexShrink: 0, marginTop: 1 }}>△</span>
                  <span style={{ fontSize: 13, color: WHITE, lineHeight: 1.4 }}>{t}</span>
                </div>
              ))}
              {m.key_number && (
                <div style={{ marginTop: 10, padding: '8px 12px', background: isWin ? 'rgba(74,222,128,0.06)' : 'rgba(248,113,113,0.06)', borderRadius: 8, border: `1px solid ${isWin ? 'rgba(74,222,128,0.12)' : 'rgba(248,113,113,0.12)'}` }}>
                  <span style={{ fontSize: 11, fontFamily: FD, color: isWin ? G : R }}>{m.key_number}</span>
                </div>
              )}
            </div>
          )}

          {/* ── 5. Patterns ───────────────────────────────────────────── */}
          {/* Coachability filter applied: drops tautological (total_pts_won),
              opaque composites (net_aggression), keeps training-actionable
              signals like cross-court % because post-match "work on this"
              content is legitimate debrief. */}
          {hasStats && (() => {
            const patternSignals = selectForDebrief(signals.correlations)
            if (patternSignals.length === 0) return null
            return (
              <div style={{ marginBottom: 24 }}>
                <SH>Patterns</SH>
                {patternSignals.map((sig, i) => {
                  const isOnWinningSide = sig.winRateAbove != null && sig.winRateBelow != null && sig.winRateAbove > sig.winRateBelow
                  const dotColor = isOnWinningSide ? G : R
                  return (
                    <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 6 }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: dotColor, flexShrink: 0, marginTop: 5 }} />
                      <span style={{ fontSize: 12, color: '#bbb', lineHeight: 1.4 }}>{sig.insight}</span>
                    </div>
                  )
                })}
              </div>
            )
          })()}

          {/* ── 6. Opponent profile (from opponents table) ────────────── */}
          {(opponent?.style || opponent?.weapon || opponent?.weakness || opponent?.notes || opp) && (
            <div style={{ marginBottom: 24 }}>
              <SH>Opponent</SH>
              {opponent?.style && (
                <div style={{ fontSize: 12, fontFamily: FD, color: '#888', marginBottom: 8 }}>{opponent.style}</div>
              )}
              <div style={{ display: 'flex', gap: 24, marginBottom: opponent?.notes ? 8 : 0 }}>
                {opponent?.weapon && <div><span style={{ fontSize: 10, color: MUTED }}>Weapon </span><span style={{ fontSize: 12, color: A }}>{opponent.weapon}</span></div>}
                {opponent?.weakness && <div><span style={{ fontSize: 10, color: MUTED }}>Weakness </span><span style={{ fontSize: 12, color: G }}>{opponent.weakness}</span></div>}
              </div>
              {opponent?.notes && (
                <div style={{ fontSize: 12, color: '#aaa', fontFamily: FB, lineHeight: 1.5, fontStyle: 'italic' as const }}>"{opponent.notes}"</div>
              )}
            </div>
          )}

          {/* ── 7. Journal ────────────────────────────────────────────── */}
          {hasJournal && j ? (
            <div style={{ background: BG2, border: `1px solid ${BORDER}`, borderRadius: 16, padding: 14, marginBottom: 24 }}>
              <SH>Your notes</SH>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5px 16px' }}>
                {j.recovery != null && <JournalRow label="Recovery" value={`${j.recovery}`} color={col(j.recovery, 80, 50)} />}
                {j.composure != null && <JournalRow label="Composure" value={`${j.composure}/5`} color={col(j.composure, 4, 3)} />}
                {j.focus != null && <JournalRow label="Focus" value={`${j.focus}/5`} color={col(j.focus, 4, 3)} />}
                {j.plan_executed && <JournalRow label="Plan" value={j.plan_executed} color={j.plan_executed === 'Yes' ? G : j.plan_executed === 'Mostly' ? A : R} />}
                {j.opp_difficulty && <JournalRow label="Difficulty" value={j.opp_difficulty} color={WHITE} />}
                {j.warmup && <JournalRow label="Warmup" value={j.warmup} color={WHITE} />}
              </div>
              {j.decided_by && j.decided_by.length > 0 && (
                <div style={{ marginTop: 8, paddingTop: 8, borderTop: `1px solid ${BORDER}`, fontSize: 10 }}>
                  <span style={{ color: MUTED }}>Decided by </span>
                  <span style={{ fontFamily: FD, color: WHITE }}>{j.decided_by.join(' · ')}</span>
                </div>
              )}
              {j.priority_next && (
                <div style={{ marginTop: 4, fontSize: 10 }}>
                  <span style={{ color: MUTED }}>Priority </span>
                  <span style={{ fontFamily: FD, color: GOLD }}>{j.priority_next}</span>
                </div>
              )}
            </div>
          ) : !hasJournal && (
            <div style={{ background: BG2, border: `1px solid rgba(196,169,106,0.15)`, borderRadius: 12, padding: 16, marginBottom: 24 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: WHITE, marginBottom: 4 }}>Add your notes</div>
              <div style={{ fontSize: 12, color: MUTED, lineHeight: 1.4 }}>Recovery, composure, what decided it — the data needs your read.</div>
            </div>
          )}

          {/* ── 8. See All Stats ───────────────────────────────────────── */}
          {hasStats && (
            <>
              <button onClick={() => setShowStats(v => !v)} style={{ width: '100%', padding: 12, background: 'none', border: `1px solid ${BORDER}`, borderRadius: 12, color: MUTED, fontFamily: FB, fontSize: 11, fontWeight: 600, cursor: 'pointer', marginBottom: showStats ? 16 : 0 }}>
                {showStats ? 'Hide all stats ↑' : 'See all stats ↓'}
              </button>

              {showStats && (
                <div style={{ marginTop: 16 }}>
                  <div style={{ display: 'flex', gap: 12, marginBottom: 16, fontSize: 9, fontFamily: FD, color: '#555' }}>
                    <span><span style={{ display: 'inline-block', width: 10, height: 1.5, background: 'rgba(255,255,255,0.55)', verticalAlign: 'middle', marginRight: 4 }} />my avg</span>
                    <span><span style={{ display: 'inline-block', width: 5, height: 5, background: B, transform: 'rotate(45deg)', verticalAlign: 'middle', marginRight: 4, borderRadius: 1 }} />opponent</span>
                  </div>

                  {/* Serve */}
                  <SH>Serve</SH>
                  <StatBar label="1st Serve % (Ad)" val={m.serve?.first?.pct_ad ?? null} avgVal={avgs.s1_ad} oppVal={opp?.serve?.first?.pct_ad} gThresh={66} aThresh={55} />
                  <StatBar label="1st Serve % (Deuce)" val={m.serve?.first?.pct_deuce ?? null} avgVal={avgs.s1_deuce} oppVal={opp?.serve?.first?.pct_deuce} gThresh={66} aThresh={55} />
                  <StatBar label="1st Srv Speed (Ad)" val={m.serve?.first?.spd_ad ?? null} avgVal={avgs.spd_s1_ad} oppVal={opp?.serve?.first?.spd_ad} gThresh={160} aThresh={140} suffix="km/h" maxVal={200} />
                  <StatBar label="1st Srv Speed (Dce)" val={m.serve?.first?.spd_deuce ?? null} avgVal={avgs.spd_s1_deuce} oppVal={opp?.serve?.first?.spd_deuce} gThresh={160} aThresh={140} suffix="km/h" maxVal={200} />
                  <StatBar label="2nd Serve % (Ad)" val={m.serve?.second?.pct_ad ?? null} avgVal={avgs.s2_ad} oppVal={opp?.serve?.second?.pct_ad} gThresh={85} aThresh={75} />
                  <StatBar label="2nd Serve % (Deuce)" val={m.serve?.second?.pct_deuce ?? null} avgVal={avgs.s2_deuce} oppVal={opp?.serve?.second?.pct_deuce} gThresh={85} aThresh={75} />
                  <StatBar label="1st Srv Pts Won" val={s.s1_pts_won_pct} avgVal={avgAll(allMatches, m => m.shot_stats?.s1_pts_won_pct)} oppVal={opp?.stats?.s1_pts_won_pct} gThresh={65} aThresh={55} />
                  <StatBar label="2nd Srv Pts Won" val={s.s2_pts_won_pct} avgVal={avgAll(allMatches, m => m.shot_stats?.s2_pts_won_pct)} oppVal={opp?.stats?.s2_pts_won_pct} gThresh={50} aThresh={40} />
                  <StatBar label="Serve Pts Won" val={s.serve_pts_won_pct} avgVal={avgAll(allMatches, m => m.shot_stats?.serve_pts_won_pct)} oppVal={opp?.stats?.serve_pts_won_pct} gThresh={60} aThresh={50} />
                  {s.aces != null && <CountRow label="Aces" jd={s.aces} opp={opp?.stats?.aces} avg={avgAll(allMatches, m => m.shot_stats?.aces) ?? 0} good={s.aces >= 3} />}
                  {s.df != null && <CountRow label="Double Faults" jd={s.df} opp={opp?.stats?.df} avg={avgAll(allMatches, m => m.shot_stats?.df) ?? 0} good={s.df <= 3} />}

                  <div style={{ height: 16 }} />
                  <SH>Return</SH>
                  <StatBar label="Return Pts Won" val={s.return_pts_won_pct} avgVal={avgAll(allMatches, m => m.shot_stats?.return_pts_won_pct)} oppVal={opp?.stats?.return_pts_won_pct} gThresh={45} aThresh={35} />
                  <StatBar label="1st Ret Pts Won" val={s.ret1_pts_won_pct} avgVal={avgAll(allMatches, m => m.shot_stats?.ret1_pts_won_pct)} oppVal={opp?.stats?.ret1_pts_won_pct} gThresh={38} aThresh={28} />
                  <StatBar label="2nd Ret Pts Won" val={s.ret2_pts_won_pct} avgVal={avgAll(allMatches, m => m.shot_stats?.ret2_pts_won_pct)} oppVal={opp?.stats?.ret2_pts_won_pct} gThresh={55} aThresh={42} />

                  <div style={{ height: 16 }} />
                  <SH>Forehand</SH>
                  <StatBar label="CC In %" val={m.forehand?.cc_in ?? null} avgVal={avgs.fh_cc} oppVal={opp?.forehand?.cc_in} gThresh={80} aThresh={70} />
                  <StatBar label="DTL In %" val={m.forehand?.dtl_in ?? null} avgVal={avgs.fh_dtl} oppVal={opp?.forehand?.dtl_in} gThresh={70} aThresh={60} />
                  <StatBar label="CC Speed" val={m.forehand?.spd_cc ?? null} avgVal={avgs.spd_fh_cc} oppVal={opp?.forehand?.spd_cc} gThresh={105} aThresh={90} suffix="km/h" maxVal={150} />
                  <StatBar label="DTL Speed" val={m.forehand?.spd_dtl ?? null} avgVal={avgs.spd_fh_dtl} oppVal={opp?.forehand?.spd_dtl} gThresh={100} aThresh={85} suffix="km/h" maxVal={150} />
                  {s.fh_winners != null && <CountRow label="FH Winners" jd={s.fh_winners} opp={opp?.stats?.fh_winners} avg={avgAll(allMatches, m => m.shot_stats?.fh_winners) ?? 0} good={s.fh_winners >= (avgAll(allMatches, m => m.shot_stats?.fh_winners) ?? 0)} />}
                  {s.fh_ue != null && <CountRow label="FH UE" jd={s.fh_ue} opp={opp?.stats?.fh_ue} avg={avgAll(allMatches, m => m.shot_stats?.fh_ue) ?? 0} good={s.fh_ue <= (avgAll(allMatches, m => m.shot_stats?.fh_ue) ?? 99)} />}

                  <div style={{ height: 16 }} />
                  <SH>Backhand</SH>
                  <StatBar label="CC In %" val={m.backhand?.cc_in ?? null} avgVal={avgs.bh_cc} oppVal={opp?.backhand?.cc_in} gThresh={75} aThresh={65} />
                  <StatBar label="DTL In %" val={m.backhand?.dtl_in ?? null} avgVal={avgs.bh_dtl} oppVal={opp?.backhand?.dtl_in} gThresh={70} aThresh={60} />
                  <StatBar label="CC Speed" val={m.backhand?.spd_cc ?? null} avgVal={avgs.spd_bh_cc} oppVal={opp?.backhand?.spd_cc} gThresh={90} aThresh={75} suffix="km/h" maxVal={130} />
                  <StatBar label="DTL Speed" val={m.backhand?.spd_dtl ?? null} avgVal={avgs.spd_bh_dtl} oppVal={opp?.backhand?.spd_dtl} gThresh={85} aThresh={70} suffix="km/h" maxVal={130} />
                  {s.bh_winners != null && <CountRow label="BH Winners" jd={s.bh_winners} opp={opp?.stats?.bh_winners} avg={avgAll(allMatches, m => m.shot_stats?.bh_winners) ?? 0} good={s.bh_winners >= (avgAll(allMatches, m => m.shot_stats?.bh_winners) ?? 0)} />}
                  {s.bh_ue != null && <CountRow label="BH UE" jd={s.bh_ue} opp={opp?.stats?.bh_ue} avg={avgAll(allMatches, m => m.shot_stats?.bh_ue) ?? 0} good={s.bh_ue <= (avgAll(allMatches, m => m.shot_stats?.bh_ue) ?? 99)} />}

                  <div style={{ height: 16 }} />
                  <SH>Pressure</SH>
                  <StatBar label="BP Saved" val={s.bp_saved_pct} avgVal={avgAll(allMatches, m => m.shot_stats?.bp_saved_pct)} oppVal={opp?.stats?.bp_saved_pct} gThresh={60} aThresh={40} />
                  <StatBar label="BP Won" val={s.bp_won_pct} avgVal={avgAll(allMatches, m => m.shot_stats?.bp_won_pct)} oppVal={opp?.stats?.bp_won_pct} gThresh={50} aThresh={35} />

                  <div style={{ height: 16 }} />
                  <SH>Winners &amp; Errors</SH>
                  {s.winners != null && <CountRow label="Total Winners" jd={s.winners} opp={opp?.stats?.winners} avg={avgAll(allMatches, m => m.shot_stats?.winners) ?? 0} good={s.winners >= (avgAll(allMatches, m => m.shot_stats?.winners) ?? 0)} />}
                  {s.ue != null && <CountRow label="Total UE" jd={s.ue} opp={opp?.stats?.ue} avg={avgAll(allMatches, m => m.shot_stats?.ue) ?? 0} good={s.ue <= (avgAll(allMatches, m => m.shot_stats?.ue) ?? 99)} />}

                  <div style={{ height: 16 }} />
                  <SH>Distribution</SH>
                  <StatBar label="FH %" val={s.fh_pct} avgVal={avgAll(allMatches, m => m.shot_stats?.fh_pct)} oppVal={opp?.distribution?.fh_pct} gThresh={50} aThresh={40} />
                  <StatBar label="BH %" val={s.bh_pct} avgVal={avgAll(allMatches, m => m.shot_stats?.bh_pct)} oppVal={opp?.distribution?.bh_pct} gThresh={35} aThresh={25} />
                  {s.topspin_pct != null && <StatBar label="Topspin %" val={s.topspin_pct} avgVal={avgAll(allMatches, m => m.shot_stats?.topspin_pct)} oppVal={opp?.distribution?.topspin_pct} gThresh={55} aThresh={40} />}
                  {s.slice_pct != null && <StatBar label="Slice %" val={s.slice_pct} avgVal={avgAll(allMatches, m => m.shot_stats?.slice_pct)} oppVal={opp?.distribution?.slice_pct} gThresh={15} aThresh={10} />}

                  <div style={{ height: 16 }} />
                  <SH>Overview</SH>
                  <StatBar label="Total Pts Won" val={s.total_pts_won_pct} avgVal={avgAll(allMatches, m => m.shot_stats?.total_pts_won_pct)} oppVal={opp?.stats?.total_pts_won_pct} gThresh={55} aThresh={45} />
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function JournalRow({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
      <span style={{ fontSize: 11, color: MUTED }}>{label}</span>
      <span style={{ fontSize: 11, fontFamily: FONT_DATA, color }}>{value}</span>
    </div>
  )
}
