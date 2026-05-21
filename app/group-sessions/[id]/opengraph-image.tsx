import { ImageResponse } from 'next/og'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'edge'
export const alt = 'Bestie Group Session'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

const ACTIVITY_LABELS: Record<string, string> = {
  hiking: 'Hiking', running: 'Running', gym_partner: 'Gym', cycling: 'Cycling', yoga: 'Yoga',
  cold_plunge: 'Cold Plunge', coffee_chat: 'Coffee Chat', deep_chat: 'Deep Chat',
  game_night: 'Game Night', movie_night: 'Movie Night', night_out: 'Night Out',
  travel_buddy: 'Travel', meditation_circle: 'Meditation', book_club: 'Book Club',
  cooking_together: 'Cooking', dance: 'Dance', climbing: 'Climbing',
  meet_irl: 'Meet IRL', walk_meet: 'Walk', vibe_call: 'Vibe Call',
}

export default async function OGImage({ params }: { params: { id: string } }) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const { data: gs } = await supabase
    .from('group_sessions')
    .select('title, description, activity_type, location, scheduled_at, max_participants, host_id')
    .eq('id', params.id)
    .single()

  const { data: host } = gs?.host_id
    ? await supabase.from('users').select('full_name, avatar_url').eq('id', gs.host_id).single()
    : { data: null as any }

  const title = gs?.title || 'Group Session'
  const activity = ACTIVITY_LABELS[gs?.activity_type as string] || 'Session'
  const d = gs?.scheduled_at ? new Date(gs.scheduled_at) : null
  const when = d ? d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) : ''
  const atTime = d ? d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : ''

  return new ImageResponse(
    (
      <div style={{ width: '1200px', height: '630px', display: 'flex', flexDirection: 'column', background: '#09090F', position: 'relative', overflow: 'hidden', fontFamily: 'sans-serif', padding: '64px 72px' }}>
        <div style={{ position: 'absolute', top: '-120px', right: '-100px', width: '600px', height: '600px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(212,175,55,0.18) 0%, transparent 65%)', display: 'flex' }} />
        <div style={{ position: 'absolute', bottom: '-120px', left: '-80px', width: '500px', height: '500px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(155,127,255,0.14) 0%, transparent 65%)', display: 'flex' }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '36px' }}>
          <div style={{ fontSize: '15px', fontWeight: 700, color: '#D4AF37', letterSpacing: '3px', display: 'flex' }}>BESTIE</div>
          <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#A99ECC', display: 'flex' }} />
          <div style={{ fontSize: '14px', color: '#A99ECC', letterSpacing: '1.5px', display: 'flex' }}>GROUP SESSION</div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
          <div style={{ padding: '8px 18px', borderRadius: '999px', background: 'rgba(212,175,55,0.12)', border: '1px solid rgba(212,175,55,0.35)', fontSize: '16px', fontWeight: 600, color: '#D4AF37', alignSelf: 'flex-start', marginBottom: '20px', display: 'flex' }}>
            {activity}
          </div>

          <div style={{ fontSize: '60px', fontWeight: 700, color: '#F0EAFF', lineHeight: 1.05, marginBottom: '28px', display: 'flex', flexDirection: 'column', maxWidth: '1000px' }}>
            {title}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '36px' }}>
            {when && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '22px', color: '#F0EAFF' }}>
                <div style={{ fontSize: '22px', display: 'flex' }}>📅</div>
                <div style={{ display: 'flex' }}>{when}{atTime ? ` · ${atTime}` : ''}</div>
              </div>
            )}
            {gs?.location && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '22px', color: '#F0EAFF' }}>
                <div style={{ fontSize: '22px', display: 'flex' }}>📍</div>
                <div style={{ display: 'flex' }}>{gs.location}</div>
              </div>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          {host && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              {host.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={host.avatar_url} alt="" width={56} height={56} style={{ width: '56px', height: '56px', borderRadius: '50%', objectFit: 'cover', border: '2px solid rgba(212,175,55,0.5)' }} />
              ) : (
                <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: '#1A1A2E', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#D4AF37', fontSize: '22px', fontWeight: 700 }}>?</div>
              )}
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <div style={{ fontSize: '13px', color: '#A99ECC', letterSpacing: '1px', display: 'flex' }}>HOSTED BY</div>
                <div style={{ fontSize: '20px', fontWeight: 700, color: '#F0EAFF', display: 'flex' }}>{host.full_name || 'Bestie'}</div>
              </div>
            </div>
          )}
          <div style={{ padding: '14px 28px', borderRadius: '14px', background: 'linear-gradient(135deg, #D4AF37 0%, #B8960C 100%)', fontSize: '18px', fontWeight: 700, color: '#09090F', display: 'flex' }}>
            Join on bestiehere.com →
          </div>
        </div>
      </div>
    ),
    { ...size }
  )
}
