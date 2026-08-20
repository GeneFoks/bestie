// @ts-nocheck
'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { ImagePlus, X } from 'lucide-react'
import LocationPicker from '@/components/LocationPicker'

const ACTIVITY_GROUPS = [
  { label: '🏃 Active & Outdoors', activities: [
    { id: 'hiking', emoji: '🥾', label: 'Hiking' }, { id: 'running', emoji: '🏃', label: 'Running' },
    { id: 'gym_partner', emoji: '💪', label: 'Gym Partner' }, { id: 'cycling', emoji: '🚴', label: 'Cycling' },
    { id: 'yoga', emoji: '🧘', label: 'Yoga' }, { id: 'climbing', emoji: '🧗', label: 'Climbing' },
    { id: 'pickleball', emoji: '🏓', label: 'Pickleball' },
  ]},
  { label: '🎮 Fun & Social', activities: [
    { id: 'game_night', emoji: '🎮', label: 'Game Night' }, { id: 'movie_night', emoji: '🎬', label: 'Movie Night' },
    { id: 'night_out', emoji: '🍸', label: 'Night Out' }, { id: 'karaoke', emoji: '🎤', label: 'Karaoke' },
    { id: 'festival_crew', emoji: '🎪', label: 'Festival Crew' }, { id: 'travel_buddy', emoji: '✈️', label: 'Travel Buddy' },
  ]},
  { label: '🧠 Mind & Growth', activities: [
    { id: 'deep_chat', emoji: '🫂', label: 'Deep Chat' }, { id: 'book_club', emoji: '📚', label: 'Book Club' },
    { id: 'debate_club', emoji: '🗣️', label: 'Debate Club' }, { id: 'language_exchange', emoji: '🌐', label: 'Language Exchange' },
    { id: 'life_coaching', emoji: '🧭', label: 'Life Coaching' },
  ]},
  { label: '🎨 Creative & Skills', activities: [
    { id: 'cooking_together', emoji: '🍳', label: 'Cooking Together' }, { id: 'dance', emoji: '💃', label: 'Dance' },
    { id: 'art_together', emoji: '🎨', label: 'Art Together' }, { id: 'music_lesson', emoji: '🎸', label: 'Music Lesson' },
  ]},
  { label: '🔮 Spiritual & Sacred', activities: [
    { id: 'meditation_circle', emoji: '🧘', label: 'Meditation Circle' }, { id: 'breathwork', emoji: '🌬️', label: 'Breathwork' },
    { id: 'cacao_ceremony', emoji: '🍫', label: 'Cacao Ceremony' }, { id: 'sound_healing', emoji: '🔔', label: 'Sound Healing' },
    { id: 'girls_circle', emoji: '🌸', label: 'Girls Circle' }, { id: 'mens_circle', emoji: '🔥', label: "Men's Circle" },
  ]},
  { label: '☕ Chill & Everyday', activities: [
    { id: 'coffee_chat', emoji: '☕', label: 'Coffee Chat' }, { id: 'coworking', emoji: '💻', label: 'Coworking' },
    { id: 'digital_detox_walk', emoji: '📵', label: 'Digital Detox Walk' },
  ]},
]

