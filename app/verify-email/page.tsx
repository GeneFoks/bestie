'use client'

import Link from 'next/link'
import { Mail } from 'lucide-react'

export default function VerifyEmailPage() {
  return (
    <div style={{ minHeight: '100vh', background: '#09090F', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
      <div style={{ textAlign: 'center', maxWidth: '400px' }}>
        <div style={{ width: '64px', height: '64px', margin: '0 auto 24px', borderRadius: '16px', background: 'rgba(212,175,55,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Mail size={32} color="#D4AF37" strokeWidth={2} />
        </div>
        <h1 style={{ fontFamily: 'DM Serif Display, serif', fontSize: '28px', fontWeight: 700, color: '#F0EAFF', marginBottom: '12px' }}>
          Check your email
        </h1>
        <p style={{ fontSize: '15px', color: '#A99ECC', lineHeight: 1.7, marginBottom: '32px' }}>
          We sent a confirmation link to your email. Click it to activate your Social Passport.
        </p>
        <div style={{ background: '#111120', border: '1px solid rgba(255,255,255,0.10)', borderRadius: '16px', padding: '20px', marginBottom: '24px' }}>
          <p style={{ fontSize: '13px', color: '#A99ECC', lineHeight: 1.7 }}>
            Didn't get it? Check your spam folder or{' '}
            <Link href="/signup" style={{ color: '#D4AF37', textDecoration: 'none' }}>try again</Link>
          </p>
        </div>
        <Link href="/login" style={{ display: 'inline-block', padding: '12px 28px', borderRadius: '12px', fontSize: '14px', fontWeight: 600, background: 'linear-gradient(135deg, #D4AF37 0%, #B8960C 100%)', color: '#09090F', textDecoration: 'none' }}>
          Go to Login →
        </Link>
      </div>
    </div>
  )
}
