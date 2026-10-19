// @ts-nocheck
export const revalidate = 0
import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import ProfileNav from '@/components/ProfileNav'
import { Users, Plus, Lock, MapPin, Zap, CalendarDays } from 'lucide-react'
import { EmptyState } from '@/components/EmptyState'
import { compatPercent, compatTone } from '@/lib/crewCompat'

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

  // Which crews have an active AI Swarm? (paid plan, not expired) — these
  // get a magical glow so they stand out from the rest.
  const swarmCrewIds = new Set<string>()
  if (crews?.length) {
    const { data: plans } = await supabase
      .from('crews')
      .select('id, plan, plan_expires_at')
      .in('id', crews.map((c: any) => c.crew_id))
    ;(plans || []).forEach((p: any) => {
      const active = p.plan && p.plan !== 'free' &&
        (!p.plan_expires_at || new Date(p.plan_expires_at) > new Date())
      if (active) swarmCrewIds.add(p.id)
    })
  }

  // Viewer Bestie Type + aggregate type per crew → compat %
  const cookieStore = cookies()
  const auth = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (n: string) => cookieStore.get(n)?.value } }
  )
  const { data: { user } } = await auth.auth.getUser()
  let viewerType: any = null
  let aggByCrew: Record<string, any> = {}
  if (user && crews?.length) {
    const [{ data: me }, { data: aggs }] = await Promise.all([
      supabase.from('users').select('energy_type, mind_type, vibe_type, bestie_type_completed').eq('id', user.id).single(),
      supabase.from('crew_aggregate_type').select('crew_id, energy_type, mind_type, vibe_type').in('crew_id', crews.map((c: any) => c.crew_id)),
    ])
    if (me?.bestie_type_completed) viewerType = me
    ;(aggs || []).forEach((a: any) => { aggByCrew[a.crew_id] = a })
  }
  const compatFor = (crewId: string): { pct: number; tone: { color: string; label: string } } | null => {
    if (!viewerType) return null
    const agg = aggByCrew[crewId]
    if (!agg?.energy_type) return null
    const pct = compatPercent(viewerType, agg)
    const tone = compatTone(pct)
    return pct !== null && tone ? { pct, tone } : null
  }

  const featuredHasSwarm = !!(featured && swarmCrewIds.has(featured.crew_id))

  // A small "AI SWARM" glowing badge reused across cards.
  const SwarmBadge = ({ float = false }: { float?: boolean }) => (
    <span style={{
      ...(float ? { position: 'absolute', top: '14px', left: '14px', backdropFilter: 'blur(8px)' } : {}),
      display: 'inline-flex', alignItems: 'center', gap: '4px',
      padding: float ? '5px 12px' : '3px 8px', borderRadius: '999px',
      fontSize: '11px', fontWeight: 800, letterSpacing: float ? '1px' : '0.5px',
      color: '#C4B5FD', background: 'rgba(124,92,255,0.18)',
      border: '1px solid rgba(155,127,255,0.55)',
      boxShadow: '0 0 12px rgba(124,92,255,0.45)',
      animation: 'swarmPulse 2.4s ease-in-out infinite',
    }}>
      <Zap size={11} strokeWidth={2.4} /> AI SWARM
    </span>
  )

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', fontFamily: 'Plus Jakarta Sans, sans-serif', paddingBottom: '88px' }}>
      <style>{`
        @keyframes swarmPulse {
          0%, 100% { box-shadow: 0 0 10px rgba(124,92,255,0.35); }
          50% { box-shadow: 0 0 20px rgba(124,92,255,0.7); }
        }
        @keyframes swarmCardGlow {
          0%, 100% { box-shadow: 0 0 0 1px rgba(155,127,255,0.45), 0 0 22px rgba(124,92,255,0.30); }
          50% { box-shadow: 0 0 0 1px rgba(155,127,255,0.75), 0 0 40px rgba(124,92,255,0.55); }
        }
      `}</style>
      <nav style={{ position: 'sticky', top: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', background: 'var(--nav-bg)', backdropFilter: 'blur(20px)', borderBottom: '1px solid var(--border)' }}>
        <Link href="/" style={{ fontFamily: 'DM Serif Display, serif', fontSize: '20px', fontWeight: 700, color: '#D4AF37', textDecoration: 'none' }}>BESTIE</Link>
        <ProfileNav />
      </nav>

      <div style={{ maxWidth: '720px', margin: '0 auto', padding: '28px 20px' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
          <div>
            <h1 style={{ fontFamily: 'DM Serif Display, serif', fontSize: '28px', color: 'var(--text-primary)', marginBottom: '4px' }}>Crews</h1>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Your inner circles · {crews?.length || 0} active</p>
          </div>
          {/* Secondary action — the featured card's "Join crew" is this screen's
              single gold CTA (the empty state carries its own CTA). */}
          <Link href="/crews/new" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', minHeight: '44px', padding: '10px 16px', borderRadius: '12px', fontSize: '14px', fontWeight: 700, background: 'var(--surface-3)', border: '1px solid var(--border-strong)', color: 'var(--text-primary)', textDecoration: 'none', whiteSpace: 'nowrap', boxSizing: 'border-box' }}>
            <Plus size={16} strokeWidth={2.5} /> New crew
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
              <Link href={`/crews/${featured.slug}`} style={{ display: 'block', borderRadius: '20px', overflow: 'hidden', textDecoration: 'none', marginBottom: '28px', background: 'var(--surface-1)', border: featuredHasSwarm ? '1px solid rgba(155,127,255,0.5)' : '1px solid var(--border)', boxShadow: '0 20px 60px rgba(0,0,0,0.4)', ...(featuredHasSwarm ? { animation: 'swarmCardGlow 2.8s ease-in-out infinite' } : {}) }}>

                {/* Cover image */}
                <div style={{ position: 'relative', height: '200px', overflow: 'hidden', background: 'linear-gradient(135deg, #1A1A2E 0%, #0d0d22 100%)' }}>
                  {featured.cover_url
                    ? <img src={featured.cover_url} alt={featured.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : featured.avatar_url
                    ? <img src={featured.avatar_url} alt={featured.name} style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'blur(2px) brightness(0.6) scale(1.05)' }} />
                    : <div style={{ width: '100%', height: '100%', background: 'radial-gradient(ellipse at 30% 60%, rgba(212,175,55,0.25) 0%, rgba(8,8,16,0) 70%)' }} />
                  }
                  {/* Gradient overlay */}
                  <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, var(--surface-1) 0%, rgba(15,15,30,0.2) 60%, transparent 100%)' }} />

                  {/* FEATURED badge — glass label, so the only solid gold on the
                      card is the "Join crew" CTA below. */}
                  <div style={{ position: 'absolute', top: '14px', left: '14px', padding: '5px 12px', borderRadius: '999px', background: 'rgba(0,0,0,0.55)', border: '1px solid rgba(212,175,55,0.45)', color: '#D4AF37', fontSize: '11px', fontWeight: 800, letterSpacing: '1px', backdropFilter: 'blur(8px)' }}>
                    FEATURED
                  </div>

                  {/* Status badges top-right — capped: AI Swarm (paid) + one
                      Open/Private status. Hot/Elite live in the meta line. */}
                  <div style={{ position: 'absolute', top: '14px', right: '14px', display: 'flex', gap: '6px' }}>
                    {featuredHasSwarm && <SwarmBadge />}
                    {featured.is_public
                      ? <span style={{ fontSize: '11px', padding: '3px 10px', borderRadius: '999px', background: 'rgba(52,211,153,0.16)', border: '1px solid rgba(52,211,153,0.4)', color: '#34D399', fontWeight: 700, backdropFilter: 'blur(8px)' }}>Open</span>
                      : <span style={{ fontSize: '11px', padding: '3px 10px', borderRadius: '999px', background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.15)', color: '#A99ECC', fontWeight: 600, backdropFilter: 'blur(8px)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}><Lock size={11} strokeWidth={2} /> Private</span>}
                  </div>
                </div>

                {/* Card body */}
                <div style={{ padding: '18px 20px 20px' }}>
                  <h2 style={{ fontFamily: 'DM Serif Display, serif', fontSize: '20px', color: 'var(--text-primary)', marginBottom: '4px' }}>{featured.name}</h2>
                  <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: featured.description ? '12px' : '0' }}>
                    {featured.member_count} members
                    {featured.avg_bestie_score ? ` · Avg score ${featured.avg_bestie_score}` : ''}
                    {featured.member_count >= 15 ? ' · Hot' : ''}
                    {featured.avg_bestie_score >= 700 ? ' · Elite' : ''}
                  </p>
                  {featured.description && (
                    <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: '14px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{featured.description}</p>
                  )}

                  {/* Next event mini block */}
                  {featured.nextEvent && (() => {
                    const d = new Date(featured.nextEvent.datetime)
                    const day = d.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase()
                    const dateNum = d.getDate()
                    const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
                    return (
                      <div style={{ background: 'rgba(52,211,153,0.06)', border: '1px solid rgba(52,211,153,0.18)', borderRadius: '12px', padding: '12px 14px', marginBottom: '16px' }}>
                        <p style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', fontWeight: 700, letterSpacing: '1.5px', color: '#34D399', marginBottom: '6px' }}><CalendarDays size={12} strokeWidth={2.2} /> NEXT EVENT</p>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{ background: 'rgba(52,211,153,0.12)', border: '1px solid rgba(52,211,153,0.25)', borderRadius: '8px', padding: '6px 10px', textAlign: 'center', flexShrink: 0 }}>
                            <p style={{ fontSize: '11px', fontWeight: 700, color: '#34D399', lineHeight: 1 }}>{day}</p>
                            <p style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'DM Serif Display, serif', lineHeight: 1.1 }}>{dateNum}</p>
                          </div>
                          <div>
                            <p style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '2px' }}>{featured.nextEvent.title}</p>
                            <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                              {day} · {time}{featured.nextEvent.location ? <> · <MapPin size={11} strokeWidth={2} style={{ display: 'inline', verticalAlign: '-1px' }} /> {featured.nextEvent.location}</> : ''}
                            </p>
                          </div>
                        </div>
                      </div>
                    )
                  })()}

                  {/* Bottom row: member avatars + join button */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                    {/* Member avatar stack */}
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      {featured.members.slice(0, 4).map((m, i) => (
                        <div key={i} style={{ width: '32px', height: '32px', borderRadius: '50%', overflow: 'hidden', border: '2px solid var(--surface-1)', marginLeft: i === 0 ? 0 : '-8px', background: 'var(--surface-3)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 4 - i }}>
                          {m.user?.avatar_url
                            ? <img src={m.user.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            : <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)' }}>{m.user?.full_name?.[0]}</span>
                          }
                        </div>
                      ))}
                      {featured.member_count > 4 && (
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginLeft: '8px' }}>+{featured.member_count - 4} more</span>
                      )}
                    </div>

                    {/* The screen's single gold CTA */}
                    <div style={{ display: 'inline-flex', alignItems: 'center', minHeight: '44px', padding: '12px 20px', borderRadius: '12px', fontSize: '14px', fontWeight: 700, background: 'linear-gradient(135deg, #D4AF37 0%, #B8960C 100%)', color: '#09090F', boxSizing: 'border-box', whiteSpace: 'nowrap', flexShrink: 0 }}>
                      Join crew →
                    </div>
                  </div>
                </div>
              </Link>
            )}

            {/* ── DISCOVER MORE ── */}
            {rest.length > 0 && (
              <>
                <p style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '2px', color: 'var(--text-muted)', marginBottom: '14px' }}>DISCOVER MORE</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {rest.map((crew, idx) => {
                    const compat = compatFor(crew.crew_id)
                    const hasSwarm = swarmCrewIds.has(crew.crew_id)
                    // Two visible signals per row: the primary metric on the right
                    // (% match when we have one, otherwise member count) + ONE
                    // Open/Private status. Everything else drops into a single
                    // muted meta line.
                    const showMatch = !!(compat && compat.pct >= 35)
                    const meta = [
                      showMatch ? `${crew.member_count} members` : null,
                      crew.avg_bestie_score ? `Avg score ${crew.avg_bestie_score}` : null,
                      crew.member_count >= 15 ? 'Hot' : null,
                      crew.avg_bestie_score >= 700 ? 'Elite' : null,
                      hasSwarm ? 'AI Swarm' : null,
                    ].filter(Boolean).join(' · ')
                    return (
                      <Link key={crew.crew_id} href={`/crews/${crew.slug}`} style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '14px 16px', background: hasSwarm ? 'linear-gradient(135deg, rgba(124,92,255,0.10), var(--surface-1) 60%)' : 'var(--surface-1)', border: hasSwarm ? '1px solid rgba(155,127,255,0.45)' : compat && compat.pct >= 60 ? `1px solid ${compat.tone.color}40` : '1px solid var(--border)', borderRadius: '16px', textDecoration: 'none', ...(hasSwarm ? { animation: 'swarmCardGlow 2.8s ease-in-out infinite' } : {}) }}>
                        {/* Thumbnail */}
                        <div style={{ width: '64px', height: '64px', borderRadius: '12px', overflow: 'hidden', flexShrink: 0, background: 'var(--surface-3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {crew.avatar_url
                            ? <img src={crew.avatar_url} alt={crew.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            : <Users size={26} color="var(--text-muted)" strokeWidth={1.6} />
                          }
                        </div>

                        {/* Info */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px', minWidth: 0 }}>
                            <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>{crew.name}</span>
                            {crew.is_public
                              ? <span style={{ flexShrink: 0, fontSize: '11px', padding: '2px 8px', borderRadius: '999px', background: 'rgba(52,211,153,0.12)', color: '#34D399', fontWeight: 700, border: '1px solid rgba(52,211,153,0.3)' }}>Open</span>
                              : <span style={{ flexShrink: 0, fontSize: '11px', padding: '2px 8px', borderRadius: '999px', background: 'rgba(155,147,192,0.12)', color: 'var(--text-muted)', fontWeight: 700, border: '1px solid rgba(155,147,192,0.3)', display: 'inline-flex', alignItems: 'center', gap: '3px' }}><Lock size={11} strokeWidth={2} /> Private</span>}
                          </div>
                          {meta && (
                            <p style={{ fontSize: '12px', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{meta}</p>
                          )}
                        </div>

                        {/* Primary metric */}
                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                          {showMatch ? (
                            <>
                              <div style={{ fontSize: '18px', fontWeight: 700, color: compat.tone.color, fontFamily: 'DM Serif Display, serif' }}>{compat.pct}%</div>
                              <div style={{ fontSize: '11px', color: 'var(--text-muted)', letterSpacing: '0.5px' }}>match</div>
                            </>
                          ) : (
                            <>
                              <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'DM Serif Display, serif' }}>{crew.member_count ?? 0}</div>
                              <div style={{ fontSize: '11px', color: 'var(--text-muted)', letterSpacing: '0.5px' }}>{crew.member_count === 1 ? 'member' : 'members'}</div>
                            </>
                          )}
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
