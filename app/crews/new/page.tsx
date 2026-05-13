'use client'
// @ts-nocheck

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

function toSlug(str: string) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

export default function NewCrewPage() {
  const router = useRouter()
  const [userId, setUserId] = useState(null)
  const [existingCrew, setExistingCrew] = useState(null)
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
      setUserId(session.user.id)
      const { data } = await supabase.from('users').select('crew_id').eq('id', session.user.id).single()
      setExistingCrew(data?.crew_id ?? null)
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
      setError(crewErr.message.includes('unique') ? 'This slug is already taken. Try another.' : crewErr.message)
      setSubmitting(false)
      return
    }

    await supabase.from('crew_members').insert({ crew_id: crew.id, user_id: userId })
    await supabase.from('users').update({ crew_id: crew.id }).eq('id', userId)

    router.push(`/crews/${crew.slug}`)
  }

  if (authLoading) return null

  const inputStyle = { width: '100%', padding: '13px 16px', borderRadius: '12px', fontSize: '15px', background: '#0F0F1E', border: '1px solid rgba(255,255,255,0.1)', color: '#E8E0FF', outline: 'none', boxSizing: 'border-box' }
  const labelStyle = { fontSize: '12px', fontWeight: 600, letterSpacing: '1px', color: '#9B93C0', marginBottom: '8px', display: 'block' }

  return (
    <div style={{ minHeight: '100vh', background: '#080810', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
      <nav style={{ position: 'sticky', top: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', background: 'rgba(8,8,16,0.9)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <Link href="/" style={{ fontFamily: 'DM Serif Display, serif', fontSize: '20px', fontWeight: 700, color: '#D4AF37', textDecoration: 'none' }}>BESTIE</Link>
        <Link href="/crews" style={{ fontSize: '14px', color: '#9B93C0', textDecoration: 'none' }}>← All Crews</Link>
      </nav>

      <div style={{ maxWidth: '560px', margin: '0 auto', padding: '40px 24px' }}>
        <h1 style={{ fontFamily: 'DM Serif Display, serif', fontSize: '36px', color: '#E8E0FF', marginBottom: '8px' }}>Create a Crew</h1>
        <p style={{ fontSize: '14px', color: '#9B93C0', marginBottom: '32px' }}>Up to 108 members · Sacred number, no coincidence.</p>

        {existingCrew && (
          <div style={{ padding: '16px', borderRadius: '14px', background: 'rgba(255,107,53,0.08)', border: '1px solid rgba(255,107,53,0.2)', marginBottom: '24px' }}>
            <p style={{ fontSize: '14px', color: '#FF6B35' }}>You're already in a crew. Leave it first to create a new one.</p>
          </div>
        )}

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
            <div style={{ display: 'flex', alignItems: 'center', background: '#0F0F1E', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', overflow: 'hidden' }}>
              <span style={{ padding: '13px 12px 13px 16px', fontSize: '15px', color: '#9B93C0', whiteSpace: 'nowrap' }}>bestiehere.com/crews/</span>
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
                { value: true, icon: '⚔️', label: 'Open', desc: 'Anyone can join' },
                { value: false, icon: '🔒', label: 'Private', desc: 'Invite only' },
              ].map(opt => (
                <button
                  key={String(opt.value)}
                  type="button"
                  onClick={() => setIsPublic(opt.value)}
                  style={{ padding: '14px', borderRadius: '14px', border: isPublic === opt.value ? '2px solid #D4AF37' : '1px solid rgba(255,255,255,0.08)', background: isPublic === opt.value ? 'rgba(212,175,55,0.08)' : '#0F0F1E', cursor: 'pointer', textAlign: 'left' }}
                >
                  <div style={{ fontSize: '20px', marginBottom: '4px' }}>{opt.icon}</div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: '#E8E0FF' }}>{opt.label}</div>
                  <div style={{ fontSize: '12px', color: '#9B93C0' }}>{opt.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {error && (
            <p style={{ fontSize: '13px', color: '#FF6B35', padding: '12px', background: 'rgba(255,107,53,0.08)', borderRadius: '10px', border: '1px solid rgba(255,107,53,0.2)' }}>{error}</p>
          )}

          <button
            type="submit"
            disabled={submitting || !!existingCrew}
            style={{ padding: '16px', borderRadius: '14px', fontSize: '16px', fontWeight: 700, background: 'linear-gradient(135deg, #D4AF37 0%, #B8960C 100%)', color: '#080810', border: 'none', cursor: submitting || existingCrew ? 'not-allowed' : 'pointer', opacity: submitting || existingCrew ? 0.6 : 1 }}
          >
            {submitting ? 'Creating…' : '⚔️ Create Crew'}
          </button>
        </form>
      </div>
    </div>
  )
}
