'use client'
import { useState, useMemo } from 'react'
import { G, A, R, B, GOLD, GOLD_DIM, BG, BG2, BG3, BORDER, BORDER2, WHITE, MUTED } from '@/app/lib/helpers'
import { generateBrief } from '@/app/lib/briefs/generate'
import type { Brief, BriefBullet } from '@/app/lib/briefs/types'

interface Props {
  opponentName: string
  matches: any[]
  onMatchClick?: (matchId: string) => void
}

const FONT_DATA = "'DM Mono', monospace"
const FONT_DISPLAY = "'Bebas Neue', sans-serif"
const FONT_BODY = "'Inter', system-ui, sans-serif"

const heroLabel = (color: string): React.CSSProperties => ({
  fontFamily: FONT_DISPLAY,
  fontSize: 26,
  letterSpacing: 4,
  color,
  textTransform: 'uppercase',
  marginBottom: 6,
  lineHeight: 1,
})

const supportLabel: React.CSSProperties = {
  fontFamily: FONT_BODY,
  fontWeight: 700,
  fontSize: 10,
  letterSpacing: 2,
  color: MUTED,
  textTransform: 'uppercase',
  marginBottom: 12,
}

function CaveatToggle({ caveat }: { caveat?: string | null }) {
  const [open, setOpen] = useState(false)
  if (!caveat) return null
  return (
    <>
      <button
        onClick={() => setOpen(!open)}
        style={{
          background: 'transparent', border: 'none', color: '#444',
          fontFamily: FONT_DATA, fontSize: 10, cursor: 'pointer',
          marginTop: 6, padding: 0,
        }}
      >{open ? '▾ hide receipts' : 'ⓘ show receipts'}</button>
      {open && (
        <div style={{
          marginTop: 8, padding: '8px 10px',
          background: '#0a0a0a', border: `1px solid ${BORDER}`, borderRadius: 6,
          fontSize: 11, color: '#888', fontFamily: FONT_DATA, lineHeight: 1.5,
        }}>{caveat}</div>
      )}
    </>
  )
}

function HeroCard({ number, label, accent, children }: { number: number; label: string; accent: string; children: React.ReactNode }) {
  return (
    <div style={{
      background: BG2, border: `1px solid ${accent}33`, borderRadius: 14,
      padding: '20px 20px 18px', marginBottom: 16,
    }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, marginBottom: 18 }}>
        <span style={{
          fontFamily: FONT_DISPLAY, fontSize: 36, color: `${accent}55`,
          lineHeight: 1, letterSpacing: 1,
        }}>{number}</span>
        <span style={heroLabel(accent)}>{label}</span>
      </div>
      {children}
    </div>
  )
}

function HeroBullet({ headline, text, caveat, isLast }: { headline: string; text: string; caveat?: string | null; isLast: boolean }) {
  return (
    <div style={{ marginBottom: isLast ? 0 : 18, paddingBottom: isLast ? 0 : 18, borderBottom: isLast ? 'none' : `1px solid ${BORDER}` }}>
      <div style={{
        fontFamily: FONT_BODY, fontSize: 16, fontWeight: 600,
        color: WHITE, lineHeight: 1.3, marginBottom: 6,
      }}>{headline}</div>
      <div style={{ fontFamily: FONT_BODY, fontSize: 14, color: '#bbb', lineHeight: 1.5 }}>{text}</div>
      <CaveatToggle caveat={caveat} />
    </div>
  )
}

function SrCard({ side, instruction, stat, target }: { side: 'deuce' | 'ad'; instruction: string; stat: string; target: string }) {
  return (
    <div style={{ padding: 14, background: BG3, borderRadius: 10, border: `1px solid ${BORDER}` }}>
      <div style={{ fontFamily: FONT_DATA, fontSize: 9, color: '#666', letterSpacing: 1.5, marginBottom: 10 }}>{side.toUpperCase()}</div>
      <div style={{ fontSize: 13, color: WHITE, fontWeight: 600, marginBottom: 6, fontFamily: FONT_BODY, lineHeight: 1.35 }}>{instruction}</div>
      <div style={{ fontSize: 10, color: GOLD_DIM, fontFamily: FONT_DATA, marginBottom: 10, lineHeight: 1.45 }}>{stat}</div>
      <div style={{ fontSize: 11, color: G, fontFamily: FONT_BODY, lineHeight: 1.45, fontStyle: 'italic' }}>↳ {target}</div>
    </div>
  )
}

