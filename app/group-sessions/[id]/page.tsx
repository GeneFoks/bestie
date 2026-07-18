// @ts-nocheck
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { PageLoader } from '@/components/Loading'
import { ActivityIcon } from '@/lib/activityIcons'

export default function GroupSessionPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [session, setSession] = useState<any>(null)
  const [participants, setParticipants] = useState<any[]>([])
  const [host, setHost] = useState<any>(null)
  const [myId, setMyId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [joining, setJoining] = useState(false)
  const [copied, setCopied] = useState(false)

  const load = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) setMyId(user.id)

    const { data: gs } = await supabase
      .from('group_sessions')
      .select('*')
      .eq('id', params.id)
      .single()

    if (!gs) { setLoading(false); return }
    setSession(gs)

    const [{ data: hostData }, { data: parts }] = await Promise.all([
      supabase.from('users').select('id, full_name, username, avatar_url, bestie_score').eq('id', gs.host_id).single(),
      supabase.from('group_session_participants').select('user_id, joined_at').eq('session_id', params.id),
    ])
    setHost(hostData)

    if (parts && parts.length > 0) {
      const userIds = parts.map(p => p.user_id)
      const { data: users } = await supabase.from('users').select('id, full_name, username, avatar_url').in('id', userIds)
      const userMap: Record<string, any> = {}
      users?.forEach(u => { userMap[u.id] = u })
      setParticipants(parts.map(p => ({ ...p, user: userMap[p.user_id] })))
    } else {
      setParticipants([])
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [params.id])

  const handleJoin = async () => {
    if (!myId) { router.push('/login'); return }
    setJoining(true)
    const { data } = await supabase.rpc('join_group_session', { p_session_id: params.id, p_user_id: myId })
    setJoining(false)
    if (data === 'joined') load()
  }

  const handleLeave = async () => {
    if (!myId) return
    await supabase.rpc('leave_group_session', { p_session_id: params.id, p_user_id: myId })
    load()
  }

  const handleTransferHost = async (p: any) => {
    const name = p.user?.full_name?.split(' ')[0] || 'this participant'
    if (!confirm(`Make ${name} the host? You'll stay in the event as a participant, but they'll get full control (edit, delete, hosting).`)) return
    const { error } = await supabase.rpc('transfer_group_session_host', {
      p_session_id: params.id,
      p_new_host_id: p.user_id,
    })
    if (error) { alert(`Could not transfer: ${error.message}`); return }
    load()
  }

  const handleDelete = async () => {
    if (!confirm('Delete this event permanently? This cannot be undone.')) return
    const { error } = await supabase.from('group_sessions').delete().eq('id', params.id)
    if (error) { alert(`Could not delete: ${error.message}`); return }
    router.push('/events')
  }

  const handleShare = () => {
    const url = `https://bestiehere.com/group-sessions/${params.id}`
    navigator.clipboard.writeText(url).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000) })
  }

  if (loading) return <PageLoader message="Loading…" />

  if (!session) return (
    <div style={{ minHeight: '100vh', background: '#09090F', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
      <div style={{ textAlign: 'center' }}>
        <p style={{ fontSize: '48px', marginBottom: '16px' }}>🔍</p>
        <p style={{ fontSize: '18px', color: '#F0EAFF' }}>Session not found</p>
        <Link href="/dashboard" style={{ fontSize: '14px', color: '#D4AF37', textDecoration: 'none', marginTop: '16px', display: 'block' }}>← Dashboard</Link>
      </div>
    </div>
  )

  const isHost = myId === session.host_id
  const isParticipant = participants.some(p => p.user_id === myId)
  const isFull = session.status === 'full'
  const isCancelled = session.status === 'cancelled'
  const isCompleted = session.status === 'completed'
  const spotsLeft = session.max_participants - participants.length
  const d = new Date(session.scheduled_at)
  const isPast = d < new Date()

  const statusColor = isCancelled ? '#FF6B6B' : isCompleted ? '#A99ECC' : isFull ? '#FF6B35' : '#34D399'
  const statusLabel = isCancelled ? 'Cancelled' : isCompleted ? 'Completed' : isFull ? 'Full' : 'Open'

  return (
    <div style={{ minHeight: '100vh', background: '#09090F', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
      <nav style={{ position: 'sticky', top: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', background: 'rgba(8,8,16,0.9)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.10)' }}>
        <Link href="/" style={{ fontFamily: 'DM Serif Display, serif', fontSize: '20px', fontWeight: 700, color: '#D4AF37', textDecoration: 'none' }}>BESTIE</Link>
        <Link href="/dashboard" style={{ fontSize: '14px', color: '#A99ECC', textDecoration: 'none', padding: '8px 16px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.1)' }}>← Dashboard</Link>
      </nav>

      <div style={{ maxWidth: '600px', margin: '0 auto', padding: '40px 24px' }}>

        {/* Header card */}
        <div style={{ background: 'linear-gradient(135deg, #111120 0%, #141428 100%)', border: '1px solid rgba(212,175,55,0.2)', borderRadius: '24px', overflow: 'hidden', marginBottom: '20px' }}>
          {session.cover_image_url && (
            <div style={{ width: '100%', aspectRatio: '16/9', background: '#0A0A14', position: 'relative' }}>
              <img src={session.cover_image_url} alt={session.title} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, transparent 60%, rgba(17,17,32,0.85) 100%)', pointerEvents: 'none' }} />
            </div>
          )}
          <div style={{ padding: '28px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
            <span style={{ width: '56px', height: '56px', borderRadius: '16px', background: 'rgba(212,175,55,0.10)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <ActivityIcon type={session.activity_type} size={28} color="#D4AF37" strokeWidth={1.6} />
            </span>
            <div style={{ flex: 1 }}>
              <h1 style={{ fontFamily: 'DM Serif Display, serif', fontSize: '24px', color: '#F0EAFF', lineHeight: 1.2 }}>{session.title}</h1>
            </div>
            <span style={{ fontSize: '11px', fontWeight: 700, padding: '4px 12px', borderRadius: '999px', background: `rgba(${statusColor === '#34D399' ? '57,255,20' : statusColor === '#FF6B6B' ? '255,107,107' : statusColor === '#FF6B35' ? '255,107,53' : '155,147,192'},0.12)`, border: `1px solid ${statusColor}40`, color: statusColor }}>
              {statusLabel}
            </span>
          </div>

          {session.description && (
            <p style={{ fontSize: '14px', color: '#A99ECC', lineHeight: 1.6, marginBottom: '16px' }}>{session.description}</p>
          )}

          {/* Meta */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '14px' }}>📅</span>
              <span style={{ fontSize: '14px', color: '#F0EAFF', fontWeight: 600 }}>
                {d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })} · {d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
            {session.location && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '14px' }}>📍</span>
                <span style={{ fontSize: '14px', color: '#A99ECC' }}>{session.location}</span>
              </div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '14px' }}>👥</span>
              <span style={{ fontSize: '14px', color: '#A99ECC' }}>
                {participants.length} / {session.max_participants} joined
                {!isFull && !isCancelled && !isCompleted && ` · ${spotsLeft} spot${spotsLeft !== 1 ? 's' : ''} left`}
              </span>
            </div>
          </div>

          {/* Host */}
          {host && (
            <Link href={`/${host.username}`} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px', borderRadius: '14px', background: '#131323', border: '1px solid rgba(255,255,255,0.10)', textDecoration: 'none', marginBottom: '16px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '10px', overflow: 'hidden', background: '#1A1A2E', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {host.avatar_url ? <img src={host.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ color: '#D4AF37', fontWeight: 700 }}>{host.full_name?.[0]}</span>}
              </div>
              <div>
                <p style={{ fontSize: '13px', fontWeight: 600, color: '#F0EAFF' }}>{host.full_name}</p>
                <p style={{ fontSize: '11px', color: '#A99ECC' }}>Host · BS {host.bestie_score || 0}</p>
              </div>
              <span style={{ marginLeft: 'auto', fontSize: '12px', color: '#D4AF37' }}>👑 Host</span>
            </Link>
          )}

          {/* Actions */}
          {!isCancelled && !isCompleted && (
            <div style={{ display: 'flex', gap: '10px' }}>
              {isHost ? (
                <>
                  <button onClick={handleShare} style={{ flex: 1, padding: '12px', borderRadius: '12px', fontSize: '14px', fontWeight: 600, background: 'rgba(212,175,55,0.12)', border: '1px solid rgba(212,175,55,0.3)', color: '#D4AF37', cursor: 'pointer' }}>
                    {copied ? '✓ Copied!' : '🔗 Share link'}
                  </button>
                  {!isPast && (
                    <Link href={`/group-sessions/${params.id}/edit`} style={{ padding: '12px 16px', borderRadius: '12px', fontSize: '14px', fontWeight: 600, background: '#131323', border: '1px solid rgba(255,255,255,0.12)', color: '#A99ECC', cursor: 'pointer', textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}>
                      Edit
                    </Link>
                  )}
                  <button onClick={handleDelete} style={{ padding: '12px 16px', borderRadius: '12px', fontSize: '14px', background: 'rgba(255,80,80,0.08)', border: '1px solid rgba(255,80,80,0.2)', color: '#FF6B6B', cursor: 'pointer' }}>
                    🗑 Delete
                  </button>
                </>
              ) : isParticipant ? (
                <>
                  <div style={{ flex: 1, padding: '12px', borderRadius: '12px', fontSize: '14px', fontWeight: 600, background: 'rgba(57,255,20,0.08)', border: '1px solid rgba(57,255,20,0.2)', color: '#34D399', textAlign: 'center' }}>
                    ✓ You're in!
                  </div>
                  <button onClick={handleLeave} style={{ padding: '12px 16px', borderRadius: '12px', fontSize: '14px', background: '#131323', border: '1px solid rgba(255,255,255,0.12)', color: '#A99ECC', cursor: 'pointer' }}>
                    Leave
                  </button>
                </>
              ) : (
                <>
                  <button onClick={handleJoin} disabled={joining || isFull}
                    style={{ flex: 1, padding: '12px', borderRadius: '12px', fontSize: '14px', fontWeight: 700, background: isFull ? '#131323' : 'linear-gradient(135deg, #D4AF37 0%, #B8960C 100%)', border: 'none', color: isFull ? '#555' : '#09090F', cursor: isFull ? 'not-allowed' : 'pointer' }}>
                    {joining ? 'Joining...' : isFull ? 'Session full' : '🎉 Join session'}
                  </button>
                  <button onClick={handleShare} style={{ padding: '12px 16px', borderRadius: '12px', fontSize: '14px', background: '#131323', border: '1px solid rgba(255,255,255,0.12)', color: '#A99ECC', cursor: 'pointer' }}>
                    {copied ? '✓' : '🔗'}
                  </button>
                </>
              )}
            </div>
          )}
          </div>
        </div>

        {/* Participants */}
        {participants.length > 0 && (
          <div style={{ background: '#111120', border: '1px solid rgba(255,255,255,0.10)', borderRadius: '20px', padding: '20px' }}>
            <p style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '2px', color: '#A99ECC', marginBottom: '14px' }}>
              PARTICIPANTS · {participants.length}/{session.max_participants}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {participants.map(p => (
                <div key={p.user_id} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <Link href={`/${p.user?.username}`} style={{ display: 'flex', alignItems: 'center', gap: '12px', textDecoration: 'none', flex: 1, minWidth: 0 }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '10px', overflow: 'hidden', background: '#1A1A2E', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {p.user?.avatar_url ? <img src={p.user.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ color: '#D4AF37', fontWeight: 700 }}>{p.user?.full_name?.[0]}</span>}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <p style={{ fontSize: '14px', fontWeight: 600, color: '#F0EAFF', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.user?.full_name}</p>
                      <p style={{ fontSize: '12px', color: '#A99ECC' }}>@{p.user?.username}</p>
                    </div>
                  </Link>
                  {isHost && !isPast && (
                    <button
                      onClick={() => handleTransferHost(p)}
                      style={{ flexShrink: 0, padding: '6px 12px', borderRadius: '9px', fontSize: '11px', fontWeight: 700, background: 'rgba(212,175,55,0.08)', border: '1px solid rgba(212,175,55,0.25)', color: '#D4AF37', cursor: 'pointer', fontFamily: 'Plus Jakarta Sans, sans-serif', whiteSpace: 'nowrap' }}
                    >
                      👑 Make host
                    </button>
                  )}
                </div>
              ))}
              {/* Empty spots */}
              {spotsLeft > 0 && !isFull && Array.from({ length: Math.min(spotsLeft, 4) }).map((_, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#111120', border: '1px dashed rgba(255,255,255,0.1)', flexShrink: 0 }} />
                  <p style={{ fontSize: '13px', color: '#333' }}>Open spot</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
