// @ts-nocheck
import { ImageResponse } from 'next/og'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'edge'
export const alt = 'Bestie profile'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

// Spark type → display label (mirrors SPARK_TYPES on the passport page).
const SPARK_LABELS: Record<string, string> = {
  kind: 'Kind', fun: 'Fun', reliable: 'Reliable', genuine: 'Genuine', safe: 'Safe',
  energetic: 'Energetic', good_listener: 'Good listener', social: 'Social',
  punctual: 'Punctual', open: 'Open', focused: 'Focused', insightful: 'Insightful',
  motivating: 'Motivating', supportive: 'Supportive', creative: 'Creative',
  inspiring: 'Inspiring', professional: 'Professional', articulate: 'Articulate',
  calming: 'Calming', high_energy: 'High energy', worldly: 'Worldly',
  knowledgeable: 'Knowledgeable',
}
const sparkLabel = (t: string) =>
  SPARK_LABELS[t] || (t ? t.charAt(0).toUpperCase() + t.slice(1).replace(/_/g, ' ') : '')

// Branded 1200×630 share card for a public profile. This is the link people
// share most (referral / match / "check my profile"), so it gets a rich card
// instead of a bare avatar thumbnail.
// Bestie Score is private progress — this card is seen by everyone else, so it
// shows only what grows and is positive: what they're known for + who they've met.
export default async function OGImage({ params }: { params: { username: string } }) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const { data: profile } = await supabase
    .from('users')
    .select('id, full_name, username, avatar_url, bio, city, country, total_sessions, activities')
    .eq('username', params.username)
    .single()

  // "Known for": the person's top 1-3 sparks by count (labels only, no counts).
  let knownFor: string[] = []
  if (profile?.id) {
    try {
      const { data: sparks } = await supabase
        .from('sparks')
        .select('spark_type')
        .eq('receiver_id', profile.id)
      const counts: Record<string, number> = {}
      ;(sparks || []).forEach((s: { spark_type: string }) => {
        if (s?.spark_type) counts[s.spark_type] = (counts[s.spark_type] || 0) + 1
      })
      knownFor = Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([t]) => sparkLabel(t))
        .filter(Boolean)
    } catch (err) {
      console.error('OG sparks fetch failed:', err)
      knownFor = []
    }
  }

  const sessions = profile?.total_sessions || 0
  const initials = profile?.full_name?.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2) || '??'
  const topActivities: string[] = Array.isArray(profile?.activities) ? profile.activities.slice(0, 3) : []

  // Serif display font for the title line; a failed fetch falls back to sans-serif.
  let fontData: ArrayBuffer | null = null
  try {
    fontData = await fetch('https://fonts.gstatic.com/s/dmserifdisplay/v15/-nFnOHM81r4j6k0gjAW3mujVU2B2K_d709jy92k.ttf')
      .then((res) => (res.ok ? res.arrayBuffer() : null))
  } catch (err) {
    console.error('OG font fetch failed:', err)
    fontData = null
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: '1200px',
          height: '630px',
          display: 'flex',
          background: '#09090F',
          position: 'relative',
          overflow: 'hidden',
          fontFamily: 'sans-serif',
        }}
      >
        {/* Background gradient orbs */}
        <div style={{ position: 'absolute', top: '-120px', left: '50%', width: '700px', height: '600px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(212,175,55,0.12) 0%, transparent 65%)', transform: 'translateX(-50%)', display: 'flex' }} />
        <div style={{ position: 'absolute', bottom: '-100px', right: '-80px', width: '500px', height: '500px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(155,147,192,0.08) 0%, transparent 70%)', display: 'flex' }} />

        {/* Left side — user photo */}
        <div style={{ width: '420px', height: '630px', flexShrink: 0, position: 'relative', display: 'flex' }}>
          {profile?.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={profile.avatar_url} alt="" style={{ width: '420px', height: '630px', objectFit: 'cover', objectPosition: 'center top' }} />
          ) : (
            <div style={{ width: '420px', height: '630px', background: 'linear-gradient(135deg, #1A1A2E 0%, #111120 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ fontSize: '120px', fontWeight: 700, color: '#D4AF37', display: 'flex' }}>{initials}</div>
            </div>
          )}
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to right, transparent 60%, #09090F 100%)', display: 'flex' }} />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(8,8,16,0.5) 0%, transparent 40%)', display: 'flex' }} />
        </div>

        {/* Right side — info */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '48px 56px 48px 32px' }}>

          {/* BESTIE logo */}
          <div style={{ fontSize: '15px', fontWeight: 700, color: '#D4AF37', letterSpacing: '3px', marginBottom: '28px', display: 'flex' }}>
            BESTIE
          </div>

          <div style={{ fontSize: '16px', color: '#A99ECC', marginBottom: '12px', display: 'flex', letterSpacing: '0.5px' }}>
            LET'S CONNECT ON BESTIE
          </div>

          {/* Name */}
          <div style={{ fontFamily: fontData ? 'DM Serif Display' : 'sans-serif', fontSize: '52px', fontWeight: 700, color: '#F0EAFF', lineHeight: 1.1, marginBottom: '8px', display: 'flex', flexDirection: 'column' }}>
            {profile?.full_name || params.username}
          </div>

          {/* City */}
          {profile?.city && (
            <div style={{ fontSize: '16px', color: '#A99ECC', marginBottom: '22px', display: 'flex' }}>
              📍 {profile.city}{profile.country ? `, ${profile.country}` : ''}
            </div>
          )}

          {/* Activities */}
          {topActivities.length > 0 && (
            <div style={{ display: 'flex', gap: '8px', marginBottom: '28px', flexWrap: 'wrap' }}>
              {topActivities.map((a) => (
                <div key={a} style={{ padding: '8px 16px', background: 'rgba(212,175,55,0.08)', border: '1px solid rgba(212,175,55,0.25)', borderRadius: '999px', fontSize: '16px', fontWeight: 600, color: '#D4AF37', display: 'flex' }}>
                  {a.replace(/_/g, ' ')}
                </div>
              ))}
            </div>
          )}

          {/* Stats row — Known for + Met N people (never a score, never a zero) */}
          <div style={{ display: 'flex', gap: '12px', marginBottom: '32px', flexWrap: 'wrap' }}>
            {knownFor.length > 0 && (
              <div style={{ padding: '12px 20px', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '12px', display: 'flex', flexDirection: 'column' }}>
                <div style={{ fontSize: '11px', color: '#A99ECC', marginBottom: '4px', letterSpacing: '1px', display: 'flex' }}>KNOWN FOR</div>
                <div style={{ fontSize: '24px', fontWeight: 700, color: '#F0EAFF', display: 'flex' }}>{knownFor.join(' · ')}</div>
              </div>
            )}
            {sessions > 0 && (
              <div style={{ padding: '12px 20px', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '12px', display: 'flex', flexDirection: 'column' }}>
                <div style={{ fontSize: '11px', color: '#A99ECC', marginBottom: '4px', letterSpacing: '1px', display: 'flex' }}>MET</div>
                <div style={{ fontSize: '24px', fontWeight: 700, color: '#F0EAFF', display: 'flex' }}>{`${sessions} ${sessions === 1 ? 'person' : 'people'}`}</div>
              </div>
            )}
            {knownFor.length === 0 && sessions === 0 && (
              <div style={{ padding: '10px 18px', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '999px', fontSize: '16px', fontWeight: 600, color: '#A99ECC', display: 'flex' }}>
                New to Bestie
              </div>
            )}
          </div>

          {/* CTA pill */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ padding: '14px 28px', borderRadius: '14px', background: 'linear-gradient(135deg, #D4AF37 0%, #B8960C 100%)', fontSize: '17px', fontWeight: 700, color: '#09090F', display: 'flex' }}>
              @{profile?.username || params.username} on bestiehere.com →
            </div>
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      ...(fontData ? { fonts: [{ name: 'DM Serif Display', data: fontData, style: 'normal' as const }] } : {}),
    }
  )
}
