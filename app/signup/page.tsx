// @ts-nocheck
'use client'

import { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/Button'

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
      router.push(`/verify-email?email=${encodeURIComponent(form.email)}`)
    }
  }

  const refCode = searchParams.get('ref')

  return (
    <div style={{ minHeight: '100vh', background: '#09090F', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
      <div style={{ width: '100%', maxWidth: '400px' }}>
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <Link href="/" style={{ fontFamily: 'DM Serif Display, serif', fontSize: '28px', fontWeight: 700, color: '#D4AF37', textDecoration: 'none' }}>BESTIE</Link>
          <h1 style={{ fontFamily: 'DM Serif Display, serif', fontSize: '22px', color: '#F0EAFF', marginTop: '20px', marginBottom: '6px' }}>Real people. Real moments.</h1>
          <p style={{ fontSize: '13px', color: '#A99ECC' }}>Create your social passport — takes 60 seconds.</p>
        </div>
        {refCode && (
          <div style={{ marginBottom: '20px', padding: '12px 16px', borderRadius: '12px', background: 'rgba(212,175,55,0.08)', border: '1px solid rgba(212,175,55,0.2)', textAlign: 'center', fontSize: '13px', color: '#D4AF37', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px', width: '100%', boxSizing: 'border-box' }}>
            <Sparkles size={14} strokeWidth={2} /> Invited by a friend — you both get +10 Sparks ⚡
          </div>
        )}
        <div style={{ background: '#111120', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '20px', padding: '32px' }}>
          <form onSubmit={handleSignup} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ fontSize: '13px', fontWeight: 500, color: '#A99ECC', display: 'block', marginBottom: '8px' }}>Full Name</label>
              <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Your name" required style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', fontSize: '14px', outline: 'none', background: '#161628', border: '1px solid rgba(255,255,255,0.1)', color: '#F0EAFF', boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ fontSize: '13px', fontWeight: 500, color: '#A99ECC', display: 'block', marginBottom: '8px' }}>Email</label>
              <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="you@example.com" required style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', fontSize: '14px', outline: 'none', background: '#161628', border: '1px solid rgba(255,255,255,0.1)', color: '#F0EAFF', boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ fontSize: '13px', fontWeight: 500, color: '#A99ECC', display: 'block', marginBottom: '8px' }}>Password</label>
              <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Min 6 characters" required minLength={6} style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', fontSize: '14px', outline: 'none', background: '#161628', border: '1px solid rgba(255,255,255,0.1)', color: '#F0EAFF', boxSizing: 'border-box' }} />
            </div>
            {error && <div style={{ padding: '12px', borderRadius: '10px', background: 'rgba(255,80,80,0.1)', border: '1px solid rgba(255,80,80,0.2)', fontSize: '13px', color: '#ff6b6b' }}>{error}</div>}
            <p style={{ fontSize: '12px', color: '#A99ECC', textAlign: 'center' }}>By joining you agree to the <Link href="/terms" style={{ color: '#D4AF37', textDecoration: 'none' }}>Terms of Service</Link> and <Link href="/privacy" style={{ color: '#D4AF37', textDecoration: 'none' }}>Privacy Policy</Link>. 18+ only.</p>
            <Button type="submit" variant="primary" disabled={loading} style={{ width: '100%', opacity: loading ? 0.7 : 1, cursor: loading ? 'not-allowed' : 'pointer' }}>
              {loading ? 'Creating account...' : 'Create Account →'}
            </Button>
          </form>
          <p style={{ textAlign: 'center', marginTop: '20px', fontSize: '13px', color: '#A99ECC' }}>
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
