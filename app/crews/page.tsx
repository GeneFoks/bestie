// @ts-nocheck
export const revalidate = 0
import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
import ProfileNav from '@/components/ProfileNav'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export const metadata = {
  title: 'Crew Rankings · Bestie',
  description: 'Top crews ranked by average Bestie Score of their members.',
}

export default async function CrewsPage() {
  const { data: crews } = await supabase
    .from('crew_rankings')
    .select('*')
    .order('avg_bestie_score', { ascending: false })
    .limit(50)

  return (
    <div style={{ minHeight: '100vh', background: '#080810', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
      <nav style={{ position: 'sticky', top: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', background: 'rgba(8,8,16,0.9)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <Link href="/" style={{ fontFamily: 'DM Serif Display, serif', fontSize: '20px', fontWeight: 700, color: '#D4AF37', textDecoration: 'none' }}>BESTIE</Link>
        <ProfileNav />
      </nav>

      <div style={{ maxWidth: '720px', margin: '0 auto', padding: '40px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: '32px' }}>
          <div>
            <h1 style={{ fontFamily: 'DM Serif Display, serif', fontSize: '36px', color: '#E8E0FF', marginBottom: '8px' }}>Crew Rankings</h1>
            <p style={{ fontSize: '14px', color: '#9B93C0' }}>Ranked by average Bestie Score · Sacred 108 members max</p>
          </div>
          <Link href="/crews/new" style={{ padding: '10px 20px', borderRadius: '12px', fontSize: '14px', fontWeight: 600, background: 'linear-gradient(135deg, #D4AF37 0%, #B8960C 100%)', color: '#080810', textDecoration: 'none', whiteSpace: 'nowrap' }}>
            + Create Crew
          </Link>
        </div>

        {/* Legend */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '20px' }}>
          {[
            { label: '🔥 Hot', desc: '15+ members', color: '#FF6B35' },
            { label: '🌟 Elite', desc: 'BS avg 700+', color: '#D4AF37' },
            { label: '🔒 Invite only', desc: 'Private crew', color: '#9B93C0' },
            { label: '🌱 Growing', desc: 'Under 8 members', color: '#39FF14' },
          ].map(b => (
            <span key={b.label} style={{ fontSize: '11px', padding: '4px 10px', borderRadius: '999px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: b.color, fontWeight: 500 }}>{b.label}</span>
          ))}
        </div>

        {!crews || crews.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 24px', background: '#0F0F1E', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.06)' }}>
            <p style={{ fontSize: '48px', marginBottom: '16px' }}>👥</p>
            <p style={{ fontSize: '18px', color: '#E8E0FF', fontWeight: 600, marginBottom: '8px' }}>No crews yet</p>
            <p style={{ fontSize: '14px', color: '#9B93C0', marginBottom: '24px' }}>Be the first to create one</p>
            <Link href="/crews/new" style={{ padding: '10px 24px', borderRadius: '12px', fontSize: '14px', fontWeight: 600, background: 'linear-gradient(135deg, #D4AF37 0%, #B8960C 100%)', color: '#080810', textDecoration: 'none' }}>
              Create Crew
            </Link>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {crews.map((crew, idx) => {
              const scoreColor = crew.avg_bestie_score >= 800 ? '#39FF14' : crew.avg_bestie_score >= 600 ? '#D4AF37' : '#9B93C0'
              const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : null
              return (
                <Link key={crew.crew_id} href={`/crews/${crew.slug}`} style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '20px', background: '#0F0F1E', border: idx < 3 ? `1px solid ${scoreColor}30` : '1px solid rgba(255,255,255,0.06)', borderRadius: '16px', textDecoration: 'none' }}>
                  <div style={{ width: '32px', textAlign: 'center', flexShrink: 0 }}>
                    {medal
                      ? <span style={{ fontSize: '24px' }}>{medal}</span>
                      : <span style={{ fontSize: '14px', fontWeight: 700, color: '#9B93C0' }}>#{idx + 1}</span>
                    }
                  </div>

                  <div style={{ width: '48px', height: '48px', borderRadius: '14px', overflow: 'hidden', flexShrink: 0, background: '#1a1a35', border: '1px solid rgba(212,175,55,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {crew.avatar_url
                      ? <img src={crew.avatar_url} alt={crew.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : <span style={{ fontSize: '22px' }}>👥</span>
                    }
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '5px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '16px', fontWeight: 700, color: '#E8E0FF' }}>{crew.name}</span>
                      {/* Status badges */}
                      {!crew.is_public && <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '999px', background: 'rgba(155,147,192,0.12)', border: '1px solid rgba(155,147,192,0.25)', color: '#9B93C0', fontWeight: 600 }}>🔒 Invite only</span>}
                      {crew.avg_bestie_score >= 700 && <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '999px', background: 'rgba(212,175,55,0.1)', border: '1px solid rgba(212,175,55,0.3)', color: '#D4AF37', fontWeight: 600 }}>🌟 Elite</span>}
                      {crew.member_count >= 15 && <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '999px', background: 'rgba(255,107,53,0.1)', border: '1px solid rgba(255,107,53,0.3)', color: '#FF6B35', fontWeight: 600 }}>🔥 Hot</span>}
                      {crew.member_count < 8 && crew.member_count > 0 && <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '999px', background: 'rgba(57,255,20,0.07)', border: '1px solid rgba(57,255,20,0.2)', color: '#39FF14', fontWeight: 600 }}>🌱 Growing</span>}
                    </div>
                    <span style={{ fontSize: '12px', color: '#9B93C0' }}>{crew.member_count} member{crew.member_count !== 1 ? 's' : ''}</span>
                  </div>

                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: '22px', fontWeight: 700, color: scoreColor, fontFamily: 'DM Serif Display, serif' }}>{crew.avg_bestie_score ?? '—'}</div>
                    <div style={{ fontSize: '10px', color: '#9B93C0', letterSpacing: '1px' }}>AVG BS</div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
