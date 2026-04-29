'use client'

import Link from 'next/link'

export default function DashboardPage() {
  return (
    <div style={{ minHeight: '100vh', background: '#080810', fontFamily: 'Plus Jakarta Sans, sans-serif', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px' }}>
      <div style={{ fontFamily: 'DM Serif Display, serif', fontSize: '48px', color: '#D4AF37' }}>🏠</div>
      <h1 style={{ fontFamily: 'DM Serif Display, serif', fontSize: '32px', color: '#E8E0FF' }}>Dashboard</h1>
      <p style={{ fontSize: '15px', color: '#9B93C0' }}>Connect Supabase to load your profile and stats.</p>
      <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
        <Link href="/" style={{ padding: '10px 20px', borderRadius: '12px', fontSize: '14px', color: '#9B93C0', border: '1px solid rgba(255,255,255,0.1)', textDecoration: 'none' }}>
          ← Home
        </Link>
        <Link href="/browse" style={{ padding: '10px 20px', borderRadius: '12px', fontSize: '14px', fontWeight: 600, background: 'linear-gradient(135deg, #D4AF37 0%, #B8960C 100%)', color: '#080810', textDecoration: 'none' }}>
          Browse Besties
        </Link>
      </div>
    </div>
  )
}
