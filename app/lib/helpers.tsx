'use client'
import React, { Component } from 'react'

export const G = '#4ade80', A = '#fbbf24', R = '#f87171', B = '#60a5fa'
export const GD = 'rgba(74,222,128,0.12)', AD = 'rgba(251,191,36,0.12)', RD = 'rgba(248,113,113,0.12)'

export function avg(arr: (number|null|undefined)[]) {
  const v = arr.filter((x): x is number => x != null && !isNaN(x as number))
  return v.length ? Math.round(v.reduce((a,b)=>a+b,0)/v.length) : null
}
export function col(v: number|null, g: number, a: number) {
  if (v == null) return '#555'
  return v >= g ? G : v >= a ? A : R
}
export function fmtDate(d: string) {
  return new Date(d+'T12:00:00').toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'})
}
export function getStatVal(obj: any, path: string[]): any {
  return path.reduce((o, k) => o?.[k], obj)
}
export const IMPORTANT_FIELDS: { path: string[]; label: string; section: string }[] = [
  { path: ['serve','first','pct_ad'],     label: '1st Serve Ad %',       section: 'Serve' },
  { path: ['serve','first','pct_deuce'],  label: '1st Serve Deuce %',    section: 'Serve' },
  { path: ['serve','second','pct_ad'],    label: '2nd Serve Ad %',        section: 'Serve' },
  { path: ['serve','second','pct_deuce'], label: '2nd Serve Deuce %',     section: 'Serve' },
  { path: ['return','first','pct_ad'],    label: '1st Return Ad %',       section: 'Return' },
  { path: ['return','second','pct_ad'],   label: '2nd Return Ad %',       section: 'Return' },
  { path: ['forehand','cc_in'],           label: 'FH Cross-Court %',      section: 'Groundstrokes' },
  { path: ['forehand','dtl_in'],          label: 'FH Down-the-Line %',    section: 'Groundstrokes' },
  { path: ['backhand','cc_in'],           label: 'BH Cross-Court %',      section: 'Groundstrokes' },
  { path: ['backhand','dtl_in'],          label: 'BH Down-the-Line %',    section: 'Groundstrokes' },
  { path: ['shot_stats','ue'],            label: 'Unforced Errors',       section: 'Shot Stats' },
  { path: ['shot_stats','winners'],       label: 'Winners',               section: 'Shot Stats' },
  { path: ['shot_stats','aces'],              label: 'Aces',                  section: 'Match Stats' },
  { path: ['shot_stats','s1_pts_won_pct'],    label: '1st Srv Pts Won %',     section: 'Match Stats' },
  { path: ['shot_stats','s2_pts_won_pct'],    label: '2nd Srv Pts Won %',     section: 'Match Stats' },
  { path: ['shot_stats','return_pts_won_pct'],label: 'Return Pts Won %',      section: 'Match Stats' },
  { path: ['shot_stats','total_pts_won_pct'], label: 'Total Pts Won %',       section: 'Match Stats' },
]
export function getMissingFields(match: any) {
  return IMPORTANT_FIELDS.filter(f => getStatVal(match, f.path) == null)
}
export function deepMerge(existing: any, incoming: any): any {
  // Never recurse into arrays — they hold ordered data (sets, bullet points) and
  // spreading them into objects destroys structure and causes "not iterable" crashes.
  if (Array.isArray(existing)) return existing.length > 0 ? existing : (incoming ?? existing)
  if (typeof existing !== 'object' || existing === null) return existing ?? incoming
  const result = { ...existing }
  for (const k of Object.keys(incoming || {})) {
    if (result[k] == null && incoming[k] != null) {
      result[k] = incoming[k]
    } else if (
      !Array.isArray(result[k]) &&
      typeof result[k] === 'object' && result[k] !== null &&
      typeof incoming[k] === 'object' && incoming[k] !== null && !Array.isArray(incoming[k])
    ) {
      result[k] = deepMerge(result[k], incoming[k])
    }
  }
  return result
}
export function computeAvgs(matches: any[]) {
  return {
    s1_ad:      avg(matches.map(m=>m.serve?.first?.pct_ad)),
    s1_deuce:   avg(matches.map(m=>m.serve?.first?.pct_deuce)),
    s2_ad:      avg(matches.map(m=>m.serve?.second?.pct_ad)),
    s2_deuce:   avg(matches.map(m=>m.serve?.second?.pct_deuce)),
    spd_s1_ad:  avg(matches.map(m=>m.serve?.first?.spd_ad)),
    spd_s1_deuce: avg(matches.map(m=>m.serve?.first?.spd_deuce)),
    spd_s2_ad:  avg(matches.map(m=>m.serve?.second?.spd_ad)),
    spd_s2_deuce: avg(matches.map(m=>m.serve?.second?.spd_deuce)),
    ret1_ad:    avg(matches.map(m=>m.return?.first?.pct_ad)),
    ret1_deuce: avg(matches.map(m=>m.return?.first?.pct_deuce)),
    ret2_ad:    avg(matches.map(m=>m.return?.second?.pct_ad)),
    ret2_deuce: avg(matches.map(m=>m.return?.second?.pct_deuce)),
    spd_ret1:   avg(matches.map(m=>m.return?.first?.spd_ad??m.return?.first?.spd)),
    spd_ret2:   avg(matches.map(m=>m.return?.second?.spd_ad??m.return?.second?.spd)),
    fh_cc:      avg(matches.map(m=>m.forehand?.cc_in)),
    fh_dtl:     avg(matches.map(m=>m.forehand?.dtl_in)),
    bh_cc:      avg(matches.map(m=>m.backhand?.cc_in)),
    bh_dtl:     avg(matches.map(m=>m.backhand?.dtl_in)),
    spd_fh_cc:  avg(matches.map(m=>m.forehand?.spd_cc)),
    spd_fh_dtl: avg(matches.map(m=>m.forehand?.spd_dtl)),
    spd_bh_cc:  avg(matches.map(m=>m.backhand?.spd_cc)),
    spd_bh_dtl: avg(matches.map(m=>m.backhand?.spd_dtl)),
  }
}

// ─── ERROR BOUNDARY ───────────────────────────────────────────────────────────
export class ErrorBoundary extends Component<{children: React.ReactNode}, {err: string|null}> {
  constructor(props: any) { super(props); this.state = { err: null } }
  static getDerivedStateFromError(e: any) { return { err: e?.message || String(e) } }
  componentDidCatch(e: any) { console.error('MatchDetail crash:', e?.stack || e) }
  render() {
    if (this.state.err) return (
      <div style={{background:'#1a0a0a',border:'1px solid #f87171',borderRadius:10,padding:16,margin:'12px 0',fontFamily:'monospace',fontSize:11,color:'#f87171',whiteSpace:'pre-wrap',wordBreak:'break-all'}}>
        <div style={{fontWeight:700,marginBottom:6}}>Render error — copy this and send to debug:</div>
        {this.state.err}
      </div>
    )
    return this.props.children
  }
}
