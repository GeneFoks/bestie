// @ts-nocheck
'use client'
import { useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  const handleReset = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: 'https://bestiehere.com/reset-password',
    })

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      setSent(true)
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#080810', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
      <div style={{ width: '100%', maxWidth: '400px' }}>
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <Link href="/" style={{ fontFamily: 'DM Serif Display, serif', fontSize: '28px', fontWeight: 700, color: '#D4AF37', textDecoration: 'none' }}>BESTIE</Link>
          <p style={{ marginTop: '8px', fontSize: '14px', color: '#9B93C0' }}>Reset your password</p>
        </div>

        <div style={{ background: '#0F0F1E', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '20px', padding: '32px' }}>
          {sent ? (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>📬</div>
              <h2 style={{ fontFamily: 'DM Serif Display, serif', fontSize: '22px', color: '#E8E0FF', marginBottom: '12px' }}>Check your email</h2>
              <p style={{ fontSize: '14px', color: '#9B93C0', lineHeight: 1.7, marginBottom: '24px' }}>
                We sent a password reset link to <span style={{ color: '#D4AF37' }}>{email}</span>. Check your inbox and click the link.
              </p>
              <Link href="/login" style={{ display: 'inline-block', padding: '12px 24px', borderRadius: '12px', fontSize: '14px', fontWeight: 600, background: 'linear-gradient(135deg, #D4AF37 0%, #B8960C 100%)', color: '#080810', textDecoration: 'none' }}>
                Back to login
              </Link>
            </div>
          ) : (
            <form onSubmit={handleReset} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <p style={{ fontSize: '14px', color: '#9B93C0', lineHeight: 1.6 }}>
                Enter your email and we'll send you a link to reset your password.
              </p>
              <div>
                <label style={{ fontSize: '13px', fontWeight: 500, color: '#9B93C0', display: 'block', marginBottom: '8px' }}>Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', fontSize: '14px', outline: 'none', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#E8E0FF', boxSizing: 'border-box' }}
                />
              </div>
              {error && (
                <div style={{ padding: '12px', borderRadius: '10px', background: 'rgba(255,80,80,0.1)', border: '1px solid rgba(255,80,80,0.2)', fontSize: '13px', color: '#ff6b6b' }}>{error}</div>
              )}
              <button type="submit" disabled={loading} style={{ padding: '14px', borderRadius: '12px', fontSize: '14px', fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1, background: 'linear-gradient(135deg, #D4AF37 0%, #B8960C 100%)', color: '#080810', border: 'none', marginTop: '8px' }}>
                {loading ? 'Sending...' : 'Send reset link'}
              </button>
              <p style={{ textAlign: 'center', fontSize: '13px', color: '#9B93C0' }}>
                <Link href="/login" style={{ color: '#D4AF37', textDecoration: 'none' }}>← Back to login</Link>
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
