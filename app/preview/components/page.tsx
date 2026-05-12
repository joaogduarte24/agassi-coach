'use client'
import { useState } from 'react'
import Card from '@/app/components/ui/Card'
import Chip from '@/app/components/ui/Chip'
import Pill from '@/app/components/ui/Pill'
import Button from '@/app/components/ui/Button'
import SectionHeader from '@/app/components/ui/SectionHeader'
import {
  G, A, R, B, GD, AD, RD,
  BG, BG2, BG3, BORDER, BORDER2,
  WHITE, MUTED, MUTED_HI, DIM, NULL_STATE,
  GOLD, GOLD_DIM,
  FONT_BODY, FONT_DATA, FONT_DISPLAY,
  S, RAD,
} from '@/app/lib/helpers'

// ─── Inline replicas of the CURRENT patterns, copy-pasted from real components ──
// Kept here verbatim so we can spot drift between extracted and inline versions.

function InlineCardCurrent({ title, children }: any) {
  return (
    <div style={{background:'#1e1e1e',borderRadius:10,padding:14,marginBottom:12}}>
      <div style={{fontSize:10,letterSpacing:2,color:'#555',textTransform:'uppercase',fontFamily: FONT_DATA,marginBottom:12}}>{title}</div>
      {children}
    </div>
  )
}

function InlineMainCard({ children }: any) {
  return (
    <div style={{background:'#141414',border:'1px solid #222',borderRadius:16,padding:20,marginBottom:12}}>
      {children}
    </div>
  )
}

function InlineChip({ selected, children, onClick }: any) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '8px 16px',
        borderRadius: 20,
        border: `1px solid ${selected ? GOLD_DIM : BORDER2}`,
        background: selected ? 'rgba(196,169,106,0.08)' : BG2,
        color: selected ? GOLD : MUTED,
        fontFamily: FONT_BODY, fontSize: 12, fontWeight: 500, cursor: 'pointer',
      }}
    >{children}</button>
  )
}

function InlinePillGreen({ children }: any) {
  return <span style={{padding:'4px 10px',borderRadius:20,background:GD,color:G,fontFamily:FONT_DATA,fontSize:10,fontWeight:500}}>{children}</span>
}

function InlineButtonPrimary({ children }: any) {
  return (
    <button style={{
      padding: 14, border: `1px solid ${BORDER2}`, background: 'none',
      color: MUTED, borderRadius: 12, fontFamily: FONT_BODY, fontSize: 12, fontWeight: 600,
      cursor: 'pointer', width: '100%',
    }}>{children}</button>
  )
}

function InlineSectionHeader({ children }: any) {
  return <div style={{fontSize:10,fontWeight:700,letterSpacing:2,textTransform:'uppercase',color:MUTED,marginBottom:16,fontFamily:FONT_BODY}}>{children}</div>
}

// ─── Helpers ────────────────────────────────────────────────────────────────────

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{marginBottom: S.md}}>
      <div style={{fontFamily: FONT_DATA, fontSize: 10, color: MUTED, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8}}>{label}</div>
      {children}
    </div>
  )
}

