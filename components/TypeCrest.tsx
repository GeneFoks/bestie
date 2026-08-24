// @ts-nocheck
'use client'

/**
 * TypeCrest — the visual sigil of a Bestie Type.
 * A radial-gradient medallion built from the type's family (values) and
 * collective (mode of action) element colors, wrapped in a thin gold ring,
 * with a serif monogram at the center.
 *
 * Used on the Bestie Type result ceremony; the 9:16 share card
 * (app/api/type-card/[type]) mirrors this design server-side.
 */

import { TYPES, ELEMENTS } from '@/lib/socionics'

const GOLD = '#D4AF37'

type Props = {
  typeId: string            // 4-letter key, e.g. 'INLR'
  size?: number             // outer diameter in px
  name?: string             // optional display name (localized) under the medallion
  tagline?: string          // optional one-line archetype under the name
}

export default function TypeCrest({ typeId, size = 168, name, tagline }: Props) {
  const t = TYPES[typeId]
  if (!t) return null
  const famColor = ELEMENTS[t.fam].color   // outer field — core values
  const colColor = ELEMENTS[t.col].color   // inner light — mode of action
  const monogram = t.name[0]               // serif initial, stable across languages

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      {/* Gold ring */}
      <div style={{
        width: `${size}px`, height: `${size}px`, borderRadius: '50%',
        padding: `${Math.round(size * 0.045)}px`, boxSizing: 'border-box',
        border: `1px solid rgba(212,175,55,0.65)`,
        boxShadow: `0 0 ${Math.round(size * 0.5)}px ${famColor}44, inset 0 0 0 1px rgba(212,175,55,0.12)`,
        display: 'flex', flexShrink: 0,
      }}>
        {/* Gradient disc */}
        <div style={{
          width: '100%', height: '100%', borderRadius: '50%',
          background: `radial-gradient(circle at 32% 28%, ${colColor} 0%, ${famColor} 62%, #0B0A18 135%)`,
          boxShadow: `inset 0 ${-Math.round(size * 0.1)}px ${Math.round(size * 0.25)}px rgba(0,0,0,0.38), inset 0 ${Math.round(size * 0.03)}px ${Math.round(size * 0.12)}px rgba(255,255,255,0.18)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <span style={{
            fontFamily: 'DM Serif Display, serif',
            fontSize: `${Math.round(size * 0.42)}px`,
            color: 'rgba(255,255,255,0.95)',
            textShadow: '0 2px 18px rgba(0,0,0,0.5)',
            lineHeight: 1, userSelect: 'none',
          }}>{monogram}</span>
        </div>
      </div>

      {name && (
        <div style={{ fontFamily: 'DM Serif Display, serif', fontSize: `${Math.round(size * 0.21)}px`, color: '#F0EAFF', marginTop: '14px', textAlign: 'center', lineHeight: 1.15 }}>
          {name}
        </div>
      )}
      {tagline && (
        <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: '13px', color: '#A99ECC', marginTop: '6px', textAlign: 'center', lineHeight: 1.5, maxWidth: `${size * 2.2}px` }}>
          {tagline}
        </div>
      )}
    </div>
  )
}
