'use client'
import { useState, useEffect, useCallback } from 'react'
import { G, R, A, GD, RD, avg, fmtDate, col, getMissingFields, ErrorBoundary, matchState,
         FONT_BODY, FONT_DATA, FONT_DISPLAY, BG, BG2, BG3, BORDER, BORDER2, WHITE, MUTED, DIM, GOLD, GOLD_DIM } from '@/app/lib/helpers'
import { Avgs } from '@/app/types'
import Debrief from '@/app/components/Debrief'
import UploadMatch from '@/app/components/UploadMatch'
import FixMatchModal from '@/app/components/FixMatchModal'
import JDStats from '@/app/components/JDStats'
import NextMatchStrategy from '@/app/components/Strategy'

// ─── SPARKLINE (Evolution) ────────────────────────────────────────────────────
function MiniChart({ data, color }: any) {
  const valid = data.filter((v: any) => v != null)
  if (valid.length < 2) return <div style={{ height: 55, display: 'flex', alignItems: 'center', justifyContent: 'center', color: BG3, fontSize: 11, fontFamily: FONT_DATA }}>Need more data</div>
  const min = Math.min(...valid), max = Math.max(...valid)
  const range = max - min || 1
  const H = 55, W = 100
  const pts = data.map((v: any, i: number) => ({ x: (i / (data.length - 1)) * W, y: v != null ? H - ((v - min) / range) * (H - 10) - 5 : null }))
  const pathD = pts.filter((p: any) => p.y != null).map((p: any, i: number) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: H }} preserveAspectRatio="none">
      <path d={pathD} fill="none" stroke={color} strokeWidth="2" />
      {pts.filter((p: any) => p.y != null).map((p: any, i: number) => <circle key={i} cx={p.x} cy={p.y} r="2.5" fill={color} />)}
    </svg>
  )
}

