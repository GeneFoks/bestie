// @ts-nocheck
'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { Inbox, CheckCircle2, XCircle, PartyPopper, Users, MessageCircle, Sparkles, Hand, Trophy, Bell, Heart } from 'lucide-react'
import { supabase } from '@/lib/supabase'

export default function NotificationBell({ userId }: { userId: string }) {
  const [notifications, setNotifications] = useState<any[]>([])
  const [open, setOpen] = useState(false)
  const [panelTop, setPanelTop] = useState(64)
  const ref = useRef<HTMLDivElement>(null)
  const btnRef = useRef<HTMLButtonElement>(null)

  // Anchor the panel just below the bell, but pinned to the screen's right
  // edge so it never overflows off-screen on mobile (the bell isn't always
  // at the far right of the nav).
  const toggleOpen = () => {
    setOpen(o => {
      const next = !o
      if (next && btnRef.current) {
        setPanelTop(btnRef.current.getBoundingClientRect().bottom + 8)
      }
      return next
    })
  }

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

  // icon + tint per notification type (visual hierarchy by topic)
  const typeMeta: Record<string, { Icon: any; color: string; bg: string }> = {
    match:             { Icon: Heart,         color: '#D4AF37', bg: 'rgba(212,175,55,0.12)' },
    new_match:         { Icon: Heart,         color: '#D4AF37', bg: 'rgba(212,175,55,0.12)' },
    booking_request:   { Icon: Inbox,         color: '#D4AF37', bg: 'rgba(212,175,55,0.12)' },
    booking_accepted:  { Icon: CheckCircle2,  color: '#34D399', bg: 'rgba(52,211,153,0.12)' },
    booking_declined:  { Icon: XCircle,       color: '#FF6B35', bg: 'rgba(255,107,53,0.12)' },
    booking_completed: { Icon: PartyPopper,   color: '#34D399', bg: 'rgba(52,211,153,0.12)' },
    session_confirmed: { Icon: Users,         color: '#34D399', bg: 'rgba(52,211,153,0.12)' },
    new_message:       { Icon: MessageCircle, color: '#9B7FFF', bg: 'rgba(155,127,255,0.12)' },
    spark_received:    { Icon: Sparkles,      color: '#D4AF37', bg: 'rgba(212,175,55,0.12)' },
    join_request:      { Icon: Hand,          color: '#D4AF37', bg: 'rgba(212,175,55,0.12)' },
    join_accepted:     { Icon: Trophy,        color: '#34D399', bg: 'rgba(52,211,153,0.12)' },
    referral_reward:   { Icon: PartyPopper,   color: '#D4AF37', bg: 'rgba(212,175,55,0.12)' },
  }
  const fallbackMeta = { Icon: Bell, color: '#A99ECC', bg: 'rgba(169,158,204,0.12)' }

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        ref={btnRef}
        onClick={toggleOpen}
        aria-label="Notifications"
        style={{ position: 'relative', background: 'none', border: 'none', cursor: 'pointer', padding: '10px', borderRadius: '10px', color: unread > 0 ? '#D4AF37' : 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: '40px', minHeight: '40px' }}
      >
        <Bell size={20} strokeWidth={2} />
        {unread > 0 && (
          <span style={{ position: 'absolute', top: '2px', right: '2px', minWidth: '16px', height: '16px', background: '#D4AF37', borderRadius: '999px', fontSize: '10px', fontWeight: 700, color: '#09090F', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 3px' }}>
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div style={{ position: 'fixed', top: panelTop, right: '12px', width: 'min(340px, calc(100vw - 24px))', background: 'var(--surface-1)', border: '1px solid var(--border)', borderRadius: '16px', overflow: 'hidden', zIndex: 100, boxShadow: '0 12px 36px rgba(0,0,0,0.5)', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>Notifications</span>
            {unread > 0 && (
              <button onClick={markAllRead} style={{ fontSize: '12px', color: '#D4AF37', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                Mark all read
              </button>
            )}
          </div>

          <div style={{ maxHeight: '420px', overflowY: 'auto' }}>
            {notifications.length === 0 ? (
              <div style={{ padding: '36px 20px', textAlign: 'center' }}>
                <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'rgba(169,158,204,0.10)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                  <Bell size={20} color="var(--text-muted)" strokeWidth={1.6} />
                </div>
                <p style={{ fontSize: '13px', color: 'var(--text-primary)', fontWeight: 600, marginBottom: '4px' }}>You're all caught up</p>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Knocks, sessions, and sparks show up here</p>
              </div>
            ) : notifications.map(n => {
              const meta = typeMeta[n.type] || fallbackMeta
              const Icon = meta.Icon
              return (
                <div
                  key={n.id}
                  onClick={() => { markRead(n.id); if (n.link) window.location.href = n.link; setOpen(false) }}
                  style={{ display: 'flex', gap: '12px', padding: '12px 18px', cursor: n.link ? 'pointer' : 'default', background: n.read ? 'transparent' : 'rgba(212,175,55,0.04)', borderBottom: '1px solid rgba(255,255,255,0.04)', transition: 'background 0.15s' }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'var(--overlay)' }}
                  onMouseLeave={e => { e.currentTarget.style.background = n.read ? 'transparent' : 'rgba(212,175,55,0.04)' }}
                >
                  <span style={{ width: '34px', height: '34px', borderRadius: '10px', background: meta.bg, color: meta.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Icon size={16} strokeWidth={2} />
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: '13px', fontWeight: n.read ? 500 : 700, color: 'var(--text-primary)', marginBottom: '2px', lineHeight: 1.4 }}>{n.title}</p>
                    {n.body && <p style={{ fontSize: '12px', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.body}</p>}
                    <p style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '3px' }}>{timeAgo(n.created_at)}</p>
                  </div>
                  {!n.read && <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: meta.color, flexShrink: 0, marginTop: '8px', boxShadow: `0 0 8px ${meta.color}80` }} />}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
