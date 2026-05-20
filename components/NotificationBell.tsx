// @ts-nocheck
'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { Inbox, CheckCircle2, XCircle, PartyPopper, Users, MessageCircle, Sparkles, Hand, Trophy, Bell } from 'lucide-react'
import { supabase } from '@/lib/supabase'

export default function NotificationBell({ userId }: { userId: string }) {
  const [notifications, setNotifications] = useState<any[]>([])
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const unread = notifications.filter(n => !n.read).length

  const load = async () => {
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(30)
    if (data) setNotifications(data)
  }

  useEffect(() => {
    load()

    const channel = supabase
      .channel(`notifications:${userId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`,
      }, () => load())
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [userId])

  // Close on outside click
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const markRead = async (id: string) => {
    await supabase.from('notifications').update({ read: true }).eq('id', id)
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
  }

  const markAllRead = async () => {
    await supabase.from('notifications').update({ read: true }).eq('user_id', userId).eq('read', false)
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
  }

  const timeAgo = (ts: string) => {
    const diff = Date.now() - new Date(ts).getTime()
    const m = Math.floor(diff / 60000)
    if (m < 1) return 'just now'
    if (m < 60) return `${m}m ago`
    const h = Math.floor(m / 60)
    if (h < 24) return `${h}h ago`
    return `${Math.floor(h / 24)}d ago`
  }

  const typeIcon: Record<string, React.ComponentType<{ size?: number; strokeWidth?: number }>> = {
    booking_request: Inbox,
    booking_accepted: CheckCircle2,
    booking_declined: XCircle,
    booking_completed: PartyPopper,
    session_confirmed: Users,
    new_message: MessageCircle,
    spark_received: Sparkles,
    join_request: Hand,
    join_accepted: Trophy,
  }

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{ position: 'relative', background: 'none', border: 'none', cursor: 'pointer', padding: '6px', borderRadius: '10px', color: '#9B93C0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unread > 0 && (
          <span style={{ position: 'absolute', top: '2px', right: '2px', minWidth: '16px', height: '16px', background: '#D4AF37', borderRadius: '999px', fontSize: '10px', fontWeight: 700, color: '#080810', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 3px' }}>
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div style={{ position: 'absolute', top: 'calc(100% + 8px)', right: 0, width: '320px', background: '#13132a', border: '1px solid rgba(212,175,55,0.2)', borderRadius: '16px', overflow: 'hidden', zIndex: 100, boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <span style={{ fontSize: '14px', fontWeight: 600, color: '#E8E0FF' }}>Notifications</span>
            {unread > 0 && (
              <button onClick={markAllRead} style={{ fontSize: '12px', color: '#D4AF37', background: 'none', border: 'none', cursor: 'pointer' }}>
                Mark all read
              </button>
            )}
          </div>

          <div style={{ maxHeight: '380px', overflowY: 'auto' }}>
            {notifications.length === 0 ? (
              <div style={{ padding: '32px 16px', textAlign: 'center', color: '#9B93C0', fontSize: '13px' }}>
                No notifications yet
              </div>
            ) : notifications.map(n => (
              <div
                key={n.id}
                onClick={() => { markRead(n.id); if (n.link) window.location.href = n.link; setOpen(false) }}
                style={{ display: 'flex', gap: '12px', padding: '12px 16px', cursor: n.link ? 'pointer' : 'default', background: n.read ? 'transparent' : 'rgba(212,175,55,0.05)', borderBottom: '1px solid rgba(255,255,255,0.04)', transition: 'background 0.15s' }}
              >
                {(() => {
                  const Icon = typeIcon[n.type] || Bell
                  return (
                    <span style={{ width: '32px', height: '32px', borderRadius: '10px', background: 'rgba(212,175,55,0.12)', color: '#D4AF37', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Icon size={16} strokeWidth={2} />
                    </span>
                  )
                })()}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: '13px', fontWeight: n.read ? 400 : 600, color: '#E8E0FF', marginBottom: '2px' }}>{n.title}</p>
                  {n.body && <p style={{ fontSize: '12px', color: '#9B93C0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.body}</p>}
                  <p style={{ fontSize: '11px', color: '#6B6490', marginTop: '3px' }}>{timeAgo(n.created_at)}</p>
                </div>
                {!n.read && <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#D4AF37', flexShrink: 0, marginTop: '6px' }} />}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
