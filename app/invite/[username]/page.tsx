// @ts-nocheck
export const revalidate = 0
import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
import ProfileNav from '@/components/ProfileNav'
import InviteCTA from './InviteCTA'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

const ACTIVITY_LABELS = {
  hiking: 'go hiking', running: 'go running', gym_partner: 'work out together',
  cycling: 'go cycling', yoga: 'do yoga', cold_plunge: 'do a cold plunge',
  coffee_chat: 'grab coffee', deep_chat: 'have a deep conversation',
  game_night: 'play games', movie_night: 'watch a movie', night_out: 'go out',
  travel_buddy: 'travel together', meditation_circle: 'meditate together',
  breathwork: 'do breathwork', book_club: 'discuss books',
  cooking_together: 'cook together', dance: 'dance', climbing: 'go climbing',
}

export async function generateMetadata({ params, searchParams }) {
  const { data: profile } = await supabase
    .from('users')
    .select('full_name, username, bio, avatar_url, city, country')
    .eq('username', params.username)
    .single()
  if (!profile) return { title: 'Invite · Bestie' }
  const activity = searchParams?.activity
  const label = ACTIVITY_LABELS[activity] || 'connect'
  const title = `${profile.full_name} wants to ${label} with you`
  const description = profile.bio
    ? `${profile.bio.slice(0, 120)}${profile.bio.length > 120 ? '…' : ''}`
    : `Join Bestie to accept ${profile.full_name}'s invitation`
  const ogImageUrl = `https://bestiehere.com/invite/${params.username}/opengraph-image${activity ? `?activity=${activity}` : ''}`

  return {
    title: `${title} · Bestie`,
    description,
    openGraph: {
      title,
      description,
      url: `https://bestiehere.com/invite/${params.username}`,
      type: 'profile',
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: `${profile.full_name} on Bestie`,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImageUrl],
    },
  }
}

export default async function InvitePage({ params, searchParams }) {
  const { data: profile } = await supabase
    .from('users')
    .select('id, full_name, username, avatar_url, bestie_score, bio, city, country, eterotype, eterotype_name, activity_packages(*)')
    .eq('username', params.username)
    .single()

  if (!profile) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: '48px', marginBottom: '16px' }}>🔍</p>
          <h1 style={{ fontFamily: 'DM Serif Display, serif', fontSize: '24px', color: 'var(--text-primary)', marginBottom: '16px' }}>Invite not found</h1>
          <Link href="/" style={{ padding: '10px 24px', borderRadius: '12px', fontSize: '14px', fontWeight: 600, background: 'linear-gradient(135deg, #D4AF37 0%, #B8960C 100%)', color: '#09090F', textDecoration: 'none' }}>Go to Bestie</Link>
        </div>
      </div>
    )
  }

  const activityKey = searchParams?.activity
  const msg = searchParams?.msg
  const activityPkg = activityKey
    ? profile.activity_packages?.find((p: any) => p.activity_type === activityKey)
    : null
  const activityLabel = ACTIVITY_LABELS[activityKey] || 'connect'
  const initials = profile.full_name?.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2) || '?'
  const score = profile.bestie_score || 0
  const scoreColor = score >= 800 ? '#34D399' : score >= 600 ? '#D4AF37' : '#A99ECC'

  const signupUrl = `/signup?next=/${profile.username}${activityKey ? `&activity=${activityKey}` : ''}`

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
      <nav style={{ position: 'sticky', top: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', background: 'var(--nav-bg)', backdropFilter: 'blur(20px)', borderBottom: '1px solid var(--border)' }}>
        <Link href="/" style={{ fontFamily: 'DM Serif Display, serif', fontSize: '20px', fontWeight: 700, color: '#D4AF37', textDecoration: 'none' }}>BESTIE</Link>
        <ProfileNav />
      </nav>

      <div style={{ maxWidth: '480px', margin: '0 auto', padding: '60px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '32px' }}>

        {/* Invite header */}
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '12px', letterSpacing: '0.5px' }}>You've been invited</p>
          <h1 style={{ fontFamily: 'DM Serif Display, serif', fontSize: '28px', color: 'var(--text-primary)', lineHeight: 1.3 }}>
            {profile.full_name} wants to{' '}
            <span style={{ color: '#D4AF37' }}>{activityLabel}</span>
            {' '}with you
          </h1>
          {msg && (
            <p style={{ marginTop: '16px', fontSize: '15px', color: 'var(--text-muted)', fontStyle: 'italic', padding: '12px 20px', borderRadius: '14px', background: 'var(--surface-1b)', border: '1px solid var(--border)' }}>
              "{msg}"
            </p>
          )}
        </div>

        {/* Profile card */}
        <div style={{ width: '100%', background: 'linear-gradient(135deg, var(--surface-1) 0%, var(--surface-3) 100%)', border: '1px solid rgba(212,175,55,0.25)', borderRadius: '24px', padding: '28px', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: '-40px', right: '-40px', width: '160px', height: '160px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(212,175,55,0.06) 0%, transparent 70%)', pointerEvents: 'none' }} />

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px' }}>
            <div style={{ width: '72px', height: '72px', borderRadius: '18px', overflow: 'hidden', flexShrink: 0, border: '2px solid rgba(212,175,55,0.3)', background: 'var(--surface-3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {profile.avatar_url
                ? <img src={profile.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <span style={{ fontSize: '24px', fontWeight: 700, color: '#D4AF37' }}>{initials}</span>}
            </div>
            <div>
              <h2 style={{ fontFamily: 'DM Serif Display, serif', fontSize: '20px', color: 'var(--text-primary)', marginBottom: '3px' }}>{profile.full_name}</h2>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>@{profile.username}{profile.city ? ` · ${profile.city}` : ''}</p>
              {profile.eterotype && (
                <p style={{ fontSize: '12px', color: '#9B7FFF', marginTop: '2px' }}>🧭 {profile.eterotype_name || profile.eterotype}</p>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px', marginBottom: profile.bio ? '16px' : '0' }}>
            <div style={{ flex: 1, padding: '12px', borderRadius: '12px', background: 'rgba(0,0,0,0.3)', border: `1px solid ${scoreColor}20`, textAlign: 'center' }}>
              <p style={{ fontSize: '10px', color: 'var(--text-muted)', letterSpacing: '1px', marginBottom: '4px' }}>BESTIE SCORE</p>
              <p style={{ fontSize: '22px', fontWeight: 700, color: scoreColor, fontFamily: 'DM Serif Display, serif' }}>{score}</p>
            </div>
            {activityPkg && (
              <div style={{ flex: 2, padding: '12px', borderRadius: '12px', background: 'rgba(212,175,55,0.06)', border: '1px solid rgba(212,175,55,0.2)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '24px' }}>🎯</span>
                <div>
                  <p style={{ fontSize: '12px', color: '#D4AF37', fontWeight: 600 }}>{activityPkg.title}</p>
                  {activityPkg.description && <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>{activityPkg.description.slice(0, 60)}{activityPkg.description.length > 60 ? '…' : ''}</p>}
                </div>
              </div>
            )}
          </div>

          {profile.bio && (
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.6 }}>{profile.bio}</p>
          )}
        </div>

        {/* CTAs — client component handles logged-in vs logged-out state */}
        <InviteCTA
          username={profile.username}
          activityKey={activityKey}
          signupUrl={signupUrl}
        />

        <p style={{ fontSize: '13px', color: 'var(--text-muted)', textAlign: 'center', maxWidth: '340px', lineHeight: 1.6 }}>
          Bestie is a social platform for real-life connections. Find people for activities, build your crew, and track your social life.
        </p>
      </div>
    </div>
  )
}
