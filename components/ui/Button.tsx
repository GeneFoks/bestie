'use client'

// Shared button system. Three variants encode action hierarchy:
//   • primary → the ONE main action on a screen (gold gradient)
//   • ghost   → secondary actions (outline)
//   • danger  → destructive / warning actions
// Use <Button> for onClick actions and <ButtonLink> for navigation.

import Link from 'next/link'
import type { ButtonHTMLAttributes, CSSProperties, ReactNode } from 'react'
import { colors, radius, font, goldGradient } from '@/lib/tokens'

type Variant = 'primary' | 'ghost' | 'danger'
type Size = 'sm' | 'md'

export function buttonStyle(variant: Variant = 'primary', size: Size = 'md'): CSSProperties {
  const base: CSSProperties = {
    fontFamily: font.sans,
    fontWeight: 700,
    borderRadius: radius.lg,
    cursor: 'pointer',
    textDecoration: 'none',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    transition: 'all 0.2s',
    padding: size === 'sm' ? '9px 16px' : '14px 20px',
    fontSize: size === 'sm' ? '14px' : '15px',
    border: '1px solid transparent',
  }
  if (variant === 'primary') {
    return { ...base, background: goldGradient, color: colors.bg, border: 'none' }
  }
  if (variant === 'danger') {
    return { ...base, background: 'rgba(255,107,107,0.12)', color: colors.danger, border: '1px solid rgba(255,107,107,0.30)' }
  }
  // ghost
  return { ...base, background: 'rgba(255,255,255,0.05)', color: colors.textPrimary, border: `1px solid ${colors.border}` }
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size }

export function Button({ variant, size, style, children, ...rest }: ButtonProps) {
  return (
    <button style={{ ...buttonStyle(variant, size), ...style }} {...rest}>
      {children}
    </button>
  )
}

type ButtonLinkProps = { href: string; variant?: Variant; size?: Size; style?: CSSProperties; children: ReactNode }

export function ButtonLink({ href, variant, size, style, children }: ButtonLinkProps) {
  return (
    <Link href={href} style={{ ...buttonStyle(variant, size), ...style }}>
      {children}
    </Link>
  )
}
