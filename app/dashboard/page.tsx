// @ts-nocheck
'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function DashboardPage() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const getUser = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }
      setUser(session.user)
      const { data } = await supabase.from('users').select('*, activity_packages(*)').eq('id', session.user.id).single()
      setProfile(data)
      setLoading(false)
    }
    getUser()
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#080810', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: '40px', height: '40px', border: '3px solid rgba(212,175,55,0.2)', borderTop: '3px solid #D4AF37', borderRadius: '50%', margin: '0 auto 16px', animation: 'spin 1s linear infinite' }} />
        <p style={{ color: '#9B93C0', fontSize: '14px' }}>Loading your profile...</p>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )

  const score = profile?.bestie_score || 0
  const scoreColor = score >= 800 ? '#39FF14' : score >= 600 ? '#D4AF37' : '#9B93C0'
  const scoreLabel = score >= 800 ? 'Excellent' : score >= 600 ? 'Good' : score >= 400 ? 'Fair' : 'New'

  return (
    <div style={{ minHeight: '100vh', background: '#080810', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
      <nav style={{ position: 'sticky', top: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', background: 'rgba(8,8,16,0.9)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <Link href="/" style={{ fontFamily: 'DM Serif Display, serif', fontSize: '20px', fontWeight: 700, color: '#D4AF37', textDecoration: 'none' }}>BESTIE</Link>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <Link href="/browse" style={{ fontSize: '14px', color: '#9B93C0', textDecoration: 'none' }}>Browse</Link>
          <button onClick={handleLogout} style={{ fontSize: '14px', color: '#9B93C0', background: 'none', border: '1px solid rgba(255,255,255,0.1)', padding: '6px 16px', borderRadius: '10px', cursor: 'pointer' }}>Log out</button>
        </div>
      </nav>

      <div style={{ maxWidth: '960px', margin: '0 auto', padding: '40px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '32px', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h1 style={{ fontFamily: 'DM Serif Display, serif', fontSize: '32px', fontWeight: 700, color: '#E8E0FF', marginBottom: '4px' }}>
              Hey, {profile?.full_name?.split(' ')[0] || user?.email?.split('@')[0]} 👋
            </h1>
            <p style={{ fontSize: '14px', color: '#9B93C0' }}>@{profile?.username || user?.email?.split('@')[0]}</p>
          </div>
          <Link href={`/${profile?.username}`} style={{ padding: '10px 20px', borderRadius: '12px', fontSize: '14px', fontWeight: 600, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#E8E0FF', textDecoration: 'none' }}>
            View my profile →
          </Link>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '32px' }}>
          <div style={{ background: '#0F0F1E', border: `1px solid ${scoreColor}25`, borderRadius: '20px', padding: '24px', textAlign: 'center' }}>
            <p style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '2px', color: '#9B93C0', marginBottom: '8px' }}>BESTIE SCORE</p>
            <div style={{ fontSize: '56px', fontWeight: 700, color: scoreColor, fontFamily: 'DM Serif Display, serif', lineHeight: 1 }}>{score}</div>
            <div style={{ height: '6px', borderRadius: '999px', background: 'rgba(255,255,255,0.06)', margin: '12px 0 8px', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${score / 10}%`, borderRadius: '999px', background: `linear-gradient(90deg, ${scoreColor} 0%, #D4AF37 100%)` }} />
            </div>
            <p style={{ fontSize: '12px', fontWeight: 600, color: scoreColor }}>{scoreLabel}</p>
          </div>
          <div style={{ background: '#0F0F1E', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '20px', padding: '24px', textAlign: 'center' }}>
            <p style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '2px', color: '#9B93C0', marginBottom: '8px' }}>SESSIONS</p>
            <div style={{ fontSize: '56px', fontWeight: 700, color: '#E8E0FF', fontFamily: 'DM Serif Display, serif', lineHeight: 1 }}>{profile?.total_sessions || 0}</div>
            <p style={{ fontSize: '12px', color: '#9B93C0', marginTop: '12px' }}>completed</p>
          </div>
          <div style={{ background: '#0F0F1E', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '20px', padding: '24px', textAlign: 'center' }}>
            <p style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '2px', color: '#9B93C0', marginBottom: '8px' }}>RATING</p>
            <div style={{ fontSize: '56px', fontWeight: 700, color: '#D4AF37', fontFamily: 'DM Serif Display, serif', lineHeight: 1 }}>{profile?.avg_rating ? profile.avg_rating.toFixed(1) : '—'}</div>
            <p style={{ fontSize: '12px', color: '#9B93C0', marginTop: '12px' }}>avg rating ⭐</p>
          </div>
          <div style={{ background: '#0F0F1E', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '20px', padding: '24px', textAlign: 'center' }}>
            <p style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '2px', color: '#9B93C0', marginBottom: '8px' }}>LOCATION</p>
            <div style={{ fontSize: '32px', marginBottom: '8px' }}>📍</div>
            <p style={{ fontSize: '16px', fontWeight: 600, color: '#E8E0FF' }}>{profile?.city || 'Not set'}</p>
            <p style={{ fontSize: '12px', color: '#9B93C0', marginTop: '4px' }}>{profile?.country || 'Add your city'}</p>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
          <div style={{ background: '#0F0F1E', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '20px', padding: '24px' }}>
            <h3 style={{ fontFamily: 'DM Serif Display, serif', fontSize: '18px', color: '#E8E0FF', marginBottom: '16px' }}>Complete your profile</h3>
            {[
              { label: 'Add profile photo', done: !!profile?.avatar_url },
              { label: 'Write your bio', done: !!profile?.bio },
              { label: 'Add your city', done: !!profile?.city },
              { label: 'Create an activity', done: profile?.activity_packages?.length > 0 },
            ].map((item) => (
              <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                <div style={{ width: '20px', height: '20px', borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: item.done ? 'rgba(57,255,20,0.15)' : 'rgba(255,255,255,0.06)', border: item.done ? '1px solid rgba(57,255,20,0.3)' : '1px solid rgba(255,255,255,0.1)', fontSize: '11px', color: '#39FF14' }}>
                  {item.done ? '✓' : ''}
                </div>
                <span style={{ fontSize: '14px', color: item.done ? '#9B93C0' : '#E8E0FF', textDecoration: item.done ? 'line-through' : 'none' }}>{item.label}</span>
                {!item.done && <span style={{ marginLeft: 'auto', fontSize: '12px', color: '#D4AF37' }}>→</span>}
              </div>
            ))}
          </div>

          <div style={{ background: '#0F0F1E', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '20px', padding: '24px' }}>
            <h3 style={{ fontFamily: 'DM Serif Display, serif', fontSize: '18px', color: '#E8E0FF', marginBottom: '16px' }}>Quick actions</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {[
                { emoji: '🔍', label: 'Browse Besties', sub: 'Find someone for your activity', href: '/browse' },
                { emoji: '✏️', label: 'Edit profile', sub: 'Update your bio, photo, city', href: '/profile/edit' },
                { emoji: '👤', label: 'View my profile', sub: 'See how others see you', href: `/${profile?.username}` },
                { emoji: '📋', label: 'Bookings', sub: 'View your booking requests', href: '/bookings' },
                { emoji: '✉️', label: 'Messages', sub: 'Check your conversations', href: '/messages' },
              ].map((action) => (
                <Link key={action.label} href={action.href} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px', borderRadius: '14px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', textDecoration: 'none' }}>
                  <span style={{ fontSize: '24px' }}>{action.emoji}</span>
                  <div>
                    <p style={{ fontSize: '14px', fontWeight: 600, color: '#E8E0FF', marginBottom: '2px' }}>{action.label}</p>
                    <p style={{ fontSize: '12px', color: '#9B93C0' }}>{action.sub}</p>
                  </div>
                  <span style={{ marginLeft: 'auto', color: '#9B93C0' }}>→</span>
                </Link>
              ))}
            </div>
          </div>
        </div>

        <div style={{ marginTop: '20px', background: 'linear-gradient(135deg, rgba(212,175,55,0.08) 0%, rgba(57,255,20,0.04) 100%)', border: '1px solid rgba(212,175,55,0.15)', borderRadius: '20px', padding: '24px' }}>
          <h3 style={{ fontFamily: 'DM Serif Display, serif', fontSize: '18px', color: '#E8E0FF', marginBottom: '16px' }}>🚀 Boost your Bestie Score</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
            {[
              { icon: '📸', label: 'Add photo', points: '+50 BS' },
              { icon: '✍️', label: 'Complete bio', points: '+30 BS' },
              { icon: '🤝', label: 'Complete session', points: '+100 BS' },
              { icon: '⭐', label: 'Get 5-star review', points: '+80 BS' },
            ].map((tip) => (
              <div key={tip.label} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px', borderRadius: '12px', background: 'rgba(255,255,255,0.04)' }}>
                <span style={{ fontSize: '20px' }}>{tip.icon}</span>
                <div>
                  <p style={{ fontSize: '13px', fontWeight: 500, color: '#E8E0FF' }}>{tip.label}</p>
                  <p style={{ fontSize: '12px', color: '#39FF14', fontWeight: 600 }}>{tip.points}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
