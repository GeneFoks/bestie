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

const EMPTY_FORM = { title: '', activity_type: '', description: '', price_per_session: '', is_free: false }

const inputStyle = { width: '100%', padding: '12px 16px', borderRadius: '12px', fontSize: '14px', outline: 'none', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#E8E0FF', boxSizing: 'border-box', fontFamily: 'Plus Jakarta Sans, sans-serif' }
const labelStyle = { fontSize: '13px', fontWeight: 500, color: '#9B93C0', display: 'block', marginBottom: '8px' }

export default function ActivitiesPage() {
  const router = useRouter()
  const [userId, setUserId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [packages, setPackages] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }
      setUserId(session.user.id)
      const { data } = await supabase
        .from('activity_packages')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false })
      setPackages(data || [])
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

      <div style={{ maxWidth: '680px', margin: '0 auto', padding: '40px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '32px' }}>
          <div>
            <h1 style={{ fontFamily: 'DM Serif Display, serif', fontSize: '28px', fontWeight: 700, color: '#E8E0FF', marginBottom: '4px' }}>My Activities</h1>
            <p style={{ fontSize: '14px', color: '#9B93C0' }}>{packages.length} activities · what people can book you for</p>
          </div>
          {!showForm && (
            <button onClick={() => setShowForm(true)} style={{ padding: '10px 20px', borderRadius: '12px', fontSize: '14px', fontWeight: 600, background: 'linear-gradient(135deg, #D4AF37 0%, #B8960C 100%)', color: '#080810', border: 'none', cursor: 'pointer' }}>
              + Add activity
            </button>
          )}
        </div>

        {showForm && (
          <div style={{ background: '#0F0F1E', border: '1px solid rgba(212,175,55,0.2)', borderRadius: '20px', padding: '28px', marginBottom: '24px' }}>
            <h3 style={{ fontFamily: 'DM Serif Display, serif', fontSize: '20px', color: '#E8E0FF', marginBottom: '24px' }}>
              {editingId ? 'Edit activity' : 'New activity'}
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={labelStyle}>Title</label>
                <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Morning Trail Run in Barton Creek" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Activity type</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                  {ACTIVITIES.map(a => {
                    const selected = form.activity_type === a.id
                    return (
                      <button key={a.id} onClick={() => setForm(f => ({ ...f, activity_type: a.id }))} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', padding: '10px 6px', borderRadius: '12px', border: selected ? '1px solid rgba(212,175,55,0.4)' : '1px solid rgba(255,255,255,0.06)', background: selected ? 'rgba(212,175,55,0.1)' : 'rgba(255,255,255,0.03)', cursor: 'pointer' }}>
                        <span style={{ fontSize: '18px' }}>{a.emoji}</span>
                        <span style={{ fontSize: '10px', color: selected ? '#D4AF37' : '#9B93C0', textAlign: 'center' }}>{a.label}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
              <div>
                <label style={labelStyle}>Description</label>
                <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="What will you do together? What's included?" rows={3} style={{ ...inputStyle, resize: 'none', lineHeight: 1.6 }} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <input type="checkbox" id="is_free" checked={form.is_free} onChange={e => setForm(f => ({ ...f, is_free: e.target.checked }))} style={{ width: '16px', height: '16px', cursor: 'pointer' }} />
                <label htmlFor="is_free" style={{ fontSize: '14px', color: '#E8E0FF', cursor: 'pointer' }}>This is a free match — no payment needed</label>
              </div>
              {!form.is_free && (
                <div>
                  <label style={labelStyle}>Price per session ($)</label>
                  <input type="number" value={form.price_per_session} onChange={e => setForm(f => ({ ...f, price_per_session: e.target.value }))} placeholder="e.g. 25" style={{ ...inputStyle, maxWidth: '200px' }} />
                </div>
              )}
              <div style={{ display: 'flex', gap: '10px', paddingTop: '8px' }}>
                <button onClick={handleCancel} style={{ flex: 1, padding: '12px', borderRadius: '12px', fontSize: '14px', background: 'none', border: '1px solid rgba(255,255,255,0.1)', color: '#9B93C0', cursor: 'pointer' }}>Cancel</button>
                <button onClick={handleSave} disabled={saving || !form.title || !form.activity_type} style={{ flex: 2, padding: '12px', borderRadius: '12px', fontSize: '14px', fontWeight: 600, background: 'linear-gradient(135deg, #D4AF37 0%, #B8960C 100%)', color: '#080810', border: 'none', cursor: 'pointer', opacity: (!form.title || !form.activity_type) ? 0.5 : 1 }}>
                  {saving ? 'Saving...' : editingId ? 'Save changes' : 'Add activity'}
                </button>
              </div>
            </div>
          </div>
        )}

        {packages.length === 0 && !showForm ? (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <p style={{ fontSize: '48px', marginBottom: '16px' }}>🎯</p>
            <h3 style={{ fontSize: '20px', fontWeight: 600, color: '#E8E0FF', marginBottom: '8px' }}>No activities yet</h3>
            <p style={{ fontSize: '14px', color: '#9B93C0', marginBottom: '24px' }}>Add your first activity so people can book you</p>
            <button onClick={() => setShowForm(true)} style={{ padding: '12px 28px', borderRadius: '12px', fontSize: '14px', fontWeight: 600, background: 'linear-gradient(135deg, #D4AF37 0%, #B8960C 100%)', color: '#080810', border: 'none', cursor: 'pointer' }}>
              + Add first activity
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {packages.map(pkg => {
              const activity = getActivity(pkg.activity_type)
              return (
                <div key={pkg.id} style={{ background: '#0F0F1E', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '16px', padding: '20px' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', marginBottom: '12px' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                        <span style={{ fontSize: '20px' }}>{activity?.emoji || '✨'}</span>
                        <h4 style={{ fontSize: '16px', fontWeight: 600, color: '#E8E0FF' }}>{pkg.title}</h4>
                      </div>
                      <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '4px' }}>
                        <span style={{ fontSize: '12px', padding: '3px 10px', borderRadius: '999px', background: 'rgba(255,255,255,0.05)', color: '#9B93C0' }}>{activity?.label}</span>
                        <span style={{ fontSize: '13px', fontWeight: 600, color: pkg.is_free ? '#39FF14' : '#E8E0FF' }}>
                          {pkg.is_free ? 'Free' : `$${pkg.price_per_session}/session`}
                        </span>
                      </div>
                      {pkg.description && <p style={{ fontSize: '13px', color: '#9B93C0', lineHeight: 1.6 }}>{pkg.description}</p>}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={() => handleEdit(pkg)} style={{ flex: 1, padding: '8px', borderRadius: '10px', fontSize: '13px', fontWeight: 500, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#E8E0FF', cursor: 'pointer' }}>✏️ Edit</button>
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
