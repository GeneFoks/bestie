// @ts-nocheck
'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { PageLoader } from '@/components/Loading'
import { Users, Hand } from 'lucide-react'

type Message = {
  id: string
  content: string
  created_at: string
  sender: {
    id: string
    username: string
    full_name: string
    avatar_url: string | null
  }
}

export default function CrewChatPage() {
  const params = useParams()
  const router = useRouter()
  const slug = params.slug as string

  const [userId, setUserId] = useState<string | null>(null)
  const [crew, setCrew] = useState<any>(null)
  const [isMember, setIsMember] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(true)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { router.push('/login'); return }
      const uid = session.user.id
      setUserId(uid)

      const { data: crewData } = await supabase
        .from('crews').select('id, name, slug, avatar_url').eq('slug', slug).single()
      if (!crewData) { router.push('/crews'); return }
      setCrew(crewData)

      const { data: membership } = await supabase
        .from('crew_members').select('crew_id').eq('crew_id', crewData.id).eq('user_id', uid).maybeSingle()
      if (!membership) { router.push(`/crews/${slug}`); return }
      setIsMember(true)

      const { data: msgs } = await supabase
        .from('crew_messages')
        .select('id, content, created_at, sender:users!sender_id(id, username, full_name, avatar_url)')
        .eq('crew_id', crewData.id)
        .order('created_at', { ascending: true })
        .limit(100)

      setMessages(msgs || [])
      setLoading(false)

      // Real-time subscription
      const channel = supabase
        .channel(`crew-chat-${crewData.id}`)
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'crew_messages',
          filter: `crew_id=eq.${crewData.id}`,
        }, async (payload) => {
          const { data: msg } = await supabase
            .from('crew_messages')
            .select('id, content, created_at, sender:users!sender_id(id, username, full_name, avatar_url)')
            .eq('id', payload.new.id)
            .single()
          if (msg) setMessages(prev => prev.some(m => m.id === msg.id) ? prev : [...prev, msg])
        })
        .subscribe()

      return () => { supabase.removeChannel(channel) }
    })
  }, [slug])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const send = async () => {
    const text = input.trim()
    if (!text || sending || !crew || !userId) return
    setSending(true)
    setInput('')

    const { data: msg, error } = await supabase
      .from('crew_messages')
      .insert({ crew_id: crew.id, sender_id: userId, content: text })
      .select('id, content, created_at, sender:users!sender_id(id, username, full_name, avatar_url)')
      .single()

    if (msg) {
      // Optimistic: add immediately, realtime deduplicates by id
      setMessages(prev => prev.some(m => m.id === msg.id) ? prev : [...prev, msg])
    }
    setSending(false)
    inputRef.current?.focus()
  }

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
  }

  if (loading) return <PageLoader message="Loading chat…" />

  const groupedMessages = messages.reduce((groups: any[], msg, i) => {
    const prev = messages[i - 1]
    const sameAuthor = prev?.sender?.id === msg.sender?.id
    const close = prev && (new Date(msg.created_at).getTime() - new Date(prev.created_at).getTime()) < 5 * 60 * 1000
    if (sameAuthor && close) {
      groups[groups.length - 1].items.push(msg)
    } else {
      groups.push({ sender: msg.sender, items: [msg] })
    }
    return groups
  }, [])

  return (
    <div style={{ height: '100vh', background: '#09090F', fontFamily: 'Plus Jakarta Sans, sans-serif', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <nav style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 20px', background: 'rgba(8,8,16,0.95)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.10)', zIndex: 50 }}>
        <Link href={`/crews/${slug}`} style={{ color: '#A99ECC', textDecoration: 'none', fontSize: '20px', lineHeight: 1 }}>←</Link>
        {crew?.avatar_url
          ? <img src={crew.avatar_url} alt="" style={{ width: '32px', height: '32px', borderRadius: '10px', objectFit: 'cover' }} />
          : <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: '#1A1A2E', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Users size={16} color="#D4AF37" strokeWidth={1.8} /></div>
        }
        <div>
          <div style={{ fontSize: '15px', fontWeight: 700, color: '#F0EAFF' }}>{crew?.name}</div>
          <div style={{ fontSize: '11px', color: '#A99ECC' }}>Members only</div>
        </div>
      </nav>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {messages.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#A99ECC', fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
            No messages yet. Say hello <Hand size={14} strokeWidth={2} />
          </div>
        )}
        {groupedMessages.map((group, gi) => (
          <div key={gi} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', overflow: 'hidden', flexShrink: 0, background: '#1A1A2E', border: '1px solid rgba(212,175,55,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {group.sender?.avatar_url
                ? <img src={group.sender.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <span style={{ fontSize: '14px', fontWeight: 700, color: '#D4AF37' }}>{group.sender?.full_name?.[0]}</span>
              }
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '4px' }}>
                <Link href={`/${group.sender?.username}`} style={{ fontSize: '13px', fontWeight: 700, color: group.sender?.id === userId ? '#D4AF37' : '#F0EAFF', textDecoration: 'none' }}>
                  {group.sender?.full_name}
                </Link>
                <span style={{ fontSize: '11px', color: '#A99ECC' }}>
                  {new Date(group.items[0].created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              {group.items.map((msg: Message) => (
                <div key={msg.id} style={{ fontSize: '14px', color: '#C8C0E0', lineHeight: 1.6, marginBottom: '2px', wordBreak: 'break-word' }}>
                  {msg.content}
                </div>
              ))}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{ flexShrink: 0, padding: '12px 16px', borderTop: '1px solid rgba(255,255,255,0.10)', background: 'rgba(8,8,16,0.95)', display: 'flex', gap: '10px', alignItems: 'flex-end' }}>
        <textarea
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKey}
          placeholder="Message the crew…"
          rows={1}
          maxLength={1000}
          style={{ flex: 1, padding: '12px 14px', borderRadius: '12px', fontSize: '14px', background: '#111120', border: '1px solid rgba(255,255,255,0.1)', color: '#F0EAFF', outline: 'none', resize: 'none', lineHeight: 1.5, maxHeight: '120px', overflowY: 'auto', fontFamily: 'Plus Jakarta Sans, sans-serif' }}
        />
        <button
          onClick={send}
          disabled={!input.trim() || sending}
          style={{ padding: '12px 18px', borderRadius: '12px', fontSize: '14px', fontWeight: 700, background: input.trim() ? 'linear-gradient(135deg, #D4AF37 0%, #B8960C 100%)' : 'rgba(255,255,255,0.10)', color: input.trim() ? '#09090F' : '#A99ECC', border: 'none', cursor: input.trim() ? 'pointer' : 'not-allowed', flexShrink: 0, transition: 'all 0.15s' }}
        >
          Send
        </button>
      </div>
    </div>
  )
}
