// @ts-nocheck
'use client'

import React, { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

export default function NewEventPage() {
  const router = useRouter()
  const params = useParams()
  const slug = params.slug as string

  const [userId, setUserId] = useState<string | null>(null)
  const [crewId, setCrewId] = useState<string | null>(null)
  const [authLoading, setAuthLoading] = useState(true)

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [location, setLocation] = useState('')
  const [datetime, setDatetime] = useState('')
  const [maxAttendees, setMaxAttendees] = useState('')
  const [isMembersOnly, setIsMembersOnly] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { router.push('/login'); return }
      const uid = session.user.id
      const { data: crew } = await supabase
        .from('crews').select('id, captain_id').eq('slug', slug).single()
      if (!crew || crew.captain_id !== uid) {
        router.push(`/crews/${slug}`)
        return
      }
      setUserId(uid)
      setCrewId(crew.id)
      setAuthLoading(false)
    })
  }, [slug])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !datetime) return
    setSubmitting(true)
    setError(null)

    const { data: event, error: err } = await supabase
      .from('crew_events')
      .insert({
        crew_id: crewId,
        created_by: userId,
        title: title.trim(),
        description: description.trim() || null,
        location: location.trim() || null,
        datetime,
        max_attendees: maxAttendees ? parseInt(maxAttendees) : null,
        is_members_only: isMembersOnly,
      })
      .select()
      .single()

    if (err) { setError(err.message); setSubmitting(false); return }

    // Auto-join captain as attendee
    await supabase.from('crew_event_attendees').insert({ event_id: event.id, user_id: userId })

    router.push(`/events/${event.id}`)
  }

  if (authLoading) return null

  const inputStyle: React.CSSProperties = { width: '100%', padding: '13px 16px', borderRadius: '12px', fontSize: '15px', background: '#111120', border: '1px solid rgba(255,255,255,0.1)', color: '#F0EAFF', outline: 'none', boxSizing: 'border-box' }
  const labelStyle: React.CSSProperties = { fontSize: '12px', fontWeight: 600, letterSpacing: '1px', color: '#A99ECC', marginBottom: '8px', display: 'block' }

  return (
    <div style={{ minHeight: '100vh', background: '#09090F', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
      <nav style={{ position: 'sticky', top: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', background: 'rgba(8,8,16,0.9)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.10)' }}>
        <Link href="/" style={{ fontFamily: 'DM Serif Display, serif', fontSize: '20px', fontWeight: 700, color: '#D4AF37', textDecoration: 'none' }}>BESTIE</Link>
        <Link href={`/crews/${slug}`} style={{ fontSize: '14px', color: '#A99ECC', textDecoration: 'none' }}>← Back to Crew</Link>
      </nav>

      <div style={{ maxWidth: '560px', margin: '0 auto', padding: '40px 24px' }}>
        <h1 style={{ fontFamily: 'DM Serif Display, serif', fontSize: '36px', color: '#F0EAFF', marginBottom: '8px' }}>Create Event</h1>
        <p style={{ fontSize: '14px', color: '#A99ECC', marginBottom: '32px' }}>Anyone can join unless you make it members only.</p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <label style={labelStyle}>TITLE</label>
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Saturday Hike" maxLength={80} required style={inputStyle} />
          </div>

          <div>
            <label style={labelStyle}>DATE & TIME</label>
            <input type="datetime-local" value={datetime} onChange={e => setDatetime(e.target.value)} required style={inputStyle} />
          </div>

          <div>
            <label style={labelStyle}>LOCATION</label>
            <input value={location} onChange={e => setLocation(e.target.value)} placeholder="Central Park, NYC" maxLength={120} style={inputStyle} />
          </div>

          <div>
            <label style={labelStyle}>DESCRIPTION (optional)</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="What's happening…" maxLength={400} rows={3} style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.6 }} />
          </div>

          <div>
            <label style={labelStyle}>MAX ATTENDEES (optional, leave empty for unlimited)</label>
            <input type="number" value={maxAttendees} onChange={e => setMaxAttendees(e.target.value)} placeholder="e.g. 20" min={1} max={108} style={inputStyle} />
          </div>

          <div>
            <label style={labelStyle}>ACCESS</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              {[
                { value: false, icon: '🌐', label: 'Open', desc: 'Anyone can join' },
                { value: true, icon: '🔒', label: 'Members only', desc: 'Crew members only' },
              ].map(opt => (
                <button key={String(opt.value)} type="button" onClick={() => setIsMembersOnly(opt.value)}
                  style={{ padding: '14px', borderRadius: '14px', border: isMembersOnly === opt.value ? '2px solid #D4AF37' : '1px solid rgba(255,255,255,0.12)', background: isMembersOnly === opt.value ? 'rgba(212,175,55,0.08)' : '#111120', cursor: 'pointer', textAlign: 'left' }}>
                  <div style={{ fontSize: '20px', marginBottom: '4px' }}>{opt.icon}</div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: '#F0EAFF' }}>{opt.label}</div>
                  <div style={{ fontSize: '12px', color: '#A99ECC' }}>{opt.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {error && <p style={{ fontSize: '13px', color: '#FF6B35', padding: '12px', background: 'rgba(255,107,53,0.08)', borderRadius: '10px', border: '1px solid rgba(255,107,53,0.2)' }}>{error}</p>}

          <button type="submit" disabled={submitting}
            style={{ padding: '16px', borderRadius: '14px', fontSize: '16px', fontWeight: 700, background: 'linear-gradient(135deg, #D4AF37 0%, #B8960C 100%)', color: '#09090F', border: 'none', cursor: submitting ? 'not-allowed' : 'pointer', opacity: submitting ? 0.6 : 1 }}>
            {submitting ? 'Creating…' : 'Create Event'}
          </button>
        </form>
      </div>
    </div>
  )
}
