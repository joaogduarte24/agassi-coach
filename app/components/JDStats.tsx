'use client'
import { useState, useMemo } from 'react'
import { G, A, R, avg, col, computeAvgs } from '@/app/lib/helpers'
import { Avgs } from '@/app/types'
import { ATP_PLAYERS, ATPPlayer } from '@/lib/atp-players'
import RadarChart from './RadarChart'
import { computeSignals } from '@/app/lib/signals/compute'
import type { Signal, StrokeSignal, PlayerProfile } from '@/app/lib/signals/types'

// ─── SPARKLINE ───────────────────────────────────────────────────────────────
function Sparkline({ data }: { data: (number | null)[] }) {
  const vals = data.filter((v): v is number => v != null)
  if (vals.length < 3) return null
  const W = 44, H = 14
  const min = Math.min(...vals), max = Math.max(...vals)
  const rng = max - min || 1
  const pts = vals
    .map((v, i) => `${((i / (vals.length - 1)) * W).toFixed(1)},${(H - ((v - min) / rng) * (H - 3) - 1).toFixed(1)}`)
    .join(' ')
  const up = vals[vals.length - 1] >= vals[0]
  const lp = pts.split(' ').pop()!.split(',')
  return (
    <svg width={W} height={H} style={{ display: 'block', flexShrink: 0, opacity: 0.75 }}>
      <polyline points={pts} fill="none" stroke={up ? G : R} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={lp[0]} cy={lp[1]} r="2" fill={up ? G : R} />
    </svg>
  )
}

