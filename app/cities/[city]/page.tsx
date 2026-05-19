// @ts-nocheck
export const revalidate = 0
import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
import ProfileNav from '@/components/ProfileNav'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

const ACTIVITY_EMOJI: Record<string, string> = {
  hiking: '🥾', running: '🏃', gym_partner: '💪', cycling: '🚴', swimming: '🏊',
  cold_plunge: '🧊', yoga: '🧘', martial_arts: '🥋', climbing: '🧗',
  game_night: '🎮', movie_night: '🎬', night_out: '🌙', bar_hopping: '🍻',
  karaoke: '🎤', festival_crew: '🎪', travel_buddy: '✈️',
  deep_chat: '🫂', book_club: '📚', coffee_chat: '☕', cooking_together: '🍳',
  dance: '💃', meditation_circle: '🔮', breathwork: '🌬️',
}

export async function generateMetadata({ params }) {
  const city = decodeURIComponent(params.city)
  return { title: `${city} · Bestie`, description: `Top Besties, crews and events in ${city}` }
}

export default async function CityHubPage({ params }) {
  const city = decodeURIComponent(params.city)

  const [
    { data: topBesties },
    { data: activityPkgs },
    { data: crews },
  ] = await Promise.all([
    // Top 6 besties in this city
    supabase.from('users')
      .select('id, username, full_name, avatar_url, bestie_score, energy_type, mind_type, vibe_type, bio')
      .ilike('city', city)
      .order('bestie_score', { ascending: false })
      .limit(6),

    // All activity packages from users in this city
    supabase.from('activity_packages')
      .select('activity_type, user:users!user_id(city)')
      .not('activity_type', 'is', null),

    // Crews based in this city
    supabase.from('crews')
      .select('id, name, slug, description, avatar_url, is_public, city, captain:users!captain_id(city)')
      .or(`city.ilike.${city},captain.city.ilike.${city}`)
      .eq('is_public', true)
      .limit(6),
  ])

  // Count activity types from users in this city
  const activityCount: Record<string, number> = {}
  activityPkgs?.forEach(pkg => {
    if (pkg.user?.city?.toLowerCase() === city.toLowerCase()) {
      activityCount[pkg.activity_type] = (activityCount[pkg.activity_type] || 0) + 1
    }
  })
  const topActivities = Object.entries(activityCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)

  // Upcoming crew events from crews in this city
  const crewIds = crews?.map(c => c.id) || []
  const { data: upcomingEvents } = crewIds.length > 0
    ? await supabase.from('crew_events')
        .select('id, title, datetime, location, crew:crews(name, slug)')
        .in('crew_id', crewIds)
        .gte('datetime', new Date().toISOString())
        .order('datetime', { ascending: true })
        .limit(5)
    : { data: [] }

  const scoreColor = (s: number) => s >= 800 ? '#34D399' : s >= 600 ? '#D4AF37' : '#A99ECC'

  return (
    <div style={{ minHeight: '100vh', background: '#09090F', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
      <nav style={{ position: 'sticky', top: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', background: 'rgba(8,8,16,0.9)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.10)' }}>
        <Link href="/" style={{ fontFamily: 'DM Serif Display, serif', fontSize: '20px', fontWeight: 700, color: '#D4AF37', textDecoration: 'none' }}>BESTIE</Link>
        <ProfileNav />
      </nav>

      <div style={{ maxWidth: '760px', margin: '0 auto', padding: '40px 24px' }}>

        {/* Header */}
        <div style={{ marginBottom: '36px' }}>
          <Link href="/cities" style={{ fontSize: '13px', color: '#A99ECC', textDecoration: 'none', marginBottom: '12px', display: 'inline-block' }}>← All cities</Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '36px' }}>📍</span>
            <div>
              <h1 style={{ fontFamily: 'DM Serif Display, serif', fontSize: '36px', color: '#F0EAFF', lineHeight: 1 }}>{city}</h1>
              <p style={{ fontSize: '14px', color: '#A99ECC', marginTop: '4px' }}>{topBesties?.length || 0} Besties · {crews?.length || 0} Crews · {upcomingEvents?.length || 0} upcoming events</p>
            </div>
          </div>
        </div>

        {/* Top Activities */}
        {topActivities.length > 0 && (
          <div style={{ marginBottom: '36px' }}>
            <h2 style={{ fontFamily: 'DM Serif Display, serif', fontSize: '20px', color: '#F0EAFF', marginBottom: '14px' }}>Popular in {city}</h2>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
              {topActivities.map(([type, count]) => (
                <Link key={type} href={`/browse?activity=${type}&city=${encodeURIComponent(city)}`} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', borderRadius: '999px', background: 'rgba(212,175,55,0.08)', border: '1px solid rgba(212,175,55,0.2)', textDecoration: 'none' }}>
                  <span style={{ fontSize: '16px' }}>{ACTIVITY_EMOJI[type] || '✨'}</span>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: '#D4AF37' }}>{type.replace(/_/g, ' ')}</span>
                  <span style={{ fontSize: '12px', color: '#A99ECC' }}>{count}</span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Upcoming Events */}
        {upcomingEvents && upcomingEvents.length > 0 && (
          <div style={{ marginBottom: '36px' }}>
            <h2 style={{ fontFamily: 'DM Serif Display, serif', fontSize: '20px', color: '#F0EAFF', marginBottom: '14px' }}>Upcoming events</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {upcomingEvents.map(ev => {
                const d = new Date(ev.datetime)
                return (
                  <Link key={ev.id} href={`/events/${ev.id}`} style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '16px', background: '#111120', border: '1px solid rgba(255,255,255,0.10)', borderRadius: '16px', textDecoration: 'none' }}>
                    <div style={{ minWidth: '48px', textAlign: 'center', padding: '8px', borderRadius: '12px', background: 'rgba(212,175,55,0.08)', border: '1px solid rgba(212,175,55,0.15)' }}>
                      <div style={{ fontSize: '11px', fontWeight: 600, color: '#D4AF37', letterSpacing: '1px' }}>{d.toLocaleString('en-US', { month: 'short' }).toUpperCase()}</div>
                      <div style={{ fontSize: '22px', fontWeight: 700, color: '#F0EAFF', fontFamily: 'DM Serif Display, serif', lineHeight: 1 }}>{d.getDate()}</div>
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: '15px', fontWeight: 600, color: '#F0EAFF', marginBottom: '3px' }}>{ev.title}</p>
                      <p style={{ fontSize: '12px', color: '#A99ECC' }}>{ev.crew?.name}{ev.location ? ` · ${ev.location}` : ''} · {d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        )}

        {/* Top Besties */}
        {topBesties && topBesties.length > 0 && (
          <div style={{ marginBottom: '36px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <h2 style={{ fontFamily: 'DM Serif Display, serif', fontSize: '20px', color: '#F0EAFF' }}>Top Besties in {city}</h2>
              <Link href={`/browse?city=${encodeURIComponent(city)}`} style={{ fontSize: '13px', color: '#D4AF37', textDecoration: 'none' }}>See all →</Link>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {topBesties.map((u, i) => {
                const sc = scoreColor(u.bestie_score || 0)
                const initials = u.full_name?.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2) || '?'
                return (
                  <Link key={u.id} href={`/${u.username}`} style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '14px 16px', background: '#111120', border: '1px solid rgba(255,255,255,0.10)', borderRadius: '16px', textDecoration: 'none' }}>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: i === 0 ? '#D4AF37' : '#A99ECC', minWidth: '20px' }}>#{i + 1}</span>
                    <div style={{ width: '44px', height: '44px', borderRadius: '12px', overflow: 'hidden', flexShrink: 0, background: '#1A1A2E', border: '1px solid rgba(212,175,55,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {u.avatar_url
                        ? <img src={u.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        : <span style={{ fontSize: '16px', fontWeight: 700, color: '#D4AF37' }}>{initials}</span>}
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: '14px', fontWeight: 600, color: '#F0EAFF' }}>{u.full_name}</p>
                      <p style={{ fontSize: '12px', color: '#A99ECC' }}>@{u.username}{u.energy_type ? ` · ${u.energy_type}` : ''}</p>
                    </div>
                    <span style={{ fontSize: '16px', fontWeight: 700, color: sc }}>{u.bestie_score || 0}</span>
                  </Link>
                )
              })}
            </div>
          </div>
        )}

        {/* Crews */}
        {crews && crews.length > 0 && (
          <div style={{ marginBottom: '36px' }}>
            <h2 style={{ fontFamily: 'DM Serif Display, serif', fontSize: '20px', color: '#F0EAFF', marginBottom: '14px' }}>Crews in {city}</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '12px' }}>
              {crews.map(crew => (
                <Link key={crew.id} href={`/crews/${crew.slug}`} style={{ padding: '18px', background: '#111120', border: '1px solid rgba(255,255,255,0.10)', borderRadius: '16px', textDecoration: 'none' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '10px', overflow: 'hidden', background: '#1A1A2E', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(212,175,55,0.15)' }}>
                      {crew.avatar_url
                        ? <img src={crew.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        : <span style={{ fontSize: '16px' }}>👥</span>}
                    </div>
                    <p style={{ fontSize: '14px', fontWeight: 600, color: '#F0EAFF' }}>{crew.name}</p>
                  </div>
                  {crew.description && <p style={{ fontSize: '12px', color: '#A99ECC', lineHeight: 1.5 }}>{crew.description.slice(0, 70)}{crew.description.length > 70 ? '…' : ''}</p>}
                </Link>
              ))}
            </div>
          </div>
        )}

        {!topBesties?.length && !crews?.length && (
          <div style={{ textAlign: 'center', padding: '60px', background: '#111120', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.10)' }}>
            <p style={{ fontSize: '32px', marginBottom: '12px' }}>🌱</p>
            <p style={{ fontSize: '16px', color: '#F0EAFF', marginBottom: '8px' }}>No Besties in {city} yet</p>
            <p style={{ fontSize: '14px', color: '#A99ECC', marginBottom: '20px' }}>Be the first to represent your city.</p>
            <Link href="/signup" style={{ padding: '12px 24px', borderRadius: '12px', fontSize: '14px', fontWeight: 600, background: 'linear-gradient(135deg, #D4AF37 0%, #B8960C 100%)', color: '#09090F', textDecoration: 'none' }}>Join Bestie →</Link>
          </div>
        )}

      </div>
    </div>
  )
}