function ColTitle({ children }: any) {
  return <div style={{fontFamily: FONT_DATA, fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', color: GOLD_DIM, marginBottom: S.sm}}>{children}</div>
}

function H2({ children }: any) {
  return <h2 style={{fontFamily: FONT_DISPLAY, fontSize: 28, letterSpacing: 1, color: WHITE, marginTop: S.xxl, marginBottom: S.lg, borderLeft: `2px solid ${GOLD_DIM}`, paddingLeft: 12}}>{children}</h2>
}

// ─── Page ───────────────────────────────────────────────────────────────────────

export default function ComponentsPreview() {
  const [selectedChips, setSelectedChips] = useState<Record<string, boolean>>({ 'In flow': true })
  const toggleChip = (k: string) => setSelectedChips(p => ({...p, [k]: !p[k]}))

  return (
    <div style={{background: BG, minHeight: '100vh', color: WHITE, fontFamily: FONT_BODY, padding: S.lg, maxWidth: 900, margin: '0 auto'}}>
      <div style={{borderBottom: `1px solid ${BORDER}`, paddingBottom: S.lg, marginBottom: S.xl}}>
        <div style={{fontFamily: FONT_DISPLAY, fontSize: 36, letterSpacing: 2, color: WHITE}}>UI COMPONENTS</div>
        <div style={{fontFamily: FONT_DATA, fontSize: 11, color: MUTED, marginTop: 4}}>Phase 2 preview · extracted vs current · {new Date().toISOString().slice(0,10)}</div>
      </div>

      {/* Tokens recap */}
      <H2>Tokens</H2>
      <Card>
        <SectionHeader>COLOURS</SectionHeader>
        <div style={{display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: S.sm}}>
          {[
            ['BG', BG], ['BG1', '#1a1a1a'], ['BG2', BG2], ['BG3', BG3], ['BORDER', BORDER], ['BORDER2', BORDER2],
            ['WHITE', WHITE], ['MUTED_HI', MUTED_HI], ['MUTED', MUTED], ['NULL_STATE', NULL_STATE], ['DIM', DIM], ['—', 'transparent'],
            ['G', G], ['A', A], ['R', R], ['B', B], ['GOLD', GOLD], ['GOLD_DIM', GOLD_DIM],
          ].map(([name, hex]) => (
            <div key={name} style={{textAlign: 'center'}}>
              <div style={{height: 36, background: hex, borderRadius: RAD.sm, border: `1px solid ${BORDER}`}}/>
              <div style={{fontFamily: FONT_DATA, fontSize: 9, color: MUTED, marginTop: 4}}>{name}</div>
            </div>
          ))}
        </div>
      </Card>

      {/* Card */}
      <H2>Card</H2>
      <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: S.md}}>
        <div>
          <ColTitle>NEW · &lt;Card&gt;</ColTitle>
          <Card>Default card. <code>variant="default"</code>. BG2, BORDER, radius {RAD.lg}, padding {S.lg}.</Card>
          <Card hover>Hoverable card — border lightens on hover.</Card>
          <Card title="DIAGNOSIS">
            <div style={{color: MUTED, fontSize: 13}}>With title prop. Mono uppercase label, NULL_STATE colour, 2px tracking.</div>
          </Card>
          <Card variant="inset">
            Inset variant. BG3, no border, radius {RAD.md}, padding {S.md - 2}. Used for sub-cards inside another card.
          </Card>
        </div>
        <div>
          <ColTitle>CURRENT INLINE</ColTitle>
          <InlineMainCard>Main card pattern (used in MatchDetail header). Matches DESIGN.md.</InlineMainCard>
          <InlineCardCurrent title="DIAGNOSIS">
            <div style={{color: MUTED, fontSize: 13}}>MatchDetail's local <code>Card</code> helper. <strong>#1e1e1e bg, radius 10, padding 14</strong> — close to <code>variant="inset"</code> but uses an undocumented bg.</div>
          </InlineCardCurrent>
        </div>
      </div>

      {/* Chip */}
      <H2>Chip</H2>
      <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: S.md}}>
        <div>
          <ColTitle>NEW · &lt;Chip&gt;</ColTitle>
          <Card>
            <Row label="Single select">
              <div style={{display: 'flex', gap: 6, flexWrap: 'wrap'}}>
                {['In flow', 'Confident', 'Grinding', 'Frustrated', 'Flat'].map(k => (
                  <Chip key={k} selected={!!selectedChips[k]} onClick={() => toggleChip(k)}>{k}</Chip>
                ))}
              </div>
            </Row>
            <Row label="Default · unselected · disabled-look (no onClick)">
              <div style={{display: 'flex', gap: 6}}>
                <Chip>Easier than me</Chip>
                <Chip selected>Even</Chip>
                <Chip>Tougher than me</Chip>
              </div>
            </Row>
          </Card>
        </div>
        <div>
          <ColTitle>CURRENT INLINE</ColTitle>
          <Card>
            <Row label="As written in journal forms">
              <div style={{display: 'flex', gap: 6, flexWrap: 'wrap'}}>
                <InlineChip selected>In flow</InlineChip>
                <InlineChip>Confident</InlineChip>
                <InlineChip>Grinding</InlineChip>
              </div>
            </Row>
          </Card>
        </div>
      </div>

      {/* Pill */}
      <H2>Pill</H2>
      <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: S.md}}>
        <div>
          <ColTitle>NEW · &lt;Pill&gt;</ColTitle>
          <Card>
            <Row label="All variants">
              <div style={{display: 'flex', gap: 6, flexWrap: 'wrap'}}>
                <Pill variant="green">67% BP</Pill>
                <Pill variant="amber">56% srv</Pill>
                <Pill variant="red">43 UE</Pill>
                <Pill variant="blue">UTR 3.75</Pill>
                <Pill variant="dim">— no data</Pill>
              </div>
            </Row>
            <Row label="Win / loss badges (nav)">
              <div style={{display: 'flex', gap: 6}}>
                <Pill variant="green">5W</Pill>
                <Pill variant="red">5L</Pill>
              </div>
            </Row>
          </Card>
        </div>
        <div>
          <ColTitle>CURRENT INLINE</ColTitle>
          <Card>
            <Row label="Green pill, as written today">
              <InlinePillGreen>67% BP</InlinePillGreen>
            </Row>
          </Card>
        </div>
      </div>

      {/* Button */}
      <H2>Button</H2>
      <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: S.md}}>
        <div>
          <ColTitle>NEW · &lt;Button&gt;</ColTitle>
          <Card>
            <Row label="Primary (full-width, hover → gold)">
              <Button variant="primary">View full stats</Button>
            </Row>
            <Row label="Primary · disabled">
              <Button variant="primary" disabled>Loading…</Button>
            </Row>
            <Row label="Destructive (text-only, hover → red)">
              <Button variant="destructive">Delete match</Button>
            </Row>
          </Card>
        </div>
        <div>
          <ColTitle>CURRENT INLINE</ColTitle>
          <Card>
            <Row label="Primary as used today">
              <InlineButtonPrimary>View full stats</InlineButtonPrimary>
            </Row>
          </Card>
        </div>
      </div>

      {/* Section header */}
      <H2>Section header</H2>
      <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: S.md}}>
        <div>
          <ColTitle>NEW · &lt;SectionHeader&gt;</ColTitle>
          <Card>
            <SectionHeader>WHAT DECIDED IT</SectionHeader>
            <div style={{color: MUTED, fontSize: 13}}>Used between cards as a divider. Inter 10/700, +2px tracking, MUTED colour.</div>
          </Card>
        </div>
        <div>
          <ColTitle>CURRENT INLINE</ColTitle>
          <Card>
            <InlineSectionHeader>WHAT DECIDED IT</InlineSectionHeader>
            <div style={{color: MUTED, fontSize: 13}}>Pattern from Strategy / PreMatchBrief — already matches.</div>
          </Card>
        </div>
      </div>

      {/* Composed real example */}
      <H2>Composed example (mini debrief card)</H2>
      <ColTitle>Uses Card + SectionHeader + Pill + Button — to sanity-check they compose</ColTitle>
      <Card>
        <SectionHeader>DIAGNOSIS</SectionHeader>
        <div style={{fontFamily: FONT_DISPLAY, fontSize: 22, color: R, letterSpacing: 1, marginBottom: S.sm}}>EXECUTION BREAKDOWN</div>
        <div style={{display: 'flex', gap: 6, marginBottom: S.md}}>
          <Pill variant="red">43 UE (avg 39)</Pill>
          <Pill variant="amber">5 winners (avg 13)</Pill>
        </div>
        <Card variant="inset">
          <div style={{fontFamily: FONT_DATA, fontSize: 9, color: NULL_STATE, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 6}}>NEXT TIME</div>
          <div style={{fontSize: 13, color: WHITE, lineHeight: 1.5}}>
            Review the stat breakdown and identify the biggest gap vs your average.
          </div>
        </Card>
        <div style={{marginTop: S.md}}>
          <Button variant="primary">Open full match</Button>
        </div>
      </Card>

      <div style={{borderTop: `1px solid ${BORDER}`, paddingTop: S.lg, marginTop: S.xxl, color: MUTED, fontSize: 11, fontFamily: FONT_DATA}}>
        END · sign off here before refactoring consumers
      </div>
    </div>
  )
}
