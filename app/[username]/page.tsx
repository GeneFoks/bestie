// @ts-nocheck
import Link from 'next/link'

// Mock - replace with Supabase fetch by username
const getMockProfile = (username: string) => ({
  username,
  full_name: 'Isolde Park',
  avatar_url: 'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=600&q=80',
  city: 'Seoul',
  country: 'KR',
  bio: 'Watch parties, late-night chats, festival companion. I love film, indie music, and good stories.',
  bestie_score: 921,
  is_verified: true,
  avg_rating: 5.0,
  total_sessions: 61,
  lights: ['Kind', 'Fun', 'Social', 'Good listener', 'Genuine'],
  activity_packages: [
    { title: 'Cozy Watch Party Night', activity_type: 'watch_together', price_per_session: 20, description: 'Pick a film, grab snacks, share reactions. Online or IRL in Seoul.' },
  ],
})

export default function ProfilePage({ params }: { params: { username: string } }) {
  const profile = getMockProfile(params.username)
  const score = profile.bestie_score
  const scoreColor = score >= 800 ? '#39FF14' : score >= 600 ? '#D4AF37' : '#9B93C0'

  return (
    <div style={{ minHeight: '100vh', background: '#080810', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
      {/* Nav */}
      <nav style={{
        position: 'sticky', top: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '16px 24px', background: 'rgba(8,8,16,0.9)', backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}>
        <Link href="/" style={{ fontFamily: 'DM Serif Display, serif', fontSize: '20px', fontWeight: 700, color: '#D4AF37', textDecoration: 'none' }}>
          BESTIE
        </Link>
        <div style={{ display: 'flex', gap: '12px' }}>
          <Link href="/browse" style={{ fontSize: '14px', color: '#9B93C0', textDecoration: 'none' }}>Browse</Link>
          <Link href="/signup" style={{ fontSize: '14px', fontWeight: 600, padding: '8px 20px', borderRadius: '12px', background: 'linear-gradient(135deg, #D4AF37 0%, #B8960C 100%)', color: '#080810', textDecoration: 'none' }}>
            Join Free
          </Link>
        </div>
      </nav>

      <div style={{ maxWidth: '720px', margin: '0 auto', padding: '40px 24px' }}>
        {/* Profile Header */}
        <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-start', marginBottom: '32px', flexWrap: 'wrap' }}>
          {/* Avatar */}
          <div style={{ width: '120px', height: '120px', borderRadius: '20px', overflow: 'hidden', flexShrink: 0, border: '2px solid rgba(212,175,55,0.3)' }}>
            <img src={profile.avatar_url} alt={profile.full_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>

          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px', flexWrap: 'wrap' }}>
              <h1 style={{ fontFamily: 'DM Serif Display, serif', fontSize: '28px', fontWeight: 700, color: '#E8E0FF' }}>
                {profile.full_name}
              </h1>
              {profile.is_verified && (
                <span style={{ fontSize: '12px', padding: '3px 10px', borderRadius: '999px', background: 'rgba(212,175,55,0.15)', border: '1px solid rgba(212,175,55,0.3)', color: '#D4AF37', fontWeight: 600 }}>
                  ✓ Verified
                </span>
              )}
            </div>

            <p style={{ fontSize: '14px', color: '#9B93C0', marginBottom: '12px' }}>
              📍 {profile.city}{profile.country ? `, ${profile.country}` : ''} · @{profile.username}
            </p>

            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', align: 'center', gap: '6px', padding: '6px 12px', borderRadius: '10px', background: `rgba(${scoreColor === '#39FF14' ? '57,255,20' : '212,175,55'},0.1)`, border: `1px solid ${scoreColor}30` }}>
                <span style={{ fontSize: '12px', color: '#9B93C0' }}>BS</span>
                <span style={{ fontSize: '16px', fontWeight: 700, color: scoreColor }}>{score}</span>
              </div>
              <div style={{ fontSize: '14px', color: '#9B93C0', display: 'flex', alignItems: 'center', gap: '4px' }}>
                ⭐ {profile.avg_rating} · {profile.total_sessions} sessions
              </div>
            </div>
          </div>
        </div>

        {/* Bio */}
        <div style={{ background: '#0F0F1E', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '16px', padding: '20px', marginBottom: '20px' }}>
          <p style={{ fontSize: '15px', color: '#E8E0FF', lineHeight: 1.7 }}>{profile.bio}</p>
        </div>

        {/* Lights */}
        {profile.lights && profile.lights.length > 0 && (
          <div style={{ background: '#0F0F1E', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '16px', padding: '20px', marginBottom: '20px' }}>
            <h3 style={{ fontSize: '13px', fontWeight: 600, letterSpacing: '1px', color: '#9B93C0', marginBottom: '12px' }}>LIGHTS FROM BESTIES</h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {profile.lights.map((light) => (
                <span key={light} style={{ padding: '6px 14px', borderRadius: '999px', fontSize: '13px', fontWeight: 500, background: 'rgba(57,255,20,0.08)', border: '1px solid rgba(57,255,20,0.2)', color: '#39FF14' }}>
                  ✦ {light}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Packages */}
        <div style={{ marginBottom: '24px' }}>
          <h3 style={{ fontSize: '13px', fontWeight: 600, letterSpacing: '1px', color: '#9B93C0', marginBottom: '12px' }}>ACTIVITIES</h3>
          {profile.activity_packages.map((pkg, i) => (
            <div key={i} style={{ background: '#0F0F1E', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '16px', padding: '20px', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
                <div>
                  <h4 style={{ fontSize: '16px', fontWeight: 600, color: '#E8E0FF', marginBottom: '6px' }}>{pkg.title}</h4>
                  <p style={{ fontSize: '13px', color: '#9B93C0', lineHeight: 1.6 }}>{pkg.description}</p>
                </div>
                <div style={{ flexShrink: 0, textAlign: 'right' }}>
                  <div style={{ fontSize: '20px', fontWeight: 700, color: '#E8E0FF' }}>${pkg.price_per_session}</div>
                  <div style={{ fontSize: '12px', color: '#9B93C0' }}>/session</div>
                </div>
              </div>
              <Link
                href="/signup"
                style={{ display: 'block', marginTop: '16px', padding: '12px', borderRadius: '12px', textAlign: 'center', fontSize: '14px', fontWeight: 600, background: 'linear-gradient(135deg, #D4AF37 0%, #B8960C 100%)', color: '#080810', textDecoration: 'none' }}
              >
                Book a Session →
              </Link>
            </div>
          ))}
        </div>

        {/* Share score CTA */}
        <div style={{ background: 'linear-gradient(135deg, rgba(212,175,55,0.08) 0%, rgba(57,255,20,0.04) 100%)', border: '1px solid rgba(212,175,55,0.15)', borderRadius: '16px', padding: '24px', textAlign: 'center' }}>
          <p style={{ fontSize: '14px', color: '#9B93C0', marginBottom: '12px' }}>
            Want your own Bestie Score? It's free.
          </p>
          <Link href="/signup" style={{ display: 'inline-block', padding: '10px 24px', borderRadius: '12px', fontSize: '14px', fontWeight: 600, background: 'linear-gradient(135deg, #D4AF37 0%, #B8960C 100%)', color: '#080810', textDecoration: 'none' }}>
            Build your Social Passport →
          </Link>
        </div>
      </div>
    </div>
  )
}
