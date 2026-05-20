// @ts-nocheck
'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import CallButton from '@/components/CallButton'
import { PageLoader } from '@/components/Loading'
import { MessageCircle } from 'lucide-react'
import { EmptyState } from '@/components/EmptyState'
import { createNotification } from '@/lib/notifications'

export default function MessagesPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [userId, setUserId] = useState(null)
  const [myName, setMyName] = useState('')
  const [conversations, setConversations] = useState([])
  const [activeConv, setActiveConv] = useState(null)
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const messagesEndRef = useRef(null)
  const activeConvRef = useRef(null)
  const userIdRef = useRef(null)

  useEffect(() => {
    const init = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { router.push('/login'); return }
        setUserId(user.id)
        userIdRef.current = user.id
        // Cache own display name for notification copy
        const { data: me } = await supabase.from('users').select('full_name').eq('id', user.id).single()
        setMyName(me?.full_name?.split(' ')[0] || 'Someone')
        await loadConversations(user.id)
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [])

  // Отдельный useEffect для ?to= — срабатывает когда userId готов
  useEffect(() => {
    if (!userId) return
    const toUsername = searchParams.get('to')
    if (!toUsername) return

    const openConv = async () => {
      // Сначала ищем в существующих
      const found = conversations.find(c => c.user.username === toUsername)
      if (found) {
        setActiveConv(found)
        activeConvRef.current = found
        return
      }
      // Если нет — загружаем пользователя напрямую
      const { data: toUser } = await supabase
        .from('users')
        .select('id, full_name, username, avatar_url, bestie_score')
        .eq('username', toUsername)
        .single()
      if (toUser) {
        const conv = { user: toUser, lastMessage: null, unread: 0 }
        setActiveConv(conv)
        activeConvRef.current = conv
      }
    }
    openConv()
  }, [userId, searchParams])

  // Real-time subscription
  useEffect(() => {
    if (!userId) return
    const sub = supabase
      .channel(`dm-realtime-${userId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'direct_messages',
        filter: `receiver_id=eq.${userId}`,
      }, (payload) => {
        const newMsg = payload.new
        if (activeConvRef.current?.user.id === newMsg.sender_id) {
          setMessages(m => m.some(x => x.id === newMsg.id) ? m : [...m, newMsg])
          scrollToBottom()
          supabase.from('direct_messages').update({ read: true }).eq('id', newMsg.id)
        }
        loadConversations(userId)
      })
      .subscribe()
    return () => supabase.removeChannel(sub)
  }, [userId])

  useEffect(() => {
    if (!userId || !activeConv) return
    activeConvRef.current = activeConv
    loadMessages(activeConv.user.id)
  }, [activeConv, userId])

  useEffect(() => { scrollToBottom() }, [messages])

  const scrollToBottom = () => {
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
  }

  const loadConversations = async (uid) => {
    const { data: sent } = await supabase.from('direct_messages').select('receiver_id').eq('sender_id', uid)
    const { data: received } = await supabase.from('direct_messages').select('sender_id').eq('receiver_id', uid)

    const partnerIds = [...new Set([
      ...(sent || []).map(m => m.receiver_id),
      ...(received || []).map(m => m.sender_id),
    ])]

    if (partnerIds.length === 0) { setConversations([]); return [] }

    const { data: users } = await supabase
      .from('users')
      .select('id, full_name, username, avatar_url, bestie_score')
      .in('id', partnerIds)

    const convs = await Promise.all((users || []).map(async (user) => {
      const { data: last } = await supabase
        .from('direct_messages')
        .select('content, created_at, sender_id, read')
        .or(`and(sender_id.eq.${uid},receiver_id.eq.${user.id}),and(sender_id.eq.${user.id},receiver_id.eq.${uid})`)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      const { count: unread } = await supabase
        .from('direct_messages')
        .select('*', { count: 'exact', head: true })
        .eq('sender_id', user.id)
        .eq('receiver_id', uid)
        .eq('read', false)

      return { user, lastMessage: last, unread: unread || 0 }
    }))

    convs.sort((a, b) => new Date(b.lastMessage?.created_at || 0) - new Date(a.lastMessage?.created_at || 0))
    setConversations(convs)
    return convs
  }

  const loadMessages = async (partnerId) => {
    const { data } = await supabase
      .from('direct_messages')
      .select('*')
      .or(`and(sender_id.eq.${userId},receiver_id.eq.${partnerId}),and(sender_id.eq.${partnerId},receiver_id.eq.${userId})`)
      .order('created_at', { ascending: true })

    setMessages(data || [])
    scrollToBottom()
    await supabase.from('direct_messages').update({ read: true }).eq('sender_id', partnerId).eq('receiver_id', userId).eq('read', false)
  }

  const sendMessage = async () => {
    if (!newMessage.trim() || !activeConv) return
    setSending(true)
    const text = newMessage.trim()
    setNewMessage('') // optimistic clear
    const msg = { sender_id: userId, receiver_id: activeConv.user.id, content: text, read: false }
    const { data, error } = await supabase.from('direct_messages').insert(msg).select().single()
    if (data) {
      setMessages(m => m.some(x => x.id === data.id) ? m : [...m, data])
      await loadConversations(userId)
      // Fire-and-forget notification to the recipient
      createNotification({
        userId: activeConv.user.id,
        type: 'new_message',
        title: `${myName || 'Someone'} sent you a message`,
        body: text.length > 80 ? text.slice(0, 80) + '…' : text,
        link: `/messages?to=${activeConv.user.username || activeConv.user.id}`,
      }).catch(() => {})
    } else {
      // Restore message if failed
      setNewMessage(text)
      console.error('Message send failed:', error?.message)
      alert('Could not send message. Please try again.')
    }
    setSending(false)
  }

  const formatTime = (ts) => {
    const d = new Date(ts)
    const now = new Date()
    const diff = now - d
    if (diff < 60000) return 'just now'
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
    if (diff < 86400000) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' })
  }

  const initials = (name) => name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?'

  if (loading) return <PageLoader fullscreen={false} message="Loading messages…" />

  return (
    <div style={{ minHeight: '100vh', background: '#09090F', fontFamily: 'Plus Jakarta Sans, sans-serif', display: 'flex', flexDirection: 'column' }}>
      <nav style={{ flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', background: 'rgba(8,8,16,0.9)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.10)' }}>
        <Link href="/" style={{ fontFamily: 'DM Serif Display, serif', fontSize: '20px', fontWeight: 700, color: '#D4AF37', textDecoration: 'none' }}>BESTIE</Link>
        <Link href="/dashboard" style={{ fontSize: '14px', color: '#A99ECC', textDecoration: 'none', padding: '8px 16px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.1)' }}>← Dashboard</Link>
      </nav>

      <div className="messages-layout" data-view={activeConv ? 'thread' : 'inbox'} style={{ flex: 1, display: 'flex', maxWidth: '1100px', width: '100%', margin: '0 auto', padding: '24px', gap: '20px', height: 'calc(100dvh - 65px)' }}>

        {/* Sidebar */}
        <div className="messages-sidebar" style={{ width: '320px', flexShrink: 0, background: '#111120', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.10)', display: activeConv ? undefined : 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ padding: '20px', borderBottom: '1px solid rgba(255,255,255,0.10)' }}>
            <h2 style={{ fontFamily: 'DM Serif Display, serif', fontSize: '20px', fontWeight: 700, color: '#F0EAFF' }}>Messages</h2>
          </div>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {conversations.length === 0 ? (
              <div style={{ padding: '20px' }}>
                <EmptyState
                  Icon={MessageCircle}
                  title="Inbox is empty"
                  description="Knock on someone's profile to start a conversation — they appear here once you match."
                  primaryCTA={{ label: 'Browse Besties', href: '/browse' }}
                  accent="gold"
                  size="sm"
                />
              </div>
            ) : conversations.map(conv => (
              <button key={conv.user.id} onClick={() => setActiveConv(conv)} style={{ width: '100%', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '12px', background: activeConv?.user.id === conv.user.id ? 'rgba(212,175,55,0.08)' : 'transparent', border: 'none', borderBottom: '1px solid #131323', cursor: 'pointer', textAlign: 'left' }}>
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  <div style={{ width: '44px', height: '44px', borderRadius: '14px', overflow: 'hidden', background: '#1A1A2E', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {conv.user.avatar_url ? <img src={conv.user.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ color: '#D4AF37', fontWeight: 700, fontSize: '14px' }}>{initials(conv.user.full_name)}</span>}
                  </div>
                  {conv.unread > 0 && (
                    <div style={{ position: 'absolute', top: '-4px', right: '-4px', width: '18px', height: '18px', borderRadius: '50%', background: '#D4AF37', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 700, color: '#09090F' }}>
                      {conv.unread > 9 ? '9+' : conv.unread}
                    </div>
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <span style={{ fontSize: '14px', fontWeight: conv.unread > 0 ? 700 : 600, color: '#F0EAFF' }}>{conv.user.full_name}</span>
                    {conv.lastMessage && <span style={{ fontSize: '11px', color: '#A99ECC' }}>{formatTime(conv.lastMessage.created_at)}</span>}
                  </div>
                  <span style={{ fontSize: '13px', color: conv.unread > 0 ? '#F0EAFF' : '#A99ECC', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block', fontWeight: conv.unread > 0 ? 500 : 400 }}>
                    {conv.lastMessage ? (conv.lastMessage.sender_id === userId ? 'You: ' : '') + conv.lastMessage.content : 'Start a conversation'}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Chat area */}
        <div className="messages-thread" style={{ flex: 1, background: '#111120', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.10)', display: activeConv ? 'flex' : 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {!activeConv ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px' }}>
              <div style={{ width: '64px', height: '64px', borderRadius: '16px', background: 'rgba(212,175,55,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <MessageCircle size={32} color="#D4AF37" strokeWidth={2} />
              </div>
              <h3 style={{ fontFamily: 'DM Serif Display, serif', fontSize: '22px', color: '#F0EAFF' }}>Select a conversation</h3>
              <Link href="/browse" style={{ fontSize: '14px', fontWeight: 600, padding: '10px 24px', borderRadius: '12px', background: 'linear-gradient(135deg, #D4AF37 0%, #B8960C 100%)', color: '#09090F', textDecoration: 'none' }}>Browse Besties</Link>
            </div>
          ) : (
            <>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.10)', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <button
                  onClick={() => setActiveConv(null)}
                  className="messages-back"
                  aria-label="Back to inbox"
                  style={{ display: 'none', background: 'none', border: 'none', color: '#A99ECC', cursor: 'pointer', padding: '4px 8px', fontSize: '18px', lineHeight: 1 }}
                >
                  ←
                </button>
                <div style={{ width: '40px', height: '40px', borderRadius: '12px', overflow: 'hidden', background: '#1A1A2E', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {activeConv.user.avatar_url ? <img src={activeConv.user.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ color: '#D4AF37', fontWeight: 700, fontSize: '13px' }}>{initials(activeConv.user.full_name)}</span>}
                </div>
                <div>
                  <p style={{ fontSize: '15px', fontWeight: 600, color: '#F0EAFF' }}>{activeConv.user.full_name}</p>
                  <p style={{ fontSize: '12px', color: '#A99ECC' }}>@{activeConv.user.username}</p>
                </div>
                <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <CallButton toUserId={activeConv.user.id} toUserName={activeConv.user.full_name} variant="icon" />
                  <Link href={`/${activeConv.user.username}`} style={{ fontSize: '13px', color: '#A99ECC', textDecoration: 'none', padding: '6px 12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)' }}>View profile</Link>
                </div>
              </div>

              <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {messages.length === 0 && <div style={{ textAlign: 'center', padding: '40px 0', color: '#A99ECC', fontSize: '14px' }}>Say hi to {activeConv.user.full_name?.split(' ')[0]} 👋</div>}
                {messages.map(msg => {
                  const isMine = msg.sender_id === userId
                  return (
                    <div key={msg.id} style={{ display: 'flex', justifyContent: isMine ? 'flex-end' : 'flex-start' }}>
                      <div style={{ maxWidth: '70%' }}>
                        <div style={{ padding: '10px 14px', borderRadius: isMine ? '16px 16px 4px 16px' : '16px 16px 16px 4px', background: isMine ? 'linear-gradient(135deg, #D4AF37 0%, #B8960C 100%)' : 'rgba(255,255,255,0.11)', color: isMine ? '#09090F' : '#F0EAFF', fontSize: '14px', lineHeight: 1.5 }}>
                          {msg.content}
                        </div>
                        <p style={{ fontSize: '11px', color: '#A99ECC', marginTop: '4px', textAlign: isMine ? 'right' : 'left' }}>{formatTime(msg.created_at)}</p>
                      </div>
                    </div>
                  )
                })}
                <div ref={messagesEndRef} />
              </div>

              <div style={{ padding: '16px 20px', borderTop: '1px solid rgba(255,255,255,0.10)', display: 'flex', gap: '10px', alignItems: 'flex-end' }}>
                <textarea value={newMessage} onChange={e => setNewMessage(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }} placeholder={`Message ${activeConv.user.full_name?.split(' ')[0]}...`} rows={1} style={{ flex: 1, padding: '12px 16px', borderRadius: '14px', fontSize: '14px', outline: 'none', background: '#161628', border: '1px solid rgba(255,255,255,0.1)', color: '#F0EAFF', resize: 'none', fontFamily: 'Plus Jakarta Sans, sans-serif', lineHeight: 1.5 }} />
                <button onClick={sendMessage} disabled={sending || !newMessage.trim()} style={{ padding: '12px 20px', borderRadius: '14px', fontSize: '14px', fontWeight: 600, background: newMessage.trim() ? 'linear-gradient(135deg, #D4AF37 0%, #B8960C 100%)' : 'rgba(255,255,255,0.10)', color: newMessage.trim() ? '#09090F' : '#A99ECC', border: 'none', cursor: newMessage.trim() ? 'pointer' : 'not-allowed', flexShrink: 0 }}>
                  {sending ? '...' : 'Send'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
