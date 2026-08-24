// @ts-nocheck
'use client'

import React from 'react'

const spinKeyframes = `@keyframes bestie-spin { to { transform: rotate(360deg) } }`
const shimmerKeyframes = `@keyframes bestie-shimmer {
  0% { background-position: -400px 0 }
  100% { background-position: 400px 0 }
}`

type PageLoaderProps = {
  message?: string
  fullscreen?: boolean
}

export function PageLoader({ message = 'Loading…', fullscreen = true }: PageLoaderProps) {
  return (
    <div
      style={{
        minHeight: fullscreen ? '100vh' : '300px',
        background: fullscreen ? 'var(--bg)' : 'transparent',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'Plus Jakarta Sans, sans-serif',
      }}
    >
      <style>{spinKeyframes}</style>
      <div style={{ textAlign: 'center' }}>
        <div
          style={{
            width: '36px',
            height: '36px',
            border: '3px solid rgba(212,175,55,0.18)',
            borderTop: '3px solid #D4AF37',
            borderRadius: '50%',
            margin: '0 auto 14px',
            animation: 'bestie-spin 0.9s linear infinite',
          }}
        />
        {message && (
          <p style={{ color: 'var(--text-muted)', fontSize: '13px', fontWeight: 500, letterSpacing: '0.2px' }}>
            {message}
          </p>
        )}
      </div>
    </div>
  )
}

type InlineSpinnerProps = {
  size?: number
  color?: string
}

export function InlineSpinner({ size = 16, color = '#D4AF37' }: InlineSpinnerProps) {
  return (
    <>
      <style>{spinKeyframes}</style>
      <span
        style={{
          display: 'inline-block',
          width: `${size}px`,
          height: `${size}px`,
          border: `2px solid ${color}33`,
          borderTopColor: color,
          borderRadius: '50%',
          animation: 'bestie-spin 0.8s linear infinite',
          verticalAlign: 'middle',
        }}
      />
    </>
  )
}

type CardSkeletonProps = {
  height?: number | string
  width?: number | string
  radius?: number | string
  style?: React.CSSProperties
}

export function CardSkeleton({ height = 120, width = '100%', radius = 16, style }: CardSkeletonProps) {
  return (
    <>
      <style>{shimmerKeyframes}</style>
      <div
        style={{
          width,
          height: typeof height === 'number' ? `${height}px` : height,
          borderRadius: typeof radius === 'number' ? `${radius}px` : radius,
          background:
            'linear-gradient(90deg, var(--surface-1) 0%, var(--surface-3) 50%, var(--surface-1) 100%)',
          backgroundSize: '800px 100%',
          animation: 'bestie-shimmer 1.4s ease-in-out infinite',
          ...style,
        }}
      />
    </>
  )
}

type SkeletonListProps = {
  count?: number
  height?: number
  gap?: number
}

export function SkeletonList({ count = 3, height = 80, gap = 12 }: SkeletonListProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: `${gap}px` }}>
      {Array.from({ length: count }).map((_, i) => (
        <CardSkeleton key={i} height={height} />
      ))}
    </div>
  )
}
