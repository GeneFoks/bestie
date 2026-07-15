'use client'
// @ts-nocheck

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { X, Sparkles, Compass } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { relation, TYPES } from '@/lib/socionics'

interface MatchModalProps {
  onClose: () => void
}

// Smart Match = socionics eterotype matching.
// 1) Not signed in            → invite to join & take the test
// 2) Signed in, no eterotype  → invite to take the test
// 3) Has eterotype            → rank everyone with a type by intertype
//    relation (Duality first), nudged by same city, show the best matches.
export default function MatchModal({ onClose }: MatchModalProps) {
  const [state, setState] = useState<'loading' | 'guest' | 'no-type' | 'results'>('loading')
  const [myType, setMyType] = useState<string | null>(null)
  const [matches, setMatches] = useState<any[]>([])
  const closeBtnRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    closeBtnRef.current?.focus()
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  useEffect(() => {
    const run = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { setState('guest'); return }

      const { data: me } = await supabase
        .from('users')
        .select('id, city, eterotype')
        .eq('id', session.user.id)
        .single()

      if (!me?.eterotype || !TYPES[me.eterotype]) { setState('no-type'); return }
      setMyType(me.eterotype)

      const { data: people } = await supabase
        .from('users')
        .select('id, full_name, username, avatar_url, city, bestie_score, eterotype, eterotype_name')
        .not('eterotype', 'is', null)
        .neq('id', me.id)
        .limit(400)

      const ranked = (people || [])
        .map((p: any) => {
          const rel = relation(me.eterotype, p.eterotype)
          if (!rel) return null
          let score = rel.score
          if (me.city && p.city && me.city.toLowerCase() === p.city.toLowerCase()) score += 6
          return { ...p, rel: { ...rel, score: Math.min(score, 99) } }
        })
        .filter(Boolean)
        .sort((a: any, b: any) =>
          b.rel.score - a.rel.score || (b.bestie_score || 0) - (a.bestie_score || 0))
        .slice(0, 8)

      setMatches(ranked)
      setState('results')
    }
    run()
  }, [])

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{ background: 'rgba(8,8,16,0.88)', backdropFilter: 'blur(16px)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="match-modal-title"
        className="w-full max-w-lg rounded-3xl overflow-hidden flex flex-col"
        style={{
          background: '#0F0F1E',
          border: '1px solid rgba(212,175,55,0.2)',
          boxShadow: '0 40px 100px rgba(0,0,0,0.7)',
          maxHeight: '85vh',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-5 flex-shrink-0"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
        >
          <div>
            <p className="text-xs font-semibold tracking-widest mb-1" style={{ color: '#D4AF37' }}>
              SMART MATCH
            </p>
            <h3
              id="match-modal-title"
              className="text-xl font-bold"
              style={{ color: '#F0EAFF', fontFamily: 'DM Serif Display, serif' }}
            >
              {state === 'results' ? 'Your best matches' : 'Match by personality'}
            </h3>
          </div>
          <button
            ref={closeBtnRef}
            onClick={onClose}
            aria-label="Close Smart Match"
            className="w-10 h-10 flex items-center justify-center rounded-full transition-colors hover:bg-white/10"
            style={{ color: '#A99ECC' }}
          >
            <X size={18} strokeWidth={2} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto">
          {state === 'loading' && (
            <p className="text-sm text-center py-8" style={{ color: '#A99ECC' }}>Finding your people…</p>
          )}

          {(state === 'guest' || state === 'no-type') && (
            <div className="text-center py-4">
              <div
                className="mx-auto mb-5 flex items-center justify-center"
                style={{ width: '72px', height: '72px', borderRadius: '20px', background: 'rgba(212,175,55,0.10)' }}
              >
                <Compass size={34} color="#D4AF37" strokeWidth={1.6} />
              </div>
              <h4 className="text-lg font-bold mb-2" style={{ color: '#F0EAFF', fontFamily: 'DM Serif Display, serif' }}>
                Discover your eterotype first
              </h4>
              <p className="text-sm mb-6 mx-auto" style={{ color: '#A99ECC', maxWidth: '360px', lineHeight: 1.6 }}>
                Smart Match pairs people by personality type — 16 types, real socionics.
                Take the 5-minute test and we'll show you the Besties you'll naturally click with.
              </p>
              <Link
                href={state === 'guest' ? '/signup' : '/bestie-type'}
                onClick={onClose}
                className="inline-flex items-center gap-2 px-7 py-3 rounded-xl text-sm font-bold transition-all hover:opacity-90"
                style={{ background: 'linear-gradient(135deg, #D4AF37 0%, #B8960C 100%)', color: '#09090F' }}
              >
                {state === 'guest' ? 'Join & take the test' : 'Take the test'} <Sparkles size={14} strokeWidth={2} />
              </Link>
              <p className="text-xs mt-4" style={{ color: '#6B6490' }}>
                28 questions · your type shows on your Social Passport
              </p>
            </div>
          )}

          {state === 'results' && (
            <div>
              {myType && TYPES[myType] && (
                <p className="text-sm mb-4" style={{ color: '#A99ECC' }}>
                  You're <b style={{ color: '#D4AF37' }}>{TYPES[myType].name}</b> — here's who you naturally click with:
                </p>
              )}

              {matches.length === 0 ? (
                <div className="text-center py-6">
                  <p className="text-sm mb-3" style={{ color: '#A99ECC' }}>
                    No one else has taken the test yet — invite your friends and be the first wave.
                  </p>
                  <Link href="/dashboard" onClick={onClose} className="text-sm font-semibold" style={{ color: '#D4AF37' }}>
                    Invite friends →
                  </Link>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {matches.map((m: any) => {
                    const pct = m.rel.score
                    const color = pct >= 80 ? '#34D399' : pct >= 60 ? '#D4AF37' : '#A99ECC'
                    return (
                      <Link
                        key={m.id}
                        href={`/${m.username}`}
                        onClick={onClose}
                        className="flex items-center gap-3 p-3 rounded-2xl transition-all hover:bg-white/5"
                        style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${pct >= 90 ? 'rgba(52,211,153,0.3)' : 'rgba(255,255,255,0.08)'}`, textDecoration: 'none' }}
                      >
                        <div style={{ width: '46px', height: '46px', borderRadius: '13px', overflow: 'hidden', background: '#1A1A2E', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {m.avatar_url
                            ? <img src={m.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            : <span style={{ color: '#D4AF37', fontWeight: 700 }}>{m.full_name?.[0]}</span>}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold truncate" style={{ color: '#F0EAFF' }}>{m.full_name}</p>
                          <p className="text-xs truncate" style={{ color: '#A99ECC' }}>
                            🧭 {m.eterotype_name || m.eterotype}{m.city ? ` · ${m.city}` : ''}
                          </p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-sm font-bold" style={{ color }}>{pct}%</p>
                          <p className="text-xs" style={{ color }}>{m.rel.label}</p>
                        </div>
                      </Link>
                    )
                  })}
                </div>
              )}

              <div className="flex items-center justify-between mt-5">
                <Link href="/bestie-type" onClick={onClose} className="text-xs" style={{ color: '#6B6490' }}>
                  Retake the test
                </Link>
                <Link
                  href="/browse"
                  onClick={onClose}
                  className="text-sm font-semibold"
                  style={{ color: '#D4AF37' }}
                >
                  Browse everyone →
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
