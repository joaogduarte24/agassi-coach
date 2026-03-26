'use client'
import { useState } from 'react'
import { G, R, A, FONT_BODY, FONT_DATA, FONT_DISPLAY, BG2, BORDER, MUTED, WHITE, BORDER2 } from '@/app/lib/helpers'
import { Avgs } from '@/app/types'
import MatchDetail from './MatchDetail'

interface DeBriefProps { m: any; avgs: Avgs; allMatches: any[] }

function bullet(icon: string, text: React.ReactNode) {
  return { icon, text }
}

function computeBullets(m: any, avgs: Avgs, all: any[]) {
  const good: ReturnType<typeof bullet>[] = []
  const watch: ReturnType<typeof bullet>[] = []
  const s = m.shot_stats || {}
  const hasStats = m.serve != null || s.ue != null

  if (!hasStats) return { good, watch }

  // UE vs average
  const avgUE = (() => {
    const vals = all.filter(x => x.id !== m.id && x.shot_stats?.ue != null).map((x: any) => x.shot_stats.ue as number)
    return vals.length ? Math.round(vals.reduce((a: number, b: number) => a + b, 0) / vals.length) : null
  })()
  if (s.ue != null && avgUE != null) {
    if (s.ue < avgUE) good.push(bullet('✓', <span>Errors controlled — <b>{s.ue} UEs</b>, below your average of {avgUE}</span>))
    else watch.push(bullet('△', <span><b>{s.ue} UEs</b> — above your average of {avgUE}. Errors cost you points.</span>))
  }

  // 1st serve Ad %
  const s1ad = m.serve?.first?.pct_ad
  if (s1ad != null) {
    const avgS1 = avgs.s1_ad
    if (s1ad >= 68) good.push(bullet('✓', <span>Ad serve held at <b>{s1ad}%</b>{avgS1 ? ` — above your ${avgS1}% average` : ''}</span>))
    else watch.push(bullet('△', <span>Ad serve at <b>{s1ad}%</b>{avgS1 ? ` — below your ${avgS1}% average` : ''}. Work the deuce side more.</span>))
  }

  // BP conversion
  if (s.bp_won_pct != null && s.bp_won_n != null) {
    if (s.bp_won_pct >= 50) good.push(bullet('✓', <span>Break points converted at <b>{s.bp_won_pct}%</b> ({s.bp_won_n}/{s.bp_won_total})</span>))
    else if (s.bp_won_pct < 35) watch.push(bullet('△', <span>Only <b>{s.bp_won_pct}%</b> BP conversion ({s.bp_won_n}/{s.bp_won_total}) — matches should be easier than they feel</span>))
  }

  // Game plan execution
  if (m.journal?.plan_executed) {
    const val = m.journal.plan_executed
    if (val === 'Yes' || val === 'Mostly') good.push(bullet('✓', <span>Game plan <b>{val.toLowerCase()}</b> executed{m.journal.recovery != null ? ` · Recovery ${m.journal.recovery}%` : ''}</span>))
    else watch.push(bullet('△', <span>Game plan <b>not executed</b> — review what broke down before next match</span>))
  }

  // Key number (always in watch/context)
  if (m.key_number) watch.push(bullet('→', <span>{m.key_number}</span>))

  // What didn't work (first item)
  if (Array.isArray(m.what_didnt) && m.what_didnt[0]) {
    watch.push(bullet('△', <span>{m.what_didnt[0]}</span>))
  }

  // What worked (first item — good)
  if (Array.isArray(m.what_worked) && m.what_worked[0] && good.length < 3) {
    good.push(bullet('✓', <span>{m.what_worked[0]}</span>))
  }

  return { good: good.slice(0, 3), watch: watch.slice(0, 3) }
}

const SH = ({ children }: { children: React.ReactNode }) => (
  <div style={{ fontSize: 10, fontFamily: FONT_BODY, fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase' as const, color: MUTED, marginBottom: 12 }}>
    {children}
  </div>
)

const Bullet = ({ icon, text }: { icon: string; text: React.ReactNode }) => (
  <div style={{ display: 'flex', gap: 12, padding: '13px 0', borderBottom: `1px solid ${BORDER}`, alignItems: 'flex-start' }}>
    <span style={{ fontSize: 13, flexShrink: 0, marginTop: 1, color: icon === '✓' ? G : icon === '△' ? A : MUTED }}>{icon}</span>
    <span style={{ fontSize: 14, color: WHITE, lineHeight: 1.5, fontFamily: FONT_BODY }}>{text}</span>
  </div>
)

export default function Debrief({ m, avgs, allMatches }: DeBriefProps) {
  const [showFull, setShowFull] = useState(false)
  const isWin = m.score?.winner === 'JD'
  const hasStats = m.serve != null || m.shot_stats != null
  const { good, watch } = computeBullets(m, avgs, allMatches)

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 11, fontFamily: FONT_DATA, color: MUTED, marginBottom: 8, letterSpacing: '1px' }}>
          vs {m.opponent?.name}{m.opponent?.utr ? ` · UTR ${m.opponent.utr}` : ''} · {m.surface}
        </div>
        <div style={{ fontFamily: FONT_DISPLAY, fontSize: 52, letterSpacing: '2px', color: isWin ? G : R, lineHeight: 1 }}>
          {m.score?.sets || (isWin ? 'W' : m.score?.winner ? 'L' : '—')}
        </div>
        <div style={{ fontSize: 12, color: MUTED, fontFamily: FONT_DATA, marginTop: 6 }}>
          {new Date(m.date + 'T12:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
        </div>
      </div>

      {/* No stats yet */}
      {!hasStats && (
        <div style={{ background: BG2, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 16, marginBottom: 20 }}>
          <div style={{ fontSize: 13, color: MUTED, fontFamily: FONT_BODY }}>
            Journal logged. Upload SwingVision stats to unlock the full debrief.
          </div>
        </div>
      )}

      {/* Good bullets */}
      {good.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <SH>What decided it</SH>
          {good.map((b, i) => <Bullet key={i} icon={b.icon} text={b.text} />)}
        </div>
      )}

      {/* Watch bullets */}
      {watch.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <SH>Watch next time</SH>
          {watch.map((b, i) => <Bullet key={i} icon={b.icon} text={b.text} />)}
        </div>
      )}

      {/* Journal summary if present */}
      {m.journal?.priority_next && (
        <div style={{ background: 'rgba(96,165,250,0.06)', border: '1px solid rgba(96,165,250,0.15)', borderRadius: 10, padding: '10px 14px', marginBottom: 20, display: 'flex', gap: 10, alignItems: 'center' }}>
          <span style={{ fontSize: 10, color: MUTED, fontFamily: FONT_BODY, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase' as const }}>Priority next</span>
          <span style={{ fontSize: 12, color: '#60a5fa', fontFamily: FONT_DATA }}>{m.journal.priority_next}</span>
        </div>
      )}

      {/* Full stats toggle */}
      {hasStats && (
        <button onClick={e => { e.stopPropagation(); setShowFull(v => !v) }}
          style={{ width: '100%', padding: 14, background: 'none', border: `1px solid ${BORDER2}`, borderRadius: 12, color: MUTED, fontFamily: FONT_BODY, fontSize: 12, fontWeight: 600, cursor: 'pointer', marginBottom: showFull ? 20 : 0, transition: 'all 0.15s' }}>
          {showFull ? 'Hide full stats ↑' : 'Full stats ↓'}
        </button>
      )}

      {showFull && <MatchDetail m={m} avgs={avgs} />}
    </div>
  )
}
