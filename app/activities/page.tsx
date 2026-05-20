// @ts-nocheck
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { PageLoader } from '@/components/Loading'

const ACTIVITY_GROUPS = [
  {
    id: 'active', label: '🏃 Active & Outdoors',
    items: [
      { id: 'hiking', emoji: '🥾', label: 'Hiking' },
      { id: 'running', emoji: '🏃', label: 'Running' },
      { id: 'gym_partner', emoji: '💪', label: 'Gym Partner' },
      { id: 'cycling', emoji: '🚴', label: 'Cycling' },
      { id: 'swimming', emoji: '🏊', label: 'Swimming' },
      { id: 'cold_plunge', emoji: '🧊', label: 'Cold Plunge/Sauna' },
      { id: 'yoga', emoji: '🧘', label: 'Yoga' },
      { id: 'martial_arts', emoji: '🥋', label: 'Martial Arts' },
      { id: 'climbing', emoji: '🧗', label: 'Climbing' },
    ]
  },
  {
    id: 'social', label: '🎮 Fun & Social',
    items: [
      { id: 'game_night', emoji: '🎮', label: 'Game Night' },
      { id: 'movie_night', emoji: '🎬', label: 'Movie Night' },
      { id: 'night_out', emoji: '🍸', label: 'Night Out' },
      { id: 'bar_hopping', emoji: '🍺', label: 'Bar Hopping' },
      { id: 'karaoke', emoji: '🎤', label: 'Karaoke' },
      { id: 'festival_crew', emoji: '🎪', label: 'Festival Crew' },
      { id: 'travel_buddy', emoji: '✈️', label: 'Travel Buddy' },
      { id: 'wing_person', emoji: '😎', label: 'Wing Person' },
      { id: 'comedy_show', emoji: '😂', label: 'Comedy Show' },
    ]
  },
  {
    id: 'mind', label: '🧠 Mind & Growth',
    items: [
      { id: 'deep_chat', emoji: '🫂', label: 'Deep Chat' },
      { id: 'debate_club', emoji: '🗣️', label: 'Debate Club' },
      { id: 'book_club', emoji: '📚', label: 'Book Club' },
      { id: 'language_exchange', emoji: '🌐', label: 'Language Exchange' },
      { id: 'career_talk', emoji: '💼', label: 'Career Talk' },
      { id: 'money_talk', emoji: '💰', label: 'Money Talk' },
      { id: 'journaling', emoji: '📓', label: 'Journaling Together' },
      { id: 'accountability', emoji: '🎯', label: 'Accountability Partner' },
      { id: 'storytelling', emoji: '📖', label: 'Storytelling Night' },
    ]
  },
  {
    id: 'creative', label: '🎨 Creative & Skills',
    items: [
      { id: 'music_lesson', emoji: '🎸', label: 'Music Lesson' },
      { id: 'art_together', emoji: '🎨', label: 'Art Together' },
      { id: 'photography', emoji: '📸', label: 'Photography Walk' },
      { id: 'cooking', emoji: '🍳', label: 'Cooking Together' },
      { id: 'dance', emoji: '💃', label: 'Dance' },
      { id: 'improv', emoji: '🎭', label: 'Improv/Acting' },
      { id: 'writing_club', emoji: '✍️', label: 'Writing Club' },
    ]
  },
  {
    id: 'emotional', label: '🫂 Emotional & Support',
    items: [
      { id: 'vent_session', emoji: '💬', label: 'Vent Session' },
      { id: 'talk_3am', emoji: '🌙', label: '3am Talk' },
      { id: 'hype_man', emoji: '🔥', label: 'Hype Person' },
      { id: 'sobriety_buddy', emoji: '🌿', label: 'Sobriety Buddy' },
      { id: 'silence_buddy', emoji: '🤫', label: 'Silence Buddy' },
      { id: 'grief_support', emoji: '🤍', label: 'Grief Support' },
      { id: 'ugly_cry', emoji: '😭', label: 'Ugly Cry Buddy' },
    ]
  },
  {
    id: 'spiritual', label: '🔮 Spiritual & Sacred',
    items: [
      { id: 'meditation', emoji: '🧘', label: 'Meditation Circle' },
      { id: 'breathwork', emoji: '🌬️', label: 'Breathwork' },
      { id: 'sound_healing', emoji: '🔔', label: 'Sound Healing' },
      { id: 'cacao_ceremony', emoji: '🍫', label: 'Cacao Ceremony' },
      { id: 'tarot', emoji: '🔮', label: 'Tarot/Human Design' },
      { id: 'retreat_buddy', emoji: '🏕️', label: 'Retreat Buddy' },
      { id: 'psychedelic_integration', emoji: '🌀', label: 'Psychedelic Integration' },
      { id: 'nature_ritual', emoji: '🌿', label: 'Nature Ritual' },
      { id: 'lucid_dream', emoji: '💫', label: 'Lucid Dream Club' },
    ]
  },
  {
    id: 'chill', label: '☕ Chill & Everyday',
    items: [
      { id: 'coffee_chat', emoji: '☕', label: 'Coffee Chat' },
      { id: 'digital_detox', emoji: '📵', label: 'Digital Detox Walk' },
      { id: 'skincare_night', emoji: '✨', label: 'Skincare Night' },
      { id: 'smoke_buddy', emoji: '💨', label: 'Smoke Buddy' },
      { id: 'astrology', emoji: '⭐', label: 'Astrology Session' },
      { id: 'coworking', emoji: '💻', label: 'Coworking' },
      { id: 'errand_buddy', emoji: '🛒', label: 'Errand Buddy' },
    ]
  },
]

