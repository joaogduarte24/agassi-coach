'use client'
import { useEffect, useMemo, useState } from 'react'
import { G, R, A, B, col, FONT_BODY, FONT_DATA, FONT_DISPLAY,
         BG, BG2, BG3, BORDER, BORDER2, WHITE, MUTED, DIM, GOLD } from '@/app/lib/helpers'
import type { Match } from '@/app/types'
import { computeSignals } from '@/app/lib/signals/compute'
import { getBandMedians, gapToNext, utrToBand, type BenchmarkStat, type BenchmarkPoint } from '@/app/lib/analyst/benchmarks'
import JDStats from './JDStats'

const FB = FONT_BODY, FD = FONT_DATA, FX = FONT_DISPLAY

// ─── SECTION HEADER (mirror of MatchDetailScreen.SH) ─────────────────────────
const SH = ({ children }: { children: React.ReactNode }) => (
  <div style={{ fontSize: 10, fontFamily: FB, fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: MUTED, marginBottom: 12 }}>{children}</div>
)

// ─── SPARKLINE (tiny inline trend) ───────────────────────────────────────────
function Sparkline({ data, color, lower }: { data: (number | null | undefined)[]; color: string; lower?: boolean }) {
  const valid = data.filter((v): v is number => v != null && !isNaN(v))
  if (valid.length < 2) return <div style={{ height: 16 }} />
  const min = Math.min(...valid), max = Math.max(...valid)
  const range = max - min || 1
  const W = 80, H = 16
  const pts = data.map((v, i) => v == null ? null : { x: (i / (data.length - 1)) * W, y: H - ((v - min) / range) * (H - 2) - 1 })
  const path = pts.filter((p): p is { x: number; y: number } => p != null).map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
  // Trend direction: avg of last 3 vs first 3 (or split in half)
  const half = Math.max(1, Math.floor(valid.length / 3))
  const firstAvg = valid.slice(0, half).reduce((a, b) => a + b, 0) / half
  const lastAvg = valid.slice(-half).reduce((a, b) => a + b, 0) / Math.min(half, valid.slice(-half).length)
  const delta = lastAvg - firstAvg
  const improving = lower ? delta < -1 : delta > 1
  const worsening = lower ? delta > 1 : delta < -1
  const arrow = improving ? '↑' : worsening ? '↓' : '→'
  const arrowColor = improving ? G : worsening ? R : MUTED
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
      <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} preserveAspectRatio="none" style={{ overflow: 'visible' }}>
        <path d={path} fill="none" stroke={color} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" opacity={0.7} />
      </svg>
      <span style={{ fontSize: 10, color: arrowColor, fontFamily: FD }}>{arrow}</span>
    </div>
  )
}

// ─── COUNT CARD with band markers + sparkline ───────────────────────────────
function CountCard({ label, val, sub, good, bench, series, lower, currentBandLabel, nextBandLabel }: {
  label: string; val: number; sub?: string; good: boolean
  bench?: BenchmarkPoint | null
  series?: (number | null | undefined)[]
  lower?: boolean
  currentBandLabel?: string
  nextBandLabel?: string
}) {
  const c = good ? G : R
  const showBench = bench != null
  return (
    <div style={{ background: BG2, border: `1px solid ${BORDER}`, borderRadius: 12, padding: '12px 14px' }}>
      <div style={{ fontSize: 10, fontFamily: FB, fontWeight: 600, color: '#888', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: 8 }}>{label}</div>
      <div style={{ textAlign: 'center', marginBottom: 6 }}>
        <span style={{ fontSize: 32, fontFamily: FD, fontWeight: 700, color: c, lineHeight: 1 }}>{val}</span>
      </div>
      {showBench && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, fontSize: 10, fontFamily: FD, color: '#555' }}>
          <span style={{ color: 'rgba(255,255,255,0.55)' }}>{currentBandLabel}: {bench!.current}</span>
          {bench!.next != null && <><span style={{ color: '#444' }}>·</span><span style={{ color: B }}>{nextBandLabel}: {bench!.next}</span></>}
        </div>
      )}
      {!showBench && sub && <div style={{ textAlign: 'center', fontSize: 10, fontFamily: FD, color: '#555' }}>{sub}</div>}
      {series && series.length >= 2 && <Sparkline data={series} color={c} lower={lower} />}
    </div>
  )
}

