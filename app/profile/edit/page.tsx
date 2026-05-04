// @ts-nocheck
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const ACTIVITY_GROUPS = [
  {
    label: '🏃 Active & Outdoors',
    activities: [
      { id: 'hiking', emoji: '🥾', label: 'Hiking' },
      { id: 'running', emoji: '🏃', label: 'Running' },
      { id: 'gym_partner', emoji: '💪', label: 'Gym Partner' },
      { id: 'cycling', emoji: '🚴', label: 'Cycling' },
      { id: 'swimming', emoji: '🏊', label: 'Swimming' },
      { id: 'cold_plunge', emoji: '🧊', label: 'Cold Plunge/Sauna' },
      { id: 'yoga', emoji: '🧘', label: 'Yoga' },
      { id: 'martial_arts', emoji: '🥋', label: 'Martial Arts' },
      { id: 'climbing', emoji: '🧗', label: 'Climbing' },
    ],
  },
  {
    label: '🎮 Fun & Social',
    activities: [
      { id: 'game_night', emoji: '🎮', label: 'Game Night' },
      { id: 'movie_night', emoji: '🎬', label: 'Movie Night' },
      { id: 'night_out', emoji: '🍸', label: 'Night Out' },
      { id: 'bar_hopping', emoji: '🍺', label: 'Bar Hopping' },
      { id: 'karaoke', emoji: '🎤', label: 'Karaoke' },
      { id: 'festival_crew', emoji: '🎪', label: 'Festival Crew' },
      { id: 'travel_buddy', emoji: '✈️', label: 'Travel Buddy' },
      { id: 'wing_person', emoji: '😎', label: 'Wing Person' },
      { id: 'comedy_show', emoji: '😂', label: 'Comedy Show' },
    ],
  },
  {
    label: '🧠 Mind & Growth',
    activities: [
      { id: 'deep_chat', emoji: '🫂', label: 'Deep Chat' },
      { id: 'debate_club', emoji: '🗣️', label: 'Debate Club' },
      { id: 'book_club', emoji: '📚', label: 'Book Club' },
      { id: 'language_exchange', emoji: '🌐', label: 'Language Exchange' },
      { id: 'career_talk', emoji: '💼', label: 'Career Talk' },
      { id: 'money_talk', emoji: '💰', label: 'Money Talk' },
      { id: 'journaling', emoji: '📓', label: 'Journaling Together' },
      { id: 'accountability_partner', emoji: '🎯', label: 'Accountability Partner' },
      { id: 'storytelling_night', emoji: '📖', label: 'Storytelling Night' },
    ],
  },
  {
    label: '🎨 Creative & Skills',
    activities: [
      { id: 'music_lesson', emoji: '🎸', label: 'Music Lesson' },
      { id: 'art_together', emoji: '🎨', label: 'Art Together' },
      { id: 'photography_walk', emoji: '📸', label: 'Photography Walk' },
      { id: 'cooking_together', emoji: '🍳', label: 'Cooking Together' },
      { id: 'dance', emoji: '💃', label: 'Dance' },
      { id: 'improv_acting', emoji: '🎭', label: 'Improv/Acting' },
      { id: 'writing_club', emoji: '✍️', label: 'Writing Club' },
    ],
  },
  {
    label: '🫂 Emotional & Support',
    activities: [
      { id: 'vent_session', emoji: '💬', label: 'Vent Session' },
      { id: '3am_talk', emoji: '🌙', label: '3am Talk' },
      { id: 'hype_person', emoji: '🔥', label: 'Hype Person' },
      { id: 'sobriety_buddy', emoji: '🌿', label: 'Sobriety Buddy' },
      { id: 'silence_buddy', emoji: '🤫', label: 'Silence Buddy' },
      { id: 'grief_support', emoji: '🤍', label: 'Grief Support' },
      { id: 'ugly_cry_buddy', emoji: '😭', label: 'Ugly Cry Buddy' },
    ],
  },
  {
    label: '🔮 Spiritual & Sacred',
    activities: [
      { id: 'meditation_circle', emoji: '🧘', label: 'Meditation Circle' },
      { id: 'breathwork', emoji: '🌬️', label: 'Breathwork' },
      { id: 'sound_healing', emoji: '🔔', label: 'Sound Healing' },
      { id: 'cacao_ceremony', emoji: '🍫', label: 'Cacao Ceremony' },
      { id: 'tarot', emoji: '🔮', label: 'Tarot/Human Design' },
      { id: 'retreat_buddy', emoji: '🏕️', label: 'Retreat Buddy' },
      { id: 'psychedelic_integration', emoji: '🌀', label: 'Psychedelic Integration' },
      { id: 'nature_ritual', emoji: '🌿', label: 'Nature Ritual' },
      { id: 'lucid_dream_club', emoji: '💫', label: 'Lucid Dream Club' },
    ],
  },
  {
    label: '☕ Chill & Everyday',
    activities: [
      { id: 'coffee_chat', emoji: '☕', label: 'Coffee Chat' },
      { id: 'digital_detox_walk', emoji: '📵', label: 'Digital Detox Walk' },
      { id: 'skincare_night', emoji: '✨', label: 'Skincare Night' },
      { id: 'smoke_buddy', emoji: '💨', label: 'Smoke Buddy' },
      { id: 'astrology_session', emoji: '⭐', label: 'Astrology Session' },
      { id: 'coworking', emoji: '💻', label: 'Coworking' },
      { id: 'errand_buddy', emoji: '🛒', label: 'Errand Buddy' },
    ],
  },
]

