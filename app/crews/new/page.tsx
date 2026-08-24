// @ts-nocheck
'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { PageLoader } from '@/components/Loading'
import { Globe, Lock, Swords } from 'lucide-react'

function toSlug(str: string) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

export default function NewCrewPage() {
  const router = useRouter()
  const [userId, setUserId] = useState<string | null>(null)
  const [myScore, setMyScore] = useState(0)
  const [isPlus, setIsPlus] = useState(false)
  const [captainedCount, setCaptainedCount] = useState(0)
  const [authLoading, setAuthLoading] = useState(true)

  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [slugEdited, setSlugEdited] = useState(false)
  const [description, setDescription] = useState('')
  const [isPublic, setIsPublic] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { router.push('/login'); return }
      const uid = session.user.id
      setUserId(uid)
      const [{ data: profile }, { count }] = await Promise.all([
        supabase.from('users').select('bestie_score, subscription_tier, plus_expires_at').eq('id', uid).single(),
        supabase.from('crews').select('id', { count: 'exact', head: true }).eq('captain_id', uid),
      ])
      setMyScore(profile?.bestie_score || 0)
      const plusActive = profile?.subscription_tier === 'plus' &&
        (!profile?.plus_expires_at || new Date(profile.plus_expires_at) > new Date())
      setIsPlus(!!plusActive)
      setCaptainedCount(count || 0)
      setAuthLoading(false)
    })
  }, [])

  const handleNameChange = (val: string) => {
    setName(val)
    if (!slugEdited) setSlug(toSlug(val))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !slug.trim()) return
    setSubmitting(true)
    setError(null)

    const { data: crew, error: crewErr } = await supabase
      .from('crews')
      .insert({ name: name.trim(), slug: slug.trim(), description: description.trim() || null, captain_id: userId, is_public: isPublic })
      .select()
      .single()

    if (crewErr) {
      const m = crewErr.message || ''
      setError(
        m.includes('crew_limit_free') ? 'Free members can lead one crew. Upgrade to Bestie Plus to create more.'
        : m.includes('crew_limit_reached') ? 'You’ve used all your crew slots. Raise your Bestie Score to unlock more.'
        : m.includes('unique') ? 'This slug is already taken. Try another.'
        : m
      )
      setSubmitting(false)
      return
    }

    await supabase.from('crew_members').insert({ crew_id: crew.id, user_id: userId })
    await supabase.from('users').update({ crew_id: crew.id }).eq('id', userId)

    router.push(`/crews/${crew.slug}`)
  }

  if (authLoading) return <PageLoader />


  // Free members are capped at a single crew. Bestie Plus unlocks the
  // score-based slots (always at least 2, scaling up to 5).
  const scoreSlots = myScore >= 1000 ? 5 : myScore >= 800 ? 4 : myScore >= 600 ? 3 : myScore >= 400 ? 2 : 1
  const maxCrews = isPlus ? Math.max(2, scoreSlots) : 1
  const atLimit = captainedCount >= maxCrews
  // For Plus members, what score unlocks the next slot?
  const nextThreshold = !isPlus ? null
    : myScore < 600 ? 600 : myScore < 800 ? 800 : myScore < 1000 ? 1000 : null
  const nextMax = nextThreshold ? (nextThreshold >= 1000 ? 5 : nextThreshold >= 800 ? 4 : 3) : null
  // A free user is blocked purely because they don't have Plus.
  const blockedByPlan = !isPlus && atLimit

  const inputStyle = { width: '100%', padding: '13px 16px', borderRadius: '12px', fontSize: '15px', background: '#111120', border: '1px solid rgba(255,255,255,0.1)', color: '#F0EAFF', outline: 'none', boxSizing: 'border-box' }
  const labelStyle = { fontSize: '12px', fontWeight: 600, letterSpacing: '1px', color: '#A99ECC', marginBottom: '8px', display: 'block' }

  return (
    <div style={{ minHeight: '100vh', background: '#09090F', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
      <nav style={{ position: 'sticky', top: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', background: 'rgba(8,8,16,0.9)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.10)' }}>
        <Link href="/" style={{ fontFamily: 'DM Serif Display, serif', fontSize: '20px', fontWeight: 700, color: '#D4AF37', textDecoration: 'none' }}>BESTIE</Link>
        <Link href="/crews" style={{ fontSize: '14px', color: '#A99ECC', textDecoration: 'none' }}>← All Crews</Link>
      </nav>

      <div style={{ maxWidth: '560px', margin: '0 auto', padding: '40px 24px' }}>
        <h1 style={{ fontFamily: 'DM Serif Display, serif', fontSize: '36px', color: '#F0EAFF', marginBottom: '8px' }}>Create a Crew</h1>
        <p style={{ fontSize: '14px', color: '#A99ECC', marginBottom: '24px' }}>Up to 108 members · Sacred number, no coincidence.</p>

        {/* Crew slots indicator */}
        <div style={{ marginBottom: '28px', padding: '16px 20px', borderRadius: '16px', background: atLimit ? 'rgba(255,107,53,0.06)' : 'rgba(212,175,55,0.06)', border: atLimit ? '1px solid rgba(255,107,53,0.2)' : '1px solid rgba(212,175,55,0.15)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
            <p style={{ fontSize: '13px', fontWeight: 600, color: atLimit ? '#FF6B35' : '#D4AF37' }}>
              {atLimit ? 'Crew limit reached' : `Crew slots: ${captainedCount} / ${maxCrews}`}
            </p>
            <span style={{ fontSize: '12px', color: '#A99ECC' }}>{isPlus ? `★ ${myScore} · Plus` : `★ ${myScore}`}</span>
          </div>
          <div style={{ display: 'flex', gap: '6px' }}>
            {[1,2,3,4,5].map(i => (
              <div key={i} style={{ flex: 1, height: '4px', borderRadius: '999px', background: i <= captainedCount ? '#D4AF37' : i <= maxCrews ? 'rgba(212,175,55,0.2)' : 'rgba(255,255,255,0.10)' }} />
            ))}
          </div>
          {blockedByPlan && (
            <p style={{ fontSize: '12px', color: '#A99ECC', marginTop: '10px' }}>
              Free members can lead one crew. <Link href="/plus" style={{ color: '#D4AF37', fontWeight: 700, textDecoration: 'none' }}>Upgrade to Bestie Plus</Link> to create more.
            </p>
          )}
          {isPlus && nextThreshold && (
            <p style={{ fontSize: '12px', color: '#A99ECC', marginTop: '10px' }}>
              Reach <span style={{ color: '#D4AF37', fontWeight: 700 }}>★ {nextThreshold}</span> to unlock {nextMax} crew slots
            </p>
          )}
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <label style={labelStyle}>CREW NAME</label>
            <input
              value={name}
              onChange={e => handleNameChange(e.target.value)}
              placeholder="Night Owls"
              maxLength={40}
              required
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>SLUG (URL)</label>
            <div style={{ display: 'flex', alignItems: 'center', background: '#111120', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', overflow: 'hidden' }}>
              <span style={{ padding: '13px 12px 13px 16px', fontSize: '15px', color: '#A99ECC', whiteSpace: 'nowrap' }}>bestiehere.com/crews/</span>
              <input
                value={slug}
                onChange={e => { setSlug(toSlug(e.target.value)); setSlugEdited(true) }}
                placeholder="night-owls"
                maxLength={40}
                required
                style={{ ...inputStyle, border: 'none', borderRadius: 0, paddingLeft: 0, flex: 1 }}
              />
            </div>
          </div>

          <div>
            <label style={labelStyle}>DESCRIPTION (optional)</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="What your crew is about…"
              maxLength={200}
              rows={3}
              style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.6 }}
            />
          </div>

          <div>
            <label style={labelStyle}>VISIBILITY</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              {[
                { value: true, Icon: Globe, label: 'Open', desc: 'Anyone can join' },
                { value: false, Icon: Lock, label: 'Private', desc: 'Invite only' },
              ].map(opt => (
                <button
                  key={String(opt.value)}
                  type="button"
                  onClick={() => setIsPublic(opt.value)}
                  style={{ padding: '14px', borderRadius: '14px', border: isPublic === opt.value ? '2px solid #D4AF37' : '1px solid rgba(255,255,255,0.12)', background: isPublic === opt.value ? 'rgba(212,175,55,0.08)' : '#111120', cursor: 'pointer', textAlign: 'left' }}
                >
                  <div style={{ marginBottom: '4px' }}><opt.Icon size={20} color="#D4AF37" strokeWidth={1.8} /></div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: '#F0EAFF' }}>{opt.label}</div>
                  <div style={{ fontSize: '12px', color: '#A99ECC' }}>{opt.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {error && (
            <p style={{ fontSize: '13px', color: '#FF6B35', padding: '12px', background: 'rgba(255,107,53,0.08)', borderRadius: '10px', border: '1px solid rgba(255,107,53,0.2)' }}>{error}</p>
          )}

          {blockedByPlan ? (
            <Link
              href="/plus"
              style={{ padding: '16px', borderRadius: '14px', fontSize: '16px', fontWeight: 700, background: 'linear-gradient(135deg, #D4AF37 0%, #B8960C 100%)', color: '#09090F', textDecoration: 'none', textAlign: 'center' }}
            >
              ✨ Upgrade to Bestie Plus to create more crews
            </Link>
          ) : (
            <button
              type="submit"
              disabled={submitting || atLimit}
              style={{ padding: '16px', borderRadius: '14px', fontSize: '16px', fontWeight: 700, background: atLimit ? 'rgba(255,255,255,0.10)' : 'linear-gradient(135deg, #D4AF37 0%, #B8960C 100%)', color: atLimit ? '#A99ECC' : '#09090F', border: atLimit ? '1px solid rgba(255,255,255,0.1)' : 'none', cursor: submitting || atLimit ? 'not-allowed' : 'pointer', opacity: submitting ? 0.7 : 1 }}
            >
              {submitting ? 'Creating…' : atLimit ? `Limit reached · ★ ${nextThreshold} to unlock` : (<span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}><Swords size={18} strokeWidth={2} /> Create Crew</span>)}
            </button>
          )}
        </form>
      </div>
    </div>
  )
}