// ─── BAR CARD with band markers (avg tick = band, diamond = next band) ──────
function BarCard({ label, val, valStr, gThresh, aThresh, max, lower, bench, series, currentBandLabel, nextBandLabel }: {
  label: string; val: number; valStr: string;
  gThresh: number; aThresh: number; max: number; lower?: boolean
  bench?: BenchmarkPoint | null
  series?: (number | null | undefined)[]
  currentBandLabel?: string
  nextBandLabel?: string
}) {
  const c = lower ? (val <= gThresh ? G : val <= aThresh ? A : R) : col(val, gThresh, aThresh)
  const valPct = lower ? 100 - Math.min((val / max) * 100, 100) : Math.min((val / max) * 100, 100)
  const benchPct = bench ? (lower ? 100 - Math.min((bench.current / max) * 100, 100) : Math.min((bench.current / max) * 100, 100)) : null
  const nextPct = bench?.next != null ? (lower ? 100 - Math.min((bench.next / max) * 100, 100) : Math.min((bench.next / max) * 100, 100)) : null
  return (
    <div style={{ background: BG2, border: `1px solid ${BORDER}`, borderRadius: 12, padding: '12px 14px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
        <span style={{ fontSize: 10, fontFamily: FB, fontWeight: 600, color: '#888', letterSpacing: '1.5px', textTransform: 'uppercase' }}>{label}</span>
        <span style={{ fontSize: 14, fontFamily: FD, fontWeight: 600, color: c }}>{valStr}</span>
      </div>
      {bench && (
        <div style={{ fontSize: 10, fontFamily: FD, color: '#555', marginBottom: 6 }}>
          <span style={{ color: 'rgba(255,255,255,0.55)' }}>{currentBandLabel}: {bench.current}{lower ? '' : '%'}</span>
          {bench.next != null && <><span style={{ color: '#444' }}> · </span><span style={{ color: B }}>{nextBandLabel}: {bench.next}{lower ? '' : '%'}</span></>}
        </div>
      )}
      <div style={{ position: 'relative', height: 6, background: '#252525', borderRadius: 3 }}>
        <div style={{ position: 'absolute', ...(lower ? { right: 0 } : { left: 0 }), top: 0, height: 6, borderRadius: 3, width: `${valPct}%`, background: c }} />
        {benchPct != null && <div style={{ position: 'absolute', left: `${benchPct}%`, top: -4, width: 1.5, height: 14, background: 'rgba(255,255,255,0.55)', borderRadius: 1 }} />}
        {nextPct != null && <div style={{ position: 'absolute', left: `${nextPct}%`, top: '50%', width: 6, height: 6, background: B, borderRadius: 1, transform: 'translateX(-50%) translateY(-50%) rotate(45deg)' }} />}
      </div>
      {series && series.length >= 2 && <Sparkline data={series} color={c} lower={lower} />}
    </div>
  )
}

// ─── HELPERS ────────────────────────────────────────────────────────────────
function avgN(matches: Match[], fn: (m: Match) => number | null | undefined): number | null {
  const v = matches.map(fn).filter((x): x is number => x != null && !isNaN(x))
  return v.length ? Math.round(v.reduce((a, b) => a + b, 0) / v.length) : null
}

interface MyGameProps {
  matches: Match[]
  avgs: any
}

export default function MyGame({ matches, avgs }: MyGameProps) {
  const [showStats, setShowStats] = useState(false)
  const [editingUtr, setEditingUtr] = useState(false)
  const [utrInput, setUtrInput] = useState('')
  const [utr, setUtr] = useState<{ value: number | null; updatedAt: string | null }>({ value: null, updatedAt: null })

  useEffect(() => {
    fetch('/api/profile')
      .then(r => r.json())
      .then(d => setUtr({ value: d.profile?.utr ?? null, updatedAt: d.profile?.utr_updated_at ?? null }))
      .catch(() => {})
  }, [])

  const saveUtr = async () => {
    const v = parseFloat(utrInput)
    if (isNaN(v) || v < 0 || v > 16) { setEditingUtr(false); return }
    await fetch('/api/profile', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ utr: v }) })
    setUtr({ value: v, updatedAt: new Date().toISOString().slice(0, 10) })
    setEditingUtr(false)
  }

  const signals = useMemo(() => computeSignals(matches), [matches])
  const profile = signals.jdProfile

  const sortedMatches = useMemo(() => [...matches].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()), [matches])
  const wins = matches.filter(m => m.score?.winner === 'JD').length
  const losses = matches.filter(m => m.score?.winner && m.score.winner !== 'JD').length
  const winRate = matches.length ? Math.round((wins / matches.length) * 100) : null
  const winRateColor = winRate == null ? MUTED : winRate >= 60 ? G : winRate >= 40 ? A : R

  // ─── CAREER AVERAGES + benchmark lookups ────────────────────────────────
  const ueAvg = avgN(matches, m => m.shot_stats?.ue)
  const winnersAvg = avgN(matches, m => m.shot_stats?.winners)
  const s1Avg = avgN(matches, m => {
    const ad = m.serve?.first?.pct_ad, dc = m.serve?.first?.pct_deuce
    if (ad == null && dc == null) return null
    return Math.round(((ad ?? 0) + (dc ?? 0)) / ((ad != null ? 1 : 0) + (dc != null ? 1 : 0)))
  })
  const retAvg = avgN(matches, m => m.shot_stats?.return_pts_won_pct)
  const bpWonAvg = avgN(matches, m => m.shot_stats?.bp_won_pct)
  const totalPtsAvg = avgN(matches, m => m.shot_stats?.total_pts_won_pct)

  const ueBench = getBandMedians('ue_per_match', utr.value)
  const winnersBench = getBandMedians('winners_per_match', utr.value)
  const s1Bench = getBandMedians('first_serve_pct', utr.value)
  const retBench = getBandMedians('return_pts_won_pct', utr.value)
  const bpWonBench = getBandMedians('bp_won_pct', utr.value)
  const totalPtsBench = getBandMedians('total_pts_won_pct', utr.value)

  // Series for sparklines (ordered chronologically)
  const ueSeries = sortedMatches.map(m => m.shot_stats?.ue)
  const winnersSeries = sortedMatches.map(m => m.shot_stats?.winners)
  const s1Series = sortedMatches.map(m => {
    const ad = m.serve?.first?.pct_ad, dc = m.serve?.first?.pct_deuce
    if (ad == null && dc == null) return null
    return Math.round(((ad ?? 0) + (dc ?? 0)) / ((ad != null ? 1 : 0) + (dc != null ? 1 : 0)))
  })
  const retSeries = sortedMatches.map(m => m.shot_stats?.return_pts_won_pct)
  const bpWonSeries = sortedMatches.map(m => m.shot_stats?.bp_won_pct)
  const totalPtsSeries = sortedMatches.map(m => m.shot_stats?.total_pts_won_pct)

  const hasAnyStats = matches.some(m => m.shot_stats != null || m.serve != null)

  // ─── PATH TO NEXT UTR — 2 biggest gaps ──────────────────────────────────
  const utrBand = utrToBand(utr.value)
  const nextBandStr = utr.value != null ? `${(Math.floor(utr.value * 2) / 2 + 0.5).toFixed(1)}-${(Math.floor(utr.value * 2) / 2 + 1.0).toFixed(1)}` : null
  const nextBandLabel = utr.value != null ? `${(Math.floor(utr.value * 2) / 2 + 0.5).toFixed(1)}` : null
  type GapRow = { label: string; gap: number; you: number; target: number; unit: string; drill: string }
  const gaps: GapRow[] = []
  const pushGap = (label: string, you: number | null, bench: BenchmarkPoint | null, unit: string, drill: string) => {
    if (you == null || !bench || bench.next == null) return
    const g = gapToNext(you, bench)
    if (g > 0) gaps.push({ label, gap: g, you, target: bench.next, unit, drill })
  }
  pushGap('Unforced errors', ueAvg, ueBench, '/match', 'Cut UE first — extra topspin margin, target the middle 70% of the court')
  pushGap('Winners', winnersAvg, winnersBench, '/match', 'Take the +1 ball after a deep return — punish short balls')
  pushGap('1st serve %', s1Avg, s1Bench, '%', 'Drop pace 5%, add toss consistency drills')
  pushGap('Return pts won', retAvg, retBench, '%', 'Take returns earlier and aim deep middle — depth over angle')
  pushGap('BP won', bpWonAvg, bpWonBench, '%', 'On break points, go to your highest-percentage pattern, not your flashiest')
  pushGap('Total pts won', totalPtsAvg, totalPtsBench, '%', 'Win the +1 shot after serve and return — first-strike tennis')
  // Rank by relative gap (gap as % of distance between current & next band)
  const topGaps = gaps
    .map(g => ({ ...g, rel: g.gap / Math.max(1, Math.abs(g.target - g.you)) }))
    .sort((a, b) => b.gap - a.gap)
    .slice(0, 2)

  // Top 3 correlation patterns
  const topPatterns = signals.correlations.slice(0, 3)
  const opponents = Object.values(signals.opponentProfiles).sort((a, b) => b.matchCount - a.matchCount)

  return (
    <div>

      {/* ── 1. SCORE — record + UTR ──────────────────────────────────────── */}
      <div style={{ textAlign: 'center', padding: '16px 0 24px' }}>
        <div style={{ fontFamily: FX, fontSize: 56, letterSpacing: '2px', color: winRateColor, lineHeight: 1 }}>
          {winRate != null ? `${winRate}%` : '—'}
        </div>
        <div style={{ fontSize: 12, fontFamily: FD, color: MUTED, marginTop: 8 }}>
          {matches.length} matches · <span style={{ color: G }}>{wins}W</span> <span style={{ color: R }}>{losses}L</span>
        </div>
        <div style={{ marginTop: 12, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          {editingUtr ? (
            <>
              <input
                type="number" step={0.1} min={0} max={16}
                value={utrInput}
                onChange={e => setUtrInput(e.target.value)}
                autoFocus
                style={{ width: 64, background: BG3, color: WHITE, border: `1px solid ${BORDER2}`, borderRadius: 6, padding: '4px 8px', fontFamily: FD, fontSize: 13, textAlign: 'center' }}
              />
              <button onClick={saveUtr} style={{ background: GOLD, color: '#000', border: 'none', borderRadius: 6, padding: '4px 10px', fontSize: 11, fontFamily: FB, fontWeight: 600, cursor: 'pointer' }}>Save</button>
            </>
          ) : (
            <span onClick={() => { setUtrInput(utr.value?.toString() ?? ''); setEditingUtr(true) }}
              style={{ cursor: 'pointer', fontSize: 11, fontFamily: FD, color: GOLD, padding: '4px 12px', border: `1px solid rgba(196,169,106,0.25)`, borderRadius: 20 }}>
              UTR {utr.value ?? '—'}{utr.updatedAt && <span style={{ color: DIM, marginLeft: 6 }}> · {utr.updatedAt}</span>}
            </span>
          )}
        </div>
      </div>

      {/* ── 2. DIAGNOSIS — who you are ───────────────────────────────────── */}
      {profile ? (
        <div style={{
          background: '#121814', border: `1px solid #1a2a1f`,
          borderRadius: 16, padding: '16px 20px', marginBottom: 24,
        }}>
          <SH>Who you are</SH>
          <div style={{ fontFamily: FX, fontSize: 26, color: GOLD, lineHeight: 1, marginBottom: 12 }}>
            {profile.style.label}
          </div>
          <ul style={{ margin: 0, padding: 0, listStyle: 'none', fontSize: 13, color: '#bbb', lineHeight: 1.5 }}>
            {profile.weapon.label !== 'Unknown' && (
              <li style={{ marginBottom: 4 }}>• <span style={{ color: G }}>Weapon:</span> {profile.weapon.label} — {profile.weapon.evidence}</li>
            )}
            {profile.weakness.label !== 'Unknown' && (
              <li style={{ marginBottom: 4 }}>• <span style={{ color: R }}>Work on:</span> {profile.weakness.label}</li>
            )}
            <li style={{ marginBottom: 4 }}>• {profile.clutch.insight}</li>
            <li style={{ marginBottom: 4 }}>• {profile.aggression.insight}</li>
          </ul>
          {topPatterns[0] && (
            <div style={{ borderTop: `1px solid #1a2a1f`, marginTop: 12, paddingTop: 10 }}>
              <span style={{ fontSize: 9, fontFamily: FB, fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: MUTED }}>Biggest lever</span>
              <div style={{ fontSize: 12, color: GOLD, marginTop: 4, lineHeight: 1.4 }}>{topPatterns[0].insight}</div>
            </div>
          )}
        </div>
      ) : (
        <div style={{ background: BG2, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 16, marginBottom: 24 }}>
          <div style={{ fontSize: 13, color: MUTED }}>Log a few more matches to unlock your player profile.</div>
        </div>
      )}

      {/* ── 3. PATH TO NEXT UTR ──────────────────────────────────────────── */}
      {topGaps.length > 0 && nextBandLabel && (
        <div style={{
          background: 'rgba(196,169,106,0.04)', border: `1px solid rgba(196,169,106,0.18)`,
          borderRadius: 16, padding: '16px 20px', marginBottom: 24,
        }}>
          <SH>Path to {nextBandLabel}</SH>
          <div style={{ fontSize: 12, color: '#bbb', lineHeight: 1.5, marginBottom: 12 }}>
            Closest gap to your next level — close these and the rating follows.
          </div>
          {topGaps.map((g, i) => (
            <div key={i} style={{ display: 'flex', gap: 12, padding: '10px 0', borderTop: i > 0 ? `1px solid rgba(196,169,106,0.12)` : 'none' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, color: WHITE, fontWeight: 600 }}>{g.label}</div>
                <div style={{ fontSize: 11, fontFamily: FD, color: MUTED, marginTop: 2 }}>
                  you <span style={{ color: A }}>{g.you}{g.unit}</span> → target <span style={{ color: GOLD }}>{g.target}{g.unit}</span>
                </div>
                <div style={{ fontSize: 11, color: '#888', lineHeight: 1.4, marginTop: 4 }}>{g.drill}</div>
              </div>
            </div>
          ))}
          <div style={{ fontSize: 9, fontFamily: FD, color: DIM, marginTop: 8, paddingTop: 8, borderTop: `1px solid rgba(196,169,106,0.12)` }}>
            Benchmarks · synthetic v1 · band {utrBand}
          </div>
        </div>
      )}

      {/* ── 4. CAREER AVERAGES — cards w/ band markers + sparklines ──────── */}
      {hasAnyStats && (
        <div style={{ marginBottom: 24 }}>
          <div style={{ marginBottom: 12 }}>
            <SH>Career averages</SH>
            <div style={{ fontSize: 10, fontFamily: FD, color: '#555' }}>
              vs UTR-band median ·{' '}
              <span style={{ color: 'rgba(255,255,255,0.55)' }}>{utrBand} = your level</span>
              {' · '}
              <span style={{ color: B }}>{nextBandStr} = next level</span>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {ueAvg != null && (
              <CountCard label="Unforced Errors" val={ueAvg} good={ueBench ? ueAvg <= ueBench.current : ueAvg <= 30} bench={ueBench} series={ueSeries} lower currentBandLabel={utrBand} nextBandLabel={nextBandStr ?? undefined} />
            )}
            {winnersAvg != null && (
              <CountCard label="Winners" val={winnersAvg} good={winnersBench ? winnersAvg >= winnersBench.current : winnersAvg >= 12} bench={winnersBench} series={winnersSeries} currentBandLabel={utrBand} nextBandLabel={nextBandStr ?? undefined} />
            )}
            {s1Avg != null && (
              <BarCard label="1st Serve %" val={s1Avg} valStr={`${s1Avg}%`} gThresh={66} aThresh={55} max={100} bench={s1Bench} series={s1Series} currentBandLabel={utrBand} nextBandLabel={nextBandStr ?? undefined} />
            )}
            {retAvg != null && (
              <BarCard label="Return Pts Won" val={retAvg} valStr={`${retAvg}%`} gThresh={45} aThresh={35} max={100} bench={retBench} series={retSeries} currentBandLabel={utrBand} nextBandLabel={nextBandStr ?? undefined} />
            )}
            {bpWonAvg != null && (
              <BarCard label="BP Won" val={bpWonAvg} valStr={`${bpWonAvg}%`} gThresh={50} aThresh={35} max={100} bench={bpWonBench} series={bpWonSeries} currentBandLabel={utrBand} nextBandLabel={nextBandStr ?? undefined} />
            )}
            {totalPtsAvg != null && (
              <BarCard label="Total Pts Won" val={totalPtsAvg} valStr={`${totalPtsAvg}%`} gThresh={55} aThresh={45} max={100} bench={totalPtsBench} series={totalPtsSeries} currentBandLabel={utrBand} nextBandLabel={nextBandStr ?? undefined} />
            )}
          </div>
        </div>
      )}

      {/* ── 5. COACH'S READ — strokes ─────────────────────────────────────── */}
      {signals.strokes.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <SH>Coach&apos;s read</SH>
          {signals.strokes.filter(s => s.tag === 'hidden_weapon' || s.tag === 'reliable').slice(0, 3).map((s, i) => (
            <div key={`w${i}`} style={{ display: 'flex', gap: 10, padding: '9px 0', borderBottom: `1px solid ${BORDER}`, alignItems: 'flex-start' }}>
              <span style={{ fontSize: 12, color: G, flexShrink: 0, marginTop: 1 }}>✓</span>
              <span style={{ fontSize: 13, color: WHITE, lineHeight: 1.4 }}>{s.insight}</span>
            </div>
          ))}
          {signals.strokes.filter(s => s.tag === 'liability' || s.tag === 'overused').slice(0, 3).map((s, i) => (
            <div key={`d${i}`} style={{ display: 'flex', gap: 10, padding: '9px 0', borderBottom: `1px solid ${BORDER}`, alignItems: 'flex-start' }}>
              <span style={{ fontSize: 12, color: A, flexShrink: 0, marginTop: 1 }}>△</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, color: WHITE, lineHeight: 1.4 }}>{s.insight}</div>
                <div style={{ fontSize: 11, color: GOLD, lineHeight: 1.4, marginTop: 3 }}>
                  Drill: {s.stroke.startsWith('fh') ? 'cross-court rally with target zones; build to' : 'wall reps to groove contact; build to'} {s.stroke.endsWith('cc') ? 'CC consistency before going DTL' : 'change-of-direction off short balls'}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── 6. PATTERNS — top 3 correlation signals ──────────────────────── */}
      {topPatterns.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <SH>Patterns</SH>
          {topPatterns.map((sig, i) => {
            const winning = sig.winRateAbove != null && sig.winRateBelow != null && sig.winRateAbove > sig.winRateBelow
            const dot = winning ? G : R
            return (
              <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 6 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: dot, flexShrink: 0, marginTop: 5 }} />
                <span style={{ fontSize: 12, color: '#bbb', lineHeight: 1.4 }}>{sig.insight}</span>
              </div>
            )
          })}
        </div>
      )}

      {/* ── 7. HOW YOU COMPETE — pressure delta + journal signals ───────── */}
      {(() => {
        const composureAvg = avgN(matches, m => m.journal?.composure)
        const focusAvg = avgN(matches, m => m.journal?.focus)
        const planExec = matches.filter(m => m.journal?.plan_executed).length
        const planYes = matches.filter(m => m.journal?.plan_executed === 'Yes').length
        const planRate = planExec > 0 ? Math.round((planYes / planExec) * 100) : null
        const recoveryWins = matches.filter(m => m.journal?.recovery != null && m.score?.winner === 'JD')
        const recoveryLosses = matches.filter(m => m.journal?.recovery != null && m.score?.winner && m.score.winner !== 'JD')
        const recWinAvg = recoveryWins.length ? Math.round(recoveryWins.reduce((s, m) => s + (m.journal!.recovery as number), 0) / recoveryWins.length) : null
        const recLossAvg = recoveryLosses.length ? Math.round(recoveryLosses.reduce((s, m) => s + (m.journal!.recovery as number), 0) / recoveryLosses.length) : null
        // Pressure delta = BP-won % minus total-pts-won %
        const bpAvg = avgN(matches, m => m.shot_stats?.bp_won_pct)
        const totalAvg = avgN(matches, m => m.shot_stats?.total_pts_won_pct)
        const pressureDelta = bpAvg != null && totalAvg != null ? bpAvg - totalAvg : null
        const hasAny = composureAvg != null || focusAvg != null || planRate != null || recWinAvg != null || pressureDelta != null
        if (!hasAny) return null
        return (
          <div style={{ marginBottom: 24 }}>
            <SH>How you compete</SH>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {pressureDelta != null && (
                <CountCard
                  label="Pressure delta"
                  val={`${pressureDelta > 0 ? '+' : ''}${pressureDelta}` as any}
                  sub="BP vs normal"
                  good={pressureDelta >= 0}
                />
              )}
              {composureAvg != null && (
                <CountCard label="Composure" val={`${composureAvg}/5` as any} sub="self-rated" good={composureAvg >= 4} />
              )}
              {focusAvg != null && (
                <CountCard label="Focus" val={`${focusAvg}/5` as any} sub="self-rated" good={focusAvg >= 4} />
              )}
              {planRate != null && (
                <BarCard label="Plan executed" val={planRate} valStr={`${planRate}%`} gThresh={70} aThresh={45} max={100} />
              )}
              {recWinAvg != null && recLossAvg != null && (
                <CountCard
                  label="Recovery delta"
                  val={`${recWinAvg - recLossAvg > 0 ? '+' : ''}${recWinAvg - recLossAvg}` as any}
                  sub={`win ${recWinAvg} · loss ${recLossAvg}`}
                  good={recWinAvg - recLossAvg > 0}
                />
              )}
            </div>
          </div>
        )
      })()}

      {/* ── 8. OPPONENTS ─────────────────────────────────────────────────── */}
      {opponents.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <SH>Opponents</SH>
          {opponents.slice(0, 8).map(o => {
            const oppMatches = matches.filter(m => m.opponent?.name === o.name)
            const w = oppMatches.filter(m => m.score?.winner === 'JD').length
            const l = oppMatches.length - w
            const positive = w >= l
            return (
              <div key={o.name} style={{ display: 'flex', alignItems: 'center', padding: '10px 0', borderBottom: `1px solid ${BORDER}` }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, color: WHITE, fontWeight: 500 }}>{o.name}</div>
                  <div style={{ fontSize: 10, fontFamily: FD, color: MUTED, marginTop: 2 }}>
                    {o.style.label}{o.weapon.label !== 'Unknown' ? ` · weapon ${o.weapon.label}` : ''}
                  </div>
                </div>
                <span style={{ fontSize: 13, fontFamily: FD, fontWeight: 600, color: positive ? G : R, marginLeft: 12 }}>
                  {w}-{l}
                </span>
              </div>
            )
          })}
        </div>
      )}

      {/* ── 9. SEE ALL STATS ─────────────────────────────────────────────── */}
      {hasAnyStats && (
        <>
          <button onClick={() => setShowStats(v => !v)} style={{ width: '100%', padding: 12, background: 'none', border: `1px solid ${BORDER}`, borderRadius: 12, color: MUTED, fontFamily: FB, fontSize: 11, fontWeight: 600, cursor: 'pointer', marginBottom: showStats ? 16 : 0 }}>
            {showStats ? 'Hide all stats ↑' : 'See all stats ↓'}
          </button>
          {showStats && (
            <div style={{ marginTop: 16 }}>
              <JDStats matches={matches} avgs={avgs} />
            </div>
          )}
        </>
      )}
    </div>
  )
}
