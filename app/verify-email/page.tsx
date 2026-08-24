// @ts-nocheck
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Mail, RefreshCw, Check } from 'lucide-react'
import { supabase } from '@/lib/supabase'

export default function VerifyEmailPage() {
  const [email, setEmail] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [err, setErr] = useState('')

  useEffect(() => {
    const e = new URLSearchParams(window.location.search).get('email')
    if (e) setEmail(e)
  }, [])

  const resend = async () => {
    if (!email) return
    setSending(true); setErr('')
    const { error } = await supabase.auth.resend({ type: 'signup', email })
    setSending(false)
    if (error) setErr(error.message)
    else { setSent(true); setTimeout(() => setSent(false), 4000) }
  }

  // Deep-link to the user's inbox provider when we can detect it
  const domain = email.split('@')[1]?.toLowerCase() || ''
  const inbox = domain.includes('gmail') ? 'https://mail.google.com'
    : domain.includes('outlook') || domain.includes('hotmail') || domain.includes('live') ? 'https://outlook.live.com'
    : domain.includes('yahoo') ? 'https://mail.yahoo.com'
    : domain.includes('icloud') ? 'https://www.icloud.com/mail'
    : null

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
      <div style={{ textAlign: 'center', maxWidth: '420px' }}>
        <div style={{ width: '64px', height: '64px', margin: '0 auto 24px', borderRadius: '16px', background: 'rgba(212,175,55,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Mail size={32} color="#D4AF37" strokeWidth={2} />
        </div>
        <h1 style={{ fontFamily: 'DM Serif Display, serif', fontSize: '28px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '12px' }}>
          One tap left — check your email
        </h1>
        <p style={{ fontSize: '15px', color: 'var(--text-muted)', lineHeight: 1.7, marginBottom: '8px' }}>
          We sent a confirmation link{email ? <> to <b style={{ color: 'var(--text-primary)' }}>{email}</b></> : ''}. Tap it and you're in.
        </p>
        <p style={{ fontSize: '13px', color: '#FF6B35', lineHeight: 1.6, marginBottom: '28px' }}>
          ⚠️ Don't see it? <b>Check your Spam / Promotions folder</b> — it often lands there.
        </p>

        {inbox && (
          <a href={inbox} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-block', width: '100%', boxSizing: 'border-box', padding: '14px', borderRadius: '14px', fontSize: '15px', fontWeight: 700, background: 'linear-gradient(135deg, #D4AF37 0%, #B8960C 100%)', color: '#09090F', textDecoration: 'none', marginBottom: '10px' }}>
            Open my inbox →
          </a>
        )}

        <button onClick={resend} disabled={sending || !email || sent} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px', width: '100%', padding: '13px', borderRadius: '14px', fontSize: '14px', fontWeight: 600, cursor: sending || sent ? 'default' : 'pointer', background: sent ? 'rgba(52,211,153,0.12)' : 'var(--surface-2)', border: sent ? '1px solid rgba(52,211,153,0.35)' : '1px solid var(--border)', color: sent ? '#34D399' : 'var(--text-primary)', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
          {sent ? <><Check size={15} strokeWidth={2.5} /> Sent — check again</> : <><RefreshCw size={15} strokeWidth={2} /> {sending ? 'Sending…' : 'Resend the email'}</>}
        </button>
        {err && <p style={{ fontSize: '12px', color: '#ff6b6b', marginTop: '10px' }}>{err}</p>}

        <p style={{ fontSize: '13px', color: 'var(--text-dim)', marginTop: '24px' }}>
          Wrong email? <Link href="/signup" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>Start over</Link>
          {'  ·  '}
          <Link href="/login" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>Log in</Link>
        </p>
      </div>
    </div>
  )
}
