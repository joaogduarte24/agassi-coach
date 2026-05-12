'use client'
import { ReactNode, CSSProperties } from 'react'
import { MUTED, FONT_BODY, S } from '@/app/lib/helpers'

interface SectionHeaderProps {
  style?: CSSProperties
  children: ReactNode
}

export default function SectionHeader({ style, children }: SectionHeaderProps) {
  return (
    <div style={{
      fontFamily: FONT_BODY,
      fontSize: 10,
      fontWeight: 700,
      letterSpacing: 2,
      textTransform: 'uppercase',
      color: MUTED,
      marginBottom: S.md,
      ...style,
    }}>
      {children}
    </div>
  )
}