const ALL_ACTIVITIES = ACTIVITY_GROUPS.flatMap(g => g.activities)

const LANGUAGES = [
  'English', 'Spanish', 'Russian', 'French', 'German', 'Portuguese',
  'Mandarin', 'Japanese', 'Korean', 'Arabic', 'Hindi', 'Italian',
  'Turkish', 'Dutch', 'Polish', 'Ukrainian', 'Hebrew', 'Swahili',
]

export default function EditProfilePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [userId, setUserId] = useState(null)
  const [avatarFile, setAvatarFile] = useState(null)
  const [avatarPreview, setAvatarPreview] = useState(null)
  const [packages, setPackages] = useState([])
  const [showAddForm, setShowAddForm] = useState(false)
  const [newPkg, setNewPkg] = useState({ title: '', activity_type: '', description: '', price_per_session: '', is_free: false })
  const [selectedLanguages, setSelectedLanguages] = useState([])
  const [form, setForm] = useState({ full_name: '', username: '', bio: '', city: '', country: '', avatar_url: '' })

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }
      setUserId(session.user.id)
      const { data } = await supabase.from('users').select('*, activity_packages(*)').eq('id', session.user.id).single()
      if (data) {
        setForm({ full_name: data.full_name || '', username: data.username || '', bio: data.bio || '', city: data.city || '', country: data.country || '', avatar_url: data.avatar_url || '' })
        setPackages(data.activity_packages || [])
        setSelectedLanguages(data.languages || [])
        if (data.avatar_url) setAvatarPreview(data.avatar_url)
      }
      setLoading(false)
    }
    load()
  }, [])

  const handleAvatarChange = (e) => {
    const file = e.target.files[0]
    if (!file) return
    setAvatarFile(file)
    setAvatarPreview(URL.createObjectURL(file))
  }

  const toggleLanguage = (lang) => {
    setSelectedLanguages(prev =>
      prev.includes(lang) ? prev.filter(l => l !== lang) : [...prev, lang]
    )
  }

  const handleSave = async () => {
    setSaving(true)
    const { data: { session } } = await supabase.auth.getSession()
    const uid = session?.user?.id || userId
    if (!uid) { setSaving(false); return }

    let avatar_url = form.avatar_url
    if (avatarFile) {
      const ext = avatarFile.name.split('.').pop()
      const path = `${uid}/avatar.${ext}`
      const { error: uploadError } = await supabase.storage.from('avatars').upload(path, avatarFile, { upsert: true, contentType: avatarFile.type })
      if (!uploadError) {
        const { data } = supabase.storage.from('avatars').getPublicUrl(path)
        avatar_url = `${data.publicUrl}?t=${Date.now()}`
      }
    }

    const { error } = await supabase.from('users').update({
      full_name: form.full_name,
      username: form.username,
      bio: form.bio,
      city: form.city,
      country: form.country,
      avatar_url,
      languages: selectedLanguages,
    }).eq('id', uid)

    setSaving(false)
    if (!error) {
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    }
  }

  const handleDeletePackage = async (id) => {
    await supabase.from('activity_packages').delete().eq('id', id)
    setPackages(p => p.filter(pkg => pkg.id !== id))
  }

  const handleAddPackage = async () => {
    if (!newPkg.title || !newPkg.activity_type) return
    const { data: { session } } = await supabase.auth.getSession()
    const uid = session?.user?.id || userId
    const { data } = await supabase.from('activity_packages').insert({
      user_id: uid,
      title: newPkg.title,
      activity_type: newPkg.activity_type,
      description: newPkg.description,
      price_per_session: newPkg.is_free ? 0 : parseFloat(newPkg.price_per_session) || 0,
      is_free: newPkg.is_free,
    }).select().single()
    if (data) {
      setPackages(p => [...p, data])
      setNewPkg({ title: '', activity_type: '', description: '', price_per_session: '', is_free: false })
      setShowAddForm(false)
    }
  }

  const getActivityLabel = (id) => {
    const a = ALL_ACTIVITIES.find(a => a.id === id)
    return a ? `${a.emoji} ${a.label}` : id.replace(/_/g, ' ')
  }

  const inputStyle = { width: '100%', padding: '12px 16px', borderRadius: '12px', fontSize: '14px', outline: 'none', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#E8E0FF', boxSizing: 'border-box', fontFamily: 'Plus Jakarta Sans, sans-serif' }
  const labelStyle = { fontSize: '13px', fontWeight: 500, color: '#9B93C0', display: 'block', marginBottom: '8px' }
  const sectionStyle = { background: '#0F0F1E', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '20px', padding: '24px', marginBottom: '20px' }

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
        <div style={{ display: 'flex', gap: '12px' }}>
          <Link href="/dashboard" style={{ fontSize: '14px', color: '#9B93C0', textDecoration: 'none', padding: '8px 16px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.1)' }}>← Dashboard</Link>
          <button onClick={handleSave} disabled={saving} style={{ fontSize: '14px', fontWeight: 600, padding: '8px 20px', borderRadius: '10px', background: saved ? 'rgba(57,255,20,0.15)' : 'linear-gradient(135deg, #D4AF37 0%, #B8960C 100%)', color: saved ? '#39FF14' : '#080810', border: saved ? '1px solid rgba(57,255,20,0.3)' : 'none', cursor: 'pointer' }}>
            {saving ? 'Saving...' : saved ? '✓ Saved!' : 'Save changes'}
          </button>
        </div>
      </nav>

      <div style={{ maxWidth: '640px', margin: '0 auto', padding: '40px 24px' }}>
        <h1 style={{ fontFamily: 'DM Serif Display, serif', fontSize: '28px', fontWeight: 700, color: '#E8E0FF', marginBottom: '32px' }}>Edit Profile</h1>

        {/* Photo */}
        <div style={sectionStyle}>
          <h3 style={{ fontFamily: 'DM Serif Display, serif', fontSize: '18px', color: '#E8E0FF', marginBottom: '20px' }}>Profile Photo</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <div style={{ width: '80px', height: '80px', borderRadius: '20px', overflow: 'hidden', border: '2px solid rgba(212,175,55,0.3)', flexShrink: 0, background: '#1a1a35', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {avatarPreview ? <img src={avatarPreview} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: '28px', color: '#D4AF37' }}>{form.full_name?.[0] || '?'}</span>}
            </div>
            <div>
              <label style={{ display: 'inline-block', padding: '10px 20px', borderRadius: '12px', fontSize: '14px', fontWeight: 600, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#E8E0FF', cursor: 'pointer' }}>
                Upload photo
                <input type="file" accept="image/*" onChange={handleAvatarChange} style={{ display: 'none' }} />
              </label>
              <p style={{ fontSize: '12px', color: '#9B93C0', marginTop: '8px' }}>JPG, PNG up to 5MB</p>
            </div>
          </div>
        </div>

        {/* Basic Info */}
        <div style={sectionStyle}>
          <h3 style={{ fontFamily: 'DM Serif Display, serif', fontSize: '18px', color: '#E8E0FF', marginBottom: '20px' }}>Basic Info</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={labelStyle}>Full name</label>
                <input value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} placeholder="Your name" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Username</label>
                <input value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value.toLowerCase().replace(/\s/g, '_') }))} placeholder="your_username" style={inputStyle} />
              </div>
            </div>
            <div>
              <label style={labelStyle}>Bio</label>
              <textarea value={form.bio} onChange={e => setForm(f => ({ ...f, bio: e.target.value }))} placeholder="Tell people who you are..." rows={4} style={{ ...inputStyle, resize: 'none', lineHeight: 1.6 }} maxLength={300} />
              <p style={{ fontSize: '11px', color: '#9B93C0', marginTop: '4px', textAlign: 'right' }}>{form.bio.length}/300</p>
            </div>
          </div>
        </div>

        {/* Location */}
        <div style={sectionStyle}>
          <h3 style={{ fontFamily: 'DM Serif Display, serif', fontSize: '18px', color: '#E8E0FF', marginBottom: '20px' }}>Location</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={labelStyle}>City</label>
              <input value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} placeholder="Austin" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>State / Country</label>
              <input value={form.country} onChange={e => setForm(f => ({ ...f, country: e.target.value }))} placeholder="TX" style={inputStyle} />
            </div>
          </div>
        </div>

        {/* Languages */}
        <div style={sectionStyle}>
          <h3 style={{ fontFamily: 'DM Serif Display, serif', fontSize: '18px', color: '#E8E0FF', marginBottom: '8px' }}>Languages</h3>
          <p style={{ fontSize: '13px', color: '#9B93C0', marginBottom: '16px' }}>Select languages you speak</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {LANGUAGES.map(lang => {
              const selected = selectedLanguages.includes(lang)
              return (
                <button key={lang} onClick={() => toggleLanguage(lang)} style={{ padding: '8px 16px', borderRadius: '999px', fontSize: '13px', fontWeight: 500, cursor: 'pointer', background: selected ? 'rgba(212,175,55,0.15)' : 'rgba(255,255,255,0.04)', border: selected ? '1px solid rgba(212,175,55,0.5)' : '1px solid rgba(255,255,255,0.08)', color: selected ? '#D4AF37' : '#9B93C0', transition: 'all 0.15s' }}>
                  {lang}
                </button>
              )
            })}
          </div>
          {selectedLanguages.length > 0 && (
            <p style={{ fontSize: '12px', color: '#D4AF37', marginTop: '12px' }}>Selected: {selectedLanguages.join(', ')}</p>
          )}
        </div>

        {/* Activities */}
        <div style={sectionStyle}>
          <h3 style={{ fontFamily: 'DM Serif Display, serif', fontSize: '18px', color: '#E8E0FF', marginBottom: '16px' }}>My Activities</h3>
          {packages.length === 0 && <p style={{ fontSize: '14px', color: '#9B93C0', marginBottom: '16px' }}>No activities yet.</p>}
          {packages.map(pkg => (
            <div key={pkg.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderRadius: '12px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', marginBottom: '8px' }}>
              <div>
                <p style={{ fontSize: '14px', fontWeight: 600, color: '#E8E0FF' }}>{pkg.title}</p>
                <p style={{ fontSize: '12px', color: '#9B93C0', marginTop: '2px' }}>{getActivityLabel(pkg.activity_type)} · {pkg.is_free ? 'Free' : `$${pkg.price_per_session}/session`}</p>
              </div>
              <button onClick={() => handleDeletePackage(pkg.id)} style={{ background: 'none', border: 'none', color: '#9B93C0', cursor: 'pointer', fontSize: '20px', padding: '4px 8px' }}>×</button>
            </div>
          ))}
          {!showAddForm ? (
            <button onClick={() => setShowAddForm(true)} style={{ width: '100%', padding: '12px', borderRadius: '12px', fontSize: '14px', fontWeight: 500, background: 'rgba(212,175,55,0.08)', border: '1px dashed rgba(212,175,55,0.3)', color: '#D4AF37', cursor: 'pointer', marginTop: '8px' }}>
              + Add activity
            </button>
          ) : (
            <div style={{ marginTop: '12px', padding: '16px', borderRadius: '14px', background: 'rgba(212,175,55,0.05)', border: '1px solid rgba(212,175,55,0.15)' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <label style={labelStyle}>Title</label>
                  <input value={newPkg.title} onChange={e => setNewPkg(p => ({ ...p, title: e.target.value }))} placeholder="Morning Trail Run" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Type</label>
                  <select value={newPkg.activity_type} onChange={e => setNewPkg(p => ({ ...p, activity_type: e.target.value }))} style={{ ...inputStyle, cursor: 'pointer' }}>
                    <option value="">Select activity type...</option>
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
                  <input value={newPkg.description} onChange={e => setNewPkg(p => ({ ...p, description: e.target.value }))} placeholder="What you'll do together..." style={inputStyle} />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input type="checkbox" checked={newPkg.is_free} onChange={e => setNewPkg(p => ({ ...p, is_free: e.target.checked }))} id="is_free" />
                  <label htmlFor="is_free" style={{ fontSize: '14px', color: '#E8E0FF', cursor: 'pointer' }}>Free match</label>
                </div>
                {!newPkg.is_free && (
                  <div>
                    <label style={labelStyle}>Price ($)</label>
                    <input type="number" value={newPkg.price_per_session} onChange={e => setNewPkg(p => ({ ...p, price_per_session: e.target.value }))} placeholder="20" style={inputStyle} />
                  </div>
                )}
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={() => setShowAddForm(false)} style={{ flex: 1, padding: '10px', borderRadius: '10px', fontSize: '14px', background: 'none', border: '1px solid rgba(255,255,255,0.1)', color: '#9B93C0', cursor: 'pointer' }}>Cancel</button>
                  <button onClick={handleAddPackage} style={{ flex: 2, padding: '10px', borderRadius: '10px', fontSize: '14px', fontWeight: 600, background: 'linear-gradient(135deg, #D4AF37 0%, #B8960C 100%)', color: '#080810', border: 'none', cursor: 'pointer' }}>Add activity</button>
                </div>
              </div>
            </div>
          )}
        </div>

        <button onClick={handleSave} disabled={saving} style={{ width: '100%', padding: '14px', borderRadius: '14px', fontSize: '15px', fontWeight: 600, background: saved ? 'rgba(57,255,20,0.15)' : 'linear-gradient(135deg, #D4AF37 0%, #B8960C 100%)', color: saved ? '#39FF14' : '#080810', border: saved ? '1px solid rgba(57,255,20,0.3)' : 'none', cursor: 'pointer' }}>
          {saving ? 'Saving...' : saved ? '✓ Profile saved!' : 'Save all changes'}
        </button>
      </div>
    </div>
  )
}
