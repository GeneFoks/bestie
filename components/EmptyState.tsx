// @ts-nocheck
import React from 'react'
import Link from 'next/link'
import type { LucideIcon } from 'lucide-react'

type CTA = {
  label: string
  href?: string
  onClick?: () => void
}

type EmptyStateProps = {
  Icon?: LucideIcon
  title: string
  description?: React.ReactNode
  primaryCTA?: CTA
  secondaryCTA?: CTA
  accent?: 'gold' | 'purple' | 'green'
  size?: 'sm' | 'md' | 'lg'
}

const accents = {
  gold:   { bg: 'rgba(212,175,55,0.10)', border: 'rgba(212,175,55,0.18)', color: '#D4AF37' },
  purple: { bg: 'rgba(155,127,255,0.10)', border: 'rgba(155,127,255,0.18)', color: '#9B7FFF' },
  green:  { bg: 'rgba(52,211,153,0.10)', border: 'rgba(52,211,153,0.18)', color: '#34D399' },
}

const sizes = {
  sm: { padding: '24px 20px', iconBox: 44, iconSize: 22, titleSize: 15, descSize: 13 },
  md: { padding: '36px 28px', iconBox: 56, iconSize: 28, titleSize: 17, descSize: 14 },
  lg: { padding: '52px 32px', iconBox: 72, iconSize: 36, titleSize: 20, descSize: 15 },
}

/**
 * Consistent empty-state component for "no X yet" surfaces.
 * Designed to turn dead ends into onboarding moments — every empty state
 * should explain the value (what will happen) and offer at least one CTA.
 */
export function EmptyState({
  Icon,
  title,
  description,
  primaryCTA,
  secondaryCTA,
  accent = 'gold',
  size = 'md',
}: EmptyStateProps) {
  const tone = accents[accent]
  const dims = sizes[size]

  return (
    <div
      style={{
        padding: dims.padding,
        borderRadius: '20px',
        background: 'var(--surface-1)',
        border: '1px solid var(--border)',
        textAlign: 'center',
        fontFamily: 'Plus Jakarta Sans, sans-serif',
      }}
    >
      {Icon && (
        <div
          style={{
            width: `${dims.iconBox}px`,
            height: `${dims.iconBox}px`,
            borderRadius: `${Math.round(dims.iconBox * 0.28)}px`,
            background: tone.bg,
            border: `1px solid ${tone.border}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 14px',
          }}
        >
          <Icon size={dims.iconSize} color={tone.color} strokeWidth={1.6} />
        </div>
      )}
      <p
        style={{
          fontSize: `${dims.titleSize}px`,
          fontWeight: 700,
          color: 'var(--text-primary)',
          fontFamily: 'DM Serif Display, serif',
          marginBottom: description ? '8px' : '16px',
        }}
      >
        {title}
      </p>
      {description && (
        <div
          style={{
            fontSize: `${dims.descSize}px`,
            color: 'var(--text-muted)',
            lineHeight: 1.6,
            maxWidth: '380px',
            margin: '0 auto 18px',
          }}
        >
          {description}
        </div>
      )}
      {(primaryCTA || secondaryCTA) && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {primaryCTA &&
            (primaryCTA.href ? (
              <Link
                href={primaryCTA.href}
                style={{
                  padding: '10px 22px',
                  borderRadius: '12px',
                  fontSize: '13px',
                  fontWeight: 700,
                  background: 'linear-gradient(135deg, #D4AF37 0%, #B8960C 100%)',
                  color: '#09090F',
                  textDecoration: 'none',
                  whiteSpace: 'nowrap',
                }}
              >
                {primaryCTA.label}
              </Link>
            ) : (
              <button
                onClick={primaryCTA.onClick}
                style={{
                  padding: '10px 22px',
                  borderRadius: '12px',
                  fontSize: '13px',
                  fontWeight: 700,
                  background: 'linear-gradient(135deg, #D4AF37 0%, #B8960C 100%)',
                  color: '#09090F',
                  border: 'none',
                  cursor: 'pointer',
                  fontFamily: 'Plus Jakarta Sans, sans-serif',
                  whiteSpace: 'nowrap',
                }}
              >
                {primaryCTA.label}
              </button>
            ))}
          {secondaryCTA &&
            (secondaryCTA.href ? (
              <Link
                href={secondaryCTA.href}
                style={{
                  padding: '10px 22px',
                  borderRadius: '12px',
                  fontSize: '13px',
                  fontWeight: 600,
                  background: 'var(--overlay)',
                  border: '1px solid var(--border)',
                  color: 'var(--text-muted)',
                  textDecoration: 'none',
                  whiteSpace: 'nowrap',
                }}
              >
                {secondaryCTA.label}
              </Link>
            ) : (
              <button
                onClick={secondaryCTA.onClick}
                style={{
                  padding: '10px 22px',
                  borderRadius: '12px',
                  fontSize: '13px',
                  fontWeight: 600,
                  background: 'var(--overlay)',
                  border: '1px solid var(--border)',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  fontFamily: 'Plus Jakarta Sans, sans-serif',
                  whiteSpace: 'nowrap',
                }}
              >
                {secondaryCTA.label}
              </button>
            ))}
        </div>
      )}
    </div>
  )
}
