// @ts-nocheck
'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { ActivityIcon } from '@/lib/activityIcons'
import { PageLoader } from '@/components/Loading'
import { showToast } from '@/components/Toast'
import { Zap, Gamepad2, BookOpen, Palette, Heart, Moon, Coffee, MapPin, Camera, Sparkles } from 'lucide-react'

const ACTIVITY_GROUPS = [
  { id: 'active',   label: 'Active',    Icon: Zap, activities: [
    { id: 'hiking', emoji: '🥾', label: 'Hiking' }, { id: 'running', emoji: '🏃', label: 'Running' },
    { id: 'gym_partner', emoji: '💪', label: 'Gym' }, { id: 'cycling', emoji: '🚴', label: 'Cycling' },
    { id: 'swimming', emoji: '🏊', label: 'Swimming' }, { id: 'cold_plunge', emoji: '🧊', label: 'Cold Plunge' },
    { id: 'yoga', emoji: '🧘', label: 'Yoga' }, { id: 'martial_arts', emoji: '🥋', label: 'Martial Arts' },
    { id: 'climbing', emoji: '🧗', label: 'Climbing' }, { id: 'pickleball', emoji: '🏓', label: 'Pickleball' },
  ]},
  { id: 'social',   label: 'Social',    Icon: Gamepad2, activities: [
    { id: 'game_night', emoji: '🎮', label: 'Game Night' }, { id: 'movie_night', emoji: '🎬', label: 'Movie Night' },
    { id: 'night_out', emoji: '🍸', label: 'Night Out' }, { id: 'bar_hopping', emoji: '🍺', label: 'Bar Hopping' },
    { id: 'karaoke', emoji: '🎤', label: 'Karaoke' }, { id: 'festival_crew', emoji: '🎪', label: 'Festival' },
    { id: 'travel_buddy', emoji: '✈️', label: 'Travel' }, { id: 'wing_person', emoji: '😎', label: 'Wing Person' },
    { id: 'comedy_show', emoji: '😂', label: 'Comedy' },
  ]},
  { id: 'mind',     label: 'Mind',      Icon: BookOpen, activities: [
    { id: 'deep_chat', emoji: '🫂', label: 'Deep Chat' }, { id: 'debate_club', emoji: '🗣️', label: 'Debate' },
    { id: 'book_club', emoji: '📚', label: 'Book Club' }, { id: 'language_exchange', emoji: '🌐', label: 'Language' },
    { id: 'career_talk', emoji: '💼', label: 'Career Talk' }, { id: 'money_talk', emoji: '💰', label: 'Money Talk' },
    { id: 'journaling', emoji: '📓', label: 'Journaling' }, { id: 'accountability_partner', emoji: '🎯', label: 'Accountability' },
    { id: 'storytelling_night', emoji: '📖', label: 'Storytelling' },
  ]},
  { id: 'creative', label: 'Creative',  Icon: Palette, activities: [
    { id: 'music_lesson', emoji: '🎸', label: 'Music' }, { id: 'art_together', emoji: '🎨', label: 'Art' },
    { id: 'photography_walk', emoji: '📸', label: 'Photography' }, { id: 'cooking_together', emoji: '🍳', label: 'Cooking' },
    { id: 'dance', emoji: '💃', label: 'Dance' }, { id: 'improv_acting', emoji: '🎭', label: 'Improv' },
    { id: 'writing_club', emoji: '✍️', label: 'Writing' },
  ]},
  { id: 'support',  label: 'Support',   Icon: Heart, activities: [
    { id: 'vent_session', emoji: '💬', label: 'Vent Session' }, { id: '3am_talk', emoji: '🌙', label: '3am Talk' },
    { id: 'hype_person', emoji: '🔥', label: 'Hype Person' }, { id: 'sobriety_buddy', emoji: '🌿', label: 'Sobriety' },
    { id: 'silence_buddy', emoji: '🤫', label: 'Silence' }, { id: 'grief_support', emoji: '🤍', label: 'Grief' },
    { id: 'ugly_cry_buddy', emoji: '😭', label: 'Ugly Cry' },
  ]},
  { id: 'spiritual',label: 'Spiritual', Icon: Moon, activities: [
    { id: 'meditation_circle', emoji: '🧘', label: 'Meditation' }, { id: 'breathwork', emoji: '🌬️', label: 'Breathwork' },
    { id: 'sound_healing', emoji: '🔔', label: 'Sound Healing' }, { id: 'cacao_ceremony', emoji: '🍫', label: 'Cacao' },
    { id: 'girls_circle', emoji: '🌸', label: 'Girls Circle' }, { id: 'mens_circle', emoji: '🔥', label: "Men's Circle" },
    { id: 'tarot', emoji: '🔮', label: 'Tarot' }, { id: 'retreat_buddy', emoji: '🏕️', label: 'Retreat' },
    { id: 'psychedelic_integration', emoji: '🌀', label: 'Integration' }, { id: 'nature_ritual', emoji: '🌿', label: 'Nature' },
    { id: 'lucid_dream_club', emoji: '💫', label: 'Lucid Dream' },
  ]},
  { id: 'chill',    label: 'Chill',     Icon: Coffee, activities: [
    { id: 'coffee_chat', emoji: '☕', label: 'Coffee Chat' }, { id: 'digital_detox_walk', emoji: '📵', label: 'Detox Walk' },
    { id: 'skincare_night', emoji: '✨', label: 'Skincare' }, { id: 'smoke_buddy', emoji: '💨', label: 'Smoke' },
    { id: 'astrology_session', emoji: '⭐', label: 'Astrology' }, { id: 'coworking', emoji: '💻', label: 'Coworking' },
    { id: 'errand_buddy', emoji: '🛒', label: 'Errands' },
  ]},
]

