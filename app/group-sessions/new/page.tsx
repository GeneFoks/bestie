// @ts-nocheck
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const ACTIVITY_GROUPS = [
  { label: '🏃 Active & Outdoors', activities: [
    { id: 'hiking', emoji: '🥾', label: 'Hiking' }, { id: 'running', emoji: '🏃', label: 'Running' },
    { id: 'gym_partner', emoji: '💪', label: 'Gym Partner' }, { id: 'cycling', emoji: '🚴', label: 'Cycling' },
    { id: 'yoga', emoji: '🧘', label: 'Yoga' }, { id: 'climbing', emoji: '🧗', label: 'Climbing' },
  ]},
  { label: '🎮 Fun & Social', activities: [
    { id: 'game_night', emoji: '🎮', label: 'Game Night' }, { id: 'movie_night', emoji: '🎬', label: 'Movie Night' },
    { id: 'night_out', emoji: '🍸', label: 'Night Out' }, { id: 'karaoke', emoji: '🎤', label: 'Karaoke' },
    { id: 'festival_crew', emoji: '🎪', label: 'Festival Crew' }, { id: 'travel_buddy', emoji: '✈️', label: 'Travel Buddy' },
  ]},
  { label: '🧠 Mind & Growth', activities: [
    { id: 'deep_chat', emoji: '🫂', label: 'Deep Chat' }, { id: 'book_club', emoji: '📚', label: 'Book Club' },
    { id: 'debate_club', emoji: '🗣️', label: 'Debate Club' }, { id: 'language_exchange', emoji: '🌐', label: 'Language Exchange' },
  ]},
  { label: '🎨 Creative & Skills', activities: [
    { id: 'cooking_together', emoji: '🍳', label: 'Cooking Together' }, { id: 'dance', emoji: '💃', label: 'Dance' },
    { id: 'art_together', emoji: '🎨', label: 'Art Together' }, { id: 'music_lesson', emoji: '🎸', label: 'Music Lesson' },
  ]},
  { label: '🔮 Spiritual & Sacred', activities: [
    { id: 'meditation_circle', emoji: '🧘', label: 'Meditation Circle' }, { id: 'breathwork', emoji: '🌬️', label: 'Breathwork' },
    { id: 'cacao_ceremony', emoji: '🍫', label: 'Cacao Ceremony' }, { id: 'sound_healing', emoji: '🔔', label: 'Sound Healing' },
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
  })

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) router.push('/login')
      else setUserId(user.id)
    })
  }, [])

  const handleCreate = async () => {
    if (!form.title || !form.scheduled_at) return
    setSaving(true)
    const { data, error } = await supabase.from('group_sessions').insert({
      host_id: userId,
      title: form.title,
      activity_type: form.activity_type || null,
      description: form.description || null,
      scheduled_at: form.scheduled_at,
      location: form.location || null,
      max_participants: parseInt(form.max_participants) || 6,
    }).select().single()
    setSaving(false)
    if (!error && data) router.push(`/group-sessions/${data.id}`)
  }

  const inputStyle = { width: '100%', padding: '12px 14px', borderRadius: '12px', fontSize: '14px', background: '#0F0F1E', border: '1px solid rgba(255,255,255,0.1)', color: '#E8E0FF', outline: 'none', boxSizing: 'border-box' as const }
  const labelStyle = { fontSize: '12px', fontWeight: 600, color: '#9B93C0', letterSpacing: '0.5px', marginBottom: '6px', display: 'block' }

  return (
    <div style={{ minHeight: '100vh', background: '#080810', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
      <nav style={{ position: 'sticky', top: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', background: 'rgba(8,8,16,0.9)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <Link href="/" style={{ fontFamily: 'DM Serif Display, serif', fontSize: '20px', fontWeight: 700, color: '#D4AF37', textDecoration: 'none' }}>BESTIE</Link>
        <Link href="/dashboard" style={{ fontSize: '14px', color: '#9B93C0', textDecoration: 'none', padding: '8px 16px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.1)' }}>← Dashboard</Link>
      </nav>

      <div style={{ maxWidth: '560px', margin: '0 auto', padding: '40px 24px' }}>
        <p style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '2px', color: '#D4AF37', marginBottom: '8px' }}>GROUP SESSION</p>
        <h1 style={{ fontFamily: 'DM Serif Display, serif', fontSize: '28px', color: '#E8E0FF', marginBottom: '8px' }}>Host a group meetup</h1>
        <p style={{ fontSize: '14px', color: '#9B93C0', marginBottom: '32px' }}>Invite multiple Besties to one event. Share the link, let them join.</p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
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
            <style>{`select option, select optgroup { background: #1a1a35; color: #E8E0FF; }`}</style>
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
            <label style={labelStyle}>Location</label>
            <input value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} placeholder="Runyon Canyon Park, Los Angeles" style={inputStyle} />
          </div>

          <div>
            <label style={labelStyle}>Max participants</label>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {[3, 5, 6, 8, 10, 15, 20].map(n => (
                <button key={n} onClick={() => setForm(f => ({ ...f, max_participants: n }))}
                  style={{ padding: '8px 16px', borderRadius: '10px', fontSize: '14px', fontWeight: 600, background: form.max_participants === n ? 'rgba(212,175,55,0.2)' : 'rgba(255,255,255,0.04)', border: form.max_participants === n ? '1px solid rgba(212,175,55,0.5)' : '1px solid rgba(255,255,255,0.08)', color: form.max_participants === n ? '#D4AF37' : '#9B93C0', cursor: 'pointer' }}>
                  {n}
                </button>
              ))}
            </div>
          </div>

          <button onClick={handleCreate} disabled={saving || !form.title || !form.scheduled_at}
            style={{ padding: '14px', borderRadius: '14px', fontSize: '15px', fontWeight: 700, background: 'linear-gradient(135deg, #D4AF37 0%, #B8960C 100%)', color: '#080810', border: 'none', cursor: form.title && form.scheduled_at ? 'pointer' : 'not-allowed', opacity: form.title && form.scheduled_at ? 1 : 0.5, marginTop: '8px' }}>
            {saving ? 'Creating...' : '🎉 Create Group Session'}
          </button>
        </div>
      </div>
    </div>
  )
}
