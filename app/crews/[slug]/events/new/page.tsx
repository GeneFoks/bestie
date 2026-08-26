// @ts-nocheck
'use client'

import React, { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { PageLoader } from '@/components/Loading'
import { showToast } from '@/components/Toast'
import { Lock, Globe } from 'lucide-react'

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
  const [otherCrews, setOtherCrews] = useState<Array<{ id: string; name: string }>>([])
  const [coHosts, setCoHosts] = useState<string[]>([])
  const [ticketPrice, setTicketPrice] = useState('')
  const [connectReady, setConnectReady] = useState(false)
  const [connecting, setConnecting] = useState(false)
  // Existing group sessions of mine that could be attached to this crew
  const [mySessions, setMySessions] = useState<any[]>([])
  const [attaching, setAttaching] = useState<string | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { router.push('/login'); return }
      const uid = session.user.id
      const { data: crew, error: crewErr } = await supabase
        .from('crews').select('id, captain_id, stripe_connect_id, connect_charges_enabled').eq('slug', slug).single()
      if (crewErr || !crew) {
        setError('Could not load crew. Please try again.')
        setAuthLoading(false)
        return
      }
      if (crew.captain_id !== uid) {
        setError('Only the crew captain can create events.')
        setAuthLoading(false)
        return
      }
      setUserId(uid)
      setCrewId(crew.id)
      setConnectReady(!!crew.connect_charges_enabled)

      // Other crews this captain is a member of — potential co-hosts
      const { data: memberships } = await supabase
        .from('crew_members')
        .select('crew:crews(id, name)')
        .eq('user_id', uid)
      const others = (memberships || [])
        .map((m: any) => m.crew)
        .filter((c: any) => c && c.id !== crew.id)
      setOtherCrews(others)

      // My upcoming group sessions not yet attached to THIS crew — offer to
      // attach instead of creating a duplicate (participants come along).
      const { data: sessions } = await supabase
        .from('group_sessions')
        .select('id, title, scheduled_at, location, crew_id, participants:group_session_participants(count)')
        .eq('host_id', uid)
        .gte('scheduled_at', new Date().toISOString())
        .order('scheduled_at', { ascending: true })
        .limit(12)
      // Show ALL of them — ones already attached to this crew render with a
      // check state, so the captain always sees what's linked.
      setMySessions(sessions || [])

      setAuthLoading(false)
    })
  }, [slug])

  // Kick off (or resume) the crew's payout onboarding, then bounce to Stripe.
  const setupPayouts = async () => {
    setConnecting(true)
    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch('/api/stripe/connect/onboard', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
      body: JSON.stringify({ crewId }),
    }).then(r => r.json()).catch(() => null)
    if (res?.url) { window.location.href = res.url; return }
    console.error('Payout onboarding failed:', res?.error)
    showToast("Couldn't start payout setup — try again", { type: 'error' })
    setConnecting(false)
  }

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
        datetime: new Date(datetime).toISOString(),
        max_attendees: maxAttendees ? parseInt(maxAttendees) : null,
        is_members_only: isMembersOnly,
        ticket_price: connectReady && ticketPrice ? Math.max(0, parseFloat(ticketPrice) || 0) : 0,
      })
      .select()
      .single()

    if (err) { setError(err.message); setSubmitting(false); return }

    // Attach co-host crews (best effort)
    if (coHosts.length > 0) {
      await supabase.from('crew_event_co_hosts').insert(
        coHosts.map(cid => ({ event_id: event.id, crew_id: cid }))
      )
    }

    // Auto-join captain as attendee
    await supabase.from('crew_event_attendees').insert({ event_id: event.id, user_id: userId })

    router.push(`/events/${event.id}`)
  }

  if (authLoading) return <PageLoader />

  const inputStyle: React.CSSProperties = { width: '100%', padding: '13px 16px', borderRadius: '12px', fontSize: '15px', background: 'var(--surface-1)', border: '1px solid var(--border)', color: 'var(--text-primary)', outline: 'none', boxSizing: 'border-box' }
  const labelStyle: React.CSSProperties = { fontSize: '12px', fontWeight: 600, letterSpacing: '1px', color: 'var(--text-muted)', marginBottom: '8px', display: 'block' }

  if (!crewId) return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
      <div style={{ textAlign: 'center', padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
          <Lock size={32} color="var(--text-muted)" strokeWidth={1.8} />
        </div>
        <p style={{ color: 'var(--text-primary)', fontSize: '16px', fontWeight: 700, marginBottom: '8px' }}>{error || 'Access denied'}</p>
        <Link href={`/crews/${slug}`} style={{ fontSize: '14px', color: '#D4AF37' }}>← Back to Crew</Link>
      </div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
      <nav style={{ position: 'sticky', top: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', background: 'var(--nav-bg)', backdropFilter: 'blur(20px)', borderBottom: '1px solid var(--border)' }}>
        <Link href="/" style={{ fontFamily: 'DM Serif Display, serif', fontSize: '20px', fontWeight: 700, color: '#D4AF37', textDecoration: 'none' }}>BESTIE</Link>
        <Link href={`/crews/${slug}`} style={{ fontSize: '14px', color: 'var(--text-muted)', textDecoration: 'none' }}>← Back to Crew</Link>
      </nav>

      <div style={{ maxWidth: '560px', margin: '0 auto', padding: '40px 24px' }}>
        <h1 style={{ fontFamily: 'DM Serif Display, serif', fontSize: '36px', color: 'var(--text-primary)', marginBottom: '8px' }}>Create Event</h1>
        <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '32px' }}>Anyone can join unless you make it members only.</p>

        {/* Attach one of my existing sessions instead of creating a duplicate */}
        {mySessions.length > 0 && (
          <div style={{ marginBottom: '28px', padding: '18px', borderRadius: '16px', background: 'rgba(212,175,55,0.05)', border: '1px dashed rgba(212,175,55,0.3)' }}>
            <p style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>⛺ Already have a session? Attach it here</p>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '12px' }}>Its participants come along — no duplicate needed.</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {mySessions.map((s: any) => {
                const d = new Date(s.scheduled_at)
                return (
                  <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '11px 14px', borderRadius: '12px', background: 'var(--surface-1)', border: '1px solid var(--border)' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.title}</p>
                      <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: 0 }}>
                        {d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}{s.location ? ` · ${s.location}` : ''} · {s.participants?.[0]?.count || 0} joined
                        {s.crew_id && s.crew_id !== crewId ? ' · attached to another crew' : ''}
                      </p>
                    </div>
                    {s.crew_id === crewId ? (
                      <span style={{ flexShrink: 0, padding: '8px 14px', borderRadius: '10px', fontSize: '12px', fontWeight: 700, background: 'rgba(52,211,153,0.10)', border: '1px solid rgba(52,211,153,0.35)', color: '#34D399' }}>
                        ✓ Attached
                      </span>
                    ) : (
                      <button
                        type="button"
                        disabled={attaching === s.id}
                        onClick={async () => {
                          setAttaching(s.id)
                          const { error: err } = await supabase.from('group_sessions').update({ crew_id: crewId }).eq('id', s.id)
                          setAttaching(null)
                          if (err) { console.error(err); showToast("Couldn't attach the session — try again", { type: 'error' }); return }
                          showToast('Session attached to the crew ✓', { type: 'success' })
                          router.push(`/crews/${slug}`)
                        }}
                        style={{ flexShrink: 0, padding: '8px 14px', borderRadius: '10px', fontSize: '12px', fontWeight: 700, background: 'rgba(212,175,55,0.12)', border: '1px solid rgba(212,175,55,0.4)', color: '#D4AF37', cursor: 'pointer', fontFamily: 'Plus Jakarta Sans, sans-serif' }}
                      >
                        {attaching === s.id ? 'Attaching…' : 'Attach'}
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
            <p style={{ fontSize: '11px', color: 'var(--text-dim)', margin: '12px 0 0', textAlign: 'center' }}>— or create a brand-new event below —</p>
          </div>
        )}

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
                { value: false, Icon: Globe, label: 'Open', desc: 'Anyone can join' },
                { value: true, Icon: Lock, label: 'Members only', desc: 'Crew members only' },
              ].map(opt => (
                <button key={String(opt.value)} type="button" onClick={() => setIsMembersOnly(opt.value)}
                  style={{ padding: '14px', borderRadius: '14px', border: isMembersOnly === opt.value ? '2px solid #D4AF37' : '1px solid var(--border)', background: isMembersOnly === opt.value ? 'rgba(212,175,55,0.08)' : 'var(--surface-1)', cursor: 'pointer', textAlign: 'left' }}>
                  <div style={{ marginBottom: '4px' }}><opt.Icon size={20} color="#D4AF37" strokeWidth={1.8} /></div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>{opt.label}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{opt.desc}</div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label style={labelStyle}>TICKET PRICE</label>
            {connectReady ? (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '18px', fontWeight: 700, color: '#D4AF37' }}>$</span>
                  <input
                    type="number" min={0} step="0.5" placeholder="0 = free event"
                    value={ticketPrice}
                    onChange={e => setTicketPrice(e.target.value)}
                    style={{ ...inputStyle, maxWidth: '160px' }}
                  />
                </div>
                <p style={{ fontSize: '11px', color: '#34D399', marginTop: '6px' }}>
                  ✓ Crew payouts connected. Guests pay to RSVP · Bestie fee 10% · the rest goes to the crew.
                </p>
              </div>
            ) : (
              <div style={{ padding: '14px 16px', borderRadius: '14px', background: 'rgba(212,175,55,0.05)', border: '1px dashed rgba(212,175,55,0.3)' }}>
                <p style={{ fontSize: '13px', color: 'var(--text-primary)', marginBottom: '10px' }}>💰 Want to charge for this event? Connect the crew&rsquo;s Stripe account first — guests pay at checkout and the money lands in the crew&rsquo;s account (Bestie keeps 10%).</p>
                <button type="button" onClick={setupPayouts} disabled={connecting}
                  style={{ padding: '10px 16px', borderRadius: '11px', fontSize: '13px', fontWeight: 700, background: 'linear-gradient(135deg, #D4AF37 0%, #B8960C 100%)', color: '#09090F', border: 'none', cursor: connecting ? 'wait' : 'pointer' }}>
                  {connecting ? 'Opening Stripe…' : '💳 Set up payouts'}
                </button>
                <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '8px' }}>Leave this for free events — no setup needed.</p>
              </div>
            )}
          </div>

          {otherCrews.length > 0 && (
            <div>
              <label style={labelStyle}>CO-HOST WITH (optional)</label>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '10px' }}>
                Members of co-host crews can also RSVP to this event.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {otherCrews.map(c => {
                  const checked = coHosts.includes(c.id)
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setCoHosts(prev => checked ? prev.filter(id => id !== c.id) : [...prev, c.id])}
                      style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 14px', borderRadius: '12px', border: checked ? '1px solid rgba(155,127,255,0.40)' : '1px solid var(--border)', background: checked ? 'rgba(155,127,255,0.08)' : 'var(--surface-1)', cursor: 'pointer', textAlign: 'left', fontFamily: 'Plus Jakarta Sans, sans-serif' }}
                    >
                      <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '20px', height: '20px', borderRadius: '6px', border: checked ? 'none' : '1.5px solid var(--border-strong)', background: checked ? '#9B7FFF' : 'transparent', color: '#09090F', fontSize: '13px', fontWeight: 700 }}>
                        {checked ? '✓' : ''}
                      </span>
                      <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>{c.name}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

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
