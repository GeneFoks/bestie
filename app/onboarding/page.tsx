// @ts-nocheck
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const ACTIVITIES = [
  { id: 'meet_irl', emoji: '🤝', label: 'Meet IRL' },
  { id: 'dance_crew', emoji: '💃', label: 'Dance Crew' },
  { id: 'trail_crew', emoji: '🥾', label: 'Trail Crew' },
  { id: 'travel_buddy', emoji: '✈️', label: 'Travel Buddy' },
  { id: 'game_night', emoji: '🎮', label: 'Game Night' },
  { id: 'watch_together', emoji: '🎬', label: 'Watch Together' },
  { id: 'vibe_call', emoji: '📱', label: 'Vibe Call' },
  { id: 'deep_chat', emoji: '🫂', label: 'Deep Chat' },
  { id: 'real_talk', emoji: '💬', label: 'Real Talk' },
  { id: 'festival_crew', emoji: '🎪', label: 'Festival Crew' },
  { id: 'epic_journey', emoji: '🌍', label: 'Epic Journey' },
  { id: 'fishing_crew', emoji: '🎣', label: 'Fishing Crew' },
]

const STEP_TITLES = ['Who are you?', 'Where are you?', 'What are you into?', 'Your first activity']

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [userId, setUserId] = useState(null)
  const [form, setForm] = useState({
    full_name: '', bio: '', city: '', country: '',
    activities: [], activityTitle: '', activityType: '',
    activityPrice: '', activityFree: false, activityDesc: '',
  })

  useEffect(() => {
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getUser()
      if (!session) { router.push('/login'); return }
      setUserId(session.user.id)
      const name = session.user.user_metadata?.full_name
      if (name) setForm(f => ({ ...f, full_name: name }))
    }
    getSession()
  }, [])

  const toggleActivity = (id) => {
    setForm(f => ({
      ...f,
      activities: f.activities.includes(id) ? f.activities.filter(a => a !== id) : [...f.activities, id]
    }))
  }

  const handleFinish = async () => {
    setLoading(true)
    await supabase.from('users').update({
      full_name: form.full_name, bio: form.bio,
      city: form.city, country: form.country, bestie_score: 80,
    }).eq('id', userId)
    if (form.activityTitle && form.activityType) {
      await supabase.from('activity_packages').insert({
        user_id: userId, title: form.activityTitle,
        activity_type: form.activityType, description: form.activityDesc,
        price_per_session: form.activityFree ? 0 : parseFloat(form.activityPrice) || 0,
        is_free: form.activityFree,
      })
    }
    router.push('/dashboard')
  }

  const inputStyle = { width: '100%', padding: '12px 16px', borderRadius: '12px', fontSize: '14px', outline: 'none', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#E8E0FF', boxSizing: 'border-box', fontFamily: 'Plus Jakarta Sans, sans-serif' }
  const labelStyle = { fontSize: '13px', fontWeight: 500, color: '#9B93C0', display: 'block', marginBottom: '8px' }

  return (
    <div style={{ minHeight: '100vh', background: '#080810', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
      <div style={{ width: '100%', maxWidth: '520px' }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <span style={{ fontFamily: 'DM Serif Display, serif', fontSize: '24px', fontWeight: 700, color: '#D4AF37' }}>BESTIE</span>
          <p style={{ fontSize: '13px', color: '#9B93C0', marginTop: '4px' }}>Step {step} of 4</p>
        </div>
        <div style={{ display: 'flex', gap: '6px', marginBottom: '32px' }}>
          {[1,2,3,4].map(s => (
            <div key={s} style={{ flex: 1, height: '4px', borderRadius: '999px', background: s <= step ? '#D4AF37' : 'rgba(255,255,255,0.08)', transition: 'all 0.3s' }} />
          ))}
        </div>
        <div style={{ background: '#0F0F1E', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '24px', padding: '32px' }}>
          <h2 style={{ fontFamily: 'DM Serif Display, serif', fontSize: '24px', fontWeight: 700, color: '#E8E0FF', marginBottom: '24px' }}>
            {STEP_TITLES[step - 1]}
          </h2>

          {step === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={labelStyle}>Your name</label>
                <input value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} placeholder="Gennadii Fokin" style={inputStyle} />
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
                <p style={{ fontSize: '13px', color: '#9B93C0', lineHeight: 1.6 }}>📍 Your city helps people find you locally. Vibe calls work anywhere.</p>
              </div>
            </div>
          )}

          {step === 3 && (
            <div>
              <p style={{ fontSize: '14px', color: '#9B93C0', marginBottom: '16px' }}>Pick everything you're open to:</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                {ACTIVITIES.map(a => {
                  const selected = form.activities.includes(a.id)
                  return (
                    <button key={a.id} onClick={() => toggleActivity(a.id)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', padding: '12px 8px', borderRadius: '14px', border: selected ? '1px solid rgba(212,175,55,0.4)' : '1px solid rgba(255,255,255,0.06)', background: selected ? 'rgba(212,175,55,0.1)' : 'rgba(255,255,255,0.03)', cursor: 'pointer' }}>
                      <span style={{ fontSize: '24px' }}>{a.emoji}</span>
                      <span style={{ fontSize: '11px', fontWeight: 500, color: selected ? '#D4AF37' : '#9B93C0', textAlign: 'center' }}>{a.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {step === 4 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <p style={{ fontSize: '14px', color: '#9B93C0' }}>Create your first offering — what people will book you for.</p>
              <div>
                <label style={labelStyle}>Activity title</label>
                <input value={form.activityTitle} onChange={e => setForm(f => ({ ...f, activityTitle: e.target.value }))} placeholder="Morning Trail Run in Barton Creek" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Activity type</label>
                <select value={form.activityType} onChange={e => setForm(f => ({ ...f, activityType: e.target.value }))} style={{ ...inputStyle, cursor: 'pointer' }}>
                  <option value="">Select type...</option>
                  {ACTIVITIES.map(a => <option key={a.id} value={a.id}>{a.emoji} {a.label}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Description</label>
                <textarea value={form.activityDesc} onChange={e => setForm(f => ({ ...f, activityDesc: e.target.value }))} placeholder="Describe what you'll do together..." rows={3} style={{ ...inputStyle, resize: 'none' }} />
              </div>
              <button onClick={() => setForm(f => ({ ...f, activityFree: !f.activityFree }))} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                <div style={{ width: '20px', height: '20px', borderRadius: '6px', border: form.activityFree ? '2px solid #D4AF37' : '2px solid rgba(255,255,255,0.2)', background: form.activityFree ? '#D4AF37' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', color: '#080810' }}>
                  {form.activityFree ? '✓' : ''}
                </div>
                <span style={{ fontSize: '14px', color: '#E8E0FF' }}>This is a free match</span>
              </button>
              {!form.activityFree && (
                <div>
                  <label style={labelStyle}>Price per session ($)</label>
                  <input type="number" value={form.activityPrice} onChange={e => setForm(f => ({ ...f, activityPrice: e.target.value }))} placeholder="20" style={inputStyle} />
                </div>
              )}
              <p style={{ fontSize: '12px', color: '#9B93C0' }}>You can skip this and add activities later.</p>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px' }}>
          {step > 1 ? (
            <button onClick={() => setStep(s => s - 1)} style={{ fontSize: '14px', color: '#9B93C0', background: 'none', border: 'none', cursor: 'pointer' }}>← Back</button>
          ) : <div />}
          <div style={{ display: 'flex', gap: '10px' }}>
            {step === 4 && (
              <button onClick={() => router.push('/dashboard')} style={{ fontSize: '14px', color: '#9B93C0', background: 'none', border: '1px solid rgba(255,255,255,0.1)', padding: '10px 20px', borderRadius: '12px', cursor: 'pointer' }}>Skip</button>
            )}
            {step < 4 ? (
              <button onClick={() => setStep(s => s + 1)} disabled={step === 1 && !form.full_name} style={{ padding: '12px 28px', borderRadius: '12px', fontSize: '14px', fontWeight: 600, background: 'linear-gradient(135deg, #D4AF37 0%, #B8960C 100%)', color: '#080810', border: 'none', cursor: 'pointer', opacity: (step === 1 && !form.full_name) ? 0.5 : 1 }}>
                Continue →
              </button>
            ) : (
              <button onClick={handleFinish} disabled={loading} style={{ padding: '12px 28px', borderRadius: '12px', fontSize: '14px', fontWeight: 600, background: 'linear-gradient(135deg, #D4AF37 0%, #B8960C 100%)', color: '#080810', border: 'none', cursor: 'pointer', opacity: loading ? 0.7 : 1 }}>
                {loading ? 'Saving...' : 'Finish setup 🎉'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
