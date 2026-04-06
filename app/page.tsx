'use client'
import { useState, useEffect, useCallback } from 'react'
import { G, R, A, avg, fmtDate, col, getMissingFields, matchState,
         FONT_BODY, FONT_DATA, FONT_DISPLAY, BG, BG2, BG3, BORDER, WHITE, MUTED, DIM, GOLD } from '@/app/lib/helpers'
import { Avgs } from '@/app/types'
import UploadMatch from '@/app/components/UploadMatch'
import MatchDetailScreen from '@/app/components/MatchDetailScreen'
import FixMatchModal from '@/app/components/FixMatchModal'
import MyGame from '@/app/components/MyGame'
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
function MatchCard({ m, onSelect, onFix }: { m: any; onSelect: () => void; onFix: () => void }) {
  const isWin = m.score?.winner === 'JD'
  const state = matchState(m)
  const s = m.shot_stats || {}
  const s1a = m.serve?.first ? Math.round(((m.serve.first.pct_ad || 0) + (m.serve.first.pct_deuce || 0)) / 2) : null
  const accentColor = isWin ? G : (m.score?.winner ? R : DIM)

  // Smart stat line: lead with most relevant stat
  const statLine: { label: string; color: string }[] = []
  if (state === 'complete' || state === 'stats-only') {
    if (s.ue != null) statLine.push({ label: `${s.ue} UE`, color: s.ue < 30 ? G : s.ue < 42 ? A : R })
    if (s1a != null) statLine.push({ label: `${s1a}% srv`, color: col(s1a, 70, 58) })
    if (s.bp_won_pct != null) statLine.push({ label: `${s.bp_won_pct}% BP`, color: col(s.bp_won_pct, 50, 35) })
  }

  const cta = state === 'journal-only' ? 'Upload stats →'
    : state === 'stats-only' ? 'Add journal →'
    : null

  return (
    <div style={{ position: 'relative', marginBottom: 8 }}>
      <div onClick={onSelect} style={{
        background: BG2, border: `1px solid ${BORDER}`, borderRadius: 16,
        borderLeft: `3px solid ${accentColor}`,
        padding: '14px 18px', cursor: 'pointer', transition: 'border-color 0.15s',
      }}>
        {/* Row 1: Opponent + Score */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: accentColor, flexShrink: 0 }} />
            <span style={{ fontSize: 15, fontWeight: 600, color: WHITE }}>
              {m.opponent?.name || 'Unknown'}
            </span>
            {m.opponent?.utr && <span style={{ fontSize: 10, fontFamily: FONT_DATA, color: MUTED }}>UTR {m.opponent.utr}</span>}
          </div>
          <span style={{ fontFamily: FONT_DISPLAY, fontSize: 19, color: accentColor, letterSpacing: '1px' }}>
            {m.score?.sets || '—'}
          </span>
        </div>

        {/* Row 2: Date + W/L */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 3 }}>
          <span style={{ fontSize: 11, fontFamily: FONT_DATA, color: MUTED }}>
            {fmtDate(m.date)}{m.surface ? ` · ${m.surface}` : ''}{m.journal?.match_type ? ` · ${m.journal.match_type}` : ''}
          </span>
          {m.score?.winner && (
            <span style={{ fontSize: 10, fontWeight: 700, color: accentColor, textTransform: 'uppercase' }}>
              {isWin ? 'WIN' : 'LOSS'}
            </span>
          )}
        </div>

        {/* Row 3: Stat line */}
        {statLine.length > 0 && (
          <div style={{ fontSize: 11, fontFamily: FONT_DATA, color: '#999', marginTop: 8 }}>
            {statLine.map((s, i) => (
              <span key={i}>
                {i > 0 && <span style={{ color: '#444' }}> ▪ </span>}
                <span style={{ color: s.color }}>{s.label}</span>
              </span>
            ))}
          </div>
        )}

        {/* Row 4: CTA or Fix */}
        {(cta || getMissingFields(m).length > 0) && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
            {cta && <span style={{ fontSize: 11, color: GOLD, fontWeight: 500 }}>{cta}</span>}
            {!cta && <span />}
            {getMissingFields(m).length > 0 && (
              <button onClick={e => { e.stopPropagation(); onFix() }}
                style={{ fontSize: 10, fontFamily: FONT_DATA, color: DIM, background: 'none', border: 'none', cursor: 'pointer' }}>
                Fix
              </button>
            )}
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
  const [selectedMatch, setSelectedMatch] = useState<string | null>(null)
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
    setSelectedMatch(m.id)
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

            {/* Match list */}
            <div>
              {[...sorted].reverse().map(m => (
                <MatchCard
                  key={m.id}
                  m={m}
                  onSelect={() => setSelectedMatch(m.id)}
                  onFix={() => setFixingMatch(m)}
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
            <div style={{ fontSize: 12, color: MUTED, fontFamily: FONT_DATA, marginBottom: 20 }}>{matches.length} matches tracked</div>
            <MyGame matches={matches} avgs={avgs} />
          </div>
        )}

        {/* ── ADD ── */}
        {tab === 'add' && <UploadMatch onMatchAdded={addMatch} matches={matches} />}
      </div>

      {/* Match Detail Screen (full-screen overlay) */}
      {selectedMatch && (() => {
        const m = matches.find(x => x.id === selectedMatch)
        if (!m) return null
        return (
          <MatchDetailScreen
            match={m}
            avgs={avgs}
            allMatches={matches}
            onBack={() => setSelectedMatch(null)}
            onFix={() => { setSelectedMatch(null); setFixingMatch(m) }}
            onDelete={() => { deleteMatch(m.id); setSelectedMatch(null) }}
          />
        )
      })()}

      {fixingMatch && (
        <FixMatchModal match={fixingMatch} onPatched={patchMatch} onClose={() => setFixingMatch(null)} />
      )}
    </div>
  )
}
