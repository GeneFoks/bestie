// @ts-nocheck
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { PageLoader } from '@/components/Loading'
import { ActivityIcon } from '@/lib/activityIcons'
import { Trash2, Check, Plus, CheckSquare, Square } from 'lucide-react'

export default function MySessionsPage() {
  const router = useRouter()
  const [sessions, setSessions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [deleting, setDeleting] = useState(false)

  const load = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }
    const { data } = await supabase
      .from('group_sessions')
      .select('id, title, activity_type, scheduled_at, location, status, series_id, recurrence, participants:group_session_participants(count)')
      .eq('host_id', user.id)
      .order('scheduled_at', { ascending: true })
    setSessions(data || [])
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  const toggle = (id: string) => setSelected(s => {
    const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n
  })
  const toggleAll = () => setSelected(s => s.size === sessions.length ? new Set() : new Set(sessions.map(x => x.id)))
  const selectSeries = (seriesId: string) => setSelected(s => {
    const n = new Set(s)
    sessions.filter(x => (x.series_id || x.id) === seriesId).forEach(x => n.add(x.id))
    return n
  })

  const deleteSelected = async () => {
    if (!selected.size) return
    if (!confirm(`Delete ${selected.size} session${selected.size > 1 ? 's' : ''} permanently? This can't be undone.`)) return
    setDeleting(true)
    const ids = [...selected]
    const { error } = await supabase.from('group_sessions').delete().in('id', ids)
    setDeleting(false)
    if (error) { alert(`Could not delete: ${error.message}`); return }
    setSessions(prev => prev.filter(x => !selected.has(x.id)))
    setSelected(new Set())
  }

  if (loading) return <PageLoader message="Loading your sessions…" />

  const fmt = (d) => new Date(d).toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
      <nav style={{ position: 'sticky', top: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', background: 'var(--nav-bg)', backdropFilter: 'blur(20px)', borderBottom: '1px solid var(--border)' }}>
        <Link href="/" style={{ fontFamily: 'DM Serif Display, serif', fontSize: '20px', fontWeight: 700, color: '#D4AF37', textDecoration: 'none' }}>BESTIE</Link>
        <Link href="/events" style={{ fontSize: '14px', color: 'var(--text-muted)', textDecoration: 'none', padding: '8px 16px', borderRadius: '10px', border: '1px solid var(--border)' }}>← Events</Link>
      </nav>

      <div style={{ maxWidth: '680px', margin: '0 auto', padding: '32px 20px 120px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px', gap: '12px', flexWrap: 'wrap' }}>
          <h1 style={{ fontFamily: 'DM Serif Display, serif', fontSize: '28px', color: 'var(--text-primary)', margin: 0 }}>My sessions</h1>
          <Link href="/group-sessions/new" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '9px 16px', borderRadius: '12px', fontSize: '13px', fontWeight: 700, background: 'linear-gradient(135deg, #D4AF37 0%, #B8960C 100%)', color: 'var(--bg)', textDecoration: 'none' }}><Plus size={15} strokeWidth={2.5} /> New</Link>
        </div>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '20px' }}>Select one or more to delete them together.</p>

        {sessions.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', background: 'var(--surface-1)', border: '1px solid var(--border)', borderRadius: '18px' }}>
            <p style={{ fontSize: '34px', marginBottom: '10px' }}>📅</p>
            <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '14px' }}>You haven't hosted any sessions yet.</p>
            <Link href="/group-sessions/new" style={{ fontSize: '13px', fontWeight: 700, color: '#D4AF37', textDecoration: 'none' }}>Create your first →</Link>
          </div>
        ) : (
          <>
            <button onClick={toggleAll} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '13px', cursor: 'pointer', marginBottom: '12px', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
              {selected.size === sessions.length ? <CheckSquare size={16} color="#D4AF37" /> : <Square size={16} />} Select all
            </button>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {sessions.map(s => {
                const on = selected.has(s.id)
                const isPast = new Date(s.scheduled_at) < new Date()
                const recurring = s.recurrence && s.recurrence !== 'none'
                return (
                  <div key={s.id} onClick={() => toggle(s.id)} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 16px', borderRadius: '14px', background: on ? 'rgba(212,175,55,0.08)' : 'var(--surface-1)', border: on ? '1px solid rgba(212,175,55,0.4)' : '1px solid var(--border)', cursor: 'pointer', opacity: isPast ? 0.6 : 1 }}>
                    <span style={{ flexShrink: 0, width: '22px', height: '22px', borderRadius: '6px', border: on ? 'none' : '2px solid rgba(255,255,255,0.25)', background: on ? '#D4AF37' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {on && <Check size={14} color="var(--bg)" strokeWidth={3} />}
                    </span>
                    <span style={{ width: '34px', height: '34px', borderRadius: '10px', background: 'rgba(212,175,55,0.10)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <ActivityIcon type={s.activity_type} size={16} color="#D4AF37" strokeWidth={1.8} />
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.title}</span>
                        {recurring && <span onClick={e => { e.stopPropagation(); selectSeries(s.series_id || s.id) }} title="Select whole series" style={{ fontSize: '9px', fontWeight: 700, padding: '2px 7px', borderRadius: '999px', background: 'rgba(155,127,255,0.14)', border: '1px solid rgba(155,127,255,0.35)', color: '#9B7FFF' }}>🔁 series</span>}
                        {isPast && <span style={{ fontSize: '10px', color: 'var(--text-dim)' }}>past</span>}
                      </div>
                      <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0 }}>{fmt(s.scheduled_at)}{s.location ? ` · ${s.location}` : ''} · {s.participants?.[0]?.count || 0} joined</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>

      {/* Sticky delete bar */}
      {selected.size > 0 && (
        <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 60, padding: '14px 20px calc(16px + env(safe-area-inset-bottom))', background: 'var(--nav-bg)', backdropFilter: 'blur(16px)', borderTop: '1px solid var(--border)' }}>
          <div style={{ maxWidth: '680px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
            <span style={{ fontSize: '14px', color: 'var(--text-primary)', fontWeight: 600 }}>{selected.size} selected</span>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setSelected(new Set())} style={{ padding: '11px 16px', borderRadius: '11px', fontSize: '13px', fontWeight: 600, background: 'var(--overlay-2)', border: '1px solid var(--border-strong)', color: 'var(--text-muted)', cursor: 'pointer' }}>Clear</button>
              <button onClick={deleteSelected} disabled={deleting} style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', padding: '11px 20px', borderRadius: '11px', fontSize: '14px', fontWeight: 700, background: 'rgba(255,80,80,0.15)', border: '1px solid rgba(255,80,80,0.4)', color: '#FF6B6B', cursor: 'pointer' }}>
                <Trash2 size={15} strokeWidth={2} /> {deleting ? 'Deleting…' : `Delete ${selected.size}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
