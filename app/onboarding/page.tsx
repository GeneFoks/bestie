// @ts-nocheck
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { ActivityIcon } from '@/lib/activityIcons'

const ACTIVITY_GROUPS = [
  { label: '🏃 Active', activities: [
    { id: 'hiking', emoji: '🥾', label: 'Hiking' },
    { id: 'running', emoji: '🏃', label: 'Running' },
    { id: 'gym_partner', emoji: '💪', label: 'Gym' },
    { id: 'cycling', emoji: '🚴', label: 'Cycling' },
    { id: 'swimming', emoji: '🏊', label: 'Swimming' },
    { id: 'cold_plunge', emoji: '🧊', label: 'Cold Plunge' },
    { id: 'yoga', emoji: '🧘', label: 'Yoga' },
    { id: 'martial_arts', emoji: '🥋', label: 'Martial Arts' },
    { id: 'climbing', emoji: '🧗', label: 'Climbing' },
  ]},
  { label: '🎮 Social', activities: [
    { id: 'game_night', emoji: '🎮', label: 'Game Night' },
    { id: 'movie_night', emoji: '🎬', label: 'Movie Night' },
    { id: 'night_out', emoji: '🍸', label: 'Night Out' },
    { id: 'bar_hopping', emoji: '🍺', label: 'Bar Hopping' },
    { id: 'karaoke', emoji: '🎤', label: 'Karaoke' },
    { id: 'festival_crew', emoji: '🎪', label: 'Festival' },
    { id: 'travel_buddy', emoji: '✈️', label: 'Travel' },
    { id: 'wing_person', emoji: '😎', label: 'Wing Person' },
    { id: 'comedy_show', emoji: '😂', label: 'Comedy' },
  ]},
  { label: '🧠 Mind', activities: [
    { id: 'deep_chat', emoji: '🫂', label: 'Deep Chat' },
    { id: 'debate_club', emoji: '🗣️', label: 'Debate' },
    { id: 'book_club', emoji: '📚', label: 'Book Club' },
    { id: 'language_exchange', emoji: '🌐', label: 'Language' },
    { id: 'career_talk', emoji: '💼', label: 'Career Talk' },
    { id: 'money_talk', emoji: '💰', label: 'Money Talk' },
    { id: 'journaling', emoji: '📓', label: 'Journaling' },
    { id: 'accountability_partner', emoji: '🎯', label: 'Accountability' },
    { id: 'storytelling_night', emoji: '📖', label: 'Storytelling' },
  ]},
  { label: '🎨 Creative', activities: [
    { id: 'music_lesson', emoji: '🎸', label: 'Music' },
    { id: 'art_together', emoji: '🎨', label: 'Art' },
    { id: 'photography_walk', emoji: '📸', label: 'Photography' },
    { id: 'cooking_together', emoji: '🍳', label: 'Cooking' },
    { id: 'dance', emoji: '💃', label: 'Dance' },
    { id: 'improv_acting', emoji: '🎭', label: 'Improv' },
    { id: 'writing_club', emoji: '✍️', label: 'Writing' },
  ]},
  { label: '🫂 Support', activities: [
    { id: 'vent_session', emoji: '💬', label: 'Vent Session' },
    { id: '3am_talk', emoji: '🌙', label: '3am Talk' },
    { id: 'hype_person', emoji: '🔥', label: 'Hype Person' },
    { id: 'sobriety_buddy', emoji: '🌿', label: 'Sobriety' },
    { id: 'silence_buddy', emoji: '🤫', label: 'Silence' },
    { id: 'grief_support', emoji: '🤍', label: 'Grief' },
    { id: 'ugly_cry_buddy', emoji: '😭', label: 'Ugly Cry' },
  ]},
  { label: '🔮 Spiritual', activities: [
    { id: 'meditation_circle', emoji: '🧘', label: 'Meditation' },
    { id: 'breathwork', emoji: '🌬️', label: 'Breathwork' },
    { id: 'sound_healing', emoji: '🔔', label: 'Sound Healing' },
    { id: 'cacao_ceremony', emoji: '🍫', label: 'Cacao' },
    { id: 'tarot', emoji: '🔮', label: 'Tarot' },
    { id: 'retreat_buddy', emoji: '🏕️', label: 'Retreat' },
    { id: 'psychedelic_integration', emoji: '🌀', label: 'Integration' },
    { id: 'nature_ritual', emoji: '🌿', label: 'Nature' },
    { id: 'lucid_dream_club', emoji: '💫', label: 'Lucid Dream' },
  ]},
  { label: '☕ Chill', activities: [
    { id: 'coffee_chat', emoji: '☕', label: 'Coffee Chat' },
    { id: 'digital_detox_walk', emoji: '📵', label: 'Detox Walk' },
    { id: 'skincare_night', emoji: '✨', label: 'Skincare' },
    { id: 'smoke_buddy', emoji: '💨', label: 'Smoke' },
    { id: 'astrology_session', emoji: '⭐', label: 'Astrology' },
    { id: 'coworking', emoji: '💻', label: 'Coworking' },
    { id: 'errand_buddy', emoji: '🛒', label: 'Errands' },
  ]},
]

