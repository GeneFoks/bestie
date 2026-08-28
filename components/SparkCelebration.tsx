// @ts-nocheck
'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { X, Sparkles, ArrowRight } from 'lucide-react'
import { celebrate, buzz } from '@/lib/celebrate'

// Shown when the user opens the dashboard and has an uncelebrated Spark —
// someone vouched for them while they were away. Sparks are the rarest trust
// signal on Bestie, so receiving one should feel like a moment, not a
// notification row. Mirrors MatchCelebration's modal style (z-index 10000,
// confetti above at 10001).

export default function SparkCelebration({
  labels,
  giverName,
  giverUsername,
  onClose,
}: {
  labels: string              // e.g. "Kind · Genuine" (notification body)
  giverName?: string          // giver's first name, if known
  giverUsername?: string      // enables "Send one back" deep link
  onClose: () => void
}) {
  // Confetti on mount — above the modal backdrop (which sits at 10000).
  useEffect(() => {
    celebrate({ count: 50, spread: 90, zIndex: 10001 })
    buzz('success')
  }, [])

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
      style={{ position: 'fixed', inset: 0, zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(5,5,12,0.78)', backdropFilter: 'blur(6px)', padding: '20px', fontFamily: 'Plus Jakarta Sans, sans-serif' }}
    >
      <div style={{ position: 'relative', width: '100%', maxWidth: '360px', background: 'var(--surface-1)', border: '1px solid rgba(212,175,55,0.35)', borderRadius: '24px', padding: '32px 26px', textAlign: 'center', boxShadow: '0 24px 70px rgba(0,0,0,0.6), 0 0 48px rgba(212,175,55,0.18)' }}>
        <button
          onClick={onClose}
          aria-label="Close"
          style={{ position: 'absolute', top: '14px', right: '14px', width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--overlay)', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
        >
          <X size={16} />
        </button>

        {/* Glowing spark badge */}
        <div style={{ width: '64px', height: '64px', borderRadius: '50%', margin: '0 auto 16px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'radial-gradient(circle, rgba(212,175,55,0.25) 0%, rgba(212,175,55,0.08) 100%)', border: '1px solid rgba(212,175,55,0.4)', boxShadow: '0 0 28px rgba(212,175,55,0.35)' }}>
          <Sparkles size={30} color="#D4AF37" strokeWidth={1.8} />
        </div>

        <h2 style={{ fontFamily: 'DM Serif Display, serif', fontSize: '24px', color: '#D4AF37', marginBottom: '8px' }}>✨ You received a Spark!</h2>

        {labels && (
          <p style={{ display: 'inline-block', padding: '7px 16px', borderRadius: '999px', background: 'rgba(212,175,55,0.10)', border: '1px solid rgba(212,175,55,0.25)', fontSize: '14px', fontWeight: 700, color: '#D4AF37', marginBottom: '10px' }}>
            {labels}
          </p>
        )}

        <p style={{ fontSize: '14px', color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: '24px' }}>
          {giverName
            ? <><span style={{ color: 'var(--text-primary)', fontWeight: 700 }}>{giverName}</span> vouched for you. That's how trust grows here.</>
            : <>Someone vouched for you. That's how trust grows here.</>}
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {giverUsername ? (
            <Link
              href={`/sparks/give?to=${giverUsername}`}
              onClick={onClose}
              style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '13px 18px', borderRadius: '14px', fontSize: '15px', fontWeight: 700, background: 'linear-gradient(135deg, #D4AF37 0%, #B8960C 100%)', border: 'none', color: '#09090F', textDecoration: 'none', width: '100%', boxSizing: 'border-box', boxShadow: '0 4px 16px rgba(212,175,55,0.25)' }}
            >
              Send one back <ArrowRight size={15} strokeWidth={2.2} />
            </Link>
          ) : (
            <button
              onClick={onClose}
              style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '13px 18px', borderRadius: '14px', fontSize: '15px', fontWeight: 700, background: 'linear-gradient(135deg, #D4AF37 0%, #B8960C 100%)', border: 'none', color: '#09090F', cursor: 'pointer', width: '100%', boxShadow: '0 4px 16px rgba(212,175,55,0.25)', fontFamily: 'Plus Jakarta Sans, sans-serif' }}
            >
              Nice! <ArrowRight size={15} strokeWidth={2.2} />
            </button>
          )}

          <button
            onClick={onClose}
            style={{ padding: '9px', borderRadius: '12px', fontSize: '13px', fontWeight: 500, background: 'transparent', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', fontFamily: 'Plus Jakarta Sans, sans-serif' }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