// ─── COMPARE BAR ─────────────────────────────────────────────────────────────
function CompareBar({ label, jd, atp, gThresh, aThresh, suffix = '%', maxVal, sparkData }: {
  label: string; jd: number | null; atp?: number | null
  gThresh: number; aThresh: number; suffix?: string; maxVal?: number
  sparkData?: (number | null)[]
}) {
  if (jd == null) return null
  const scale = suffix === 'km/h' ? (maxVal || 220) : 100
  const color = col(jd, gThresh, aThresh)
  const jdPct = Math.min((jd / scale) * 100, 100)
  const atpPct = atp != null ? Math.min((atp / scale) * 100, 100) : null
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 11, color: '#666' }}>{label}</span>
          {sparkData && <Sparkline data={sparkData} />}
        </div>
        <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 13, fontWeight: 500, color }}>{jd}{suffix}</span>
      </div>
      <div style={{ height: 7, background: '#1e1e1e', borderRadius: 4, position: 'relative', overflow: 'visible' }}>
        <div style={{ height: '100%', width: `${jdPct}%`, background: color, borderRadius: 4, transition: 'width 0.3s' }} />
        {atpPct != null && (
          <div style={{ position: 'absolute', top: -5, left: `${atpPct}%`, width: 2, height: 17, background: '#fff', borderRadius: 1, zIndex: 2, transform: 'translateX(-50%)' }}>
            <span style={{ position: 'absolute', top: 19, left: '50%', transform: 'translateX(-50%)', fontSize: 9, color: '#888', whiteSpace: 'nowrap', fontFamily: 'monospace' }}>
              {atp}{suffix}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── SEGMENTED BAR ───────────────────────────────────────────────────────────
function SegBar({ segments }: { segments: { label: string; val: number | null; color: string }[] }) {
  const filtered = segments.filter(s => (s.val ?? 0) > 0)
  if (!filtered.length) return <div style={{ fontSize: 11, color: '#333', fontFamily: 'monospace' }}>No data yet</div>
  const total = filtered.reduce((s, sg) => s + sg.val!, 0)
  return (
    <div>
      <div style={{ display: 'flex', height: 10, borderRadius: 5, overflow: 'hidden', gap: 1, marginBottom: 8 }}>
        {filtered.map((s, i) => (
          <div key={i} style={{ flex: s.val! / total, background: s.color, transition: 'flex 0.3s', minWidth: 2 }} />
        ))}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: '4px 14px' }}>
        {filtered.map((s, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, color: '#666', fontFamily: 'monospace' }}>
            <div style={{ width: 8, height: 8, borderRadius: 2, background: s.color, flexShrink: 0 }} />
            {s.label} {Math.round((s.val! / total) * 100)}%
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── MAIN COMPONENT ──────────────────────────────────────────────────────────
interface JDStatsProps { matches: any[]; avgs: Avgs }

export default function JDStats({ matches }: JDStatsProps) {
  const [selectedPlayer, setSelectedPlayer] = useState<ATPPlayer | null>(null)
  const [filter, setFilter] = useState<'all' | 'wins' | 'losses'>('all')
  const atp = selectedPlayer

  const filteredMatches = filter === 'all' ? matches
    : filter === 'wins' ? matches.filter(m => m.score?.winner === 'JD')
    : matches.filter(m => m.score?.winner !== 'JD')

  const avgs = computeAvgs(filteredMatches)

  // Intelligence signals (memoized — recomputes only when matches change)
  const signals = useMemo(() => computeSignals(matches), [matches])

  // Chronological order for sparklines (last 8)
  const chrono = [...matches]
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(-8)
  const spark = (fn: (m: any) => number | null | undefined): (number | null)[] =>
    chrono.map(m => { const v = fn(m); return v != null ? Number(v) : null })

  const norm = (v: number | null, min: number, max: number) =>
    v == null ? 0 : Math.min(100, Math.max(0, Math.round(((v - min) / (max - min)) * 100)))

  const radarAxes = [
    { label: '1ST SRV', jd: norm(avgs.s1_ad, 40, 80),       atp: norm(atp?.serve.first.pct_ad ?? null, 40, 80) },
    { label: 'SRV SPD', jd: norm(avgs.spd_s1_ad, 70, 220),   atp: norm(atp?.serve.first.spd_ad ?? null, 70, 220) },
    { label: '2ND SRV', jd: norm(avgs.s2_ad, 60, 95),        atp: norm(atp?.serve.second.pct_ad ?? null, 60, 95) },
    { label: 'RETURN',  jd: norm(avgs.ret1_ad, 60, 95),      atp: norm(atp?.return.first.pct_ad ?? null, 60, 95) },
    { label: 'FH CC',   jd: norm(avgs.fh_cc, 50, 95),        atp: norm(atp?.forehand.cc_in ?? null, 50, 95) },
    { label: 'BH CC',   jd: norm(avgs.bh_cc, 50, 95),        atp: norm(atp?.backhand.cc_in ?? null, 50, 95) },
    { label: 'BP GAME', jd: norm(avg(filteredMatches.map(m => m.shot_stats?.bp_saved_pct)), 30, 85), atp: norm(atp?.shot_stats.bp_saved_pct ?? null, 30, 85) },
    { label: 'WINNERS', jd: norm(avg(filteredMatches.map(m => m.shot_stats?.winners)), 5, 50),      atp: norm(atp?.shot_stats.winners ?? null, 5, 50) },
  ]

  const compRows = [
    { label: '1st Serve %',     jd: avgs.s1_ad,    atp: atp?.serve.first.pct_ad ?? null,    unit: '%',    higherBetter: true,  gT: 75, aT: 60 },
    { label: '1st Srv Speed',   jd: avgs.spd_s1_ad, atp: atp?.serve.first.spd_ad ?? null,   unit: 'km/h', higherBetter: true,  gT: 185, aT: 160 },
    { label: '2nd Serve %',     jd: avgs.s2_ad,    atp: atp?.serve.second.pct_ad ?? null,   unit: '%',    higherBetter: true,  gT: 80, aT: 65 },
    { label: '2nd Srv Speed',   jd: avgs.spd_s2_ad, atp: atp?.serve.second.spd_ad ?? null,  unit: 'km/h', higherBetter: true,  gT: 148, aT: 130 },
    { label: '1st Return %',    jd: avgs.ret1_ad,  atp: atp?.return.first.pct_ad ?? null,   unit: '%',    higherBetter: true,  gT: 80, aT: 65 },
    { label: '2nd Return %',    jd: avgs.ret2_ad,  atp: atp?.return.second.pct_ad ?? null,  unit: '%',    higherBetter: true,  gT: 80, aT: 65 },
    { label: 'FH CC In %',      jd: avgs.fh_cc,    atp: atp?.forehand.cc_in ?? null,        unit: '%',    higherBetter: true,  gT: 80, aT: 65 },
    { label: 'FH DTL In %',     jd: avgs.fh_dtl,   atp: atp?.forehand.dtl_in ?? null,       unit: '%',    higherBetter: true,  gT: 80, aT: 65 },
    { label: 'BH CC In %',      jd: avgs.bh_cc,    atp: atp?.backhand.cc_in ?? null,        unit: '%',    higherBetter: true,  gT: 80, aT: 65 },
    { label: 'BH DTL In %',     jd: avgs.bh_dtl,   atp: atp?.backhand.dtl_in ?? null,       unit: '%',    higherBetter: true,  gT: 80, aT: 65 },
    { label: 'Winners / match', jd: avg(filteredMatches.map(m => m.shot_stats?.winners)), atp: atp?.shot_stats.winners ?? null, unit: '', higherBetter: true, gT: 30, aT: 20 },
    { label: 'Unforced Errors', jd: avg(filteredMatches.map(m => m.shot_stats?.ue)),      atp: atp?.shot_stats.ue ?? null,      unit: '', higherBetter: false, gT: 30, aT: 42 },
    { label: 'Double Faults',   jd: avg(filteredMatches.map(m => m.shot_stats?.df)),      atp: atp?.shot_stats.df ?? null,      unit: '', higherBetter: false, gT: 3,  aT: 6 },
    { label: 'BP Saved %',      jd: avg(filteredMatches.map(m => m.shot_stats?.bp_saved_pct)), atp: atp?.shot_stats.bp_saved_pct ?? null, unit: '%', higherBetter: true,  gT: 70, aT: 50 },
    { label: 'BP Won %',        jd: avg(filteredMatches.map(m => m.shot_stats?.bp_won_pct)),   atp: atp?.shot_stats.bp_won_pct ?? null,   unit: '%', higherBetter: true,  gT: 50, aT: 35 },
  ]

  const ahead = atp ? compRows.filter(r => r.jd != null && r.atp != null && (r.higherBetter ? r.jd >= r.atp : r.jd <= r.atp)) : []
  const behind = atp ? compRows.filter(r => r.jd != null && r.atp != null && (r.higherBetter ? r.jd < r.atp : r.jd > r.atp)) : []

  // Shot mix averages
  const shotMix = {
    fh:  avg(filteredMatches.map(m => m.shot_stats?.fh_pct)),
    bh:  avg(filteredMatches.map(m => m.shot_stats?.bh_pct)),
    vol: avg(filteredMatches.map(m => m.shot_stats?.volley_pct)),
    flat:     avg(filteredMatches.map(m => m.shot_stats?.flat_pct)),
    topspin:  avg(filteredMatches.map(m => m.shot_stats?.topspin_pct)),
    slice:    avg(filteredMatches.map(m => m.shot_stats?.slice_pct)),
  }

  // Winner & error source
  const fhWinners = avg(filteredMatches.map(m => m.shot_stats?.fh_winners))
  const bhWinners = avg(filteredMatches.map(m => m.shot_stats?.bh_winners))
  const fhUE = avg(filteredMatches.map(m => m.shot_stats?.fh_ue))
  const bhUE = avg(filteredMatches.map(m => m.shot_stats?.bh_ue))
  const hasShotSplit = fhWinners != null || bhWinners != null || fhUE != null || bhUE != null

  const SectionTitle = ({ title }: { title: string }) => (
    <div style={{ fontSize: 10, letterSpacing: 2, color: '#555', textTransform: 'uppercase', fontFamily: 'monospace', marginBottom: 14, marginTop: 24, borderBottom: '1px solid #1a1a1a', paddingBottom: 8 }}>{title}</div>
  )

  const Card = ({ title, children }: any) => (
    <div style={{ background: '#141414', border: '1px solid #1a1a1a', borderRadius: 12, padding: 16, marginBottom: 12 }}>
      <div style={{ fontSize: 10, letterSpacing: 2, color: '#444', textTransform: 'uppercase', fontFamily: 'monospace', marginBottom: 14 }}>{title}</div>
      {children}
    </div>
  )

  const filterBtn = (label: string, value: typeof filter) => {
    const wins = matches.filter(m => m.score?.winner === 'JD').length
    const losses = matches.length - wins
    const count = value === 'all' ? matches.length : value === 'wins' ? wins : losses
    const active = filter === value
    const color = value === 'wins' ? G : value === 'losses' ? R : '#e8d5b0'
    return (
      <button
        onClick={() => setFilter(value)}
        style={{
          padding: '5px 11px', borderRadius: 6, fontSize: 10, fontFamily: 'monospace', letterSpacing: 0.5,
          cursor: 'pointer', border: `1px solid ${active ? color : '#252525'}`,
          background: active ? `${color}18` : '#161616', color: active ? color : '#444',
        }}
      >
        {label} <span style={{ opacity: 0.5 }}>{count}</span>
      </button>
    )
  }

  if (matches.length === 0) {
    return <div style={{ color: '#333', fontFamily: 'monospace', textAlign: 'center', padding: 60 }}>No matches yet. Upload your first match →</div>
  }

  const noData = filteredMatches.length === 0

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, flexWrap: 'wrap' as const, gap: 12 }}>
        <div>
          <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 30, letterSpacing: 2, color: '#e8d5b0' }}>JD Stats</div>
          <div style={{ fontSize: 11, color: '#444', fontFamily: 'monospace', marginTop: 2 }}>
            {filteredMatches.length} of {matches.length} matches
            {filter !== 'all' && <span style={{ color: filter === 'wins' ? G : R }}> ({filter})</span>}
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' as const, alignItems: 'flex-end', gap: 8 }}>
          {/* Filter pills */}
          <div style={{ display: 'flex', gap: 6 }}>
            {filterBtn('All', 'all')}
            {filterBtn('Wins', 'wins')}
            {filterBtn('Losses', 'losses')}
          </div>
          {/* ATP compare */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ fontSize: 9, color: '#444', fontFamily: 'monospace', letterSpacing: 1 }}>COMPARE VS</div>
            <select
              value={selectedPlayer?.name || ''}
              onChange={e => setSelectedPlayer(ATP_PLAYERS.find(p => p.name === e.target.value) || null)}
              style={{ background: '#161616', border: '1px solid #252525', borderRadius: 8, padding: '7px 12px', color: selectedPlayer ? '#e8d5b0' : '#555', fontSize: 12, outline: 'none', fontFamily: 'inherit', cursor: 'pointer', minWidth: 180 }}
            >
              <option value=''>— Select ATP Player —</option>
              {ATP_PLAYERS.map(p => (
                <option key={p.name} value={p.name}>{p.nationality} #{p.rank} {p.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {noData ? (
        <div style={{ textAlign: 'center', padding: 40, color: '#333', fontFamily: 'monospace', fontSize: 12 }}>
          No {filter} on record yet.
        </div>
      ) : (
        <>
          {/* RADAR + SUMMARY ROW */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 8, alignItems: 'start' }}>
            <div style={{ background: '#141414', border: '1px solid #1a1a1a', borderRadius: 12, padding: 20 }}>
              <div style={{ fontSize: 10, letterSpacing: 2, color: '#444', textTransform: 'uppercase', fontFamily: 'monospace', marginBottom: 14 }}>Player Profile</div>
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <RadarChart
                  jdValues={radarAxes.map(a => a.jd)}
                  atpValues={atp ? radarAxes.map(a => a.atp) : null}
                  labels={radarAxes.map(a => a.label)}
                />
              </div>
              <div style={{ display: 'flex', gap: 16, justifyContent: 'center', marginTop: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10, color: '#555', fontFamily: 'monospace' }}>
                  <div style={{ width: 18, height: 2, background: '#4ade80', borderRadius: 1 }} />
                  <span>JD</span>
                </div>
                {atp && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10, color: '#555', fontFamily: 'monospace' }}>
                    <div style={{ width: 18, height: 2, background: '#fbbf24', borderRadius: 1, borderTop: '2px dashed #fbbf24' }} />
                    <span>{atp.name.split(' ')[1]}</span>
                  </div>
                )}
              </div>
            </div>

            <div style={{ background: '#141414', border: '1px solid #1a1a1a', borderRadius: 12, padding: 20 }}>
              <div style={{ fontSize: 10, letterSpacing: 2, color: '#444', textTransform: 'uppercase', fontFamily: 'monospace', marginBottom: 14 }}>
                {atp ? `JD vs ${atp.name}` : 'Player Summary'}
              </div>

              {!atp ? (
                <div>
                  <div style={{ fontSize: 10, letterSpacing: 1.5, color: G, textTransform: 'uppercase', fontFamily: 'monospace', marginBottom: 8 }}>Strengths</div>
                  {compRows.filter(r => r.jd != null && col(r.jd, r.gT, r.aT) === G).slice(0, 4).map((r, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #1a1a1a' }}>
                      <span style={{ fontSize: 12, color: '#777' }}>{r.label}</span>
                      <span style={{ fontFamily: 'monospace', fontSize: 12, color: G }}>{r.jd}{r.unit}</span>
                    </div>
                  ))}
                  <div style={{ fontSize: 10, letterSpacing: 1.5, color: R, textTransform: 'uppercase', fontFamily: 'monospace', marginTop: 16, marginBottom: 8 }}>Areas to Improve</div>
                  {compRows.filter(r => r.jd != null && col(r.jd, r.gT, r.aT) === R).slice(0, 4).map((r, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #1a1a1a' }}>
                      <span style={{ fontSize: 12, color: '#777' }}>{r.label}</span>
                      <span style={{ fontFamily: 'monospace', fontSize: 12, color: R }}>{r.jd}{r.unit}</span>
                    </div>
                  ))}
                  <div style={{ marginTop: 16, padding: '10px 12px', background: '#0e0e0e', borderRadius: 8, fontSize: 11, color: '#555', fontFamily: 'monospace', lineHeight: 1.6 }}>
                    Select an ATP player above to compare directly.
                  </div>
                </div>
              ) : (
                <div>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                    <div style={{ flex: 1, textAlign: 'center', background: 'rgba(74,222,128,0.08)', borderRadius: 8, padding: '8px 4px', border: '1px solid rgba(74,222,128,0.15)' }}>
                      <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 28, color: G }}>{ahead.length}</div>
                      <div style={{ fontSize: 9, color: '#444', fontFamily: 'monospace', letterSpacing: 1 }}>JD AHEAD</div>
                    </div>
                    <div style={{ flex: 1, textAlign: 'center', background: 'rgba(248,113,113,0.08)', borderRadius: 8, padding: '8px 4px', border: '1px solid rgba(248,113,113,0.15)' }}>
                      <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 28, color: R }}>{behind.length}</div>
                      <div style={{ fontSize: 9, color: '#444', fontFamily: 'monospace', letterSpacing: 1 }}>NEED WORK</div>
                    </div>
                  </div>

                  {(() => {
                    const ranked = compRows
                      .filter(r => r.jd != null && r.atp != null)
                      .map(r => ({ ...r, delta: r.higherBetter ? (r.jd! - r.atp!) : (r.atp! - r.jd!) }))
                      .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
                    const top3pos = ranked.filter(r => r.delta > 0).slice(0, 3)
                    const top4neg = ranked.filter(r => r.delta < 0).slice(0, 4)
                    return (
                      <div>
                        <div style={{ fontSize: 10, letterSpacing: 1.5, color: G, textTransform: 'uppercase', fontFamily: 'monospace', marginBottom: 6 }}>JD Edges</div>
                        {top3pos.length === 0 && <div style={{ fontSize: 11, color: '#333', fontFamily: 'monospace', marginBottom: 10 }}>None yet</div>}
                        {top3pos.map((r, i) => (
                          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 0', borderBottom: '1px solid #1a1a1a' }}>
                            <span style={{ fontSize: 11, color: '#888' }}>{r.label}</span>
                            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                              <span style={{ fontFamily: 'monospace', fontSize: 11, color: G }}>{r.jd}{r.unit}</span>
                              <span style={{ fontFamily: 'monospace', fontSize: 9, color: '#333' }}>vs</span>
                              <span style={{ fontFamily: 'monospace', fontSize: 11, color: '#555' }}>{r.atp}{r.unit}</span>
                              <span style={{ fontFamily: 'monospace', fontSize: 9, color: G, background: 'rgba(74,222,128,0.1)', padding: '1px 5px', borderRadius: 4 }}>+{Math.abs(r.delta).toFixed(0)}</span>
                            </div>
                          </div>
                        ))}
                        <div style={{ fontSize: 10, letterSpacing: 1.5, color: R, textTransform: 'uppercase', fontFamily: 'monospace', marginTop: 14, marginBottom: 6 }}>Biggest Gaps</div>
                        {top4neg.map((r, i) => (
                          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 0', borderBottom: i < top4neg.length - 1 ? '1px solid #1a1a1a' : 'none' }}>
                            <span style={{ fontSize: 11, color: '#888' }}>{r.label}</span>
                            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                              <span style={{ fontFamily: 'monospace', fontSize: 11, color: R }}>{r.jd}{r.unit}</span>
                              <span style={{ fontFamily: 'monospace', fontSize: 9, color: '#333' }}>vs</span>
                              <span style={{ fontFamily: 'monospace', fontSize: 11, color: '#555' }}>{r.atp}{r.unit}</span>
                              <span style={{ fontFamily: 'monospace', fontSize: 9, color: R, background: 'rgba(248,113,113,0.1)', padding: '1px 5px', borderRadius: 4 }}>{Math.abs(r.delta).toFixed(0)}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )
                  })()}
                </div>
              )}
            </div>
          </div>

          {/* Legend bar */}
          {atp && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: 10, color: '#555', padding: '7px 12px', background: '#111', borderRadius: 6, marginBottom: 4, fontFamily: 'monospace' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 20, height: 6, borderRadius: 3, background: '#4ade80' }} />
                <span>JD average</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 2, height: 14, borderRadius: 1, background: '#fff' }} />
                <span>{atp.name} (white marker)</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <svg width={30} height={10}><polyline points="0,8 10,3 20,6 30,2" fill="none" stroke={G} strokeWidth="1.5" /><circle cx="30" cy="2" r="2" fill={G} /></svg>
                <span>trend (last 8)</span>
              </div>
            </div>
          )}

          {/* ── INTELLIGENCE LAYER ── */}

          {/* JD Profile */}
          {signals.jdProfile && (
            <>
              <SectionTitle title="Your Identity" />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 4 }}>
                {[
                  { label: 'Style', value: signals.jdProfile.style.label, sub: signals.jdProfile.style.evidence, conf: signals.jdProfile.style.confidence },
                  { label: 'Weapon', value: signals.jdProfile.weapon.label, sub: signals.jdProfile.weapon.evidence, conf: signals.jdProfile.weapon.confidence },
                  { label: 'Weakness', value: signals.jdProfile.weakness.label, sub: signals.jdProfile.weakness.evidence, conf: signals.jdProfile.weakness.confidence },
                ].map(({ label, value, sub, conf }) => (
                  <div key={label} style={{ background: '#141414', border: '1px solid #1a1a1a', borderRadius: 10, padding: 14, textAlign: 'center' }}>
                    <div style={{ fontSize: 9, color: '#444', fontFamily: 'monospace', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6 }}>{label}</div>
                    <div style={{ fontSize: 15, color: '#e8d5b0', fontWeight: 600, marginBottom: 4 }}>{value}</div>
                    <div style={{ fontSize: 9, color: '#444', fontFamily: 'monospace', lineHeight: 1.4 }}>{sub}</div>
                    <div style={{ fontSize: 8, color: conf === 'strong' ? G : conf === 'moderate' ? A : '#333', fontFamily: 'monospace', marginTop: 4 }}>{conf}</div>
                  </div>
                ))}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
                <div style={{ background: '#141414', border: '1px solid #1a1a1a', borderRadius: 10, padding: '12px 14px' }}>
                  <div style={{ fontSize: 9, color: '#444', fontFamily: 'monospace', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 }}>Clutch</div>
                  <div style={{ fontSize: 12, color: signals.jdProfile.clutch.delta >= 5 ? G : signals.jdProfile.clutch.delta <= -5 ? R : '#888', lineHeight: 1.5 }}>
                    {signals.jdProfile.clutch.insight}
                  </div>
                </div>
                <div style={{ background: '#141414', border: '1px solid #1a1a1a', borderRadius: 10, padding: '12px 14px' }}>
                  <div style={{ fontSize: 9, color: '#444', fontFamily: 'monospace', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 }}>Aggression</div>
                  <div style={{ fontSize: 12, color: signals.jdProfile.aggression.index >= 3 ? G : signals.jdProfile.aggression.index <= -3 ? R : '#888', lineHeight: 1.5 }}>
                    {signals.jdProfile.aggression.insight}
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Win Drivers */}
          {signals.correlations.length > 0 && (
            <>
              <SectionTitle title="Win Drivers" />
              <div style={{ background: '#141414', border: '1px solid #1a1a1a', borderRadius: 12, padding: 16, marginBottom: 12 }}>
                {signals.correlations.slice(0, 5).map((sig, i) => (
                  <div key={sig.key} style={{ display: 'flex', gap: 12, padding: '10px 0', borderBottom: i < Math.min(4, signals.correlations.length - 1) ? '1px solid #1a1a1a' : 'none', alignItems: 'flex-start' }}>
                    <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 24, color: '#1e1e1e', lineHeight: 1, width: 24, textAlign: 'center', flexShrink: 0 }}>{i + 1}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, color: '#ccc', lineHeight: 1.5, marginBottom: 2 }}>{sig.insight}</div>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' as any }}>
                        <span style={{ fontSize: 10, fontFamily: 'monospace', color: '#555' }}>{sig.detail}</span>
                        <span style={{ fontSize: 8, fontFamily: 'monospace', padding: '1px 6px', borderRadius: 4,
                          color: sig.confidence === 'strong' ? G : sig.confidence === 'moderate' ? A : '#444',
                          background: sig.confidence === 'strong' ? 'rgba(74,222,128,0.08)' : sig.confidence === 'moderate' ? 'rgba(251,191,36,0.08)' : '#1a1a1a',
                        }}>{sig.confidence} · {sig.matchesUsed}m</span>
                      </div>
                    </div>
                    <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 22, color: sig.lift > 0 ? G : R, flexShrink: 0 }}>
                      {sig.lift > 0 ? '+' : ''}{sig.lift}%
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Your Strokes */}
          {signals.strokes.length > 0 && (
            <>
              <SectionTitle title="Your Strokes" />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
                {signals.strokes.map(s => (
                  <div key={s.stroke} style={{ background: '#141414', border: '1px solid #1a1a1a', borderRadius: 10, padding: 14 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <span style={{ fontSize: 12, color: '#ccc', fontWeight: 600 }}>{s.label}</span>
                      <span style={{ fontSize: 8, fontFamily: 'monospace', padding: '2px 6px', borderRadius: 4,
                        color: s.tag === 'hidden_weapon' ? G : s.tag === 'reliable' ? '#60a5fa' : s.tag === 'overused' ? A : R,
                        background: s.tag === 'hidden_weapon' ? 'rgba(74,222,128,0.08)' : s.tag === 'reliable' ? 'rgba(96,165,250,0.08)' : s.tag === 'overused' ? 'rgba(251,191,36,0.08)' : 'rgba(248,113,113,0.08)',
                      }}>
                        {s.tag === 'hidden_weapon' ? 'WEAPON' : s.tag === 'reliable' ? 'RELIABLE' : s.tag === 'overused' ? 'OVERUSED' : 'FIX'}
                      </span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6, marginBottom: 8 }}>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontFamily: 'monospace', fontSize: 14, color: '#e8d5b0' }}>{s.pctIn}%</div>
                        <div style={{ fontSize: 8, color: '#333', fontFamily: 'monospace' }}>IN</div>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontFamily: 'monospace', fontSize: 14, color: '#e8d5b0' }}>~{s.usage}%</div>
                        <div style={{ fontSize: 8, color: '#333', fontFamily: 'monospace' }}>USAGE</div>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontFamily: 'monospace', fontSize: 14, color: '#e8d5b0' }}>{s.pace ?? '—'}</div>
                        <div style={{ fontSize: 8, color: '#333', fontFamily: 'monospace' }}>KM/H</div>
                      </div>
                    </div>
                    <div style={{ fontSize: 10, color: '#666', lineHeight: 1.4 }}>{s.insight}</div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Journal Patterns */}
          {signals.journal.length > 0 && (
            <>
              <SectionTitle title="Journal Patterns" />
              <div style={{ background: '#141414', border: '1px solid #1a1a1a', borderRadius: 12, padding: 16, marginBottom: 12 }}>
                {signals.journal.slice(0, 5).map((sig, i) => (
                  <div key={sig.key} style={{ padding: '8px 0', borderBottom: i < Math.min(4, signals.journal.length - 1) ? '1px solid #1a1a1a' : 'none' }}>
                    <div style={{ fontSize: 12, color: '#999', lineHeight: 1.5, marginBottom: 2 }}>{sig.insight}</div>
                    <div style={{ fontSize: 10, fontFamily: 'monospace', color: '#444' }}>{sig.detail}</div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* SERVE */}
          <SectionTitle title="Serve" />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Card title="1st Serve">
              <CompareBar label="Ad %" jd={avgs.s1_ad} atp={atp?.serve.first.pct_ad} gThresh={75} aThresh={60} sparkData={spark(m => m.serve?.first?.pct_ad)} />
              <CompareBar label="Deuce %" jd={avgs.s1_deuce} atp={atp?.serve.first.pct_deuce} gThresh={75} aThresh={60} sparkData={spark(m => m.serve?.first?.pct_deuce)} />
              <CompareBar label="Ad Speed" jd={avgs.spd_s1_ad} atp={atp?.serve.first.spd_ad} gThresh={185} aThresh={160} suffix="km/h" maxVal={230} sparkData={spark(m => m.serve?.first?.spd_ad)} />
              <CompareBar label="Deuce Speed" jd={avgs.spd_s1_deuce} atp={atp?.serve.first.spd_deuce} gThresh={185} aThresh={160} suffix="km/h" maxVal={230} sparkData={spark(m => m.serve?.first?.spd_deuce)} />
            </Card>
            <Card title="2nd Serve">
              <CompareBar label="Ad %" jd={avgs.s2_ad} atp={atp?.serve.second.pct_ad} gThresh={80} aThresh={65} sparkData={spark(m => m.serve?.second?.pct_ad)} />
              <CompareBar label="Deuce %" jd={avgs.s2_deuce} atp={atp?.serve.second.pct_deuce} gThresh={80} aThresh={65} sparkData={spark(m => m.serve?.second?.pct_deuce)} />
              <CompareBar label="Ad Speed" jd={avgs.spd_s2_ad} atp={atp?.serve.second.spd_ad} gThresh={148} aThresh={130} suffix="km/h" maxVal={180} sparkData={spark(m => m.serve?.second?.spd_ad)} />
              <CompareBar label="Deuce Speed" jd={avgs.spd_s2_deuce} atp={atp?.serve.second.spd_deuce} gThresh={148} aThresh={130} suffix="km/h" maxVal={180} sparkData={spark(m => m.serve?.second?.spd_deuce)} />
            </Card>
          </div>

          {/* RETURN */}
          <SectionTitle title="Return" />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Card title="1st Return Won %">
              <CompareBar label="Ad" jd={avgs.ret1_ad} atp={atp?.return.first.pct_ad} gThresh={80} aThresh={65} sparkData={spark(m => m.return?.first?.pct_ad)} />
              <CompareBar label="Deuce" jd={avgs.ret1_deuce} atp={atp?.return.first.pct_deuce} gThresh={80} aThresh={65} sparkData={spark(m => m.return?.first?.pct_deuce)} />
            </Card>
            <Card title="2nd Return Won %">
              <CompareBar label="Ad" jd={avgs.ret2_ad} atp={atp?.return.second.pct_ad} gThresh={80} aThresh={65} sparkData={spark(m => m.return?.second?.pct_ad)} />
              <CompareBar label="Deuce" jd={avgs.ret2_deuce} atp={atp?.return.second.pct_deuce} gThresh={80} aThresh={65} sparkData={spark(m => m.return?.second?.pct_deuce)} />
            </Card>
          </div>

          {/* SHOT STATS */}
          <SectionTitle title="Shot Stats" />
          <Card title="Match Averages">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 10, marginBottom: 16 }}>
              {[
                { label: 'Winners', val: avg(filteredMatches.map(m => m.shot_stats?.winners)), atp: atp?.shot_stats.winners },
                { label: 'Unf. Errors', val: avg(filteredMatches.map(m => m.shot_stats?.ue)), atp: atp?.shot_stats.ue },
                { label: 'Dbl Faults', val: avg(filteredMatches.map(m => m.shot_stats?.df)), atp: atp?.shot_stats.df },
                { label: 'BP Saved %', val: avg(filteredMatches.map(m => m.shot_stats?.bp_saved_pct)), atp: atp?.shot_stats.bp_saved_pct },
                { label: 'BP Won %', val: avg(filteredMatches.map(m => m.shot_stats?.bp_won_pct)), atp: atp?.shot_stats.bp_won_pct },
              ].map(({ label, val, atp: atpVal }, i) => (
                <div key={i} style={{ background: '#1a1a1a', borderRadius: 8, padding: '10px 6px', textAlign: 'center' }}>
                  <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 22, color: val == null ? '#333' : '#e8d5b0' }}>{val ?? '—'}</div>
                  {atpVal != null && <div style={{ fontFamily: 'monospace', fontSize: 10, color: '#555', marginTop: 2 }}>ATP: {atpVal}</div>}
                  <div style={{ fontSize: 9, color: '#333', textTransform: 'uppercase', letterSpacing: 1, marginTop: 3, fontFamily: 'monospace' }}>{label}</div>
                </div>
              ))}
            </div>
            <CompareBar label="BP Saved %" jd={avg(filteredMatches.map(m => m.shot_stats?.bp_saved_pct))} atp={atp?.shot_stats.bp_saved_pct} gThresh={70} aThresh={50} sparkData={spark(m => m.shot_stats?.bp_saved_pct)} />
            <CompareBar label="BP Won %" jd={avg(filteredMatches.map(m => m.shot_stats?.bp_won_pct))} atp={atp?.shot_stats.bp_won_pct} gThresh={50} aThresh={35} sparkData={spark(m => m.shot_stats?.bp_won_pct)} />

            {/* Winner & Error attribution */}
            {hasShotSplit && (
              <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid #1a1a1a' }}>
                <div style={{ fontSize: 10, letterSpacing: 1.5, color: '#444', textTransform: 'uppercase', fontFamily: 'monospace', marginBottom: 12 }}>Winner & Error Sources</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  {(fhWinners != null || bhWinners != null) && (
                    <div>
                      <div style={{ fontSize: 10, color: '#555', fontFamily: 'monospace', marginBottom: 8 }}>Winners avg / match</div>
                      <SegBar segments={[
                        { label: 'FH', val: fhWinners, color: G },
                        { label: 'BH', val: bhWinners, color: '#60a5fa' },
                      ]} />
                      <div style={{ display: 'flex', gap: 16, marginTop: 6 }}>
                        {fhWinners != null && <span style={{ fontSize: 10, fontFamily: 'monospace', color: G }}>FH: {fhWinners}</span>}
                        {bhWinners != null && <span style={{ fontSize: 10, fontFamily: 'monospace', color: '#60a5fa' }}>BH: {bhWinners}</span>}
                      </div>
                    </div>
                  )}
                  {(fhUE != null || bhUE != null) && (
                    <div>
                      <div style={{ fontSize: 10, color: '#555', fontFamily: 'monospace', marginBottom: 8 }}>Unforced Errors avg / match</div>
                      <SegBar segments={[
                        { label: 'FH', val: fhUE, color: '#fbbf24' },
                        { label: 'BH', val: bhUE, color: R },
                      ]} />
                      <div style={{ display: 'flex', gap: 16, marginTop: 6 }}>
                        {fhUE != null && <span style={{ fontSize: 10, fontFamily: 'monospace', color: '#fbbf24' }}>FH: {fhUE}</span>}
                        {bhUE != null && <span style={{ fontSize: 10, fontFamily: 'monospace', color: R }}>BH: {bhUE}</span>}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </Card>

          {/* FOREHAND / BACKHAND */}
          <SectionTitle title="Ground Strokes" />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Card title="Forehand">
              <CompareBar label="CC In %" jd={avgs.fh_cc} atp={atp?.forehand.cc_in} gThresh={80} aThresh={65} sparkData={spark(m => m.forehand?.cc_in)} />
              <CompareBar label="DTL In %" jd={avgs.fh_dtl} atp={atp?.forehand.dtl_in} gThresh={80} aThresh={65} sparkData={spark(m => m.forehand?.dtl_in)} />
              <CompareBar label="CC Speed" jd={avgs.spd_fh_cc} atp={atp?.forehand.spd_cc} gThresh={125} aThresh={110} suffix="km/h" maxVal={160} sparkData={spark(m => m.forehand?.spd_cc)} />
              <CompareBar label="DTL Speed" jd={avgs.spd_fh_dtl} atp={atp?.forehand.spd_dtl} gThresh={130} aThresh={115} suffix="km/h" maxVal={160} sparkData={spark(m => m.forehand?.spd_dtl)} />
            </Card>
            <Card title="Backhand">
              <CompareBar label="CC In %" jd={avgs.bh_cc} atp={atp?.backhand.cc_in} gThresh={80} aThresh={65} sparkData={spark(m => m.backhand?.cc_in)} />
              <CompareBar label="DTL In %" jd={avgs.bh_dtl} atp={atp?.backhand.dtl_in} gThresh={80} aThresh={65} sparkData={spark(m => m.backhand?.dtl_in)} />
              <CompareBar label="CC Speed" jd={avgs.spd_bh_cc} atp={atp?.backhand.spd_cc} gThresh={118} aThresh={105} suffix="km/h" maxVal={160} sparkData={spark(m => m.backhand?.spd_cc)} />
              <CompareBar label="DTL Speed" jd={avgs.spd_bh_dtl} atp={atp?.backhand.spd_dtl} gThresh={122} aThresh={108} suffix="km/h" maxVal={160} sparkData={spark(m => m.backhand?.spd_dtl)} />
            </Card>
          </div>

          {/* SHOT MIX */}
          {(shotMix.fh != null || shotMix.flat != null) && (
            <>
              <SectionTitle title="Shot Mix" />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {(shotMix.fh != null || shotMix.bh != null || shotMix.vol != null) && (
                  <Card title="Shot Distribution">
                    <SegBar segments={[
                      { label: 'Forehand', val: shotMix.fh, color: G },
                      { label: 'Backhand', val: shotMix.bh, color: '#60a5fa' },
                      { label: 'Volley', val: shotMix.vol, color: '#c084fc' },
                    ]} />
                  </Card>
                )}
                {(shotMix.flat != null || shotMix.topspin != null || shotMix.slice != null) && (
                  <Card title="Spin Profile">
                    <SegBar segments={[
                      { label: 'Topspin', val: shotMix.topspin, color: G },
                      { label: 'Flat', val: shotMix.flat, color: A },
                      { label: 'Slice', val: shotMix.slice, color: '#60a5fa' },
                    ]} />
                  </Card>
                )}
              </div>
            </>
          )}

          {/* MINDSET */}
          {(() => {
            const withJournal = filteredMatches.filter(m => m.journal != null)
            if (withJournal.length === 0) return null

            const wins = filteredMatches.filter(m => m.score?.winner === 'JD')
            const losses = filteredMatches.filter(m => m.score?.winner !== 'JD')

            // Plan execution win rate
            const planMatches = filteredMatches.filter(m => m.journal?.plan_executed != null)
            const planWinRate = (vals: string[]) => {
              const ms = planMatches.filter(m => vals.includes(m.journal.plan_executed))
              if (!ms.length) return null
              return Math.round(ms.filter(m => m.score?.winner === 'JD').length / ms.length * 100)
            }
            const execYesMostly = planWinRate(['Yes', 'Mostly'])
            const execNo = planWinRate(['No'])

            // Avg recovery in wins vs losses
            const avgRecovery = (ms: any[]) => {
              const vals = ms.map(m => m.journal?.recovery).filter((v): v is number => v != null)
              return vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : null
            }
            const recWins = avgRecovery(wins)
            const recLosses = avgRecovery(losses)

            // Avg focus & composure
            const avgJ = (fn: (m: any) => number | null | undefined) => {
              const vals = withJournal.map(fn).filter((v): v is number => v != null)
              return vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length * 10) / 10 : null
            }
            const avgFocus = avgJ(m => m.journal?.focus)
            const avgComposure = avgJ(m => m.journal?.composure)

            const hasData = execYesMostly != null || recWins != null || avgFocus != null

            return hasData ? (
              <>
                <SectionTitle title="Mindset" />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  {execYesMostly != null && (
                    <Card title="Game Plan Execution">
                      <div style={{ marginBottom: 12 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #1a1a1a' }}>
                          <span style={{ fontSize: 12, color: '#666' }}>Yes / Mostly</span>
                          <span style={{ fontFamily: 'monospace', fontSize: 13, color: execYesMostly >= 60 ? G : execYesMostly >= 40 ? A : R }}>{execYesMostly}% win rate</span>
                        </div>
                        {execNo != null && (
                          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #1a1a1a' }}>
                            <span style={{ fontSize: 12, color: '#666' }}>No</span>
                            <span style={{ fontFamily: 'monospace', fontSize: 13, color: execNo >= 60 ? G : execNo >= 40 ? A : R }}>{execNo}% win rate</span>
                          </div>
                        )}
                        {planMatches.length > 0 && (
                          <div style={{ fontSize: 10, color: '#333', fontFamily: 'monospace', marginTop: 8 }}>from {planMatches.length} match{planMatches.length > 1 ? 'es' : ''} with journal</div>
                        )}
                      </div>
                    </Card>
                  )}
                  {(recWins != null || recLosses != null || avgFocus != null) && (
                    <Card title="Recovery & Focus">
                      {recWins != null && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #1a1a1a' }}>
                          <span style={{ fontSize: 12, color: '#666' }}>Recovery in wins</span>
                          <span style={{ fontFamily: 'monospace', fontSize: 13, color: recWins >= 67 ? G : recWins >= 34 ? A : R }}>{recWins}%</span>
                        </div>
                      )}
                      {recLosses != null && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #1a1a1a' }}>
                          <span style={{ fontSize: 12, color: '#666' }}>Recovery in losses</span>
                          <span style={{ fontFamily: 'monospace', fontSize: 13, color: recLosses >= 67 ? G : recLosses >= 34 ? A : R }}>{recLosses}%</span>
                        </div>
                      )}
                      {avgFocus != null && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #1a1a1a' }}>
                          <span style={{ fontSize: 12, color: '#666' }}>Avg focus</span>
                          <span style={{ fontFamily: 'monospace', fontSize: 13, color: avgFocus >= 4 ? G : avgFocus >= 3 ? A : R }}>{avgFocus}/5</span>
                        </div>
                      )}
                      {avgComposure != null && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0' }}>
                          <span style={{ fontSize: 12, color: '#666' }}>Avg composure</span>
                          <span style={{ fontFamily: 'monospace', fontSize: 13, color: avgComposure >= 4 ? G : avgComposure >= 3 ? A : R }}>{avgComposure}/5</span>
                        </div>
                      )}
                    </Card>
                  )}
                </div>
              </>
            ) : null
          })()}

          {/* Context note */}
          <div style={{ marginTop: 16, padding: '12px 16px', background: '#111', border: '1px solid #1a1a1a', borderRadius: 8, fontSize: 10, color: '#333', fontFamily: 'monospace', lineHeight: 1.6 }}>
            ATP stats are 2024-25 season tour averages. Forehand/backhand direction splits are tour-average estimates. Serve speeds in km/h. Trend lines show last 8 matches in chronological order.
          </div>
        </>
      )}
    </div>
  )
}
