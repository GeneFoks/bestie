// @ts-nocheck
'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { showToast } from '@/components/Toast'
import { MessageSquareHeart, X } from 'lucide-react'

const MOODS = [
  { id: 'love', emoji: '😍', label: 'Love it' },
  { id: 'idea', emoji: '💡', label: 'Idea' },
  { id: 'problem', emoji: '😕', label: 'Problem' },
]

// Floating "tell us anything" widget — mounted globally from the layout.
// Feedback lands in the DB and in the founder's inbox.
export default function FeedbackWidget() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [mood, setMood] = useState('idea')
  const [message, setMessage] = useState('')
  const [email, setEmail] = useState('')
  const [loggedIn, setLoggedIn] = useState(false)
  const [sending, setSending] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setLoggedIn(!!session))
  }, [])

  // Stay out of immersive surfaces
  if (pathname?.startsWith('/world') || pathname?.startsWith('/call')) return null

  const send = async () => {
    if (message.trim().length < 3 || sending) return
    setSending(true)
    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch('/api/feedback', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(session ? { Authorization: `Bearer ${session.access_token}` } : {}),
      },
      body: JSON.stringify({ message: message.trim(), mood, page: pathname, email: loggedIn ? undefined : email.trim() || undefined }),
    }).then(r => r.json()).catch(() => null)
    setSending(false)
    if (res?.ok) {
      setOpen(false)
      setMessage('')
      showToast('Thank you — we read every word 💛', { type: 'success' })
    } else {
      showToast("Couldn't send your feedback — try again.", { type: 'error' })
    }
  }

  return (
    <>
      {/* Trigger — quiet edge tab, above the bottom nav */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          aria-label="Send feedback"
          title="Send feedback"
          style={{
            position: 'fixed',
            left: '14px',
            bottom: 'calc(96px + env(safe-area-inset-bottom))',
            zIndex: 80,
            width: '40px',
            height: '40px',
            borderRadius: '13px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'var(--surface-1)',
            border: '1px solid var(--border-strong)',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
          }}
        >
          <MessageSquareHeart size={17} strokeWidth={1.8} />
        </button>
      )}

      {/* Sheet */}
      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 120 }} />
          <div style={{ position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 121, background: 'var(--surface-1)', borderRadius: '20px 20px 0 0', borderTop: '1px solid var(--border-strong)', padding: '20px 20px calc(20px + env(safe-area-inset-bottom))', maxWidth: '520px', margin: '0 auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
              <h3 style={{ fontFamily: 'DM Serif Display, serif', fontSize: '18px', color: 'var(--text-primary)', margin: 0 }}>Tell us anything</h3>
              <button onClick={() => setOpen(false)} aria-label="Close" style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '6px' }}><X size={18} /></button>
            </div>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '0 0 14px' }}>What you love, what's broken, what's missing — it goes straight to the founder.</p>

            <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
              {MOODS.map(m => {
                const on = mood === m.id
                return (
                  <button key={m.id} onClick={() => setMood(m.id)}
                    style={{ flex: 1, padding: '10px 6px', borderRadius: '12px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', background: on ? 'rgba(212,175,55,0.12)' : 'var(--overlay)', border: on ? '1px solid rgba(212,175,55,0.4)' : '1px solid var(--border)', color: on ? '#D4AF37' : 'var(--text-muted)', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                    {m.emoji} {m.label}
                  </button>
                )
              })}
            </div>

            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="Write in any language…"
              rows={4}
              autoFocus
              style={{ width: '100%', padding: '12px 14px', borderRadius: '13px', fontSize: '14px', background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text-primary)', outline: 'none', resize: 'vertical', boxSizing: 'border-box', fontFamily: 'Plus Jakarta Sans, sans-serif', marginBottom: '10px' }}
            />

            {!loggedIn && (
              <input
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="Your email (optional — if you'd like a reply)"
                type="email"
                style={{ width: '100%', padding: '11px 14px', borderRadius: '13px', fontSize: '13px', background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text-primary)', outline: 'none', boxSizing: 'border-box', marginBottom: '10px' }}
              />
            )}

            <button
              onClick={send}
              disabled={sending || message.trim().length < 3}
              style={{ width: '100%', padding: '13px', borderRadius: '13px', fontSize: '14px', fontWeight: 700, border: 'none', cursor: message.trim().length >= 3 ? 'pointer' : 'not-allowed', background: message.trim().length >= 3 ? 'linear-gradient(135deg, #D4AF37 0%, #B8960C 100%)' : 'var(--overlay-2)', color: message.trim().length >= 3 ? '#09090F' : 'var(--text-muted)' }}
            >
              {sending ? 'Sending…' : 'Send feedback'}
            </button>
          </div>
        </>
      )}
    </>
  )
}
