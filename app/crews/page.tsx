// @ts-nocheck
export const revalidate = 0
import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
import ProfileNav from '@/components/ProfileNav'
import { Users, Plus, Star, Flame, Lock, Sparkles, MapPin } from 'lucide-react'
import { EmptyState } from '@/components/EmptyState'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export const metadata = {
  title: 'Crews · Bestie',
  description: 'Your inner circles. Find and join crews for activities, adventures, and real connection.',
}

export default async function CrewsPage() {
  const { data: crews } = await supabase
    .from('crew_rankings')
    .select('*')
    .order('avg_bestie_score', { ascending: false })
    .limit(50)

  // For the featured crew: fetch full data + next event + member avatars
  const featuredId = crews?.[0]?.crew_id
  const [featuredExtra, featuredEvent, featuredMembers] = featuredId
    ? await Promise.all([
        supabase.from('crews').select('description, cover_url').eq('id', featuredId).single(),
        supabase.from('crew_events')
          .select('id, title, datetime, location')
          .eq('crew_id', featuredId)
          .gte('datetime', new Date().toISOString())
          .order('datetime', { ascending: true })
          .limit(1)
          .maybeSingle(),
        supabase.from('crew_members')
          .select('user:users(avatar_url, full_name)')
          .eq('crew_id', featuredId)
          .limit(5),
      ])
    : [{ data: null }, { data: null }, { data: [] }]

  const featured = crews?.[0]
    ? { ...crews[0], description: featuredExtra.data?.description, cover_url: featuredExtra.data?.cover_url, nextEvent: featuredEvent.data, members: featuredMembers.data || [] }
    : null

  const rest = crews?.slice(1) || []

  return (
    <div style={{ minHeight: '100vh', background: '#09090F', fontFamily: 'Plus Jakarta Sans, sans-serif', paddingBottom: '88px' }}>
      <nav style={{ position: 'sticky', top: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', background: 'rgba(8,8,16,0.9)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.10)' }}>
        <Link href="/" style={{ fontFamily: 'DM Serif Display, serif', fontSize: '20px', fontWeight: 700, color: '#D4AF37', textDecoration: 'none' }}>BESTIE</Link>
        <ProfileNav />
      </nav>

      <div style={{ maxWidth: '720px', margin: '0 auto', padding: '28px 20px' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
          <div>
            <h1 style={{ fontFamily: 'DM Serif Display, serif', fontSize: '28px', color: '#F0EAFF', marginBottom: '4px' }}>Crews</h1>
            <p style={{ fontSize: '13px', color: '#A99ECC' }}>Your inner circles · {crews?.length || 0} active</p>
          </div>
          <Link href="/crews/new" style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 18px', borderRadius: '14px', fontSize: '14px', fontWeight: 700, background: 'linear-gradient(135deg, #D4AF37 0%, #B8960C 100%)', color: '#09090F', textDecoration: 'none', whiteSpace: 'nowrap' }}>
            <Plus size={14} strokeWidth={2.5} /> New crew
          </Link>
        </div>

        {!crews || crews.length === 0 ? (
          <EmptyState
            Icon={Users}
            title="No crews in your area yet"
            description="Be the founder — gather your people around a shared vibe."
            primaryCTA={{ label: 'Create a crew', href: '/crews/new' }}
            accent="purple"
          />
        ) : (
          <>
            {/* ── FEATURED CARD ── */}
            {featured && (
              <Link href={`/crews/${featured.slug}`} style={{ display: 'block', borderRadius: '24px', overflow: 'hidden', textDecoration: 'none', marginBottom: '28px', background: '#111120', border: '1px solid rgba(255,255,255,0.11)', boxShadow: '0 20px 60px rgba(0,0,0,0.4)' }}>

                {/* Cover image */}
                <div style={{ position: 'relative', height: '200px', overflow: 'hidden', background: 'linear-gradient(135deg, #1A1A2E 0%, #0d0d22 100%)' }}>
                  {featured.cover_url
                    ? <img src={featured.cover_url} alt={featured.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : featured.avatar_url
                    ? <img src={featured.avatar_url} alt={featured.name} style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'blur(2px) brightness(0.6) scale(1.05)' }} />
                    : <div style={{ width: '100%', height: '100%', background: 'radial-gradient(ellipse at 30% 60%, rgba(212,175,55,0.25) 0%, rgba(8,8,16,0) 70%)' }} />
                  }
                  {/* Gradient overlay */}
                  <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(15,15,30,1) 0%, rgba(15,15,30,0.2) 60%, transparent 100%)' }} />

                  {/* FEATURED badge */}
                  <div style={{ position: 'absolute', top: '14px', left: '14px', padding: '5px 12px', borderRadius: '999px', background: '#D4AF37', color: '#09090F', fontSize: '11px', fontWeight: 800, letterSpacing: '1px' }}>
                    FEATURED
                  </div>

                  {/* Status badges top-right */}
                  <div style={{ position: 'absolute', top: '14px', right: '14px', display: 'flex', gap: '6px' }}>
                    {featured.avg_bestie_score >= 700 && <span style={{ fontSize: '10px', padding: '3px 8px', borderRadius: '999px', background: 'rgba(212,175,55,0.2)', border: '1px solid rgba(212,175,55,0.4)', color: '#D4AF37', fontWeight: 700, backdropFilter: 'blur(8px)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}><Sparkles size={10} strokeWidth={2} /> Elite</span>}
                    {featured.member_count >= 15 && <span style={{ fontSize: '10px', padding: '3px 8px', borderRadius: '999px', background: 'rgba(255,107,53,0.2)', border: '1px solid rgba(255,107,53,0.4)', color: '#FF6B35', fontWeight: 700, backdropFilter: 'blur(8px)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}><Flame size={10} strokeWidth={2} /> Hot</span>}
                    {!featured.is_public && <span style={{ fontSize: '10px', padding: '3px 8px', borderRadius: '999px', background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.15)', color: '#A99ECC', fontWeight: 600, backdropFilter: 'blur(8px)', display: 'inline-flex', alignItems: 'center' }}><Lock size={10} strokeWidth={2} /></span>}
                  </div>
                </div>

                {/* Card body */}
                <div style={{ padding: '18px 20px 20px' }}>
                  <h2 style={{ fontFamily: 'DM Serif Display, serif', fontSize: '20px', color: '#F0EAFF', marginBottom: '4px' }}>{featured.name}</h2>
                  <p style={{ fontSize: '13px', color: '#A99ECC', marginBottom: featured.description ? '12px' : '0' }}>
                    {featured.member_count} members
                    {featured.avg_bestie_score ? ` · avg BS ${featured.avg_bestie_score}` : ''}
                  </p>
                  {featured.description && (
                    <p style={{ fontSize: '13px', color: '#A99ECC', lineHeight: 1.6, marginBottom: '14px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{featured.description}</p>
                  )}

                  {/* Next event mini block */}
                  {featured.nextEvent && (() => {
                    const d = new Date(featured.nextEvent.datetime)
                    const day = d.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase()
                    const dateNum = d.getDate()
                    const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
                    return (
                      <div style={{ background: 'rgba(57,255,20,0.06)', border: '1px solid rgba(57,255,20,0.18)', borderRadius: '14px', padding: '12px 14px', marginBottom: '16px' }}>
                        <p style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '1.5px', color: '#34D399', marginBottom: '6px' }}>✦ NEXT EVENT</p>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{ background: 'rgba(57,255,20,0.12)', border: '1px solid rgba(57,255,20,0.25)', borderRadius: '10px', padding: '6px 10px', textAlign: 'center', flexShrink: 0 }}>
                            <p style={{ fontSize: '10px', fontWeight: 700, color: '#34D399', lineHeight: 1 }}>{day}</p>
                            <p style={{ fontSize: '20px', fontWeight: 700, color: '#F0EAFF', fontFamily: 'DM Serif Display, serif', lineHeight: 1.1 }}>{dateNum}</p>
                          </div>
                          <div>
                            <p style={{ fontSize: '14px', fontWeight: 700, color: '#F0EAFF', marginBottom: '2px' }}>{featured.nextEvent.title}</p>
                            <p style={{ fontSize: '12px', color: '#A99ECC' }}>
                              {day} · {time}{featured.nextEvent.location ? <> · <MapPin size={11} strokeWidth={2} style={{ display: 'inline', verticalAlign: '-1px' }} /> {featured.nextEvent.location}</> : ''}
                            </p>
                          </div>
                        </div>
                      </div>
                    )
                  })()}

                  {/* Bottom row: member avatars + join button */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    {/* Member avatar stack */}
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      {featured.members.slice(0, 4).map((m, i) => (
                        <div key={i} style={{ width: '32px', height: '32px', borderRadius: '50%', overflow: 'hidden', border: '2px solid #111120', marginLeft: i === 0 ? 0 : '-8px', background: '#1A1A2E', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 4 - i }}>
                          {m.user?.avatar_url
                            ? <img src={m.user.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            : <span style={{ fontSize: '12px', fontWeight: 700, color: '#D4AF37' }}>{m.user?.full_name?.[0]}</span>
                          }
                        </div>
                      ))}
                      {featured.member_count > 4 && (
                        <span style={{ fontSize: '11px', color: '#A99ECC', marginLeft: '8px' }}>+{featured.member_count - 4} more</span>
                      )}
                    </div>

                    <div style={{ padding: '10px 20px', borderRadius: '12px', fontSize: '14px', fontWeight: 700, background: 'linear-gradient(135deg, #D4AF37 0%, #B8960C 100%)', color: '#09090F' }}>
                      Join crew →
                    </div>
                  </div>
                </div>
              </Link>
            )}

            {/* ── DISCOVER MORE ── */}
            {rest.length > 0 && (
              <>
                <p style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '2px', color: '#A99ECC', marginBottom: '14px' }}>DISCOVER MORE</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {rest.map((crew, idx) => {
                    const scoreColor = crew.avg_bestie_score >= 800 ? '#34D399' : crew.avg_bestie_score >= 600 ? '#D4AF37' : '#A99ECC'
                    return (
                      <Link key={crew.crew_id} href={`/crews/${crew.slug}`} style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '14px 16px', background: '#111120', border: '1px solid rgba(255,255,255,0.10)', borderRadius: '16px', textDecoration: 'none' }}>
                        {/* Thumbnail */}
                        <div style={{ width: '64px', height: '64px', borderRadius: '14px', overflow: 'hidden', flexShrink: 0, background: '#1A1A2E', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {crew.avatar_url
                            ? <img src={crew.avatar_url} alt={crew.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            : <Users size={26} color="#A99ECC" strokeWidth={1.6} />
                          }
                        </div>

                        {/* Info */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px', flexWrap: 'wrap' }}>
                            <span style={{ fontSize: '15px', fontWeight: 700, color: '#F0EAFF' }}>{crew.name}</span>
                            {!crew.is_public && <Lock size={10} color="#A99ECC" strokeWidth={2} />}
                            {crew.avg_bestie_score >= 700 && <span style={{ fontSize: '9px', padding: '1px 6px', borderRadius: '999px', background: 'rgba(212,175,55,0.1)', color: '#D4AF37', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '3px' }}><Sparkles size={9} strokeWidth={2} /> Elite</span>}
                            {crew.member_count >= 15 && <span style={{ fontSize: '9px', padding: '1px 6px', borderRadius: '999px', background: 'rgba(255,107,53,0.1)', color: '#FF6B35', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '3px' }}><Flame size={9} strokeWidth={2} /> Hot</span>}
                            {crew.member_count < 8 && crew.member_count > 0 && <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: '#34D399' }} />}
                          </div>
                          <p style={{ fontSize: '12px', color: '#A99ECC' }}>{crew.member_count} members</p>
                        </div>

                        {/* Score */}
                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                          <div style={{ fontSize: '18px', fontWeight: 700, color: scoreColor, fontFamily: 'DM Serif Display, serif' }}>{crew.avg_bestie_score ?? '—'}</div>
                          <div style={{ fontSize: '9px', color: '#A99ECC', letterSpacing: '1px' }}>AVG BS</div>
                        </div>
                      </Link>
                    )
                  })}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}