export default function PreMatchBrief({ opponentName, matches, onMatchClick }: Props) {
  const [evidenceOpen, setEvidenceOpen] = useState(false)
  const brief = useMemo(() => generateBrief({ opponentName, allMatches: matches }), [opponentName, matches])
  if (!brief) return null

  return (
    <div>
      {/* Hero */}
      <div style={{ padding: '20px 22px', borderLeft: `2px solid ${GOLD}`, marginBottom: 28 }}>
        <div style={{ fontSize: 9, fontFamily: FONT_DATA, color: GOLD, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8 }}>
          Pre-Match Brief
        </div>
        <div style={{ fontFamily: FONT_DISPLAY, fontSize: 52, color: WHITE, letterSpacing: 1, lineHeight: 0.95, marginBottom: 8 }}>
          {brief.opponent.toUpperCase()}
        </div>
        <div style={{ fontSize: 12, color: MUTED, fontFamily: FONT_DATA, letterSpacing: 0.5 }}>
          {[brief.headlineTrait, brief.styleTag, brief.surface].filter(Boolean).join(' · ')}
        </div>
      </div>

      {/* HeroCard #1 — EXPECT */}
      {brief.expect.length > 0 && (
        <HeroCard number={1} label="Expect" accent={B}>
          {brief.expect.map((b, i) => (
            <HeroBullet key={i} {...b} isLast={i === brief.expect.length - 1} />
          ))}
        </HeroCard>
      )}

      {/* HeroCard #2 — DO */}
      {brief.do.length > 0 && (
        <HeroCard number={2} label="Do" accent={G}>
          {/* Intent banner */}
          <div style={{
            background: `${GOLD}15`, border: `1px solid ${GOLD}33`, borderRadius: 8,
            padding: '10px 12px', marginBottom: 18,
            display: 'flex', gap: 10, alignItems: 'baseline',
          }}>
            <span style={{
              fontFamily: FONT_DATA, fontSize: 9, color: GOLD,
              letterSpacing: 2, textTransform: 'uppercase', flexShrink: 0,
            }}>INTENT</span>
            <span style={{ fontSize: 13, color: WHITE, fontFamily: FONT_BODY, fontWeight: 600, lineHeight: 1.4 }}>
              {brief.intent}
            </span>
          </div>

          {brief.do.map((b, i) => (
            <HeroBullet key={i} {...b} isLast={i === brief.do.length - 1} />
          ))}

          {/* In-match rule footer */}
          <div style={{ marginTop: 4, paddingTop: 16, borderTop: `1px solid ${BORDER}` }}>
            <div style={{ fontFamily: FONT_DATA, fontSize: 10, color: G, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 4 }}>
              In-match rule · {brief.inMatchRule.trigger}
            </div>
            <div style={{ fontSize: 14, color: WHITE, fontFamily: FONT_BODY, lineHeight: 1.4 }}>
              {brief.inMatchRule.action}
            </div>
          </div>
        </HeroCard>
      )}

      {/* HeroCard #3 — SERVE · RETURN STRATEGY */}
      <HeroCard number={3} label="Serve · Return strategy" accent={GOLD}>
        {(['returning', 'serving'] as const).map((mode, mi) => (
          <div key={mode} style={{ marginBottom: mi === 0 ? 22 : 12 }}>
            <div style={{
              fontFamily: FONT_DATA, fontSize: 10, color: GOLD, letterSpacing: 2,
              textTransform: 'uppercase', marginBottom: 12,
            }}>When you are {mode}</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <SrCard side="deuce" {...brief.serveReturn[mode].deuce} />
              <SrCard side="ad" {...brief.serveReturn[mode].ad} />
            </div>
          </div>
        ))}
        {/* Guardrail */}
        <div style={{
          padding: '10px 12px',
          background: `${A}10`, border: `1px solid ${A}33`, borderRadius: 8,
          display: 'flex', gap: 10, alignItems: 'baseline',
        }}>
          <span style={{
            fontFamily: FONT_DATA, fontSize: 9, color: A,
            letterSpacing: 2, textTransform: 'uppercase', flexShrink: 0,
          }}>GUARDRAIL</span>
          <span style={{ fontSize: 12, color: WHITE, fontFamily: FONT_BODY, lineHeight: 1.45 }}>
            {brief.serveReturn.guardrail}
          </span>
        </div>
      </HeroCard>

      {/* WARM-UP DRILLS */}
      {brief.warmupDrills.length > 0 && (
        <div style={{ background: BG2, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 18, marginBottom: 14 }}>
          <div style={supportLabel}>Warm-up drills</div>
          {brief.warmupDrills.map((w, i) => (
            <div key={i} style={{
              marginBottom: i === brief.warmupDrills.length - 1 ? 0 : 14,
              paddingBottom: i === brief.warmupDrills.length - 1 ? 0 : 14,
              borderBottom: i === brief.warmupDrills.length - 1 ? 'none' : `1px solid ${BORDER}`,
            }}>
              <div style={{ fontSize: 14, color: WHITE, fontFamily: FONT_BODY, lineHeight: 1.4, marginBottom: 4, fontWeight: 600 }}>
                {w.drill}
              </div>
              <div style={{ fontSize: 11, color: GOLD_DIM, fontFamily: FONT_DATA, lineHeight: 1.5 }}>
                ↳ {w.stat}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MENTAL READ */}
      <div style={{
        background: BG2, border: `1px solid ${A}33`, borderRadius: 12,
        padding: 18, marginBottom: 18,
      }}>
        <div style={{ ...supportLabel, color: A }}>Mental read</div>
        <div style={{ fontSize: 18, fontFamily: FONT_DISPLAY, color: WHITE, letterSpacing: 1, marginBottom: 8 }}>
          {brief.mentalRead.headline.toUpperCase()}
        </div>
        <div style={{ fontSize: 14, color: '#bbb', fontFamily: FONT_BODY, lineHeight: 1.5, marginBottom: 10 }}>
          {brief.mentalRead.text}
        </div>
        <div style={{ fontSize: 10, color: GOLD_DIM, fontFamily: FONT_DATA, lineHeight: 1.5 }}>
          ↳ {brief.mentalRead.derivation}
        </div>
      </div>

      {/* EVIDENCE — collapsible */}
      {brief.evidence.length > 0 && (
        <>
          <button
            onClick={() => setEvidenceOpen(!evidenceOpen)}
            style={{
              width: '100%', background: 'transparent',
              border: `1px solid ${BORDER}`, borderRadius: 12,
              padding: '12px 16px', color: MUTED,
              fontFamily: FONT_DATA, fontSize: 11, letterSpacing: 1.5,
              textTransform: 'uppercase', cursor: 'pointer',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}
          >
            <span>Evidence — every claim, every data point</span>
            <span style={{ fontSize: 14 }}>{evidenceOpen ? '▾' : '▸'}</span>
          </button>

          {evidenceOpen && (
            <div style={{
              marginTop: 12, padding: 18,
              background: BG2, border: `1px solid ${BORDER}`, borderRadius: 12,
            }}>
              <div style={supportLabel}>Brief receipts</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {brief.evidence.map((c, i) => (
                  <div key={i} style={{
                    paddingBottom: i === brief.evidence.length - 1 ? 0 : 16,
                    borderBottom: i === brief.evidence.length - 1 ? 'none' : `1px solid ${BORDER}`,
                    opacity: c.gap ? 0.6 : 1,
                  }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: c.gap ? A : WHITE, fontFamily: FONT_BODY, marginBottom: 4 }}>
                      {c.gap && '⚠ '}{c.claim}
                    </div>
                    <div style={{ fontSize: 11, color: '#888', fontFamily: FONT_DATA, lineHeight: 1.5, marginBottom: 6 }}>
                      {c.data}
                    </div>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {c.matchIds.map((mid) => (
                        <button
                          key={mid}
                          onClick={() => onMatchClick?.(mid)}
                          style={{
                            fontSize: 10, fontFamily: FONT_DATA, color: B,
                            padding: '3px 8px', background: `${B}11`,
                            border: `1px solid ${B}33`, borderRadius: 4,
                            cursor: 'pointer',
                          }}
                        >→ {mid}</button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
