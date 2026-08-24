// @ts-nocheck
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { PageLoader } from '@/components/Loading'
import { ActivityIcon } from '@/lib/activityIcons'
import { EmptyState } from '@/components/EmptyState'
import { MapPin } from 'lucide-react'

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
    { id: 'pickleball', emoji: '🏓', label: 'Pickleball' },
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
    { id: 'girls_circle', emoji: '🌸', label: 'Girls Circle' },
    { id: 'mens_circle', emoji: '🔥', label: "Men's Circle" },
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

const ALL_ACTIVITIES = ACTIVITY_GROUPS.flatMap(g => g.activities)

export default function GoingToPage() {
  const router = useRouter()
  const [userId, setUserId] = useState(null)
  const [myProfile, setMyProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [posting, setPosting] = useState(false)
  const [current, setCurrent] = useState(null)
  const [stories, setStories] = useState([])
  const [joinedIds, setJoinedIds] = useState([])
  const [joiningId, setJoiningId] = useState(null)
  const [activeGroup, setActiveGroup] = useState(ACTIVITY_GROUPS[0].label)
  const [form, setForm] = useState({ activity_type: '', description: '', location: '', scheduled_at: '' })

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }
      setUserId(session.user.id)

      const { data: me } = await supabase.from('users').select('full_name, username, avatar_url').eq('id', session.user.id).single()
      setMyProfile(me)

      const { data: my } = await supabase.from('going_to').select('*').eq('user_id', session.user.id).gt('expires_at', new Date().toISOString()).single()
      setCurrent(my)

      const { data: all } = await supabase.from('going_to').select('*, users(id, full_name, username, avatar_url, city)').gt('expires_at', new Date().toISOString()).neq('user_id', session.user.id).order('created_at', { ascending: false })
      setStories(all || [])

      const { data: sentMessages } = await supabase.from('messages').select('receiver_id').eq('sender_id', session.user.id)
      setJoinedIds(sentMessages?.map(m => m.receiver_id) || [])

      setLoading(false)
    }
    init()
  }, [])

  const handlePost = async () => {
    if (!form.activity_type) return
    setPosting(true)
    await supabase.from('going_to').delete().eq('user_id', userId)
    const { data } = await supabase.from('going_to').insert({
      user_id: userId,
      activity_type: form.activity_type,
      description: form.description,
      location: form.location,
      scheduled_at: form.scheduled_at ? new Date(form.scheduled_at).toISOString() : null,
    }).select().single()
    setCurrent(data)
    setForm({ activity_type: '', description: '', location: '', scheduled_at: '' })

    // Push notification to all mutual knock connections
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        fetch('/api/going-to/notify', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            activity_type: form.activity_type,
            location: form.location,
          }),
        })
      }
    } catch (e) {
      // non-blocking — push failure shouldn't stop the post
      console.warn('[going-to] push notify error:', e)
    }

    setPosting(false)
  }

  const handleDelete = async () => {
    await supabase.from('going_to').delete().eq('user_id', userId)
    setCurrent(null)
  }

  const handleJoin = async (story) => {
    if (!story.users?.id || joiningId) return
    setJoiningId(story.id)
    const activity = getActivity(story.activity_type)
    const msg = `Hey! I saw you're going to ${activity?.label}${story.location ? ` at ${story.location}` : ''}${story.scheduled_at ? ` on ${formatDate(story.scheduled_at)}` : ''}. I'd love to join! 🙌`
    await supabase.from('messages').insert({ sender_id: userId, receiver_id: story.users.id, content: msg, read: false })
    setJoinedIds(prev => [...prev, story.users.id])
    setJoiningId(null)
  }

  const getTimeLeft = (expiresAt) => {
    const diff = new Date(expiresAt) - new Date()
    const hours = Math.floor(diff / 3600000)
    const mins = Math.floor((diff % 3600000) / 60000)
    if (hours > 0) return `${hours}h left`
    return `${mins}m left`
  }

  const formatDate = (dt) => {
    if (!dt) return null
    return new Date(dt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

  const getActivity = (id) => ALL_ACTIVITIES.find(a => a.id === id)

  const inputStyle = { width: '100%', padding: '12px 16px', borderRadius: '12px', fontSize: '14px', outline: 'none', background: '#161628', border: '1px solid rgba(255,255,255,0.1)', color: '#F0EAFF', boxSizing: 'border-box', fontFamily: 'Plus Jakarta Sans, sans-serif' }

  if (loading) return <PageLoader message="Loading…" />

  const currentGroup = ACTIVITY_GROUPS.find(g => g.label === activeGroup)

  // Composer card — rendered at the top normally, or inside the empty state when the feed is quiet
  const composer = (
    <div style={{ background: '#111120', border: '1px solid rgba(255,255,255,0.10)', borderRadius: '20px', padding: '24px', marginBottom: '24px' }}>
      <h3 style={{ fontFamily: 'DM Serif Display, serif', fontSize: '18px', color: '#F0EAFF', marginBottom: '16px' }}>What are you up to?</h3>

      {/* Group tabs */}
      <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '12px', marginBottom: '12px', scrollbarWidth: 'none' }}>
        {ACTIVITY_GROUPS.map(g => (
          <button key={g.label} onClick={() => setActiveGroup(g.label)} style={{ padding: '6px 12px', borderRadius: '999px', fontSize: '12px', fontWeight: 500, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0, background: activeGroup === g.label ? 'rgba(212,175,55,0.15)' : '#131323', border: activeGroup === g.label ? '1px solid rgba(212,175,55,0.4)' : '1px solid rgba(255,255,255,0.10)', color: activeGroup === g.label ? '#D4AF37' : '#A99ECC' }}>
            {g.label}
          </button>
        ))}
      </div>

      {/* Activity grid for active group */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginBottom: '16px' }}>
        {currentGroup?.activities.map(a => {
          const selected = form.activity_type === a.id
          return (
            <button key={a.id} onClick={() => setForm(f => ({ ...f, activity_type: a.id }))} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', padding: '10px 6px', borderRadius: '12px', border: selected ? '1px solid rgba(212,175,55,0.4)' : '1px solid rgba(255,255,255,0.10)', background: selected ? 'rgba(212,175,55,0.1)' : '#111120', cursor: 'pointer' }}>
              <ActivityIcon type={a.id} size={20} color={selected ? '#D4AF37' : '#A99ECC'} strokeWidth={1.8} />
              <span style={{ fontSize: '10px', color: selected ? '#D4AF37' : '#A99ECC', textAlign: 'center', lineHeight: 1.3 }}>{a.label}</span>
            </button>
          )
        })}
      </div>

      {form.activity_type && (
        <div style={{ marginBottom: '12px', padding: '8px 14px', borderRadius: '10px', background: 'rgba(212,175,55,0.08)', border: '1px solid rgba(212,175,55,0.2)', fontSize: '13px', color: '#D4AF37' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>Selected: <ActivityIcon type={form.activity_type} size={14} color="#D4AF37" strokeWidth={1.8} /> {getActivity(form.activity_type)?.label}</span>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
        <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="What's the vibe? (optional)" style={inputStyle} />
        <input value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} placeholder="📍 Location (optional)" style={inputStyle} />
        <div>
          <label style={{ fontSize: '12px', color: '#A99ECC', display: 'block', marginBottom: '6px' }}>🗓 Date & time <span style={{ color: '#6B5EA8' }}>(optional)</span></label>
          <input type="datetime-local" value={form.scheduled_at} onChange={e => setForm(f => ({ ...f, scheduled_at: e.target.value }))} style={{ ...inputStyle, colorScheme: 'dark' }} />
        </div>
      </div>

      <button onClick={handlePost} disabled={posting || !form.activity_type} style={{ width: '100%', padding: '13px', borderRadius: '12px', fontSize: '14px', fontWeight: 600, background: form.activity_type ? 'linear-gradient(135deg, #D4AF37 0%, #B8960C 100%)' : 'rgba(255,255,255,0.10)', color: form.activity_type ? '#09090F' : '#A99ECC', border: 'none', cursor: form.activity_type ? 'pointer' : 'not-allowed' }}>
        {posting ? 'Posting...' : '⚡ Post my status'}
      </button>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#09090F', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
      <nav style={{ position: 'sticky', top: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', background: 'rgba(8,8,16,0.9)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.10)' }}>
        <Link href="/" style={{ fontFamily: 'DM Serif Display, serif', fontSize: '20px', fontWeight: 700, color: '#D4AF37', textDecoration: 'none' }}>BESTIE</Link>
        <Link href="/dashboard" style={{ fontSize: '14px', color: '#A99ECC', textDecoration: 'none', padding: '8px 16px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.1)' }}>← Dashboard</Link>
      </nav>

      <div style={{ maxWidth: '640px', margin: '0 auto', padding: '40px 24px' }}>
        <div style={{ marginBottom: '32px' }}>
          <h1 style={{ fontFamily: 'DM Serif Display, serif', fontSize: '28px', fontWeight: 700, color: '#F0EAFF', marginBottom: '8px' }}>Going to ⚡</h1>
          <p style={{ fontSize: '14px', color: '#A99ECC' }}>Share what you're up to today — disappears in 24h</p>
        </div>

        {current ? (
          <div style={{ background: 'linear-gradient(135deg, rgba(212,175,55,0.1) 0%, rgba(52,211,153,0.05) 100%)', border: '1px solid rgba(212,175,55,0.25)', borderRadius: '20px', padding: '20px', marginBottom: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <p style={{ fontSize: '12px', fontWeight: 600, color: '#D4AF37', letterSpacing: '1px' }}>YOUR STATUS</p>
              <span style={{ fontSize: '12px', color: '#A99ECC' }}>⏱ {getTimeLeft(current.expires_at)}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <span style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'rgba(212,175,55,0.10)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <ActivityIcon type={current.activity_type} size={22} color="#D4AF37" strokeWidth={1.6} />
              </span>
              <span style={{ fontSize: '16px', fontWeight: 600, color: '#F0EAFF' }}>{getActivity(current.activity_type)?.label}</span>
            </div>
            {current.description && <p style={{ fontSize: '14px', color: '#A99ECC', marginBottom: '4px' }}>{current.description}</p>}
            {current.location && <p style={{ fontSize: '13px', color: '#A99ECC', marginBottom: '4px' }}>📍 {current.location}</p>}
            {current.scheduled_at && <p style={{ fontSize: '13px', color: '#D4AF37' }}>🗓 {formatDate(current.scheduled_at)}</p>}
            <button onClick={handleDelete} style={{ marginTop: '12px', fontSize: '13px', color: '#ff6b6b', background: 'none', border: '1px solid rgba(255,80,80,0.2)', padding: '6px 14px', borderRadius: '8px', cursor: 'pointer' }}>
              Remove status
            </button>
          </div>
        ) : stories.length > 0 ? composer : null}

        <div>
          <h3 style={{ fontFamily: 'DM Serif Display, serif', fontSize: '18px', color: '#F0EAFF', marginBottom: '16px' }}>
            What others are up to
            {stories.length > 0 && <span style={{ fontSize: '14px', color: '#A99ECC', fontFamily: 'Plus Jakarta Sans, sans-serif', fontWeight: 400, marginLeft: '8px' }}>({stories.length} active)</span>}
          </h3>

          {stories.length === 0 ? (
            current ? (
              <EmptyState
                Icon={MapPin}
                title="Nobody's out yet"
                description="Your status is live — others will see it in their feed and may want to join."
                accent="gold"
              />
            ) : (
              <div>
                <div style={{ textAlign: 'center', padding: '8px 0 20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '10px' }}><MapPin size={36} color="#A99ECC" strokeWidth={1.6} /></div>
                  <p style={{ fontSize: '16px', fontWeight: 700, color: '#F0EAFF', marginBottom: '4px' }}>Nobody&rsquo;s out — you go first</p>
                  <p style={{ fontSize: '13px', color: '#A99ECC' }}>Post what you&rsquo;re up to below — it shows here for 24h so nearby Besties can join you.</p>
                </div>
                {composer}
              </div>
            )
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {stories.map(story => {
                const activity = getActivity(story.activity_type)
                const initials = story.users?.full_name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?'
                const alreadyJoined = joinedIds.includes(story.users?.id)
                return (
                  <div key={story.id} style={{ background: '#111120', border: '1px solid rgba(255,255,255,0.10)', borderRadius: '16px', padding: '16px', display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
                    <Link href={`/${story.users?.username}`} style={{ textDecoration: 'none', flexShrink: 0 }}>
                      <div style={{ width: '44px', height: '44px', borderRadius: '12px', overflow: 'hidden', background: '#1A1A2E', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(212,175,55,0.2)' }}>
                        {story.users?.avatar_url ? <img src={story.users.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: '14px', fontWeight: 700, color: '#D4AF37' }}>{initials}</span>}
                      </div>
                    </Link>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <Link href={`/${story.users?.username}`} style={{ fontSize: '14px', fontWeight: 600, color: '#F0EAFF', textDecoration: 'none' }}>{story.users?.full_name}</Link>
                        <span style={{ fontSize: '11px', color: '#A99ECC' }}>⏱ {getTimeLeft(story.expires_at)}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                        <ActivityIcon type={story.activity_type} size={16} color="#D4AF37" strokeWidth={1.8} />
                        <span style={{ fontSize: '13px', fontWeight: 500, color: '#D4AF37' }}>{activity?.label}</span>
                        {story.users?.city && <span style={{ fontSize: '12px', color: '#A99ECC' }}>· 📍 {story.users.city}</span>}
                      </div>
                      {story.description && <p style={{ fontSize: '13px', color: '#A99ECC', marginBottom: '4px' }}>{story.description}</p>}
                      {story.location && <p style={{ fontSize: '12px', color: '#A99ECC', marginBottom: '4px' }}>📍 {story.location}</p>}
                      {story.scheduled_at && <p style={{ fontSize: '12px', color: '#D4AF37', marginBottom: '8px' }}>🗓 {formatDate(story.scheduled_at)}</p>}
                      <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                        <button onClick={() => handleJoin(story)} disabled={alreadyJoined || joiningId === story.id} style={{ fontSize: '12px', fontWeight: 600, padding: '7px 16px', borderRadius: '8px', background: alreadyJoined ? 'rgba(52,211,153,0.1)' : 'rgba(212,175,55,0.1)', border: alreadyJoined ? '1px solid rgba(52,211,153,0.3)' : '1px solid rgba(212,175,55,0.2)', color: alreadyJoined ? '#34D399' : '#D4AF37', cursor: alreadyJoined ? 'default' : 'pointer' }}>
                          {alreadyJoined ? '✓ Request sent' : joiningId === story.id ? 'Sending...' : '⚡ Join them'}
                        </button>
                        <Link href={`/messages?to=${story.users?.username}`} style={{ fontSize: '12px', fontWeight: 600, padding: '7px 16px', borderRadius: '8px', background: '#131323', border: '1px solid rgba(255,255,255,0.12)', color: '#A99ECC', textDecoration: 'none' }}>
                          💬 Message
                        </Link>
                      </div>
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
