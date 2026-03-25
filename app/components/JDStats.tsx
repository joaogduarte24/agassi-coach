'use client'
import { useState } from 'react'
import { G, A, R, avg, col } from '@/app/lib/helpers'
import { Avgs } from '@/app/types'
import { ATP_PLAYERS, ATPPlayer } from '@/lib/atp-players'
import RadarChart from './RadarChart'

interface JDStatsProps {
  matches: any[]
  avgs: Avgs
}

function CompareBar({ label, jd, atp, gThresh, aThresh, suffix='%', maxVal }: any) {
  if (jd == null) return null
  const scale = suffix === 'km/h' ? (maxVal || 220) : 100
  const jdPct = Math.min((jd / scale) * 100, 100)
  const atpPct = atp != null ? Math.min((atp / scale) * 100, 100) : null
  const color = col(jd, gThresh, aThresh)
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
        <span style={{ fontSize: 11, color: '#666' }}>{label}</span>
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

export default function JDStats({ matches, avgs }: JDStatsProps) {
  const [selectedPlayer, setSelectedPlayer] = useState<ATPPlayer | null>(null)
  const atp = selectedPlayer

  const norm = (v: number | null, min: number, max: number) =>
    v == null ? 0 : Math.min(100, Math.max(0, Math.round(((v - min) / (max - min)) * 100)))

  const radarAxes = [
    { label: '1ST SRV', jd: norm(avgs.s1_ad, 40, 80),       atp: norm(atp?.serve.first.pct_ad ?? null, 40, 80) },
    { label: 'SRV SPD', jd: norm(avgs.spd_s1_ad, 70, 220),   atp: norm(atp?.serve.first.spd_ad ?? null, 70, 220) },
    { label: '2ND SRV', jd: norm(avgs.s2_ad, 60, 95),        atp: norm(atp?.serve.second.pct_ad ?? null, 60, 95) },
    { label: 'RETURN',  jd: norm(avgs.ret1_ad, 60, 95),      atp: norm(atp?.return.first.pct_ad ?? null, 60, 95) },
    { label: 'FH CC',   jd: norm(avgs.fh_cc, 50, 95),        atp: norm(atp?.forehand.cc_in ?? null, 50, 95) },
    { label: 'BH CC',   jd: norm(avgs.bh_cc, 50, 95),        atp: norm(atp?.backhand.cc_in ?? null, 50, 95) },
    { label: 'BP GAME', jd: norm(avg(matches.map(m => m.shot_stats?.bp_saved_pct)), 30, 85), atp: norm(atp?.shot_stats.bp_saved_pct ?? null, 30, 85) },
    { label: 'WINNERS', jd: norm(avg(matches.map(m => m.shot_stats?.winners)), 5, 50),      atp: norm(atp?.shot_stats.winners ?? null, 5, 50) },
  ]

  const compRows: { label: string; jd: number | null; atp: number | null; unit: string; higherBetter: boolean; gT: number; aT: number }[] = [
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
    { label: 'Winners / match', jd: avg(matches.map(m=>m.shot_stats?.winners)), atp: atp?.shot_stats.winners ?? null, unit: '', higherBetter: true, gT: 30, aT: 20 },
    { label: 'Unforced Errors', jd: avg(matches.map(m=>m.shot_stats?.ue)),      atp: atp?.shot_stats.ue ?? null,      unit: '', higherBetter: false, gT: 30, aT: 42 },
    { label: 'Double Faults',   jd: avg(matches.map(m=>m.shot_stats?.df)),      atp: atp?.shot_stats.df ?? null,      unit: '', higherBetter: false, gT: 3,  aT: 6 },
    { label: 'BP Saved %',      jd: avg(matches.map(m=>m.shot_stats?.bp_saved_pct)), atp: atp?.shot_stats.bp_saved_pct ?? null, unit: '%', higherBetter: true,  gT: 70, aT: 50 },
    { label: 'BP Won %',        jd: avg(matches.map(m=>m.shot_stats?.bp_won_pct)),   atp: atp?.shot_stats.bp_won_pct ?? null,   unit: '%', higherBetter: true,  gT: 50, aT: 35 },
  ]

  const ahead = atp ? compRows.filter(r => r.jd != null && r.atp != null && (r.higherBetter ? r.jd >= r.atp : r.jd <= r.atp)) : []
  const behind = atp ? compRows.filter(r => r.jd != null && r.atp != null && (r.higherBetter ? r.jd < r.atp : r.jd > r.atp)) : []

  const SectionTitle = ({ title }: { title: string }) => (
    <div style={{ fontSize: 10, letterSpacing: 2, color: '#555', textTransform: 'uppercase', fontFamily: 'monospace', marginBottom: 14, marginTop: 24, borderBottom: '1px solid #1a1a1a', paddingBottom: 8 }}>{title}</div>
  )

  const Card = ({ title, children }: any) => (
    <div style={{ background: '#141414', border: '1px solid #1a1a1a', borderRadius: 12, padding: 16, marginBottom: 12 }}>
      <div style={{ fontSize: 10, letterSpacing: 2, color: '#444', textTransform: 'uppercase', fontFamily: 'monospace', marginBottom: 14 }}>{title}</div>
      {children}
    </div>
  )

  if (matches.length === 0) {
    return <div style={{ color: '#333', fontFamily: 'monospace', textAlign: 'center', padding: 60 }}>No matches yet. Upload your first match →</div>
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 30, letterSpacing: 2, color: '#e8d5b0' }}>JD Stats</div>
          <div style={{ fontSize: 11, color: '#444', fontFamily: 'monospace', marginTop: 2 }}>Averages across {matches.length} matches</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
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

      {/* RADAR + SUMMARY ROW */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 8, alignItems: 'start' }}>

        {/* Radar card */}
        <div style={{ background: '#141414', border: '1px solid #1a1a1a', borderRadius: 12, padding: 20 }}>
          <div style={{ fontSize: 10, letterSpacing: 2, color: '#444', textTransform: 'uppercase', fontFamily: 'monospace', marginBottom: 14 }}>Player Profile</div>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <RadarChart
              jdValues={radarAxes.map(a => a.jd)}
              atpValues={atp ? radarAxes.map(a => a.atp) : null}
              labels={radarAxes.map(a => a.label)}
            />
          </div>
          {/* Legend */}
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

        {/* Summary card */}
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
              {/* Score pill */}
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
                  .map(r => {
                    const delta = r.higherBetter ? (r.jd! - r.atp!) : (r.atp! - r.jd!)
                    return { ...r, delta }
                  })
                  .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))

                const top5pos = ranked.filter(r => r.delta > 0).slice(0, 3)
                const top5neg = ranked.filter(r => r.delta < 0).slice(0, 4)

                return (
                  <div>
                    <div style={{ fontSize: 10, letterSpacing: 1.5, color: G, textTransform: 'uppercase', fontFamily: 'monospace', marginBottom: 6 }}>JD Edges</div>
                    {top5pos.length === 0 && <div style={{ fontSize: 11, color: '#333', fontFamily: 'monospace', marginBottom: 10 }}>None yet</div>}
                    {top5pos.map((r, i) => (
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
                    {top5neg.map((r, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 0', borderBottom: i < top5neg.length - 1 ? '1px solid #1a1a1a' : 'none' }}>
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
        </div>
      )}

      {/* SERVE */}
      <SectionTitle title="Serve" />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Card title="1st Serve">
          <CompareBar label="Ad %" jd={avgs.s1_ad} atp={atp?.serve.first.pct_ad} gThresh={75} aThresh={60} />
          <CompareBar label="Deuce %" jd={avgs.s1_deuce} atp={atp?.serve.first.pct_deuce} gThresh={75} aThresh={60} />
          <CompareBar label="Ad Speed" jd={avgs.spd_s1_ad} atp={atp?.serve.first.spd_ad} gThresh={185} aThresh={160} suffix="km/h" maxVal={230} />
          <CompareBar label="Deuce Speed" jd={avgs.spd_s1_deuce} atp={atp?.serve.first.spd_deuce} gThresh={185} aThresh={160} suffix="km/h" maxVal={230} />
        </Card>
        <Card title="2nd Serve">
          <CompareBar label="Ad %" jd={avgs.s2_ad} atp={atp?.serve.second.pct_ad} gThresh={80} aThresh={65} />
          <CompareBar label="Deuce %" jd={avgs.s2_deuce} atp={atp?.serve.second.pct_deuce} gThresh={80} aThresh={65} />
          <CompareBar label="Ad Speed" jd={avgs.spd_s2_ad} atp={atp?.serve.second.spd_ad} gThresh={148} aThresh={130} suffix="km/h" maxVal={180} />
          <CompareBar label="Deuce Speed" jd={avgs.spd_s2_deuce} atp={atp?.serve.second.spd_deuce} gThresh={148} aThresh={130} suffix="km/h" maxVal={180} />
        </Card>
      </div>

      {/* RETURN */}
      <SectionTitle title="Return" />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Card title="1st Return Won %">
          <CompareBar label="Ad" jd={avgs.ret1_ad} atp={atp?.return.first.pct_ad} gThresh={80} aThresh={65} />
          <CompareBar label="Deuce" jd={avgs.ret1_deuce} atp={atp?.return.first.pct_deuce} gThresh={80} aThresh={65} />
        </Card>
        <Card title="2nd Return Won %">
          <CompareBar label="Ad" jd={avgs.ret2_ad} atp={atp?.return.second.pct_ad} gThresh={80} aThresh={65} />
          <CompareBar label="Deuce" jd={avgs.ret2_deuce} atp={atp?.return.second.pct_deuce} gThresh={80} aThresh={65} />
        </Card>
      </div>

      {/* SHOT STATS */}
      <SectionTitle title="Shot Stats" />
      <Card title="Match Averages">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 10, marginBottom: 16 }}>
          {[
            { label: 'Winners', val: avg(matches.map(m => m.shot_stats?.winners)), atp: atp?.shot_stats.winners },
            { label: 'Unf. Errors', val: avg(matches.map(m => m.shot_stats?.ue)), atp: atp?.shot_stats.ue },
            { label: 'Dbl Faults', val: avg(matches.map(m => m.shot_stats?.df)), atp: atp?.shot_stats.df },
            { label: 'BP Saved %', val: avg(matches.map(m => m.shot_stats?.bp_saved_pct)), atp: atp?.shot_stats.bp_saved_pct },
            { label: 'BP Won %', val: avg(matches.map(m => m.shot_stats?.bp_won_pct)), atp: atp?.shot_stats.bp_won_pct },
          ].map(({ label, val, atp: atpVal }, i) => (
            <div key={i} style={{ background: '#1a1a1a', borderRadius: 8, padding: '10px 6px', textAlign: 'center' }}>
              <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 22, color: val == null ? '#333' : '#e8d5b0' }}>{val ?? '—'}</div>
              {atpVal != null && <div style={{ fontFamily: 'monospace', fontSize: 10, color: '#555', marginTop: 2 }}>ATP: {atpVal}</div>}
              <div style={{ fontSize: 9, color: '#333', textTransform: 'uppercase', letterSpacing: 1, marginTop: 3, fontFamily: 'monospace' }}>{label}</div>
            </div>
          ))}
        </div>
        <CompareBar label="BP Saved %" jd={avg(matches.map(m => m.shot_stats?.bp_saved_pct))} atp={atp?.shot_stats.bp_saved_pct} gThresh={70} aThresh={50} />
        <CompareBar label="BP Won %" jd={avg(matches.map(m => m.shot_stats?.bp_won_pct))} atp={atp?.shot_stats.bp_won_pct} gThresh={50} aThresh={35} />
      </Card>

      {/* FOREHAND / BACKHAND */}
      <SectionTitle title="Ground Strokes" />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Card title="Forehand">
          <CompareBar label="CC In %" jd={avgs.fh_cc} atp={atp?.forehand.cc_in} gThresh={80} aThresh={65} />
          <CompareBar label="DTL In %" jd={avgs.fh_dtl} atp={atp?.forehand.dtl_in} gThresh={80} aThresh={65} />
          <CompareBar label="CC Speed" jd={avgs.spd_fh_cc} atp={atp?.forehand.spd_cc} gThresh={125} aThresh={110} suffix="km/h" maxVal={160} />
          <CompareBar label="DTL Speed" jd={avgs.spd_fh_dtl} atp={atp?.forehand.spd_dtl} gThresh={130} aThresh={115} suffix="km/h" maxVal={160} />
        </Card>
        <Card title="Backhand">
          <CompareBar label="CC In %" jd={avgs.bh_cc} atp={atp?.backhand.cc_in} gThresh={80} aThresh={65} />
          <CompareBar label="DTL In %" jd={avgs.bh_dtl} atp={atp?.backhand.dtl_in} gThresh={80} aThresh={65} />
          <CompareBar label="CC Speed" jd={avgs.spd_bh_cc} atp={atp?.backhand.spd_cc} gThresh={118} aThresh={105} suffix="km/h" maxVal={160} />
          <CompareBar label="DTL Speed" jd={avgs.spd_bh_dtl} atp={atp?.backhand.spd_dtl} gThresh={122} aThresh={108} suffix="km/h" maxVal={160} />
        </Card>
      </div>

      {/* Context note */}
      <div style={{ marginTop: 16, padding: '12px 16px', background: '#111', border: '1px solid #1a1a1a', borderRadius: 8, fontSize: 10, color: '#333', fontFamily: 'monospace', lineHeight: 1.6 }}>
        ATP stats are 2024-25 season tour averages. Forehand/backhand direction splits are tour-average estimates (not publicly available per player). Serve speeds shown in km/h.
      </div>
    </div>
  )
}