const ACTIVITIES = ACTIVITY_GROUPS.flatMap(g => g.items)
const EMPTY_FORM = { title: '', activity_type: '', description: '', price_per_session: '', is_free: false }

// How many people are doing each activity
const ACTIVITY_TRENDING_ORDER = [
  'coffee_chat', 'deep_chat', 'hiking', 'gym_partner', 'game_night',
  'travel_buddy', 'vent_session', 'book_club', 'coworking', 'yoga',
  'running', 'night_out', 'cooking', 'meditation', 'breathwork',
]
const inputStyle = { width: '100%', padding: '12px 16px', borderRadius: '12px', fontSize: '14px', outline: 'none', background: '#161628', border: '1px solid rgba(255,255,255,0.1)', color: '#F0EAFF', boxSizing: 'border-box', fontFamily: 'Plus Jakarta Sans, sans-serif' }
const labelStyle = { fontSize: '13px', fontWeight: 500, color: '#A99ECC', display: 'block', marginBottom: '8px' }

export default function ActivitiesPage() {
  const router = useRouter()
  const [userId, setUserId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [packages, setPackages] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [trendingCounts, setTrendingCounts] = useState<Record<string, number>>({})

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }
      setUserId(session.user.id)

      const [{ data: myPkgs }, { data: allPkgs }] = await Promise.all([
        supabase.from('activity_packages').select('*').eq('user_id', session.user.id).order('created_at', { ascending: false }),
        supabase.from('activity_packages').select('activity_type'),
      ])

      setPackages(myPkgs || [])

      // Compute counts
      const counts: Record<string, number> = {}
      allPkgs?.forEach(p => { counts[p.activity_type] = (counts[p.activity_type] || 0) + 1 })
      setTrendingCounts(counts)
      setLoading(false)
    }
    init()
  }, [])

  const handleSave = async () => {
    if (!form.title || !form.activity_type) return
    setSaving(true)
    const { data: { session } } = await supabase.auth.getSession()
    const uid = session?.user?.id || userId
    if (editingId) {
      const { data } = await supabase
        .from('activity_packages')
        .update({
          title: form.title,
          activity_type: form.activity_type,
          description: form.description,
          price_per_session: form.is_free ? 0 : parseFloat(form.price_per_session) || 0,
          is_free: form.is_free === true,
        })
        .eq('id', editingId)
        .select().single()
      if (data) setPackages(p => p.map(pkg => pkg.id === editingId ? data : pkg))
    } else {
      const { data } = await supabase
        .from('activity_packages')
        .insert({
          user_id: uid,
          title: form.title,
          activity_type: form.activity_type,
          description: form.description,
          price_per_session: form.is_free ? 0 : parseFloat(form.price_per_session) || 0,
          is_free: form.is_free === true,
        })
        .select().single()
      if (data) setPackages(p => [data, ...p])
    }
    setForm(EMPTY_FORM)
    setShowForm(false)
    setEditingId(null)
    setSaving(false)
  }

  const handleEdit = (pkg) => {
    setForm({
      title: pkg.title,
      activity_type: pkg.activity_type,
      description: pkg.description || '',
      price_per_session: pkg.price_per_session?.toString() || '',
      is_free: pkg.is_free,
    })
    setEditingId(pkg.id)
    setShowForm(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleDelete = async (id) => {
    await supabase.from('activity_packages').delete().eq('id', id)
    setPackages(p => p.filter(pkg => pkg.id !== id))
  }

  const handleCancel = () => {
    setForm(EMPTY_FORM)
    setShowForm(false)
    setEditingId(null)
  }

  const getActivity = (id) => ACTIVITIES.find(a => a.id === id)

  if (loading) return <PageLoader message="Loading activities…" />

  return (
    <div style={{ minHeight: '100vh', background: '#09090F', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
      <nav style={{ position: 'sticky', top: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', background: 'rgba(8,8,16,0.9)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.10)' }}>
        <Link href="/" style={{ fontFamily: 'DM Serif Display, serif', fontSize: '20px', fontWeight: 700, color: '#D4AF37', textDecoration: 'none' }}>BESTIE</Link>
        <Link href="/dashboard" style={{ fontSize: '14px', color: '#A99ECC', textDecoration: 'none', padding: '8px 16px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.1)' }}>← Dashboard</Link>
      </nav>

      <div style={{ maxWidth: '680px', margin: '0 auto', padding: '40px 24px' }}>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
          <div>
            <h1 style={{ fontFamily: 'DM Serif Display, serif', fontSize: '28px', fontWeight: 700, color: '#F0EAFF', marginBottom: '4px' }}>My Activities</h1>
            <p style={{ fontSize: '14px', color: '#A99ECC' }}>{packages.length} activities · what people can book you for</p>
          </div>
          {!showForm && (
            <button onClick={() => setShowForm(true)} style={{ padding: '10px 20px', borderRadius: '12px', fontSize: '14px', fontWeight: 600, background: 'linear-gradient(135deg, #D4AF37 0%, #B8960C 100%)', color: '#09090F', border: 'none', cursor: 'pointer' }}>
              + Add activity
            </button>
          )}
        </div>

        {/* TRENDING THIS WEEK */}
        {Object.keys(trendingCounts).length > 0 && (
          <div style={{ marginBottom: '28px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '2px', color: '#FF6B35' }}>🔥 TRENDING THIS WEEK</span>
              <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.10)' }} />
            </div>
            <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '8px', scrollbarWidth: 'none' }}>
              {ACTIVITIES
                .map(a => ({ ...a, count: trendingCounts[a.id] || 0 }))
                .filter(a => a.count > 0)
                .sort((a, b) => b.count - a.count)
                .slice(0, 12)
                .map((a, i) => {
                  const alreadyHave = packages.some(p => p.activity_type === a.id)
                  return (
                    <button
                      key={a.id}
                      onClick={() => {
                        if (!alreadyHave) {
                          setForm(f => ({ ...f, activity_type: a.id }))
                          setShowForm(true)
                          window.scrollTo({ top: 400, behavior: 'smooth' })
                        }
                      }}
                      style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', padding: '12px 14px', borderRadius: '16px', border: alreadyHave ? '1px solid rgba(57,255,20,0.35)' : i < 3 ? '1px solid rgba(255,107,53,0.3)' : '1px solid rgba(255,255,255,0.11)', background: alreadyHave ? 'rgba(57,255,20,0.06)' : i < 3 ? 'rgba(255,107,53,0.06)' : '#111120', cursor: alreadyHave ? 'default' : 'pointer', minWidth: '72px' }}
                    >
                      <span style={{ fontSize: '24px' }}>{a.emoji}</span>
                      <span style={{ fontSize: '10px', fontWeight: 600, color: alreadyHave ? '#34D399' : '#F0EAFF', textAlign: 'center', lineHeight: 1.3, whiteSpace: 'nowrap' }}>{a.label}</span>
                      <span style={{ fontSize: '10px', color: alreadyHave ? '#34D399' : '#A99ECC' }}>{a.count} besties{alreadyHave ? ' ✓' : ''}</span>
                    </button>
                  )
                })
              }
            </div>
          </div>
        )}

        {showForm && (
          <div style={{ background: '#111120', border: '1px solid rgba(212,175,55,0.2)', borderRadius: '20px', padding: '28px', marginBottom: '24px' }}>
            <h3 style={{ fontFamily: 'DM Serif Display, serif', fontSize: '20px', color: '#F0EAFF', marginBottom: '24px' }}>
              {editingId ? 'Edit activity' : 'New activity'}
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <label style={labelStyle}>Title</label>
                <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Morning Trail Run in Barton Creek" style={inputStyle} />
              </div>

              <div>
                <label style={labelStyle}>Activity type</label>
                {ACTIVITY_GROUPS.map(group => (
                  <div key={group.id} style={{ marginBottom: '16px' }}>
                    <p style={{ fontSize: '12px', fontWeight: 600, color: '#A99ECC', marginBottom: '8px', letterSpacing: '0.5px' }}>{group.label}</p>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
                      {group.items.map(a => {
                        const selected = form.activity_type === a.id
                        return (
                          <button key={a.id} onClick={() => setForm(f => ({ ...f, activity_type: a.id }))} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', padding: '8px 4px', borderRadius: '10px', border: selected ? '1px solid rgba(212,175,55,0.4)' : '1px solid rgba(255,255,255,0.10)', background: selected ? 'rgba(212,175,55,0.1)' : '#111120', cursor: 'pointer' }}>
                            <span style={{ fontSize: '16px' }}>{a.emoji}</span>
                            <span style={{ fontSize: '9px', color: selected ? '#D4AF37' : '#A99ECC', textAlign: 'center', lineHeight: 1.3 }}>{a.label}</span>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>

              <div>
                <label style={labelStyle}>Description</label>
                <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="What will you do together? What's included?" rows={3} style={{ ...inputStyle, resize: 'none', lineHeight: 1.6 }} />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <input type="checkbox" id="is_free" checked={form.is_free} onChange={e => setForm(f => ({ ...f, is_free: e.target.checked }))} style={{ width: '16px', height: '16px', cursor: 'pointer' }} />
                <label htmlFor="is_free" style={{ fontSize: '14px', color: '#F0EAFF', cursor: 'pointer' }}>This is a free match — no payment needed</label>
              </div>

              {!form.is_free && (
                <div>
                  <label style={labelStyle}>Price per session ($)</label>
                  <input type="number" value={form.price_per_session} onChange={e => setForm(f => ({ ...f, price_per_session: e.target.value }))} placeholder="e.g. 25" style={{ ...inputStyle, maxWidth: '200px' }} />
                </div>
              )}

              <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={handleCancel} style={{ flex: 1, padding: '12px', borderRadius: '12px', fontSize: '14px', background: 'none', border: '1px solid rgba(255,255,255,0.1)', color: '#A99ECC', cursor: 'pointer' }}>Cancel</button>
                <button onClick={handleSave} disabled={saving || !form.title || !form.activity_type} style={{ flex: 2, padding: '12px', borderRadius: '12px', fontSize: '14px', fontWeight: 600, background: 'linear-gradient(135deg, #D4AF37 0%, #B8960C 100%)', color: '#09090F', border: 'none', cursor: 'pointer', opacity: (!form.title || !form.activity_type) ? 0.5 : 1 }}>
                  {saving ? 'Saving...' : editingId ? 'Save changes' : 'Add activity'}
                </button>
              </div>
            </div>
          </div>
        )}

        {packages.length === 0 && !showForm ? (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <p style={{ fontSize: '48px', marginBottom: '16px' }}>🎯</p>
            <h3 style={{ fontSize: '20px', fontWeight: 600, color: '#F0EAFF', marginBottom: '8px' }}>No activities yet</h3>
            <p style={{ fontSize: '14px', color: '#A99ECC', marginBottom: '24px' }}>Add your first activity so people can book you</p>
            <button onClick={() => setShowForm(true)} style={{ padding: '12px 28px', borderRadius: '12px', fontSize: '14px', fontWeight: 600, background: 'linear-gradient(135deg, #D4AF37 0%, #B8960C 100%)', color: '#09090F', border: 'none', cursor: 'pointer' }}>
              + Add first activity
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {packages.map(pkg => {
              const activity = getActivity(pkg.activity_type)
              return (
                <div key={pkg.id} style={{ background: '#111120', border: '1px solid rgba(255,255,255,0.10)', borderRadius: '16px', padding: '20px' }}>
                  <div style={{ marginBottom: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                      <span style={{ fontSize: '20px' }}>{activity?.emoji || '✨'}</span>
                      <h4 style={{ fontSize: '16px', fontWeight: 600, color: '#F0EAFF' }}>{pkg.title}</h4>
                    </div>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '4px' }}>
                      <span style={{ fontSize: '12px', padding: '3px 10px', borderRadius: '999px', background: '#161628', color: '#A99ECC' }}>{activity?.label || pkg.activity_type}</span>
                      <span style={{ fontSize: '13px', fontWeight: 600, color: pkg.is_free ? '#34D399' : '#F0EAFF' }}>
                        {pkg.is_free ? 'Free' : `$${pkg.price_per_session}/session`}
                      </span>
                    </div>
                    {pkg.description && <p style={{ fontSize: '13px', color: '#A99ECC', lineHeight: 1.6 }}>{pkg.description}</p>}
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={() => handleEdit(pkg)} style={{ flex: 1, padding: '8px', borderRadius: '10px', fontSize: '13px', fontWeight: 500, background: '#161628', border: '1px solid rgba(255,255,255,0.1)', color: '#F0EAFF', cursor: 'pointer' }}>✏️ Edit</button>
                    <button onClick={() => handleDelete(pkg.id)} style={{ padding: '8px 16px', borderRadius: '10px', fontSize: '13px', background: 'rgba(255,80,80,0.08)', border: '1px solid rgba(255,80,80,0.15)', color: '#ff6b6b', cursor: 'pointer' }}>🗑</button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
