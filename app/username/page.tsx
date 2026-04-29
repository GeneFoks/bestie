import Link from 'next/link'

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
      <nav style={{ position: 'sticky', top: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', background: 'rgba(8,8,16,0.9)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <Link href="/" style={{ fontFamily: 'DM Serif Display, serif', fontSize: '20px', fontWeight: 700, color: '#D4AF37', textDecoration: 'none' }}>BESTIE</Link>
        <div style={{ display: 'flex', gap: '12px' }}>
          <Link href="/browse" style={{ fontSize: '14px', color: '#9B93C0', textDecoration: 'none' }}>Browse</Link>
          <Link href="/signup" style={{ fontSize: '14px', fontWeight: 600, padding: '8px 20px', borderRadius: '12px', background: 'linear-gradient(135deg, #D4AF37 0%, #B8960C 100%)', color: '#080810', textDecoration: 'none' }}>Join Free</Link>
        </div>
      </nav>

      <div style={{ maxWidth