const LABELS = Object.fromEntries(
  ACTIVITY_GROUPS.flatMap(g => g.activities.map(a => [a.id, a.label]))
)

const STEP_TITLES = ['Add your photo', 'Where are you?', 'What are you into?']

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(true)
  const [userId, setUserId] = useState(null)
  const [activeGroup, setActiveGroup] = useState(ACTIVITY_GROUPS[0].id)
  const [avatarFile, setAvatarFile] = useState(null)
  const [avatarPreview, setAvatarPreview] = useState(null)
  const fileRef = useRef(null)
  const [form, setForm] = useState({
    full_name: '', avatar_url: '', city: '', country: '', activities: [],
  })

  useEffect(() => {
    const getSession = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUserId(user.id)

      const { data: profile } = await supabase
        .from('users')
        .select('full_name, avatar_url, city, country, onboarding_completed')
        .eq('id', user.id).single()

      if (profile?.onboarding_completed) { router.push('/dashboard'); return }

      setForm(f => ({
        ...f,
        full_name: profile?.full_name || user.user_metadata?.full_name || '',
        avatar_url: profile?.avatar_url || '',
        city: profile?.city || '',
        country: profile?.country || '',
      }))
      if (profile?.avatar_url) setAvatarPreview(profile.avatar_url)
      setChecking(false)
    }
    getSession()
  }, [])

  const handleAvatarPick = (e) => {
    const f = e.target.files?.[0]
    if (!f) return
    setAvatarFile(f)
    setAvatarPreview(URL.createObjectURL(f))
  }

  const toggleActivity = (id) => {
    setForm(f => ({
      ...f,
      activities: f.activities.includes(id) ? f.activities.filter(a => a !== id) : [...f.activities, id],
    }))
  }

  // Persist everything, then hand off to the eterotype test (which saves the
  // type and returns to the dashboard). `skip` marks onboarding done and bails.
  const finish = async (skip = false) => {
    setLoading(true)
    let avatar_url = form.avatar_url
    if (avatarFile && userId) {
      const ext = avatarFile.name.split('.').pop()
      const path = `${userId}/avatar.${ext}`
      const { error } = await supabase.storage.from('avatars').upload(path, avatarFile, { upsert: true, contentType: avatarFile.type })
      if (!error) {
        const { data } = supabase.storage.from('avatars').getPublicUrl(path)
        avatar_url = `${data.publicUrl}?t=${Date.now()}`
      }
    }
    const { error } = await supabase.from('users').update({
      full_name: form.full_name || null,
      avatar_url: avatar_url || null,
      city: form.city || null,
      country: form.country || null,
      onboarding_completed: true,
    }).eq('id', userId)
    // Persist picked activities as activity packages (users has no activities
    // column). Skip ones the user already has, keep it best-effort.
    if (form.activities.length && userId) {
      const { data: existing } = await supabase.from('activity_packages').select('activity_type').eq('user_id', userId)
      const have = new Set((existing || []).map(p => p.activity_type))
      const rows = form.activities
        .filter(a => !have.has(a))
        .map(a => ({ user_id: userId, activity_type: a, title: LABELS[a] || a, is_free: true, price_per_session: 0 }))
      if (rows.length) await supabase.from('activity_packages').insert(rows)
    }
    setLoading(false)
    if (error) { console.error(error); showToast("Couldn't save your profile — try again", { type: 'error' }); return }
    // Carried intent (e.g. "Register your camp" → /crews/new) wins: deliver
    // the user where they were heading before signup. The test can wait.
    const next = typeof window !== 'undefined' ? localStorage.getItem('bestie_next') : null
    if (next && next.startsWith('/') && !next.startsWith('//')) {
      localStorage.removeItem('bestie_next')
      router.push(next)
      return
    }
    // Un-typed users go take the test (our biggest hook); typed users go home.
    router.push(skip ? '/dashboard' : '/bestie-type')
  }

  const inputStyle = { width: '100%', padding: '12px 16px', borderRadius: '12px', fontSize: '14px', outline: 'none', background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text-primary)', boxSizing: 'border-box', fontFamily: 'Plus Jakarta Sans, sans-serif' }
  const labelStyle = { fontSize: '13px', fontWeight: 500, color: 'var(--text-muted)', display: 'block', marginBottom: '8px' }
  const currentGroup = ACTIVITY_GROUPS.find(g => g.id === activeGroup)

  if (checking) return <PageLoader />

  const canContinue = step === 1 ? !!form.full_name : true

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
      <div style={{ width: '100%', maxWidth: '520px' }}>
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <span style={{ fontFamily: 'DM Serif Display, serif', fontSize: '24px', fontWeight: 700, color: '#D4AF37' }}>BESTIE</span>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>Step {step} of 3</p>
        </div>
        <div style={{ display: 'flex', gap: '6px', marginBottom: '28px' }}>
          {[1,2,3].map(s => (
            <div key={s} style={{ flex: 1, height: '4px', borderRadius: '999px', background: s <= step ? '#D4AF37' : 'var(--border)', transition: 'all 0.3s' }} />
          ))}
        </div>
        <div style={{ background: 'var(--surface-1)', border: '1px solid var(--border)', borderRadius: '24px', padding: '32px' }}>
          <h2 style={{ fontFamily: 'DM Serif Display, serif', fontSize: '24px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '20px' }}>
            {STEP_TITLES[step - 1]}
          </h2>

          {step === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                <label style={{ cursor: 'pointer', position: 'relative' }}>
                  <div style={{ width: '110px', height: '110px', borderRadius: '50%', overflow: 'hidden', background: 'var(--surface-2)', border: '2px dashed rgba(212,175,55,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {avatarPreview
                      ? <img src={avatarPreview} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : <Camera size={30} color="#D4AF37" strokeWidth={1.6} />}
                  </div>
                  <span style={{ position: 'absolute', bottom: 0, right: 0, width: '32px', height: '32px', borderRadius: '50%', background: 'linear-gradient(135deg, #D4AF37, #B8960C)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '3px solid var(--surface-1)' }}>
                    <Camera size={15} color="#09090F" strokeWidth={2.2} />
                  </span>
                  <input ref={fileRef} type="file" accept="image/*" onChange={handleAvatarPick} style={{ display: 'none' }} />
                </label>
                <p style={{ fontSize: '12px', color: '#D4AF37', textAlign: 'center' }}>Profiles with a photo get <b>3× more knocks</b></p>
              </div>
              <div>
                <label style={labelStyle}>Your name</label>
                <input value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} placeholder="Your full name" style={inputStyle} />
              </div>
            </div>
          )}

          {step === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={labelStyle}>City</label>
                <input value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} placeholder="e.g. Austin" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>State / Country</label>
                <input value={form.country} onChange={e => setForm(f => ({ ...f, country: e.target.value }))} placeholder="e.g. TX" style={inputStyle} />
              </div>
              <div style={{ padding: '16px', borderRadius: '14px', background: 'rgba(212,175,55,0.06)', border: '1px solid rgba(212,175,55,0.15)', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                <MapPin size={16} color="#D4AF37" strokeWidth={2} style={{ flexShrink: 0, marginTop: '2px' }} />
                <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.6 }}>Your city is how people find you nearby and how events match you. You can meet online from anywhere too.</p>
              </div>
            </div>
          )}

          {step === 3 && (
            <div>
              <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '12px' }}>Pick everything you're open to:</p>
              <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '10px', marginBottom: '12px', scrollbarWidth: 'none' }}>
                {ACTIVITY_GROUPS.map(g => (
                  <button key={g.id} onClick={() => setActiveGroup(g.id)} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '7px 14px', borderRadius: '999px', fontSize: '12px', fontWeight: 500, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0, background: activeGroup === g.id ? 'rgba(212,175,55,0.15)' : 'var(--surface-1b)', border: activeGroup === g.id ? '1px solid rgba(212,175,55,0.4)' : '1px solid var(--border)', color: activeGroup === g.id ? '#D4AF37' : 'var(--text-muted)' }}>
                    <g.Icon size={13} strokeWidth={1.8} />{g.label}
                  </button>
                ))}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', maxHeight: '280px', overflowY: 'auto' }}>
                {currentGroup?.activities.map(a => {
                  const selected = form.activities.includes(a.id)
                  return (
                    <button key={a.id} onClick={() => toggleActivity(a.id)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', padding: '12px 8px', borderRadius: '14px', border: selected ? '1px solid rgba(212,175,55,0.4)' : '1px solid var(--border)', background: selected ? 'rgba(212,175,55,0.1)' : 'var(--surface-1)', cursor: 'pointer' }}>
                      <ActivityIcon type={a.id} size={22} color={selected ? '#D4AF37' : 'var(--text-muted)'} strokeWidth={1.7} />
                      <span style={{ fontSize: '11px', fontWeight: 500, color: selected ? '#D4AF37' : 'var(--text-muted)', textAlign: 'center' }}>{a.label}</span>
                    </button>
                  )
                })}
              </div>
              {form.activities.length > 0 && (
                <p style={{ fontSize: '12px', color: '#D4AF37', marginTop: '12px' }}>{form.activities.length} selected</p>
              )}
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '14px', lineHeight: 1.5 }}>
                Next: the 5-minute personality test — it powers who you'll click with. 🧭
              </p>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px' }}>
          {step > 1
            ? <button onClick={() => setStep(s => s - 1)} style={{ fontSize: '14px', color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}>← Back</button>
            : <button onClick={() => finish(true)} disabled={loading} style={{ fontSize: '13px', color: 'var(--text-dim)', background: 'none', border: 'none', cursor: 'pointer' }}>Skip for now</button>}
          {step < 3 ? (
            <button onClick={() => setStep(s => s + 1)} disabled={!canContinue} style={{ padding: '12px 28px', borderRadius: '12px', fontSize: '14px', fontWeight: 600, background: 'linear-gradient(135deg, #D4AF37 0%, #B8960C 100%)', color: '#09090F', border: 'none', cursor: canContinue ? 'pointer' : 'not-allowed', opacity: canContinue ? 1 : 0.5 }}>
              Continue →
            </button>
          ) : (
            <button onClick={() => finish(false)} disabled={loading} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '12px 28px', borderRadius: '12px', fontSize: '14px', fontWeight: 700, background: 'linear-gradient(135deg, #D4AF37 0%, #B8960C 100%)', color: '#09090F', border: 'none', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1, fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
              {loading ? 'Saving…' : (<><Sparkles size={14} strokeWidth={2} /> Take the test →</>)}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
