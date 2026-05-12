'use client'
import { ReactNode } from 'react'
import { BG2, BORDER2, MUTED, GOLD, GOLD_DIM, FONT_BODY, RAD } from '@/app/lib/helpers'

interface ChipProps {
  selected?: boolean
  onClick?: () => void
  children: ReactNode
}

export default function Chip({ selected, onClick, children }: ChipProps) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '8px 16px',
        borderRadius: RAD.pill,
        border: `1px solid ${selected ? GOLD_DIM : BORDER2}`,
        background: selected ? 'rgba(196,169,106,0.08)' : BG2,
        color: selected ? GOLD : MUTED,
        fontFamily: FONT_BODY,
        fontSize: 12,
        fontWeight: 500,
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all 0.15s',
      }}
    >
      {children}
    </button>
  )
}
