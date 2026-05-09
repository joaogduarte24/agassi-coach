'use client'
import { useState } from 'react'
import { GOLD, BG2, BORDER, MUTED } from '@/app/lib/helpers'
import PreMatchBrief from './PreMatchBrief'

interface NextMatchStrategyProps {
  matches: any[]
  avgs: any
  onOpenMatch?: (matchId: string) => void
}

const FONT_DATA = "'DM Mono', monospace"
const FONT_BODY = "'Inter', system-ui, sans-serif"

export default function NextMatchStrategy({ matches, onOpenMatch }: NextMatchStrategyProps) {
  const [oppName, setOppName] = useState('')

  const pastOpponents = Array.from(
    new Map(matches.filter(m => m.opponent?.name).map(m => [m.opponent.name, m.opponent])).values(),
  ).sort((a: any, b: any) => a.name.localeCompare(b.name))

  return (
    <div>
      {/* STICKY INPUTS BAR — opponent select primary; UTR/surface/style not gated */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 10,
        background: 'rgba(13,13,13,0.92)', backdropFilter: 'blur(10px)',
        borderBottom: `1px solid ${BORDER}`,
        padding: '10px 20px',
        marginBottom: 24,
      }}>
        <div style={{ maxWidth: 600, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ fontSize: 9, fontFamily: FONT_DATA, color: MUTED, letterSpacing: 1.5, textTransform: 'uppercase' }}>OPP</div>
            <select
              value={oppName}
              onChange={e => setOppName(e.target.value)}
              style={{
                background: BG2, border: `1px solid ${BORDER}`, color: oppName ? GOLD : MUTED,
                padding: '6px 10px', borderRadius: 8, fontSize: 13, fontFamily: FONT_BODY,
                fontWeight: 600, cursor: 'pointer', flex: 1, maxWidth: 280,
                appearance: 'none' as any,
              }}
            >
              <option value=''>— Choose opponent —</option>
              {pastOpponents.map((p: any) => {
                const pm = matches.filter(m => m.opponent?.name === p.name)
                const pw = pm.filter(m => m.score?.winner === 'JD').length
                return <option key={p.name} value={p.name}>{p.name} ({pw}W {pm.length - pw}L)</option>
              })}
            </select>
          </div>
        </div>
      </div>

      {/* Brief — renders when opponent selected; brief generator handles cold-start internally */}
      <div style={{ maxWidth: 600, margin: '0 auto', padding: '0 20px' }}>
        {oppName
          ? <PreMatchBrief opponentName={oppName} matches={matches} onMatchClick={onOpenMatch} />
          : (
            <div style={{
              textAlign: 'center', padding: '60px 20px',
              color: '#2a2a2a', fontFamily: FONT_DATA, fontSize: 12,
            }}>
              Pick an opponent above to load the pre-match brief ↑
            </div>
          )
        }
      </div>
    </div>
  )
}
