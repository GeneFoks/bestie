// @ts-nocheck
'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { PageLoader } from '@/components/Loading'
import { ImagePlus, X, Calendar, Minus, Plus, ArrowLeft, CreditCard, Check } from 'lucide-react'
import LocationPicker from '@/components/LocationPicker'
import { showToast } from '@/components/Toast'
import { buzz } from '@/lib/celebrate'

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
    { id: 'burning_man', emoji: '🔥', label: 'Burning Man' },
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

const ERROR_RED = '#FF6B6B'

// UTC ISO from the DB → "YYYY-MM-DDTHH:mm" in the viewer's timezone
function toLocalInput(iso: string): string {
  const d = new Date(iso)
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
  return d.toISOString().slice(0, 16)
}

export default function EditGroupSessionPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [form, setForm] = useState<any>(null)
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [coverPreview, setCoverPreview] = useState<string | null>(null)
  const [removeCover, setRemoveCover] = useState(false)
  const [connectReady, setConnectReady] = useState(false)
  const [myCrews, setMyCrews] = useState<any[]>([])
  const [connecting, setConnecting] = useState(false)
  // Inline validation — shown only after a save attempt, cleared as the field is filled
  const [errors, setErrors] = useState<{ title?: boolean; date?: boolean }>({})
  const fileRef = useRef<HTMLInputElement>(null)
  const titleRef = useRef<HTMLInputElement>(null)
  const dateRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUserId(user.id)
      const { data: gs } = await supabase.from('group_sessions').select('*').eq('id', params.id).single()
      if (!gs) { setLoading(false); return }
      if (gs.host_id !== user.id) { router.push(`/group-sessions/${params.id}`); return }
      setForm({
        title: gs.title || '',
        activity_type: gs.activity_type || '',
        description: gs.description || '',
        // DB stores UTC; datetime-local wants local wall-clock time
        scheduled_at: gs.scheduled_at ? toLocalInput(gs.scheduled_at) : '',
        location: gs.location || '',
        max_participants: gs.max_participants || 6,
        ticket_price: gs.ticket_price ? String(gs.ticket_price) : '',
        crew_id: gs.crew_id || '',
        cover_image_url: gs.cover_image_url || null,
      })
      if (gs.cover_image_url) setCoverPreview(gs.cover_image_url)

      // Crews this host captains — a session can live under one of them
      // (shows up on the crew/camp page, e.g. a Burning Man camp).
      supabase.from('crews').select('id, name').eq('captain_id', user.id).order('name')
        .then(({ data: crews }) => setMyCrews(crews || []))

      // Payout readiness for this host (needed to charge for the session)
      const { data: me } = await supabase.from('users').select('connect_charges_enabled').eq('id', user.id).single()
      setConnectReady(!!me?.connect_charges_enabled)

      // Returning from Stripe onboarding → confirm readiness
      const qs = new URLSearchParams(window.location.search)
      if (qs.get('connect') === 'done') {
        const { data: { session } } = await supabase.auth.getSession()
        const res = await fetch('/api/stripe/connect/refresh', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
          body: JSON.stringify({ scope: 'user' }),
        }).then(r => r.json()).catch(() => null)
        if (res?.ready) setConnectReady(true)
        window.history.replaceState({}, '', `/group-sessions/${params.id}/edit`)
      }
      setLoading(false)
    })()
  }, [params.id])

  const setupPayouts = async () => {
    setConnecting(true)
    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch('/api/stripe/connect/onboard', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
      body: JSON.stringify({ scope: 'user', returnPath: `/group-sessions/${params.id}/edit` }),
    }).then(r => r.json()).catch(() => null)
    if (res?.url) { window.location.href = res.url; return }
    console.error('Payout setup error:', res?.error)
    showToast("Couldn't start payout setup — try again soon", { type: 'error' })
    setConnecting(false)
  }

  const handleCoverPick = (e: any) => {
    const f = e.target.files?.[0]
    if (!f) return
    setCoverFile(f)
    setCoverPreview(URL.createObjectURL(f))
    setRemoveCover(false)
  }
  const clearCover = () => {
    setCoverFile(null); setCoverPreview(null); setRemoveCover(true)
    if (fileRef.current) fileRef.current.value = ''
  }

  // −/+ stepper for max participants (1–100). Same form field as before.
  const bumpMax = (delta: number) => setForm(f => {
    const cur = parseInt(f.max_participants) || 6
    return { ...f, max_participants: Math.max(1, Math.min(100, cur + delta)) }
  })

  // Native datetime-local: open the picker on any tap of the field, not just the tiny icon.
  const openPicker = (e: any) => {
    try { e.currentTarget.showPicker?.() } catch {}
  }

  const handleSave = async () => {
    if (!form || saving) return
    const nextErrors = { title: !String(form.title || '').trim(), date: !form.scheduled_at }
    if (nextErrors.title || nextErrors.date) {
      setErrors(nextErrors)
      buzz('tap')
      if (nextErrors.title) {
        titleRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
        try { titleRef.current?.focus({ preventScroll: true }) } catch {}
      } else {
        dateRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
      return
    }
    setErrors({})
    setSaving(true)
    let cover_image_url = form.cover_image_url
    if (removeCover) cover_image_url = null
    if (coverFile && userId) {
      const ext = coverFile.name.split('.').pop()?.toLowerCase() || 'jpg'
      const path = `${userId}/${Date.now()}.${ext}`
      const { error: upErr } = await supabase.storage.from('group-session-covers').upload(path, coverFile, { contentType: coverFile.type, upsert: false })
      if (upErr) {
        console.error('Cover upload failed:', upErr)
        showToast("Couldn't upload the cover image — try again", { type: 'error' })
        setSaving(false)
        return
      }
      const { data: pub } = supabase.storage.from('group-session-covers').getPublicUrl(path)
      cover_image_url = pub.publicUrl
    }
    const { error } = await supabase.from('group_sessions').update({
      title: form.title,
      activity_type: form.activity_type || null,
      description: form.description || null,
      scheduled_at: new Date(form.scheduled_at).toISOString(),
      location: form.location || null,
      max_participants: parseInt(form.max_participants) || 6,
      ticket_price: connectReady && form.ticket_price ? Math.max(0, parseFloat(form.ticket_price) || 0) : 0,
      crew_id: form.crew_id || null,
      cover_image_url,
    }).eq('id', params.id)
    setSaving(false)
    if (!error) { router.push(`/group-sessions/${params.id}`); return }
    console.error('Save session error:', error)
    showToast("Couldn't save your changes — try again", { type: 'error' })
  }

  if (loading || !form) return <PageLoader message="Loading…" />

  const inputStyle = { width: '100%', padding: '12px 14px', borderRadius: '12px', fontSize: '14px', background: 'var(--surface-1)', border: '1px solid var(--border)', color: 'var(--text-primary)', outline: 'none', boxSizing: 'border-box' as const }
  const labelStyle = { fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.5px', marginBottom: '6px', display: 'block' }
  const errorBorder = { border: `1px solid ${ERROR_RED}` }
  const errorText = { fontSize: '12px', fontWeight: 600, color: ERROR_RED, marginTop: '6px' }
  const maxNum = parseInt(form.max_participants) || 0
  const stepBtn = (disabled: boolean) => ({ width: '44px', height: '44px', flexShrink: 0, padding: 0, borderRadius: '999px', background: 'var(--surface-2)', border: '1px solid var(--border-strong)', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.4 : 1 })

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
      <style>{`
        select option, select optgroup { background: var(--surface-3); color: var(--text-primary); }
        .gs-dt::-webkit-date-and-time-value { text-align: left; }
        .gs-dt::-webkit-calendar-picker-indicator { opacity: 0; cursor: pointer; }
      `}</style>
      <nav style={{ position: 'sticky', top: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', background: 'var(--nav-bg)', backdropFilter: 'blur(20px)', borderBottom: '1px solid var(--border)' }}>
        <Link href="/" style={{ fontFamily: 'DM Serif Display, serif', fontSize: '20px', fontWeight: 700, color: '#D4AF37', textDecoration: 'none' }}>BESTIE</Link>
        <Link href={`/group-sessions/${params.id}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', minHeight: '44px', boxSizing: 'border-box', fontSize: '14px', color: 'var(--text-muted)', textDecoration: 'none', padding: '8px 16px', borderRadius: '12px', border: '1px solid var(--border)' }}>
          <ArrowLeft size={16} strokeWidth={2} /> Cancel
        </Link>
      </nav>

      <div style={{ maxWidth: '560px', margin: '0 auto', padding: '40px 24px' }}>
        <p style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '2px', color: '#D4AF37', marginBottom: '8px' }}>EDIT SESSION</p>
        <h1 style={{ fontFamily: 'DM Serif Display, serif', fontSize: '28px', color: 'var(--text-primary)', marginBottom: '32px' }}>Update your group session</h1>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={labelStyle}>Cover image</label>
            {coverPreview ? (
              <div style={{ position: 'relative', borderRadius: '16px', overflow: 'hidden', aspectRatio: '16/9', background: 'var(--surface-1)' }}>
                <img src={coverPreview} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                <button type="button" onClick={clearCover} aria-label="Remove cover" style={{ position: 'absolute', top: '8px', right: '8px', width: '44px', height: '44px', padding: 0, borderRadius: '999px', background: 'rgba(0,0,0,0.65)', border: '1px solid var(--border-strong)', color: '#FFFFFF', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <X size={18} strokeWidth={2.2} />
                </button>
                <label style={{ position: 'absolute', bottom: '8px', right: '8px', display: 'inline-flex', alignItems: 'center', minHeight: '44px', boxSizing: 'border-box', padding: '0 16px', borderRadius: '999px', fontSize: '13px', fontWeight: 600, background: 'rgba(0,0,0,0.65)', border: '1px solid var(--border-strong)', color: '#FFFFFF', cursor: 'pointer' }}>
                  Replace
                  <input ref={fileRef} type="file" accept="image/*" onChange={handleCoverPick} style={{ display: 'none' }} />
                </label>
              </div>
            ) : (
              <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '28px 16px', borderRadius: '16px', background: 'var(--surface-1)', border: '2px dashed var(--border-strong)', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <ImagePlus size={22} strokeWidth={1.8} color="var(--text-muted)" />
                <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>Add a cover image</span>
                <input ref={fileRef} type="file" accept="image/*" onChange={handleCoverPick} style={{ display: 'none' }} />
              </label>
            )}
          </div>

          <div>
            <label style={labelStyle} htmlFor="gs-title">Title *</label>
            <input
              id="gs-title"
              ref={titleRef}
              value={form.title}
              onChange={e => {
                const v = e.target.value
                setForm(f => ({ ...f, title: v }))
                if (errors.title && v.trim()) setErrors(er => ({ ...er, title: false }))
              }}
              aria-invalid={!!errors.title}
              style={{ ...inputStyle, ...(errors.title ? errorBorder : {}) }}
            />
            {errors.title && <p role="alert" style={errorText}>Add a title</p>}
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
          </div>

          {myCrews.length > 0 && (
            <div>
              <label style={labelStyle}>Camp / Crew <span style={{ fontWeight: 400 }}>(optional — the session shows on its page)</span></label>
              <select value={form.crew_id} onChange={e => setForm(f => ({ ...f, crew_id: e.target.value }))} style={{ ...inputStyle, cursor: 'pointer' }}>
                <option value="">Not attached</option>
                {myCrews.map(c => <option key={c.id} value={c.id}>⛺ {c.name}</option>)}
              </select>
            </div>
          )}

          <div>
            <label style={labelStyle}>Description</label>
            <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3} style={{ ...inputStyle, resize: 'vertical' as const }} />
          </div>

          <div ref={dateRef}>
            <label style={labelStyle} htmlFor="gs-date">Date & Time *</label>
            <div style={{ position: 'relative' }}>
              <Calendar size={18} strokeWidth={2} color={errors.date ? ERROR_RED : 'var(--text-muted)'} aria-hidden="true"
                style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
              <input
                id="gs-date"
                className="gs-dt"
                type="datetime-local"
                value={form.scheduled_at}
                onChange={e => {
                  const v = e.target.value
                  setForm(f => ({ ...f, scheduled_at: v }))
                  if (errors.date && v) setErrors(er => ({ ...er, date: false }))
                }}
                onClick={openPicker}
                aria-invalid={!!errors.date}
                style={{ ...inputStyle, ...(errors.date ? errorBorder : {}), display: 'block', minHeight: '48px', paddingLeft: '44px', cursor: 'pointer', colorScheme: 'inherit' }}
              />
            </div>
            {errors.date && <p role="alert" style={errorText}>Pick a date & time</p>}
          </div>

          <div>
            <label style={labelStyle}>Location</label>
            <LocationPicker
              value={form.location}
              onChange={v => setForm(f => ({ ...f, location: v }))}
              placeholder="Search for a place…"
            />
          </div>

          <div>
            <label style={labelStyle} htmlFor="gs-max">Max participants</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <button type="button" aria-label="Fewer participants" onClick={() => bumpMax(-1)} disabled={maxNum === 1} style={stepBtn(maxNum === 1)}>
                <Minus size={18} strokeWidth={2.2} />
              </button>
              <input
                id="gs-max"
                type="text" inputMode="numeric" pattern="[0-9]*"
                value={form.max_participants}
                onChange={e => {
                  const n = parseInt(e.target.value)
                  setForm(f => ({ ...f, max_participants: isNaN(n) ? '' : Math.max(1, Math.min(100, n)) }))
                }}
                onBlur={() => setForm(f => ({ ...f, max_participants: f.max_participants || 6 }))}
                style={{ width: '64px', minHeight: '44px', boxSizing: 'border-box', textAlign: 'center', padding: '8px 4px', borderRadius: '12px', fontSize: '18px', fontWeight: 700, background: 'var(--surface-1)', border: '1px solid var(--border)', color: 'var(--text-primary)', outline: 'none' }}
              />
              <button type="button" aria-label="More participants" onClick={() => bumpMax(1)} disabled={maxNum >= 100} style={stepBtn(maxNum >= 100)}>
                <Plus size={18} strokeWidth={2.2} />
              </button>
              <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>people</span>
            </div>
          </div>

          <div>
            <label style={labelStyle}>Ticket price</label>
            {connectReady ? (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-muted)' }}>$</span>
                  <input
                    type="number" min={0} step="0.5" placeholder="0 = free event"
                    value={form.ticket_price}
                    onChange={e => setForm(f => ({ ...f, ticket_price: e.target.value }))}
                    style={{ ...inputStyle, maxWidth: '160px' }}
                  />
                </div>
                <p style={{ fontSize: '11px', color: '#34D399', marginTop: '6px', display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
                  <Check size={12} strokeWidth={2.6} style={{ flexShrink: 0, marginTop: '2px' }} /> Payouts connected. Guests pay to join · Bestie fee 10% · the rest goes to you. Set 0 to keep it free.
                </p>
              </div>
            ) : (
              <div style={{ padding: '14px 16px', borderRadius: '16px', background: 'var(--surface-1)', border: '1px dashed var(--border-strong)' }}>
                <p style={{ fontSize: '13px', color: 'var(--text-primary)', marginBottom: '10px' }}>💰 Want to charge for this session? Connect a Stripe account once — guests pay at checkout and the money lands in your account (Bestie keeps 10%).</p>
                <button type="button" onClick={setupPayouts} disabled={connecting}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', minHeight: '44px', padding: '10px 16px', borderRadius: '12px', fontSize: '13px', fontWeight: 700, background: 'var(--surface-3)', color: 'var(--text-primary)', border: '1px solid var(--border-strong)', cursor: connecting ? 'wait' : 'pointer' }}>
                  <CreditCard size={16} strokeWidth={2} /> {connecting ? 'Opening Stripe…' : 'Set up payouts'}
                </button>
              </div>
            )}
          </div>

          <button type="button" onClick={handleSave} disabled={saving} aria-busy={saving}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', minHeight: '48px', padding: '14px', borderRadius: '16px', fontSize: '15px', fontWeight: 700, background: 'linear-gradient(135deg, #D4AF37 0%, #B8960C 100%)', color: 'var(--bg)', border: 'none', cursor: saving ? 'wait' : 'pointer', opacity: saving ? 0.7 : 1, marginTop: '8px' }}>
            {saving ? 'Saving...' : 'Save changes'}
          </button>
        </div>
      </div>
    </div>
  )
}