// ─── MATCH CARD ───────────────────────────────────────────────────────────────
function MatchCard({ m, expanded, onToggle, onFix, onDelete, avgs, allMatches }: any) {
  const isWin = m.score?.winner === 'JD'
  const state = matchState(m)
  const s = m.shot_stats || {}
  const s1a = m.serve?.first ? Math.round(((m.serve.first.pct_ad || 0) + (m.serve.first.pct_deuce || 0)) / 2) : null

  const pills = state === 'complete' || state === 'stats-only' ? [
    s.ue != null && { label: `${s.ue} UE`, color: s.ue < 30 ? G : s.ue < 42 ? A : R, bg: s.ue < 30 ? GD : s.ue < 42 ? 'rgba(251,191,36,0.08)' : 'rgba(248,113,113,0.08)' },
    s1a != null && { label: `${s1a}% serve`, color: col(s1a, 70, 58), bg: s1a >= 70 ? GD : s1a >= 58 ? 'rgba(251,191,36,0.08)' : 'rgba(248,113,113,0.08)' },
    s.bp_won_pct != null && { label: `${s.bp_won_pct}% BP`, color: col(s.bp_won_pct, 50, 35), bg: s.bp_won_pct >= 50 ? GD : s.bp_won_pct >= 35 ? 'rgba(251,191,36,0.08)' : 'rgba(248,113,113,0.08)' },
  ].filter(Boolean) : []

  const partialPill = state === 'journal-only'
    ? { label: 'Journal only · Add stats →', color: MUTED, bg: BG3, border: BORDER }
    : state === 'stats-only'
    ? { label: 'Stats only · Add journal →', color: A, bg: 'rgba(251,191,36,0.06)', border: 'rgba(251,191,36,0.2)' }
    : null

  return (
    <div style={{ position: 'relative', marginBottom: 10 }}>
      {/* State dot */}
      <div style={{ position: 'absolute', left: -20, top: 22, width: 10, height: 10, borderRadius: '50%', border: `2px solid ${isWin ? G : R}`, background: state === 'complete' ? (isWin ? GD : RD) : 'transparent' }} />

      <div onClick={onToggle} style={{ background: BG2, border: `1px solid ${expanded ? GOLD_DIM : BORDER}`, borderRadius: 16, padding: 20, cursor: 'pointer', transition: 'border-color 0.15s' }}>
        {/* Top row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: pills.length || partialPill ? 14 : 0 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 600, fontFamily: FONT_BODY, color: WHITE, marginBottom: 4 }}>
              vs {m.opponent?.name}
            </div>
            <div style={{ fontSize: 11, color: MUTED, fontFamily: FONT_DATA }}>
              {fmtDate(m.date)}{m.surface ? ` · ${m.surface}` : ''}{m.opponent?.utr ? ` · UTR ${m.opponent.utr}` : ''}
            </div>
          </div>
          <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column' as const, alignItems: 'flex-end', gap: 6 }}>
            <div style={{ fontFamily: FONT_DISPLAY, fontSize: 22, letterSpacing: '1px', color: isWin ? G : (m.score?.winner ? R : MUTED), lineHeight: 1 }}>
              {m.score?.sets || '—'}
            </div>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              {m.score?.winner && (
                <span style={{ fontSize: 10, fontFamily: FONT_DATA, fontWeight: 500, color: isWin ? G : R }}>
                  {isWin ? 'Win' : 'Loss'}
                </span>
              )}
              {getMissingFields(m).length > 0 && (
                <button onClick={e => { e.stopPropagation(); onFix() }}
                  style={{ fontSize: 10, fontFamily: FONT_DATA, color: A, background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.2)', borderRadius: 4, padding: '2px 7px', cursor: 'pointer' }}>
                  Fix
                </button>
              )}
              <button onClick={e => { e.stopPropagation(); onDelete() }}
                style={{ background: 'none', border: 'none', color: DIM, cursor: 'pointer', fontSize: 16, lineHeight: 1, padding: '2px 4px', borderRadius: 4 }}
                onMouseEnter={e => (e.target as any).style.color = R}
                onMouseLeave={e => (e.target as any).style.color = DIM}>×</button>
            </div>
          </div>
        </div>

        {/* Pills */}
        {(pills.length > 0 || partialPill) && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' as const }}>
            {(pills as any[]).map((p: any, i: number) => (
              <span key={i} style={{ fontSize: 10, fontFamily: FONT_DATA, fontWeight: 500, padding: '4px 10px', borderRadius: 20, background: p.bg, color: p.color }}>
                {p.label}
              </span>
            ))}
            {partialPill && (
              <span style={{ fontSize: 10, fontFamily: FONT_DATA, padding: '4px 10px', borderRadius: 20, background: partialPill.bg, color: partialPill.color, border: `1px solid ${partialPill.border}` }}>
                {partialPill.label}
              </span>
            )}
          </div>
        )}

        {/* Debrief (expanded) */}
        {expanded && (
          <div style={{ borderTop: `1px solid ${BORDER}`, paddingTop: 24, marginTop: 20 }}>
            <ErrorBoundary>
              <Debrief m={m} avgs={avgs} allMatches={allMatches} />
            </ErrorBoundary>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function Home() {
  const [tab, setTab] = useState('matches')
  const [matches, setMatches] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [fixingMatch, setFixingMatch] = useState<any>(null)

  useEffect(() => {
    fetch('/api/matches')
      .then(r => r.json())
      .then(d => { setMatches(d.matches || []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const addMatch = useCallback((m: any) => {
    setMatches(prev => {
      const filtered = prev.filter(x => x.id !== m.id)
      return [...filtered, m].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    })
    setTab('matches')
    setExpanded(m.id)
  }, [])

  const deleteMatch = useCallback(async (id: string) => {
    if (!confirm('Delete this match?')) return
    await fetch('/api/matches', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    setMatches(prev => prev.filter(m => m.id !== id))
  }, [])

  const patchMatch = useCallback((m: any) => {
    setMatches(prev => {
      const filtered = prev.filter(x => x.id !== m.id)
      return [...filtered, m].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    })
    setFixingMatch(null)
  }, [])

  const sorted = [...matches].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  const wins = matches.filter(m => m.score?.winner === 'JD').length
  const losses = matches.filter(m => m.score?.winner && m.score.winner !== 'JD').length

  const avgs: Avgs = {
    s1_ad: avg(matches.map(m => m.serve?.first?.pct_ad)),
    s1_deuce: avg(matches.map(m => m.serve?.first?.pct_deuce)),
    s2_ad: avg(matches.map(m => m.serve?.second?.pct_ad)),
    s2_deuce: avg(matches.map(m => m.serve?.second?.pct_deuce)),
    spd_s1_ad: avg(matches.map(m => m.serve?.first?.spd_ad)),
    spd_s1_deuce: avg(matches.map(m => m.serve?.first?.spd_deuce)),
    spd_s2_ad: avg(matches.map(m => m.serve?.second?.spd_ad)),
    spd_s2_deuce: avg(matches.map(m => m.serve?.second?.spd_deuce)),
    ret1_ad: avg(matches.map(m => m.return?.first?.pct_ad)),
    ret1_deuce: avg(matches.map(m => m.return?.first?.pct_deuce)),
    ret2_ad: avg(matches.map(m => m.return?.second?.pct_ad)),
    ret2_deuce: avg(matches.map(m => m.return?.second?.pct_deuce)),
    spd_ret1: avg(matches.map(m => m.return?.first?.spd ?? m.return?.first?.spd_ad)),
    spd_ret2: avg(matches.map(m => m.return?.second?.spd ?? m.return?.second?.spd_ad)),
    fh_cc: avg(matches.map(m => m.forehand?.cc_in)),
    fh_dtl: avg(matches.map(m => m.forehand?.dtl_in)),
    bh_cc: avg(matches.map(m => m.backhand?.cc_in)),
    bh_dtl: avg(matches.map(m => m.backhand?.dtl_in)),
    spd_fh_cc: avg(matches.map(m => m.forehand?.spd_cc)),
    spd_fh_dtl: avg(matches.map(m => m.forehand?.spd_dtl)),
    spd_bh_cc: avg(matches.map(m => m.backhand?.spd_cc)),
    spd_bh_dtl: avg(matches.map(m => m.backhand?.spd_dtl)),
  }

  const NAV = [
    { id: 'matches', l: 'Matches' },
    { id: 'next', l: 'Next Match' },
    { id: 'mygame', l: 'My Game' },
    { id: 'add', l: '+ Add' },
  ]

  if (loading) return (
    <div style={{ background: BG, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: DIM, fontFamily: FONT_DATA, fontSize: 13 }}>
      Loading matches...
    </div>
  )

  return (
    <div style={{ background: BG, minHeight: '100vh', fontFamily: FONT_BODY }}>

      {/* ── NAV ── */}
      <div style={{ background: BG, borderBottom: `1px solid ${BORDER}`, position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ maxWidth: 900, margin: '0 auto', padding: '0 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 16, paddingBottom: 12 }}>
            <div style={{ fontFamily: FONT_DISPLAY, fontSize: 22, letterSpacing: '3px', color: GOLD }}>AGASSI</div>
            <div style={{ display: 'flex', gap: 6 }}>
              <span style={{ fontFamily: FONT_DATA, fontSize: 10, fontWeight: 500, padding: '3px 10px', borderRadius: 20, background: 'rgba(74,222,128,0.08)', color: G }}>{wins}W</span>
              <span style={{ fontFamily: FONT_DATA, fontSize: 10, fontWeight: 500, padding: '3px 10px', borderRadius: 20, background: 'rgba(248,113,113,0.08)', color: R }}>{losses}L</span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 0, marginLeft: -4, overflowX: 'auto', scrollbarWidth: 'none' as const }}>
            {NAV.map(n => (
              <button key={n.id} onClick={() => setTab(n.id)}
                style={{
                  padding: '10px 14px', border: 'none', background: 'none',
                  color: tab === n.id ? WHITE : (n.id === 'add' ? GOLD : DIM),
                  fontSize: 11, fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase' as const,
                  cursor: 'pointer', borderBottom: `2px solid ${tab === n.id ? GOLD : 'transparent'}`,
                  whiteSpace: 'nowrap' as const, fontFamily: FONT_BODY, transition: 'all 0.15s', flexShrink: 0,
                }}>
                {n.l}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '28px 20px 80px' }}>

        {/* ── MATCHES ── */}
        {tab === 'matches' && (
          <div>
            <div style={{ fontFamily: FONT_DISPLAY, fontSize: 36, letterSpacing: '2px', color: WHITE, marginBottom: 4 }}>Matches</div>
            <div style={{ fontSize: 12, color: MUTED, fontFamily: FONT_DATA, marginBottom: 28 }}>
              {matches.length} matches{sorted[0] ? ` · ${fmtDate(sorted[0].date)} → ${fmtDate(sorted[sorted.length - 1].date)}` : ''}
            </div>

            {/* Summary row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 28 }}>
              {[
                { v: matches.length, l: 'Matches', c: '#60a5fa' },
                { v: wins, l: 'Wins', c: G },
                { v: matches.length ? Math.round(wins / matches.length * 100) + '%' : '—', l: 'Win Rate', c: A },
              ].map(({ v, l, c }, i) => (
                <div key={i} style={{ background: BG2, border: `1px solid ${BORDER}`, borderRadius: 16, padding: 16, textAlign: 'center' }}>
                  <div style={{ fontFamily: FONT_DISPLAY, fontSize: 28, color: c }}>{v}</div>
                  <div style={{ fontSize: 10, color: MUTED, textTransform: 'uppercase' as const, letterSpacing: '1.5px', fontFamily: FONT_BODY, fontWeight: 700, marginTop: 4 }}>{l}</div>
                </div>
              ))}
            </div>

            {matches.length === 0 && (
              <div style={{ color: DIM, fontFamily: FONT_DATA, textAlign: 'center', padding: 60 }}>No matches yet. Tap + Add to log your first match.</div>
            )}

            {/* Timeline */}
            <div style={{ position: 'relative', paddingLeft: 20 }}>
              <div style={{ position: 'absolute', left: 6, top: 0, bottom: 0, width: 1, background: BORDER }} />
              {[...sorted].reverse().map(m => (
                <MatchCard
                  key={m.id}
                  m={m}
                  expanded={expanded === m.id}
                  onToggle={() => setExpanded(expanded === m.id ? null : m.id)}
                  onFix={() => setFixingMatch(m)}
                  onDelete={() => deleteMatch(m.id)}
                  avgs={avgs}
                  allMatches={matches}
                />
              ))}
            </div>
          </div>
        )}

        {/* ── NEXT MATCH ── */}
        {tab === 'next' && <NextMatchStrategy matches={matches} avgs={avgs} />}

        {/* ── MY GAME ── */}
        {tab === 'mygame' && (
          <div>
            <div style={{ fontFamily: FONT_DISPLAY, fontSize: 36, letterSpacing: '2px', color: WHITE, marginBottom: 4 }}>My Game</div>
            <div style={{ fontSize: 12, color: MUTED, fontFamily: FONT_DATA, marginBottom: 28 }}>{matches.length} matches tracked</div>

            {/* JD Stats component */}
            <JDStats matches={matches} avgs={avgs} />

            {/* Evolution sparklines */}
            {matches.length >= 2 && (
              <div style={{ marginTop: 32 }}>
                <div style={{ fontSize: 10, fontFamily: FONT_BODY, fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase' as const, color: MUTED, marginBottom: 20 }}>Trends</div>
                {[
                  { title: 'Unforced Errors', data: sorted.map(m => m.shot_stats?.ue), color: R, note: 'Lower is better' },
                  { title: 'Forehand CC %', data: sorted.map(m => m.forehand?.cc_in), color: '#60a5fa', note: 'Target 80%+' },
                  { title: '1st Serve Ad %', data: sorted.map(m => m.serve?.first?.pct_ad), color: A, note: 'Target 70%+' },
                  { title: 'Return Depth Ad', data: sorted.map(m => m.return?.first?.deep_ad), color: '#c084fc', note: 'Target 55%+' },
                  { title: 'Winners', data: sorted.map(m => m.shot_stats?.winners), color: G, note: 'Higher is better' },
                  { title: 'BH CC Depth %', data: sorted.map(m => m.backhand?.depth_cc), color: '#fb7185', note: 'Target 55%+' },
                ].map(({ title, data, color, note }) => (
                  <div key={title} style={{ background: BG2, border: `1px solid ${BORDER}`, borderRadius: 16, padding: 20, marginBottom: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                      <div style={{ fontSize: 12, fontFamily: FONT_BODY, fontWeight: 600, color: WHITE }}>{title}</div>
                      <div style={{ fontSize: 10, color: DIM, fontFamily: FONT_DATA }}>{note}</div>
                    </div>
                    <MiniChart data={data} color={color} />
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
                      {sorted.map((m, i) => (
                        <div key={i} style={{ fontSize: 8, color: DIM, fontFamily: FONT_DATA, textAlign: 'center', flex: 1 }}>
                          {new Date(m.date + 'T12:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── ADD ── */}
        {tab === 'add' && <UploadMatch onMatchAdded={addMatch} matches={matches} />}
      </div>

      {fixingMatch && (
        <FixMatchModal match={fixingMatch} onPatched={patchMatch} onClose={() => setFixingMatch(null)} />
      )}
    </div>
  )
}