export default function NewGroupSessionPage() {
  const router = useRouter()
  const [userId, setUserId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    title: '',
    activity_type: '',
    description: '',
    scheduled_at: '',
    location: '',
    max_participants: 6,
    ticket_price: '',
    recurrence: 'none',
  })
  const [isAmbassador, setIsAmbassador] = useState(false)
  const [connectReady, setConnectReady] = useState(false)
  const [connecting, setConnecting] = useState(false)
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [coverPreview, setCoverPreview] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const handleCoverPick = (e: any) => {
    const f = e.target.files?.[0]
    if (!f) return
    setCoverFile(f)
    setCoverPreview(URL.createObjectURL(f))
  }
  const clearCover = () => {
    setCoverFile(null); setCoverPreview(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { router.push('/login'); return }
      setUserId(user.id)
      const { data } = await supabase.from('users').select('is_ambassador, is_admin, stripe_connect_id, connect_charges_enabled').eq('id', user.id).single()
      setIsAmbassador(!!(data?.is_ambassador || data?.is_admin))
      setConnectReady(!!data?.connect_charges_enabled)

      // Returning from Stripe onboarding → confirm payout readiness
      const qs = new URLSearchParams(window.location.search)
      if (qs.get('connect') === 'done') {
        const { data: { session } } = await supabase.auth.getSession()
        const res = await fetch('/api/stripe/connect/refresh', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
          body: JSON.stringify({ scope: 'user' }),
        }).then(r => r.json()).catch(() => null)
        if (res?.ready) setConnectReady(true)
        window.history.replaceState({}, '', '/group-sessions/new')
      }
    })
  }, [])

  // Kick off (or resume) host payout onboarding, then bounce to Stripe.
  const setupPayouts = async () => {
    setConnecting(true)
    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch('/api/stripe/connect/onboard', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
      body: JSON.stringify({ scope: 'user' }),
    }).then(r => r.json()).catch(() => null)
    if (res?.url) { window.location.href = res.url; return }
    alert(res?.error || 'Could not start payout setup. Please try again soon.')
    setConnecting(false)
  }

  const handleCreate = async () => {
    if (!form.title || !form.scheduled_at) return
    setSaving(true)
    let cover_image_url: string | null = null
    if (coverFile && userId) {
      const ext = coverFile.name.split('.').pop()?.toLowerCase() || 'jpg'
      const path = `${userId}/${Date.now()}.${ext}`
      const { error: upErr } = await supabase.storage.from('group-session-covers').upload(path, coverFile, { contentType: coverFile.type, upsert: false })
      if (upErr) {
        console.error('Cover upload failed:', upErr)
        alert(`Cover upload failed: ${upErr.message}. Check that the "group-session-covers" Storage bucket exists and is public.`)
        setSaving(false)
        return
      }
      const { data: pub } = supabase.storage.from('group-session-covers').getPublicUrl(path)
      cover_image_url = pub.publicUrl
    }
    const base = {
      host_id: userId,
      title: form.title,
      activity_type: form.activity_type || null,
      description: form.description || null,
      location: form.location || null,
      max_participants: parseInt(form.max_participants) || 6,
      ticket_price: connectReady && form.ticket_price ? Math.max(0, parseFloat(form.ticket_price) || 0) : 0,
      cover_image_url,
      recurrence: form.recurrence,
    }
    // Create the first occurrence
    const { data, error } = await supabase.from('group_sessions').insert({
      ...base,
      scheduled_at: new Date(form.scheduled_at).toISOString(),
    }).select().single()

    // Recurring → generate the next 11 occurrences, all sharing series_id
    if (!error && data && form.recurrence !== 'none') {
      const stepDays = form.recurrence === 'weekly' ? 7 : form.recurrence === 'biweekly' ? 14 : 0
      const rows = []
      for (let i = 1; i <= 11; i++) {
        const d = new Date(form.scheduled_at)
        if (form.recurrence === 'monthly') d.setMonth(d.getMonth() + i)
        else d.setDate(d.getDate() + i * stepDays)
        rows.push({ ...base, scheduled_at: d.toISOString(), series_id: data.id })
      }
      await supabase.from('group_sessions').update({ series_id: data.id }).eq('id', data.id)
      await supabase.from('group_sessions').insert(rows)
    }

    setSaving(false)
    if (error || !data) {
      alert(`Could not create the session: ${error?.message || 'unknown error'}`)
      return
    }
    router.push(`/group-sessions/${data.id}`)
  }

  const inputStyle = { width: '100%', padding: '12px 14px', borderRadius: '12px', fontSize: '14px', background: '#111120', border: '1px solid rgba(255,255,255,0.1)', color: '#F0EAFF', outline: 'none', boxSizing: 'border-box' as const }
  const labelStyle = { fontSize: '12px', fontWeight: 600, color: '#A99ECC', letterSpacing: '0.5px', marginBottom: '6px', display: 'block' }

  return (
    <div style={{ minHeight: '100vh', background: '#09090F', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
      <nav style={{ position: 'sticky', top: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', background: 'rgba(8,8,16,0.9)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.10)' }}>
        <Link href="/" style={{ fontFamily: 'DM Serif Display, serif', fontSize: '20px', fontWeight: 700, color: '#D4AF37', textDecoration: 'none' }}>BESTIE</Link>
        <Link href="/dashboard" style={{ fontSize: '14px', color: '#A99ECC', textDecoration: 'none', padding: '8px 16px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.1)' }}>← Dashboard</Link>
      </nav>

      <div style={{ maxWidth: '560px', margin: '0 auto', padding: '40px 24px' }}>
        <p style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '2px', color: '#D4AF37', marginBottom: '8px' }}>GROUP SESSION</p>
        <h1 style={{ fontFamily: 'DM Serif Display, serif', fontSize: '28px', color: '#F0EAFF', marginBottom: '8px' }}>Host a group meetup</h1>
        <p style={{ fontSize: '14px', color: '#A99ECC', marginBottom: '32px' }}>Invite multiple Besties to one event. Share the link, let them join.</p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={labelStyle}>Cover image</label>
            {coverPreview ? (
              <div style={{ position: 'relative', borderRadius: '14px', overflow: 'hidden', aspectRatio: '16/9', background: '#111120' }}>
                <img src={coverPreview} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                <button type="button" onClick={clearCover} aria-label="Remove cover" style={{ position: 'absolute', top: '10px', right: '10px', width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(0,0,0,0.65)', border: '1px solid rgba(255,255,255,0.15)', color: '#F0EAFF', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <X size={16} strokeWidth={2.2} />
                </button>
              </div>
            ) : (
              <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '28px 16px', borderRadius: '14px', background: 'rgba(212,175,55,0.04)', border: '2px dashed rgba(212,175,55,0.3)', color: '#A99ECC', cursor: 'pointer' }}>
                <ImagePlus size={22} strokeWidth={1.8} color="#D4AF37" />
                <span style={{ fontSize: '13px', fontWeight: 600, color: '#F0EAFF' }}>Add a cover image</span>
                <span style={{ fontSize: '11px', color: '#A99ECC' }}>Optional · shows full-width on the card and in shared previews</span>
                <input ref={fileRef} type="file" accept="image/*" onChange={handleCoverPick} style={{ display: 'none' }} />
              </label>
            )}
          </div>

          <div>
            <label style={labelStyle}>Title *</label>
            <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Sunday morning hike at Runyon" style={inputStyle} />
          </div>

          <div>
            <label style={labelStyle}>Activity type</label>
            <select value={form.activity_type} onChange={e => setForm(f => ({ ...f, activity_type: e.target.value }))} style={{ ...inputStyle, cursor: 'pointer' }}>
              <option value="">Select type...</option>
              {ACTIVITY_GROUPS.map(g => (
                <optgroup key={g.label} label={g.label}>
                  {g.activities.map(a => <option key={a.id} value={a.id}>{a.emoji} {a.label}</option>)}
                </optgroup>
              ))}
            </select>
            <style>{`select option, select optgroup { background: #1A1A2E; color: #F0EAFF; }`}</style>
          </div>

          <div>
            <label style={labelStyle}>Description</label>
            <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="What's the vibe? What should people bring?" rows={3} style={{ ...inputStyle, resize: 'vertical' as const }} />
          </div>

          <div>
            <label style={labelStyle}>Date & Time *</label>
            <input type="datetime-local" value={form.scheduled_at} onChange={e => setForm(f => ({ ...f, scheduled_at: e.target.value }))} style={{ ...inputStyle, colorScheme: 'dark' }} />
          </div>

          <div>
            <label style={labelStyle}>Repeats</label>
            <select value={form.recurrence} onChange={e => setForm(f => ({ ...f, recurrence: e.target.value }))} style={{ ...inputStyle, cursor: 'pointer' }}>
              <option value="none">Does not repeat</option>
              <option value="weekly">Weekly (same day &amp; time)</option>
              <option value="biweekly">Every 2 weeks</option>
              <option value="monthly">Monthly</option>
            </select>
            {form.recurrence !== 'none' && (
              <p style={{ fontSize: '11px', color: '#A99ECC', marginTop: '6px' }}>🔁 We'll create the next 12 sessions automatically and keep the series going.</p>
            )}
          </div>

          <div>
            <label style={labelStyle}>Location</label>
            <LocationPicker
              value={form.location}
              onChange={v => setForm(f => ({ ...f, location: v }))}
              placeholder="Runyon Canyon Park, Los Angeles"
            />
          </div>

          <div>
            <label style={labelStyle}>Max participants</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <input
                type="range" min={1} max={100} step={1}
                value={form.max_participants}
                onChange={e => setForm(f => ({ ...f, max_participants: parseInt(e.target.value) }))}
                style={{ flex: 1, accentColor: '#D4AF37', cursor: 'pointer' }}
              />
              <input
                type="number" min={1} max={100}
                value={form.max_participants}
                onChange={e => {
                  const n = parseInt(e.target.value)
                  setForm(f => ({ ...f, max_participants: isNaN(n) ? '' : Math.max(1, Math.min(100, n)) }))
                }}
                onBlur={() => setForm(f => ({ ...f, max_participants: f.max_participants || 6 }))}
                style={{ flexShrink: 0, width: '72px', textAlign: 'center', padding: '8px 6px', borderRadius: '10px', fontSize: '16px', fontWeight: 700, background: 'rgba(212,175,55,0.15)', border: '1px solid rgba(212,175,55,0.4)', color: '#D4AF37', outline: 'none' }}
              />
            </div>
          </div>

          <div>
            <label style={labelStyle}>Ticket price</label>
            {connectReady ? (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '18px', fontWeight: 700, color: '#D4AF37' }}>$</span>
                  <input
                    type="number" min={0} step="0.5" placeholder="0 = free event"
                    value={form.ticket_price}
                    onChange={e => setForm(f => ({ ...f, ticket_price: e.target.value }))}
                    style={{ ...inputStyle, maxWidth: '160px' }}
                  />
                </div>
                <p style={{ fontSize: '11px', color: '#34D399', marginTop: '6px' }}>
                  ✓ Payouts connected. Guests pay when they join · Bestie fee 10% · the rest goes to you.
                </p>
              </div>
            ) : (
              <div style={{ padding: '14px 16px', borderRadius: '14px', background: 'rgba(212,175,55,0.05)', border: '1px dashed rgba(212,175,55,0.3)' }}>
                <p style={{ fontSize: '13px', color: '#F0EAFF', marginBottom: '10px' }}>💰 Want to charge for this session? Connect a Stripe account once — guests pay at checkout and the money lands in your account (Bestie keeps 10%).</p>
                <button type="button" onClick={setupPayouts} disabled={connecting}
                  style={{ padding: '10px 16px', borderRadius: '11px', fontSize: '13px', fontWeight: 700, background: 'linear-gradient(135deg, #D4AF37 0%, #B8960C 100%)', color: '#09090F', border: 'none', cursor: connecting ? 'wait' : 'pointer' }}>
                  {connecting ? 'Opening Stripe…' : '💳 Set up payouts'}
                </button>
                <p style={{ fontSize: '11px', color: '#A99ECC', marginTop: '8px' }}>Leave this for free sessions — no setup needed.</p>
              </div>
            )}
          </div>

          <button onClick={handleCreate} disabled={saving || !form.title || !form.scheduled_at}
            style={{ padding: '14px', borderRadius: '14px', fontSize: '15px', fontWeight: 700, background: 'linear-gradient(135deg, #D4AF37 0%, #B8960C 100%)', color: '#09090F', border: 'none', cursor: form.title && form.scheduled_at ? 'pointer' : 'not-allowed', opacity: form.title && form.scheduled_at ? 1 : 0.5, marginTop: '8px' }}>
            {saving ? 'Creating...' : '🎉 Create Group Session'}
          </button>
        </div>
      </div>
    </div>
  )
}
