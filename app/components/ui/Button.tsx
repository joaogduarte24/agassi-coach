'use client'
import { ReactNode } from 'react'
import { BORDER2, GOLD, GOLD_DIM, MUTED, DIM, R, FONT_BODY, RAD } from '@/app/lib/helpers'

type ButtonVariant = 'primary' | 'destructive'

interface ButtonProps {
  variant?: ButtonVariant
  onClick?: () => void
  disabled?: boolean
  children: ReactNode
}

export default function Button({ variant = 'primary', onClick, disabled, children }: ButtonProps) {
  const isDestructive = variant === 'destructive'
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: isDestructive ? 0 : 14,
        border: isDestructive ? 'none' : `1px solid ${BORDER2}`,
        background: 'none',
        color: isDestructive ? DIM : MUTED,
        borderRadius: isDestructive ? 0 : RAD.md,
        fontFamily: FONT_BODY,
        fontSize: 12,
        fontWeight: 600,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.4 : 1,
        transition: 'color 0.15s, border-color 0.15s',
        width: isDestructive ? 'auto' : '100%',
      }}
      onMouseEnter={e => {
        if (disabled) return
        if (isDestructive) e.currentTarget.style.color = R
        else { e.currentTarget.style.color = GOLD; e.currentTarget.style.borderColor = GOLD_DIM }
      }}
      onMouseLeave={e => {
        if (isDestructive) e.currentTarget.style.color = DIM
        else { e.currentTarget.style.color = MUTED; e.currentTarget.style.borderColor = BORDER2 }
      }}
    >
      {children}
    </button>
  )
}
