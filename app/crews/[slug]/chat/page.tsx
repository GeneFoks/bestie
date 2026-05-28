// @ts-nocheck
'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { PageLoader } from '@/components/Loading'
import { Users, Hand, Pin, PinOff, Reply, Smile, MoreHorizontal, X, AtSign } from 'lucide-react'
import { createNotification } from '@/lib/notifications'
import { buzz } from '@/lib/celebrate'
import AudioRecorder from '@/components/AudioRecorder'
import AudioMessage from '@/components/AudioMessage'

const QUICK_REACTIONS = ['👍', '❤️', '🔥', '😂', '👏', '🙏']

type Message = {
  id: string
  content: string
  created_at: string
  reply_to_id: string | null
  pinned_at: string | null
  media_url: string | null
  media_type: 'audio' | null
  media_duration: number | null
  sender: {
    id: string
    username: string
    full_name: string
    avatar_url: string | null
  }
}

type Reaction = {
  message_id: string
  user_id: string
  emoji: string
}

export default function CrewChatPage() {
  const params = useParams()
  const router = useRouter()
  const slug = params.slug as string

  const [userId, setUserId] = useState<string | null>(null)
  const [crew, setCrew] = useState<any>(null)
  const [members, setMembers] = useState<any[]>([])
  const [isCaptain, setIsCaptain] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [reactions, setReactions] = useState<Reaction[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(true)
  const [replyingTo, setReplyingTo] = useState<Message | null>(null)
  const [reactionPickerFor, setReactionPickerFor] = useState<string | null>(null)
  const [actionsFor, setActionsFor] = useState<string | null>(null)
  const [mentionQuery, setMentionQuery] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { router.push('/login'); return }
      const uid = session.user.id
      setUserId(uid)

      const { data: crewData } = await supabase
        .from('crews').select('id, name, slug, avatar_url, captain_id').eq('slug', slug).single()
      if (!crewData) { router.push('/crews'); return }
      setCrew(crewData)
      setIsCaptain(crewData.captain_id === uid)

      const { data: membership } = await supabase
        .from('crew_members').select('crew_id').eq('crew_id', crewData.id).eq('user_id', uid).maybeSingle()
      if (!membership) { router.push(`/crews/${slug}`); return }

      // Load members for @mention picker
      const { data: memberRows } = await supabase
        .from('crew_members')
        .select('user:users(id, username, full_name, avatar_url)')
        .eq('crew_id', crewData.id)
      setMembers((memberRows || []).map((m: any) => m.user).filter(Boolean))

      // Load messages
      const { data: msgs } = await supabase
        .from('crew_messages')
        .select('id, content, created_at, reply_to_id, pinned_at, media_url, media_type, media_duration, sender:users!sender_id(id, username, full_name, avatar_url)')
        .eq('crew_id', crewData.id)
        .order('created_at', { ascending: true })
        .limit(150)
      setMessages(msgs || [])

      // Load reactions
      const ids = (msgs || []).map(m => m.id)
      if (ids.length) {
        const { data: rx } = await supabase
          .from('crew_message_reactions')
          .select('message_id, user_id, emoji')
          .in('message_id', ids)
        setReactions(rx || [])
      }

      setLoading(false)

      // Realtime: messages
      const msgChan = supabase
        .channel(`crew-chat-${crewData.id}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'crew_messages', filter: `crew_id=eq.${crewData.id}` }, async (payload) => {
          const { data: msg } = await supabase
            .from('crew_messages')
            .select('id, content, created_at, reply_to_id, pinned_at, media_url, media_type, media_duration, sender:users!sender_id(id, username, full_name, avatar_url)')
            .eq('id', payload.new.id)
            .single()
          if (msg) setMessages(prev => prev.some(m => m.id === msg.id) ? prev : [...prev, msg])
        })
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'crew_messages', filter: `crew_id=eq.${crewData.id}` }, (payload) => {
          setMessages(prev => prev.map(m => m.id === payload.new.id ? { ...m, pinned_at: payload.new.pinned_at } : m))
        })
        .subscribe()

      // Realtime: reactions
      const rxChan = supabase
        .channel(`crew-rx-${crewData.id}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'crew_message_reactions' }, (payload) => {
          if (payload.eventType === 'INSERT') {
            setReactions(prev => prev.some(r => r.message_id === payload.new.message_id && r.user_id === payload.new.user_id && r.emoji === payload.new.emoji) ? prev : [...prev, payload.new as Reaction])
          } else if (payload.eventType === 'DELETE') {
            setReactions(prev => prev.filter(r => !(r.message_id === payload.old.message_id && r.user_id === payload.old.user_id && r.emoji === payload.old.emoji)))
          }
        })
        .subscribe()

      return () => {
        supabase.removeChannel(msgChan)
        supabase.removeChannel(rxChan)
      }
    })
  }, [slug])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  // close popovers on outside click
  useEffect(() => {
    const handler = () => { setReactionPickerFor(null); setActionsFor(null) }
    document.addEventListener('click', handler)
    return () => document.removeEventListener('click', handler)
  }, [])

  const parseMentions = (text: string): string[] => {
    const matches = text.match(/@([a-z0-9_]+)/gi) || []
    const usernames = matches.map(m => m.slice(1).toLowerCase())
    return members
      .filter(m => usernames.includes(m.username?.toLowerCase()))
      .map(m => m.id)
      .filter(id => id !== userId) // never self-notify
  }

  const send = async () => {
    const text = input.trim()
    if (!text || sending || !crew || !userId) return
    setSending(true)
    setInput('')
    setMentionQuery(null)
    const replyId = replyingTo?.id || null
    setReplyingTo(null)

    const { data: msg, error } = await supabase
      .from('crew_messages')
      .insert({ crew_id: crew.id, sender_id: userId, content: text, reply_to_id: replyId })
      .select('id, content, created_at, reply_to_id, pinned_at, sender:users!sender_id(id, username, full_name, avatar_url)')
      .single()

    if (msg) {
      setMessages(prev => prev.some(m => m.id === msg.id) ? prev : [...prev, msg])
      buzz('tap')

      // Notify mentioned users
      const mentionedIds = parseMentions(text)
      const myName = msg.sender?.full_name?.split(' ')[0] || 'Someone'
      mentionedIds.forEach(uid => {
        createNotification({
          userId: uid,
          type: 'new_message',
          title: `${myName} mentioned you in ${crew.name}`,
          body: text.length > 80 ? text.slice(0, 80) + '…' : text,
          link: `/crews/${slug}/chat`,
        }).catch(() => {})
      })
    }
    setSending(false)
    inputRef.current?.focus()
  }

  const sendAudio = async (blob: Blob, durationSec: number) => {
    if (!crew || !userId) return
    setSending(true)
    try {
      const ext = blob.type.includes('mp4') ? 'm4a' : 'webm'
      const path = `${userId}/${crew.id}-${Date.now()}.${ext}`
      const { error: upErr } = await supabase.storage
        .from('chat-audio')
        .upload(path, blob, { cacheControl: '3600', contentType: blob.type, upsert: false })
      if (upErr) { console.error(upErr); setSending(false); return }
      const { data: { publicUrl } } = supabase.storage.from('chat-audio').getPublicUrl(path)

      const replyId = replyingTo?.id || null
      setReplyingTo(null)
      const { data: msg } = await supabase
        .from('crew_messages')
        .insert({
          crew_id: crew.id,
          sender_id: userId,
          content: '',
          reply_to_id: replyId,
          media_url: publicUrl,
          media_type: 'audio',
          media_duration: durationSec,
        })
        .select('id, content, created_at, reply_to_id, pinned_at, media_url, media_type, media_duration, sender:users!sender_id(id, username, full_name, avatar_url)')
        .single()
      if (msg) {
        setMessages(prev => prev.some(m => m.id === msg.id) ? prev : [...prev, msg])
        buzz('success')
      }
    } finally {
      setSending(false)
    }
  }

  const toggleReaction = async (messageId: string, emoji: string) => {
    if (!userId) return
    const existing = reactions.find(r => r.message_id === messageId && r.user_id === userId && r.emoji === emoji)
    if (existing) {
      await supabase.from('crew_message_reactions').delete().match({ message_id: messageId, user_id: userId, emoji })
      setReactions(prev => prev.filter(r => !(r.message_id === messageId && r.user_id === userId && r.emoji === emoji)))
    } else {
      const row = { message_id: messageId, user_id: userId, emoji }
      await supabase.from('crew_message_reactions').insert(row)
      setReactions(prev => prev.some(r => r.message_id === messageId && r.user_id === userId && r.emoji === emoji) ? prev : [...prev, row as Reaction])
      buzz('tap')
    }
    setReactionPickerFor(null)
  }

  const togglePin = async (messageId: string, currentlyPinned: boolean) => {
    if (!isCaptain) return
    await supabase
      .from('crew_messages')
      .update({ pinned_at: currentlyPinned ? null : new Date().toISOString(), pinned_by: currentlyPinned ? null : userId })
      .eq('id', messageId)
    setMessages(prev => prev.map(m => m.id === messageId ? { ...m, pinned_at: currentlyPinned ? null : new Date().toISOString() } : m))
    setActionsFor(null)
  }

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value
    setInput(val)
    // Live @mention autocomplete: find last @… token
    const m = val.match(/@([a-z0-9_]*)$/i)
    setMentionQuery(m ? (m[1] || '').toLowerCase() : null)
  }

  const insertMention = (username: string) => {
    setInput(prev => prev.replace(/@([a-z0-9_]*)$/i, `@${username} `))
    setMentionQuery(null)
    inputRef.current?.focus()
  }

  if (loading) return <PageLoader message="Loading chat…" />

  const pinnedMessages = messages.filter(m => m.pinned_at).sort((a, b) => new Date(b.pinned_at!).getTime() - new Date(a.pinned_at!).getTime())

  // Group reactions per message: { messageId: { emoji: { count, mine } } }
  const rxByMessage: Record<string, Record<string, { count: number; mine: boolean }>> = {}
  reactions.forEach(r => {
    if (!rxByMessage[r.message_id]) rxByMessage[r.message_id] = {}
    if (!rxByMessage[r.message_id][r.emoji]) rxByMessage[r.message_id][r.emoji] = { count: 0, mine: false }
    rxByMessage[r.message_id][r.emoji].count++
    if (r.user_id === userId) rxByMessage[r.message_id][r.emoji].mine = true
  })

  const groupedMessages = messages.reduce((groups: any[], msg, i) => {
    const prev = messages[i - 1]
    const sameAuthor = prev?.sender?.id === msg.sender?.id
    const close = prev && (new Date(msg.created_at).getTime() - new Date(prev.created_at).getTime()) < 5 * 60 * 1000
    const hasReply = !!msg.reply_to_id
    if (sameAuthor && close && !hasReply) {
      groups[groups.length - 1].items.push(msg)
    } else {
      groups.push({ sender: msg.sender, items: [msg] })
    }
    return groups
  }, [])

  // Mention autocomplete results
  const mentionResults = mentionQuery !== null
    ? members.filter(m => m.username && m.id !== userId && m.username.toLowerCase().startsWith(mentionQuery)).slice(0, 5)
    : []

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

      {/* Pinned banner */}
      {pinnedMessages.length > 0 && (
        <div style={{ flexShrink: 0, padding: '10px 16px', background: 'rgba(212,175,55,0.06)', borderBottom: '1px solid rgba(212,175,55,0.15)', display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
          <Pin size={14} color="#D4AF37" strokeWidth={2} style={{ flexShrink: 0, marginTop: '3px' }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            {pinnedMessages.slice(0, 1).map(m => (
              <div key={m.id} style={{ fontSize: '12px', color: '#C8C0E0', lineHeight: 1.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                <span style={{ color: '#D4AF37', fontWeight: 700 }}>{m.sender?.full_name?.split(' ')[0]}:</span> {m.content}
              </div>
            ))}
            {pinnedMessages.length > 1 && (
              <p style={{ fontSize: '11px', color: '#A99ECC', marginTop: '2px' }}>+ {pinnedMessages.length - 1} more pinned</p>
            )}
          </div>
        </div>
      )}

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
              {group.items.map((msg: Message) => {
                const replyMsg = msg.reply_to_id ? messages.find(m => m.id === msg.reply_to_id) : null
                const rx = rxByMessage[msg.id]
                return (
                  <div key={msg.id} style={{ marginBottom: '6px', position: 'relative' }} onMouseLeave={() => setActionsFor(null)}>
                    {replyMsg && (
                      <div style={{ marginBottom: '4px', padding: '6px 10px', borderLeft: '3px solid rgba(155,127,255,0.5)', background: 'rgba(155,127,255,0.06)', borderRadius: '0 6px 6px 0', fontSize: '12px' }}>
                        <p style={{ color: '#9B7FFF', fontWeight: 600, marginBottom: '1px' }}>{replyMsg.sender?.full_name?.split(' ')[0] || 'someone'}</p>
                        <p style={{ color: '#A99ECC', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%' }}>{replyMsg.content}</p>
                      </div>
                    )}
                    <div style={{ position: 'relative', display: 'inline-block', maxWidth: '100%' }}>
                      {msg.media_url && msg.media_type === 'audio' ? (
                        <AudioMessage url={msg.media_url} durationSec={msg.media_duration} />
                      ) : (
                        <div style={{ fontSize: '14px', color: '#C8C0E0', lineHeight: 1.6, wordBreak: 'break-word', paddingRight: '40px' }}>
                          {renderWithMentions(msg.content)}
                        </div>
                      )}
                      {/* Hover actions */}
                      <div style={{ position: 'absolute', top: '-2px', right: '-4px', display: 'flex', gap: '2px', opacity: actionsFor === msg.id ? 1 : 0, transition: 'opacity 0.15s', background: '#161628', border: '1px solid rgba(255,255,255,0.10)', borderRadius: '8px', padding: '2px' }}>
                        <button onClick={(e) => { e.stopPropagation(); setReactionPickerFor(reactionPickerFor === msg.id ? null : msg.id) }} aria-label="React" style={iconBtn}><Smile size={14} strokeWidth={1.8} /></button>
                        <button onClick={(e) => { e.stopPropagation(); setReplyingTo(msg); setActionsFor(null); inputRef.current?.focus() }} aria-label="Reply" style={iconBtn}><Reply size={14} strokeWidth={1.8} /></button>
                        {isCaptain && (
                          <button onClick={(e) => { e.stopPropagation(); togglePin(msg.id, !!msg.pinned_at) }} aria-label={msg.pinned_at ? 'Unpin' : 'Pin'} style={iconBtn}>
                            {msg.pinned_at ? <PinOff size={14} strokeWidth={1.8} /> : <Pin size={14} strokeWidth={1.8} />}
                          </button>
                        )}
                      </div>
                      <button onClick={(e) => { e.stopPropagation(); setActionsFor(actionsFor === msg.id ? null : msg.id) }} aria-label="More" style={{ position: 'absolute', top: '0', right: '-2px', background: 'transparent', border: 'none', color: '#6B6280', cursor: 'pointer', padding: '2px', opacity: actionsFor === msg.id ? 0 : 1 }}>
                        <MoreHorizontal size={14} />
                      </button>
                    </div>

                    {/* Reaction picker */}
                    {reactionPickerFor === msg.id && (
                      <div onClick={e => e.stopPropagation()} style={{ marginTop: '6px', display: 'inline-flex', gap: '4px', padding: '6px 8px', background: '#161628', border: '1px solid rgba(255,255,255,0.10)', borderRadius: '999px', boxShadow: '0 4px 16px rgba(0,0,0,0.4)' }}>
                        {QUICK_REACTIONS.map(em => (
                          <button key={em} onClick={() => toggleReaction(msg.id, em)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px', padding: '2px 6px', borderRadius: '6px' }}>{em}</button>
                        ))}
                      </div>
                    )}

                    {/* Reaction display */}
                    {rx && (
                      <div style={{ marginTop: '4px', display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                        {Object.entries(rx).map(([emoji, info]) => (
                          <button key={emoji} onClick={() => toggleReaction(msg.id, emoji)} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '2px 8px', borderRadius: '999px', fontSize: '12px', cursor: 'pointer', background: info.mine ? 'rgba(212,175,55,0.15)' : 'rgba(255,255,255,0.05)', border: info.mine ? '1px solid rgba(212,175,55,0.35)' : '1px solid rgba(255,255,255,0.10)', color: info.mine ? '#D4AF37' : '#C8C0E0', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                            <span>{emoji}</span><span style={{ fontWeight: 700 }}>{info.count}</span>
                          </button>
                        ))}
                      </div>
                    )}

                    {msg.pinned_at && (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: '10px', color: '#D4AF37', marginTop: '4px', fontWeight: 600 }}>
                        <Pin size={10} strokeWidth={2} /> Pinned
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
            <button onClick={(e) => { e.stopPropagation(); setActionsFor(group.items[0].id) }} aria-label="Message actions" style={{ background: 'transparent', border: 'none', color: '#6B6280', cursor: 'pointer', padding: '2px', flexShrink: 0, marginTop: '2px' }}>
              <MoreHorizontal size={16} />
            </button>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Reply preview */}
      {replyingTo && (
        <div style={{ flexShrink: 0, padding: '8px 16px', background: 'rgba(155,127,255,0.06)', borderTop: '1px solid rgba(155,127,255,0.20)', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Reply size={14} color="#9B7FFF" strokeWidth={2} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: '11px', color: '#9B7FFF', fontWeight: 700 }}>Replying to {replyingTo.sender?.full_name?.split(' ')[0]}</p>
            <p style={{ fontSize: '12px', color: '#A99ECC', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{replyingTo.content}</p>
          </div>
          <button onClick={() => setReplyingTo(null)} aria-label="Cancel reply" style={{ background: 'none', border: 'none', color: '#A99ECC', cursor: 'pointer', padding: '4px' }}>
            <X size={16} strokeWidth={2} />
          </button>
        </div>
      )}

      {/* Mention autocomplete */}
      {mentionResults.length > 0 && (
        <div style={{ flexShrink: 0, padding: '6px 12px', background: '#0F0F1E', borderTop: '1px solid rgba(155,127,255,0.20)', display: 'flex', gap: '6px', overflowX: 'auto' }}>
          {mentionResults.map(m => (
            <button key={m.id} onClick={() => insertMention(m.username)} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 10px', borderRadius: '10px', background: 'rgba(155,127,255,0.10)', border: '1px solid rgba(155,127,255,0.25)', color: '#F0EAFF', cursor: 'pointer', fontSize: '12px', fontFamily: 'Plus Jakarta Sans, sans-serif', flexShrink: 0 }}>
              <AtSign size={11} strokeWidth={2} color="#9B7FFF" />
              <span style={{ color: '#9B7FFF', fontWeight: 700 }}>{m.username}</span>
              <span style={{ color: '#A99ECC' }}>{m.full_name?.split(' ')[0]}</span>
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div style={{ flexShrink: 0, padding: '12px 16px', borderTop: '1px solid rgba(255,255,255,0.10)', background: 'rgba(8,8,16,0.95)', display: 'flex', gap: '10px', alignItems: 'flex-end' }}>
        <textarea
          ref={inputRef}
          value={input}
          onChange={handleInputChange}
          onKeyDown={handleKey}
          placeholder={replyingTo ? `Reply to ${replyingTo.sender?.full_name?.split(' ')[0]}…` : 'Message the crew… use @ to mention'}
          aria-label="Message the crew"
          rows={1}
          maxLength={1000}
          style={{ flex: 1, padding: '12px 14px', borderRadius: '12px', fontSize: '14px', background: '#111120', border: '1px solid rgba(255,255,255,0.1)', color: '#F0EAFF', outline: 'none', resize: 'none', lineHeight: 1.5, maxHeight: '120px', overflowY: 'auto', fontFamily: 'Plus Jakarta Sans, sans-serif' }}
        />
        <AudioRecorder onSend={sendAudio} disabled={sending} />
        {input.trim() && (
          <button
            onClick={send}
            disabled={!input.trim() || sending}
            style={{ padding: '12px 18px', borderRadius: '12px', fontSize: '14px', fontWeight: 700, background: 'linear-gradient(135deg, #D4AF37 0%, #B8960C 100%)', color: '#09090F', border: 'none', cursor: 'pointer', flexShrink: 0, transition: 'all 0.15s', fontFamily: 'Plus Jakarta Sans, sans-serif' }}
          >
            Send
          </button>
        )}
      </div>
    </div>
  )
}

const iconBtn: React.CSSProperties = {
  background: 'transparent', border: 'none', color: '#A99ECC', cursor: 'pointer',
  padding: '4px 6px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center',
}

// Highlight @mentions in message text
function renderWithMentions(text: string) {
  const parts = text.split(/(@[a-z0-9_]+)/gi)
  return parts.map((part, i) => {
    if (/^@[a-z0-9_]+$/i.test(part)) {
      return <Link key={i} href={`/${part.slice(1)}`} style={{ color: '#9B7FFF', fontWeight: 600, textDecoration: 'none' }}>{part}</Link>
    }
    return <React.Fragment key={i}>{part}</React.Fragment>
  })
}
