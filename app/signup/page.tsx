// @ts-nocheck
'use client'

import { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { showToast } from '@/components/Toast'

// Feature flag: Google OAuth ships dark until the provider is configured in
// Supabase and NEXT_PUBLIC_GOOGLE_AUTH=1 is set in Netlify.
const GOOGLE_AUTH_ENABLED = process.env.NEXT_PUBLIC_GOOGLE_AUTH === '1'

function GoogleGLogo() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
    </svg>
  )
}

async function handleGoogleSignIn() {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: window.location.origin + '/onboarding' },
  })
  if (error) showToast("Google sign-in isn't available yet — use email below.", { type: 'error' })
}

function SignupForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const ref = searchParams.get('ref')
    if (ref) localStorage.setItem('bestie_ref', ref)
    // Intent carry-through: ?next=/crews/new (e.g. "Register your camp" on the
    // playa) survives signup + onboarding and lands the user where they meant
    // to go. Same-site relative paths only.
    const next = searchParams.get('next')
    if (next && next.startsWith('/') && !next.startsWith('//')) {
      localStorage.setItem('bestie_next', next)
    }
  }, [searchParams])

  const handleSignup = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { data, error } = await supabase.auth.signUp({
      email: form.email.trim().toLowerCase(),
      password: form.password,
      options: {
        data: { full_name: form.name },
        emailRedirectTo: 'https://bestiehere.com/auth/callback',
      }
    })
    if (error) {
      setError(error.message)
      setLoading(false)
    } else if (data.session) {
      // Email confirmation is off → user is signed in immediately. Skip the
      // dead-end verify page and go straight into onboarding.
      router.push('/onboarding')
    } else {
      router.push(`/verify-email?email=${encodeURIComponent(form.email)}`)
    }
  }

  const refCode = searchParams.get('ref')

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
      <div style={{ width: '100%', maxWidth: '400px' }}>
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <Link href="/" style={{ fontFamily: 'DM Serif Display, serif', fontSize: '28px', fontWeight: 700, color: '#D4AF37', textDecoration: 'none' }}>BESTIE</Link>
          <h1 style={{ fontFamily: 'DM Serif Display, serif', fontSize: '22px', color: 'var(--text-primary)', marginTop: '20px', marginBottom: '10px' }}>Meet your first Bestie this week</h1>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'center' }}>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>✓ Free forever</p>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>✓ 60-second setup</p>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>✓ Your test result carries over</p>
          </div>
        </div>
        {refCode && (
          <div style={{ marginBottom: '20px', padding: '12px 16px', borderRadius: '12px', background: 'rgba(212,175,55,0.08)', border: '1px solid rgba(212,175,55,0.2)', textAlign: 'center', fontSize: '13px', color: '#D4AF37', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px', width: '100%', boxSizing: 'border-box' }}>
            <Sparkles size={14} strokeWidth={2} /> Invited by a friend — you both get +10 Sparks ⚡
          </div>
        )}
        <div style={{ background: 'var(--surface-1)', border: '1px solid var(--border)', borderRadius: '20px', padding: '32px' }}>
          {GOOGLE_AUTH_ENABLED && (
            <>
              <button type="button" onClick={handleGoogleSignIn} style={{ width: '100%', minHeight: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', padding: '10px 16px', borderRadius: '12px', background: '#FCFCFC', border: 'none', color: '#1F1F1F', fontSize: '14px', fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer' }}>
                <GoogleGLogo /> Continue with Google
              </button>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '20px 0' }}>
                <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>or</span>
                <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
              </div>
            </>
          )}
          <form onSubmit={handleSignup} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-muted)', display: 'block', marginBottom: '8px' }}>Full Name</label>
              <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Your name" required style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', fontSize: '14px', outline: 'none', background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text-primary)', boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-muted)', display: 'block', marginBottom: '8px' }}>Email</label>
              <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="you@example.com" required style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', fontSize: '14px', outline: 'none', background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text-primary)', boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-muted)', display: 'block', marginBottom: '8px' }}>Password</label>
              <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Min 6 characters" required minLength={6} style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', fontSize: '14px', outline: 'none', background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text-primary)', boxSizing: 'border-box' }} />
            </div>
            {error && <div style={{ padding: '12px', borderRadius: '10px', background: 'rgba(255,80,80,0.1)', border: '1px solid rgba(255,80,80,0.2)', fontSize: '13px', color: '#ff6b6b' }}>{error}</div>}
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center' }}>By joining you agree to the <Link href="/terms" style={{ color: '#D4AF37', textDecoration: 'none' }}>Terms of Service</Link> and <Link href="/privacy" style={{ color: '#D4AF37', textDecoration: 'none' }}>Privacy Policy</Link>. 18+ only.</p>
            <Button type="submit" variant="primary" disabled={loading} style={{ width: '100%', opacity: loading ? 0.7 : 1, cursor: loading ? 'not-allowed' : 'pointer' }}>
              {loading ? 'Creating account...' : 'Create Account →'}
            </Button>
          </form>
          <p style={{ textAlign: 'center', marginTop: '20px', fontSize: '13px', color: 'var(--text-muted)' }}>
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
