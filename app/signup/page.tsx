// @ts-nocheck
'use client'

import { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

function SignupForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const ref = searchParams.get('ref')
    if (ref) localStorage.setItem('bestie_ref', ref)
  }, [searchParams])

  const handleSignup = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        data: { full_name: form.name },
        emailRedirectTo: 'https://bestiehere.com/auth/callback',
      }
    })
    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      router.push('/verify-email')
    }
  }

  const refCode = searchParams.get('ref')

  return (
    <div style={{ minHeight: '100vh', background: '#080810', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
      <div style={{ width: '100%', maxWidth: '400px' }}>
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <Link href="/" style={{ fontFamily: 'DM Serif Display, serif', fontSize: '28px', fontWeight: 700, color: '#D4AF37', textDecoration: 'none' }}>BESTIE</Link>
          <p style={{ marginTop: '8px', fontSize: '14px', color: '#9B93C0' }}>Create your social passport</p>
        </div>
        {refCode && (
          <div style={{ marginBottom: '20px', padding: '12px 16px', borderRadius: '12px', background: 'rgba(212,175,55,0.08)', border: '1px solid rgba(212,175,55,0.2)', textAlign: 'center', fontSize: '13px', color: '#D4AF37' }}>
            ✨ You were invited by a friend
          </div>
        )}
        <div style={{ background: '#0F0F1E', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '20px', padding: '32px' }}>
          <form onSubmit={handleSignup} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ fontSize: '13px', fontWeight: 500, color: '#9B93C0', display: 'block', marginBottom: '8px' }}>Full Name</label>
              <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Your name" required style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', fontSize: '14px', outline: 'none', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#E8E0FF', boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ fontSize: '13px', fontWeight: 500, color: '#9B93C0', display: 'block', marginBottom: '8px' }}>Email</label>
              <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="you@example.com" required style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', fontSize: '14px', outline: 'none', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#E8E0FF', boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ fontSize: '13px', fontWeight: 500, color: '#9B93C0', display: 'block', marginBottom: '8px' }}>Password</label>
              <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Min 6 characters" required minLength={6} style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', fontSize: '14px', outline: 'none', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#E8E0FF', boxSizing: 'border-box' }} />
            </div>
            {error && <div style={{ padding: '12px', borderRadius: '10px', background: 'rgba(255,80,80,0.1)', border: '1px solid rgba(255,80,80,0.2)', fontSize: '13px', color: '#ff6b6b' }}>{error}</div>}
            <p style={{ fontSize: '12px', color: '#9B93C0', textAlign: 'center' }}>By joining you agree to our terms. 18+ only.</p>
            <button type="submit" disabled={loading} style={{ padding: '14px', borderRadius: '12px', fontSize: '14px', fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1, background: 'linear-gradient(135deg, #D4AF37 0%, #B8960C 100%)', color: '#080810', border: 'none' }}>
              {loading ? 'Creating account...' : 'Create Account →'}
            </button>
          </form>
          <p style={{ textAlign: 'center', marginTop: '20px', fontSize: '13px', color: '#9B93C0' }}>
            Already have an account? <Link href="/login" style={{ color: '#D4AF37', textDecoration: 'none', fontWeight: 600 }}>Log in</Link>
          </p>
        </div>
      </div>
    </div>
  )
}

export default function SignupPage() {
  return (
    <Suspense>
      <SignupForm />
    </Suspense>
  )
}
