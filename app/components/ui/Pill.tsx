'use client'
import { ReactNode } from 'react'
import { G, A, R, B, GD, AD, RD, BG3, MUTED, BORDER, FONT_DATA, RAD } from '@/app/lib/helpers'

type PillVariant = 'green' | 'amber' | 'red' | 'blue' | 'dim'

interface PillProps {
  variant: PillVariant
  children: ReactNode
}

const STYLES: Record<PillVariant, { bg: string; color: string; border?: string }> = {
  green: { bg: GD,             color: G },
  amber: { bg: AD,             color: A },
  red:   { bg: RD,             color: R },
  blue:  { bg: 'rgba(96,165,250,0.08)', color: B },
  dim:   { bg: BG3,            color: MUTED, border: `1px solid ${BORDER}` },
}

export default function Pill({ variant, children }: PillProps) {
  const s = STYLES[variant]
  return (
    <span style={{
      padding: '4px 10px',
      borderRadius: RAD.pill,
      background: s.bg,
      color: s.color,
      border: s.border,
      fontFamily: FONT_DATA,
      fontSize: 10,
      fontWeight: 500,
      whiteSpace: 'nowrap',
    }}>
      {children}
    </span>
  )
}
