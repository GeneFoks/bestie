// @ts-nocheck
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
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

export default function GoingToPage() {
  const router = useRouter()
  const [userId, setUserId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [posting, setPosting] = useState(false)
  const [current, setCurrent] = useState(null)
  const [stories, setStories] = useState([])
  const [form, setForm] = useState({ activity_type: '', description: '', location: '' })

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }
      setUserId(session.user.id)

      // Мой текущий статус
      const { data: my } = await supabase
        .from('going_to')
        .select('*')
        .eq('user_id', session.user.id)
        .gt('expires_at', new Date().toISOString())
        .single()
      setCurrent(my)

      // Все активные истории
      const { data: all } = await supabase
        .from('going_to')
        .select('*, users(full_name, username, avatar_url, city)')
        .gt('expires_at', new Date().toISOString())
        .neq('user_id', session.user.id)
        .order('created_at', { ascending: false })
      setStories(all || [])
      setLoading(false)
    }
    init()
  }, [])

  const handlePost = async () => {
    if (!form.activity_type) return
    setPosting(true)

    // Удаляем старый статус
    await supabase.from('going_to').delete().eq('user_id', userId)

    const { data } = await supabase.from('going_to').insert({
      user_id: userId,
      activity_type: form.activity_type,
      description: form.description,
      location: form.location,
    }).select().single()

    setCurrent(data)
    setForm({ activity_type: '', description: '', location: '' })
    setPosting(false)
  }

  const handleDelete = async () => {
    await supabase.from('going_to').delete().eq('user_id', userId)
    setCurrent(null)
  }

  const getTimeLeft = (expiresAt) => {
    const diff = new Date(expiresAt) - new Date()
    const hours = Math.floor(diff / 3600000)
    const mins = Math.floor((diff % 3600000) / 60000)
    if (hours > 0) return `${hours}h left`
    return `${mins}m left`
  }

  const getActivity = (id) => ACTIVITIES.find(a => a.id === id)

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#080810', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: '40px', height: '40px', border: '3px solid rgba(212,175,55,0.2)', borderTop: '3px solid #D4AF37', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#080810', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
      <nav style={{ position: 'sticky', top: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', background: 'rgba(8,8,16,0.9)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <Link href="/" style={{ fontFamily: 'DM Serif Display, serif', fontSize: '20px', fontWeight: 700, color: '#D4AF37', textDecoration: 'none' }}>BESTIE</Link>
        <Link href="/dashboard" style={{ fontSize: '14px', color: '#9B93C0', textDecoration: 'none', padding: '8px 16px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.1)' }}>← Dashboard</Link>
      </nav>

      <div style={{ maxWidth: '640px', margin: '0 auto', padding: '40px 24px' }}>
        <div style={{ marginBottom: '32px' }}>
          <h1 style={{ fontFamily: 'DM Serif Display, serif', fontSize: '28px', fontWeight: 700, color: '#E8E0FF', marginBottom: '8px' }}>Going to ⚡</h1>
          <p style={{ fontSize: '14px', color: '#9B93C0' }}>Share what you're up to today — disappears in 24h</p>
        </div>

        {/* My current status */}
        {current ? (
          <div style={{ background: 'linear-gradient(135deg, rgba(212,175,55,0.1) 0%, rgba(57,255,20,0.05) 100%)', border: '1px solid rgba(212,175,55,0.25)', borderRadius: '20px', padding: '20px', marginBottom: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <p style={{ fontSize: '12px', fontWeight: 600, color: '#D4AF37', letterSpacing: '1px' }}>YOUR STATUS</p>
              <span style={{ fontSize: '12px', color: '#9B93C0' }}>⏱ {getTimeLeft(current.expires_at)}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <span style={{ fontSize: '24px' }}>{getActivity(current.activity_type)?.emoji}</span>
              <span style={{ fontSize: '16px', fontWeight: 600, color: '#E8E0FF' }}>{getActivity(current.activity_type)?.label}</span>
            </div>
            {current.description && <p style={{ fontSize: '14px', color: '#9B93C0', marginBottom: '4px' }}>{current.description}</p>}
            {current.location && <p style={{ fontSize: '13px', color: '#9B93C0' }}>📍 {current.location}</p>}
            <button onClick={handleDelete} style={{ marginTop: '12px', fontSize: '13px', color: '#ff6b6b', background: 'none', border: '1px solid rgba(255,80,80,0.2)', padding: '6px 14px', borderRadius: '8px', cursor: 'pointer' }}>
              Remove status
            </button>
          </div>
        ) : (
          /* Post new status */
          <div style={{ background: '#0F0F1E', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '20px', padding: '24px', marginBottom: '24px' }}>
            <h3 style={{ fontFamily: 'DM Serif Display, serif', fontSize: '18px', color: '#E8E0FF', marginBottom: '16px' }}>What are you up to?</h3>

            {/* Activity picker */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginBottom: '16px' }}>
              {ACTIVITIES.map(a => {
                const selected = form.activity_type === a.id
                return (
                  <button key={a.id} onClick={() => setForm(f => ({ ...f, activity_type: a.id }))} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', padding: '10px 6px', borderRadius: '12px', border: selected ? '1px solid rgba(212,175,55,0.4)' : '1px solid rgba(255,255,255,0.06)', background: selected ? 'rgba(212,175,55,0.1)' : 'rgba(255,255,255,0.03)', cursor: 'pointer' }}>
                    <span style={{ fontSize: '20px' }}>{a.emoji}</span>
                    <span style={{ fontSize: '10px', color: selected ? '#D4AF37' : '#9B93C0', textAlign: 'center', lineHeight: 1.3 }}>{a.label}</span>
                  </button>
                )
              })}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
              <input
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="What's the vibe? (optional)"
                style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', fontSize: '14px', outline: 'none', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#E8E0FF', boxSizing: 'border-box' }}
              />
              <input
                value={form.location}
                onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
                placeholder="📍 Location (optional)"
                style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', fontSize: '14px', outline: 'none', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#E8E0FF', boxSizing: 'border-box' }}
              />
            </div>

            <button onClick={handlePost} disabled={posting || !form.activity_type} style={{ width: '100%', padding: '13px', borderRadius: '12px', fontSize: '14px', fontWeight: 600, background: form.activity_type ? 'linear-gradient(135deg, #D4AF37 0%, #B8960C 100%)' : 'rgba(255,255,255,0.06)', color: form.activity_type ? '#080810' : '#9B93C0', border: 'none', cursor: form.activity_type ? 'pointer' : 'not-allowed' }}>
              {posting ? 'Posting...' : '⚡ Post my status'}
            </button>
          </div>
        )}

        {/* Other stories */}
        <div>
          <h3 style={{ fontFamily: 'DM Serif Display, serif', fontSize: '18px', color: '#E8E0FF', marginBottom: '16px' }}>
            What others are up to
            {stories.length > 0 && <span style={{ fontSize: '14px', color: '#9B93C0', fontFamily: 'Plus Jakarta Sans, sans-serif', fontWeight: 400, marginLeft: '8px' }}>({stories.length} active)</span>}
          </h3>

          {stories.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: '#9B93C0' }}>
              <p style={{ fontSize: '32px', marginBottom: '12px' }}>👀</p>
              <p style={{ fontSize: '14px' }}>No one is out yet. Be the first!</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {stories.map(story => {
                const activity = getActivity(story.activity_type)
                const initials = story.users?.full_name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?'
                return (
                  <div key={story.id} style={{ background: '#0F0F1E', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '16px', padding: '16px', display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
                    <Link href={`/${story.users?.username}`} style={{ textDecoration: 'none', flexShrink: 0 }}>
                      <div style={{ width: '44px', height: '44px', borderRadius: '12px', overflow: 'hidden', background: '#1a1a35', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(212,175,55,0.2)' }}>
                        {story.users?.avatar_url
                          ? <img src={story.users.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          : <span style={{ fontSize: '14px', fontWeight: 700, color: '#D4AF37' }}>{initials}</span>
                        }
                      </div>
                    </Link>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <Link href={`/${story.users?.username}`} style={{ fontSize: '14px', fontWeight: 600, color: '#E8E0FF', textDecoration: 'none' }}>
                          {story.users?.full_name}
                        </Link>
                        <span style={{ fontSize: '11px', color: '#9B93C0' }}>⏱ {getTimeLeft(story.expires_at)}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                        <span style={{ fontSize: '16px' }}>{activity?.emoji}</span>
                        <span style={{ fontSize: '13px', fontWeight: 500, color: '#D4AF37' }}>{activity?.label}</span>
                        {story.users?.city && <span style={{ fontSize: '12px', color: '#9B93C0' }}>· 📍 {story.users.city}</span>}
                      </div>
                      {story.description && <p style={{ fontSize: '13px', color: '#9B93C0', marginBottom: '4px' }}>{story.description}</p>}
                      {story.location && <p style={{ fontSize: '12px', color: '#9B93C0' }}>📍 {story.location}</p>}
                      <Link href={`/messages?to=${story.users?.username}`} style={{ display: 'inline-block', marginTop: '10px', fontSize: '12px', fontWeight: 600, padding: '6px 14px', borderRadius: '8px', background: 'rgba(212,175,55,0.1)', border: '1px solid rgba(212,175,55,0.2)', color: '#D4AF37', textDecoration: 'none' }}>
                        💬 Join them
                      </Link>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