const STEP_TITLES = ['Who are you?', 'Where are you?', 'What are you into?', 'Your first activity']

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(true)
  const [userId, setUserId] = useState(null)
  const [activeGroup, setActiveGroup] = useState(ACTIVITY_GROUPS[0].label)
  const [form, setForm] = useState({
    full_name: '', bio: '', city: '', country: '',
    activities: [], activityTitle: '', activityType: '',
    activityPrice: '', activityFree: false, activityDesc: '',
  })

  useEffect(() => {
    const getSession = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      setUserId(user.id)

      const { data: profile } = await supabase
        .from('users')
        .select('full_name, bio, city, country, onboarding_completed')
        .eq('id', user.id)
        .single()

      // If already onboarded — skip straight to dashboard
      if (profile?.onboarding_completed) {
        router.push('/dashboard')
        return
      }

      // Pre-fill existing data so user doesn't re-enter
      setForm(f => ({
        ...f,
        full_name: profile?.full_name || user.user_metadata?.full_name || '',
        bio: profile?.bio || '',
        city: profile?.city || '',
        country: profile?.country || '',
      }))

      setChecking(false)
    }
    getSession()
  }, [])

  const toggleActivity = (id) => {
    setForm(f => ({
      ...f,
      activities: f.activities.includes(id)
        ? f.activities.filter(a => a !== id)
        : [...f.activities, id]
    }))
  }

  const handleFinish = async () => {
    setLoading(true)

    await supabase.from('users').update({
      full_name: form.full_name,
      bio: form.bio,
      city: form.city,
      country: form.country,
      bestie_score: 80,
      activities: form.activities,
      onboarding_completed: true,
    }).eq('id', userId)

    if (form.activityTitle && form.activityType) {
      await supabase.from('activity_packages').insert({
        user_id: userId,
        title: form.activityTitle,
        activity_type: form.activityType,
        description: form.activityDesc,
        price_per_session: form.activityFree ? 0 : parseFloat(form.activityPrice) || 0,
        is_free: form.activityFree,
      })
    }

    router.push('/dashboard')
  }

  const inputStyle = { width: '100%', padding: '12px 16px', borderRadius: '12px', fontSize: '14px', outline: 'none', background: '#161628', border: '1px solid rgba(255,255,255,0.1)', color: '#F0EAFF', boxSizing: 'border-box', fontFamily: 'Plus Jakarta Sans, sans-serif' }
  const labelStyle = { fontSize: '13px', fontWeight: 500, color: '#A99ECC', display: 'block', marginBottom: '8px' }
  const currentGroup = ACTIVITY_GROUPS.find(g => g.label === activeGroup)

  if (checking) return (
    <div style={{ minHeight: '100vh', background: '#09090F', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <span style={{ color: '#A99ECC', fontSize: '14px' }}>Loading...</span>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#09090F', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
      <div style={{ width: '100%', maxWidth: '520px' }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <span style={{ fontFamily: 'DM Serif Display, serif', fontSize: '24px', fontWeight: 700, color: '#D4AF37' }}>BESTIE</span>
          <p style={{ fontSize: '13px', color: '#A99ECC', marginTop: '4px' }}>Step {step} of 4</p>
        </div>
        <div style={{ display: 'flex', gap: '6px', marginBottom: '32px' }}>
          {[1,2,3,4].map(s => (
            <div key={s} style={{ flex: 1, height: '4px', borderRadius: '999px', background: s <= step ? '#D4AF37' : 'rgba(255,255,255,0.12)', transition: 'all 0.3s' }} />
          ))}
        </div>
        <div style={{ background: '#111120', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '24px', padding: '32px' }}>
          <h2 style={{ fontFamily: 'DM Serif Display, serif', fontSize: '24px', fontWeight: 700, color: '#F0EAFF', marginBottom: '24px' }}>
            {STEP_TITLES[step - 1]}
          </h2>

          {step === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={labelStyle}>Your name</label>
                <input value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} placeholder="Your full name" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Bio <span style={{ fontWeight: 400 }}>(what makes you, you)</span></label>
                <textarea value={form.bio} onChange={e => setForm(f => ({ ...f, bio: e.target.value }))} placeholder="I love hiking at sunrise, deep conversations over coffee..." rows={4} style={{ ...inputStyle, resize: 'none', lineHeight: 1.6 }} />
              </div>
            </div>
          )}

          {step === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={labelStyle}>City</label>
                <input value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} placeholder="Austin" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>State / Country</label>
                <input value={form.country} onChange={e => setForm(f => ({ ...f, country: e.target.value }))} placeholder="TX" style={inputStyle} />
              </div>
              <div style={{ padding: '16px', borderRadius: '14px', background: 'rgba(212,175,55,0.06)', border: '1px solid rgba(212,175,55,0.15)' }}>
                <p style={{ fontSize: '13px', color: '#A99ECC', lineHeight: 1.6 }}>📍 Your city helps people find you locally. Vibe calls work anywhere.</p>
              </div>
            </div>
          )}

          {step === 3 && (
            <div>
              <p style={{ fontSize: '14px', color: '#A99ECC', marginBottom: '12px' }}>Pick everything you're open to:</p>
              <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '10px', marginBottom: '12px', scrollbarWidth: 'none' }}>
                {ACTIVITY_GROUPS.map(g => (
                  <button key={g.label} onClick={() => setActiveGroup(g.label)} style={{ padding: '6px 12px', borderRadius: '999px', fontSize: '11px', fontWeight: 500, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0, background: activeGroup === g.label ? 'rgba(212,175,55,0.15)' : '#131323', border: activeGroup === g.label ? '1px solid rgba(212,175,55,0.4)' : '1px solid rgba(255,255,255,0.10)', color: activeGroup === g.label ? '#D4AF37' : '#A99ECC' }}>
                    {g.label}
                  </button>
                ))}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', maxHeight: '300px', overflowY: 'auto' }}>
                {currentGroup?.activities.map(a => {
                  const selected = form.activities.includes(a.id)
                  return (
                    <button key={a.id} onClick={() => toggleActivity(a.id)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', padding: '12px 8px', borderRadius: '14px', border: selected ? '1px solid rgba(212,175,55,0.4)' : '1px solid rgba(255,255,255,0.10)', background: selected ? 'rgba(212,175,55,0.1)' : '#111120', cursor: 'pointer' }}>
                      <ActivityIcon type={a.id} size={22} color={selected ? '#D4AF37' : '#A99ECC'} strokeWidth={1.7} />
                      <span style={{ fontSize: '11px', fontWeight: 500, color: selected ? '#D4AF37' : '#A99ECC', textAlign: 'center' }}>{a.label}</span>
                    </button>
                  )
                })}
              </div>
              {form.activities.length > 0 && (
                <p style={{ fontSize: '12px', color: '#D4AF37', marginTop: '12px' }}>
                  {form.activities.length} selected across all groups
                </p>
              )}
            </div>
          )}

          {step === 4 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <p style={{ fontSize: '14px', color: '#A99ECC' }}>Create your first offering — what people will book you for.</p>
              <div>
                <label style={labelStyle}>Activity title</label>
                <input value={form.activityTitle} onChange={e => setForm(f => ({ ...f, activityTitle: e.target.value }))} placeholder="Morning Trail Run in Barton Creek" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Activity type</label>
                <select value={form.activityType} onChange={e => setForm(f => ({ ...f, activityType: e.target.value }))} style={{ ...inputStyle, cursor: 'pointer' }}>
                  <option value="">Select type...</option>
                  {ACTIVITY_GROUPS.map(group => (
                    <optgroup key={group.label} label={group.label}>
                      {group.activities.map(a => (
                        <option key={a.id} value={a.id}>{a.emoji} {a.label}</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Description</label>
                <textarea value={form.activityDesc} onChange={e => setForm(f => ({ ...f, activityDesc: e.target.value }))} placeholder="Describe what you'll do together..." rows={3} style={{ ...inputStyle, resize: 'none' }} />
              </div>
              <button onClick={() => setForm(f => ({ ...f, activityFree: !f.activityFree }))} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                <div style={{ width: '20px', height: '20px', borderRadius: '6px', border: form.activityFree ? '2px solid #D4AF37' : '2px solid rgba(255,255,255,0.2)', background: form.activityFree ? '#D4AF37' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', color: '#09090F' }}>
                  {form.activityFree ? '✓' : ''}
                </div>
                <span style={{ fontSize: '14px', color: '#F0EAFF' }}>This is a free match</span>
              </button>
              {!form.activityFree && (
                <div>
                  <label style={labelStyle}>Price per session ($)</label>
                  <input type="number" value={form.activityPrice} onChange={e => setForm(f => ({ ...f, activityPrice: e.target.value }))} placeholder="20" style={inputStyle} />
                </div>
              )}
              <p style={{ fontSize: '12px', color: '#A99ECC' }}>You can skip this and add activities later.</p>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px' }}>
          {step > 1 ? (
            <button onClick={() => setStep(s => s - 1)} style={{ fontSize: '14px', color: '#A99ECC', background: 'none', border: 'none', cursor: 'pointer' }}>← Back</button>
          ) : <div />}
          <div style={{ display: 'flex', gap: '10px' }}>
            {step === 4 && (
              <button onClick={() => router.push('/dashboard')} style={{ fontSize: '14px', color: '#A99ECC', background: 'none', border: '1px solid rgba(255,255,255,0.1)', padding: '10px 20px', borderRadius: '12px', cursor: 'pointer' }}>Skip</button>
            )}
            {step < 4 ? (
              <button onClick={() => setStep(s => s + 1)} disabled={step === 1 && !form.full_name} style={{ padding: '12px 28px', borderRadius: '12px', fontSize: '14px', fontWeight: 600, background: 'linear-gradient(135deg, #D4AF37 0%, #B8960C 100%)', color: '#09090F', border: 'none', cursor: 'pointer', opacity: (step === 1 && !form.full_name) ? 0.5 : 1 }}>
                Continue →
              </button>
            ) : (
              <button onClick={handleFinish} disabled={loading} style={{ padding: '12px 28px', borderRadius: '12px', fontSize: '14px', fontWeight: 600, background: 'linear-gradient(135deg, #D4AF37 0%, #B8960C 100%)', color: '#09090F', border: 'none', cursor: 'pointer', opacity: loading ? 0.7 : 1 }}>
                {loading ? 'Saving...' : 'Finish setup 🎉'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
