'use client'
import { CSSProperties, ReactNode } from 'react'
import { BG2, BG3, BORDER, BORDER2, FONT_DATA, NULL_STATE, S, RAD } from '@/app/lib/helpers'

type CardVariant = 'default' | 'inset'

interface CardProps {
  variant?: CardVariant
  title?: string
  hover?: boolean
  onClick?: () => void
  style?: CSSProperties
  children: ReactNode
}

const VARIANTS: Record<CardVariant, CSSProperties> = {
  default: { background: BG2, border: `1px solid ${BORDER}`, borderRadius: RAD.lg, padding: S.lg },
  inset:   { background: BG3, border: 'none',                  borderRadius: RAD.md, padding: S.md - 2 },
}

export default function Card({ variant = 'default', title, hover, onClick, style, children }: CardProps) {
  const base = VARIANTS[variant]
  return (
    <div
      onClick={onClick}
      style={{
        ...base,
        marginBottom: S.sm,
        cursor: onClick ? 'pointer' : undefined,
        transition: hover || onClick ? 'border-color 0.15s' : undefined,
        ...style,
      }}
      onMouseEnter={hover ? e => (e.currentTarget.style.borderColor = BORDER2) : undefined}
      onMouseLeave={hover ? e => (e.currentTarget.style.borderColor = BORDER) : undefined}
    >
      {title && (
        <div style={{
          fontSize: 10, letterSpacing: 2, textTransform: 'uppercase',
          fontFamily: FONT_DATA, color: NULL_STATE, marginBottom: S.sm,
        }}>{title}</div>
      )}
      {children}
    </div>
  )
}
