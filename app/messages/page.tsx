// @ts-nocheck
'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function MessagesPage() {
  const router = useRouter()
  const [userId, setUserId] = useState(null)
  const [conversations, setConversations] = useState([])
  const [activeConv, setActiveConv] = useState(null)
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const messagesEndRef = useRef(null)

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }
      setUserId(session.user.id)
      await loadConversations(session.user.id)
      setLoading(false)
    }
    init()
  }, [])

  useEffect(() => {
    if (!userId || !activeConv) return
    loadMessages(activeConv.user.id)

    const sub = supabase
      .channel('messages')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `receiver_id=eq.${userId}`,
      }, (payload) => {
        if (payload.new.sender_id === activeConv.user.id) {
          setMessages(m => [...m, payload.new])
          scrollToBottom()
        }
      })
      .subscribe()

    return () => supabase.removeChannel(sub)
  }, [activeConv, userId])

  useEffect(() => { scrollToBottom() }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const loadConversations = async (uid) => {
    const { data: sent } = await supabase
      .from('messages')
      .select('receiver_id')
      .eq('sender_id', uid)

    const { data: received } = await supabase
      .from('messages')
      .select('sender_id')
      .eq('receiver_id', uid)

    const partnerIds = [...new Set([
      ...(sent || []).map(m => m.receiver_id),
      ...(received || []).map(m => m.sender_id),
    ])]

    if (partnerIds.length === 0) { setConversations([]); return }

    const { data: users } = await supabase
      .from('users')
      .select('id, full_name, username, avatar_url, bestie_score')
      .in('id', partnerIds)

    const convs = await Promise.all((users || []).map(async (user) => {
      const { data: last } = await supabase
        .from('messages')
        .select('content, created_at, sender_id, read')
        .or(`and(sender_id.eq.${uid},receiver_id.eq.${user.id}),and(sender_id.eq.${user.id},receiver_id.eq.${uid})`)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      const { count } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('sender_id', user.id)
        .eq('receiver_id', uid)
        .eq('read', false)

      return { user, lastMessage: last, unread: count || 0 }
    }))

    convs.sort((a, b) => new Date(b.lastMessage?.created_at || 0) - new Date(a.lastMessage?.created_at || 0))
    setConversations(convs)
  }

  const loadMessages = async (partnerId) => {
    const { data } = await supabase
      .from('messages')
      .select('*')
      .or(`and(sender_id.eq.${userId},receiver_id.eq.${partnerId}),and(sender_id.eq.${partnerId},receiver_id.eq.${userId})`)
      .order('created_at', { ascending: true })

    setMessages(data || [])

    // Mark as read
    await supabase
      .from('messages')
      .update({ read: true })
      .eq('sender_id', partnerId)
      .eq('receiver_id', userId)
      .eq('read', false)
  }

  const sendMessage = async () => {
    if (!newMessage.trim() || !activeConv) return
    setSending(true)
    const msg = {
      sender_id: userId,
      receiver_id: activeConv.user.id,
      content: newMessage.trim(),
    }
    const { data } = await supabase.from('messages').insert(msg).select().single()
    if (data) {
      setMessages(m => [...m, data])
      setNewMessage('')
      await loadConversations(userId)
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

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#080810', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: '40px', height: '40px', border: '3px solid rgba(212,175,55,0.2)', borderTop: '3px solid #D4AF37', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#080810', fontFamily: 'Plus Jakarta Sans, sans-serif', display: 'flex', flexDirection: 'column' }}>
      {/* Nav */}
      <nav style={{ flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', background: 'rgba(8,8,16,0.9)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <Link href="/" style={{ fontFamily: 'DM Serif Display, serif', fontSize: '20px', fontWeight: 700, color: '#D4AF37', textDecoration: 'none' }}>BESTIE</Link>
        <Link href="/dashboard" style={{ fontSize: '14px', color: '#9B93C0', textDecoration: 'none', padding: '8px 16px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.1)' }}>← Dashboard</Link>
      </nav>

      {/* Chat layout */}
      <div style={{ flex: 1, display: 'flex', maxWidth: '1100px', width: '100%', margin: '0 auto', padding: '24px', gap: '20px', height: 'calc(100vh - 65px)' }}>

        {/* Conversations list */}
        <div style={{ width: '320px', flexShrink: 0, background: '#0F0F1E', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.06)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ padding: '20px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <h2 style={{ fontFamily: 'DM Serif Display, serif', fontSize: '20px', fontWeight: 700, color: '#E8E0FF' }}>Messages</h2>
          </div>

          <div style={{ flex: 1, overflowY: 'auto' }}>
            {conversations.length === 0 ? (
              <div style={{ padding: '40px 20px', textAlign: 'center' }}>
                <p style={{ fontSize: '32px', marginBottom: '12px' }}>💬</p>
                <p style={{ fontSize: '14px', fontWeight: 600, color: '#E8E0FF', marginBottom: '8px' }}>No messages yet</p>
                <p style={{ fontSize: '13px', color: '#9B93C0', marginBottom: '16px' }}>Find a Bestie and start a conversation</p>
                <Link href="/browse" style={{ fontSize: '13px', fontWeight: 600, padding: '8px 16px', borderRadius: '10px', background: 'linear-gradient(135deg, #D4AF37 0%, #B8960C 100%)', color: '#080810', textDecoration: 'none' }}>Browse Besties</Link>
              </div>
            ) : conversations.map(conv => (
              <button
                key={conv.user.id}
                onClick={() => setActiveConv(conv)}
                style={{ width: '100%', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '12px', background: activeConv?.user.id === conv.user.id ? 'rgba(212,175,55,0.08)' : 'transparent', border: 'none', borderBottom: '1px solid rgba(255,255,255,0.04)', cursor: 'pointer', textAlign: 'left' }}
              >
                {/* Avatar */}
                <div style={{ width: '44px', height: '44px', borderRadius: '14px', overflow: 'hidden', flexShrink: 0, background: '#1a1a35', display: 'flex', alignItems: 'center', justifyContent: 'center', border: activeConv?.user.id === conv.user.id ? '2px solid rgba(212,175,55,0.4)' : '2px solid transparent' }}>
                  {conv.user.avatar_url
                    ? <img src={conv.user.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <span style={{ color: '#D4AF37', fontWeight: 700, fontSize: '14px' }}>{initials(conv.user.full_name)}</span>
                  }
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <span style={{ fontSize: '14px', fontWeight: 600, color: '#E8E0FF' }}>{conv.user.full_name}</span>
                    {conv.lastMessage && <span style={{ fontSize: '11px', color: '#9B93C0' }}>{formatTime(conv.lastMessage.created_at)}</span>}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '13px', color: '#9B93C0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '160px' }}>
                      {conv.lastMessage ? (conv.lastMessage.sender_id === userId ? 'You: ' : '') + conv.lastMessage.content : 'Start a conversation'}
                    </span>
                    {conv.unread > 0 && (
                      <span style={{ background: '#D4AF37', color: '#080810', fontSize: '11px', fontWeight: 700, borderRadius: '999px', padding: '2px 7px', flexShrink: 0 }}>{conv.unread}</span>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Chat window */}
        <div style={{ flex: 1, background: '#0F0F1E', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.06)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {!activeConv ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px' }}>
              <p style={{ fontSize: '48px' }}>💬</p>
              <h3 style={{ fontFamily: 'DM Serif Display, serif', fontSize: '22px', color: '#E8E0FF' }}>Select a conversation</h3>
              <p style={{ fontSize: '14px', color: '#9B93C0' }}>Or find a Bestie to message</p>
              <Link href="/browse" style={{ fontSize: '14px', fontWeight: 600, padding: '10px 24px', borderRadius: '12px', background: 'linear-gradient(135deg, #D4AF37 0%, #B8960C 100%)', color: '#080810', textDecoration: 'none' }}>Browse Besties</Link>
            </div>
          ) : (
            <>
              {/* Chat header */}
              <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '12px', overflow: 'hidden', background: '#1a1a35', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {activeConv.user.avatar_url
                    ? <img src={activeConv.user.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <span style={{ color: '#D4AF37', fontWeight: 700, fontSize: '13px' }}>{initials(activeConv.user.full_name)}</span>
                  }
                </div>
                <div>
                  <p style={{ fontSize: '15px', fontWeight: 600, color: '#E8E0FF' }}>{activeConv.user.full_name}</p>
                  <p style={{ fontSize: '12px', color: '#9B93C0' }}>@{activeConv.user.username}</p>
                </div>
                <Link href={`/${activeConv.user.username}`} style={{ marginLeft: 'auto', fontSize: '13px', color: '#9B93C0', textDecoration: 'none', padding: '6px 12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)' }}>
                  View profile
                </Link>
              </div>

              {/* Messages */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {messages.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '40px 0', color: '#9B93C0', fontSize: '14px' }}>
                    Say hi to {activeConv.user.full_name?.split(' ')[0]} 👋
                  </div>
                )}
                {messages.map(msg => {
                  const isMine = msg.sender_id === userId
                  return (
                    <div key={msg.id} style={{ display: 'flex', justifyContent: isMine ? 'flex-end' : 'flex-start' }}>
                      <div style={{ maxWidth: '70%' }}>
                        <div style={{ padding: '10px 14px', borderRadius: isMine ? '16px 16px 4px 16px' : '16px 16px 16px 4px', background: isMine ? 'linear-gradient(135deg, #D4AF37 0%, #B8960C 100%)' : 'rgba(255,255,255,0.07)', color: isMine ? '#080810' : '#E8E0FF', fontSize: '14px', lineHeight: 1.5 }}>
                          {msg.content}
                        </div>
                        <p style={{ fontSize: '11px', color: '#9B93C0', marginTop: '4px', textAlign: isMine ? 'right' : 'left' }}>
                          {formatTime(msg.created_at)}
                        </p>
                      </div>
                    </div>
                  )
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div style={{ padding: '16px 20px', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', gap: '10px', alignItems: 'flex-end' }}>
                <textarea
                  value={newMessage}
                  onChange={e => setNewMessage(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
                  placeholder={`Message ${activeConv.user.full_name?.split(' ')[0]}...`}
                  rows={1}
                  style={{ flex: 1, padding: '12px 16px', borderRadius: '14px', fontSize: '14px', outline: 'none', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#E8E0FF', resize: 'none', fontFamily: 'Plus Jakarta Sans, sans-serif', lineHeight: 1.5 }}
                />
                <button
                  onClick={sendMessage}
                  disabled={sending || !newMessage.trim()}
                  style={{ padding: '12px 20px', borderRadius: '14px', fontSize: '14px', fontWeight: 600, background: newMessage.trim() ? 'linear-gradient(135deg, #D4AF37 0%, #B8960C 100%)' : 'rgba(255,255,255,0.06)', color: newMessage.trim() ? '#080810' : '#9B93C0', border: 'none', cursor: newMessage.trim() ? 'pointer' : 'not-allowed', flexShrink: 0 }}
                >
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
