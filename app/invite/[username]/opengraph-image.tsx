// @ts-nocheck
import { ImageResponse } from 'next/og'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'edge'
export const alt = 'Bestie Invite'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

const ACTIVITY_LABELS: Record<string, string> = {
  hiking: 'go hiking', running: 'go running', gym_partner: 'work out together',
  cycling: 'go cycling', yoga: 'do yoga', cold_plunge: 'do a cold plunge',
  coffee_chat: 'grab coffee', deep_chat: 'have a deep conversation',
  game_night: 'play games', movie_night: 'watch a movie', night_out: 'go out',
  travel_buddy: 'travel together', meditation_circle: 'meditate together',
  breathwork: 'do breathwork', book_club: 'discuss books',
  cooking_together: 'cook together', dance: 'dance', climbing: 'go climbing',
  vent_session: 'have a vent session', sound_healing: 'do sound healing',
  meet_irl: 'meet in real life', real_talk: 'have a real talk',
  walk_meet: 'go for a walk', vibe_call: 'have a vibe call',
}

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

// Bestie Score is private progress — the invite card is seen by the invitee,
// so it shows what the host is known for + who they've met, never a score.
export default async function OGImage(
  { params, searchParams }: { params: { username: string }; searchParams?: { activity?: string } }
) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const { data: profile } = await supabase
    .from('users')
    .select('id, full_name, username, avatar_url, bio, city, country, total_sessions')
    .eq('username', params.username)
    .single()

  // "Known for": the host's top 1-3 sparks by count (labels only, no counts).
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

  const activity = searchParams?.activity
  const activityLabel = activity ? (ACTIVITY_LABELS[activity] || 'connect') : 'connect'
  const sessions = profile?.total_sessions || 0
  const initials = profile?.full_name?.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2) || '??'

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
            <img
              src={profile.avatar_url}
              alt=""
              style={{ width: '420px', height: '630px', objectFit: 'cover', objectPosition: 'center top' }}
            />
          ) : (
            <div style={{ width: '420px', height: '630px', background: 'linear-gradient(135deg, #1A1A2E 0%, #111120 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ fontSize: '120px', fontWeight: 700, color: '#D4AF37', display: 'flex' }}>{initials}</div>
            </div>
          )}
          {/* Gradient overlay on photo */}
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to right, transparent 60%, #09090F 100%)', display: 'flex' }} />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(8,8,16,0.5) 0%, transparent 40%)', display: 'flex' }} />
        </div>

        {/* Right side — info */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '48px 56px 48px 32px' }}>

          {/* BESTIE logo */}
          <div style={{ fontSize: '15px', fontWeight: 700, color: '#D4AF37', letterSpacing: '3px', marginBottom: '32px', display: 'flex' }}>
            BESTIE
          </div>

          {/* Invite text */}
          <div style={{ fontSize: '16px', color: '#A99ECC', marginBottom: '12px', display: 'flex', letterSpacing: '0.5px' }}>
            YOU'VE BEEN INVITED
          </div>

          {/* Name */}
          <div style={{ fontFamily: fontData ? 'DM Serif Display' : 'sans-serif', fontSize: '52px', fontWeight: 700, color: '#F0EAFF', lineHeight: 1.1, marginBottom: '8px', display: 'flex', flexDirection: 'column' }}>
            {profile?.full_name || params.username}
          </div>

          {/* City */}
          {profile?.city && (
            <div style={{ fontSize: '16px', color: '#A99ECC', marginBottom: '24px', display: 'flex' }}>
              📍 {profile.city}{profile.country ? `, ${profile.country}` : ''}
            </div>
          )}

          {/* Activity */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '28px', padding: '16px 20px', background: 'rgba(212,175,55,0.08)', border: '1px solid rgba(212,175,55,0.25)', borderRadius: '16px' }}>
            <div style={{ fontSize: '28px', display: 'flex' }}>🎯</div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ fontSize: '13px', color: '#A99ECC', marginBottom: '2px', display: 'flex' }}>Wants to</div>
              <div style={{ fontSize: '22px', fontWeight: 700, color: '#D4AF37', display: 'flex' }}>{activityLabel}</div>
            </div>
          </div>

          {/* Stats row — Known for + Met N people in one box (keeps the card's
              height bounded under the activity block); never a score, never a zero */}
          <div style={{ display: 'flex', gap: '12px', marginBottom: '32px' }}>
            {(knownFor.length > 0 || sessions > 0) ? (
              <div style={{ padding: '12px 20px', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '12px', display: 'flex', flexDirection: 'column' }}>
                {knownFor.length > 0 && (
                  <div style={{ fontSize: '11px', color: '#A99ECC', marginBottom: '4px', letterSpacing: '1px', display: 'flex' }}>KNOWN FOR</div>
                )}
                {knownFor.length > 0 && (
                  <div style={{ fontSize: '22px', fontWeight: 700, color: '#F0EAFF', display: 'flex' }}>{knownFor.join(' · ')}</div>
                )}
                {sessions > 0 && (
                  <div style={{ fontSize: knownFor.length > 0 ? '15px' : '20px', fontWeight: knownFor.length > 0 ? 500 : 700, color: knownFor.length > 0 ? '#A99ECC' : '#F0EAFF', marginTop: knownFor.length > 0 ? '6px' : '0', display: 'flex' }}>
                    {`Met ${sessions} ${sessions === 1 ? 'person' : 'people'} on Bestie`}
                  </div>
                )}
              </div>
            ) : (
              <div style={{ padding: '10px 18px', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '999px', fontSize: '16px', fontWeight: 600, color: '#A99ECC', display: 'flex' }}>
                New to Bestie
              </div>
            )}
          </div>

          {/* CTA pill */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ padding: '14px 28px', borderRadius: '14px', background: 'linear-gradient(135deg, #D4AF37 0%, #B8960C 100%)', fontSize: '17px', fontWeight: 700, color: '#09090F', display: 'flex' }}>
              Accept on bestiehere.com →
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
