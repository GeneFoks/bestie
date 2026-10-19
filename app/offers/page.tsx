// @ts-nocheck
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import ProfileNav from '@/components/ProfileNav'
import { PageLoader } from '@/components/Loading'
import { EmptyState } from '@/components/EmptyState'
import { ActivityIcon } from '@/lib/activityIcons'
import { relation } from '@/lib/socionics'
import { showToast } from '@/components/Toast'
import { Search, Compass, Flame, Sparkles, UserPlus, Share2 } from 'lucide-react'

// Filter chip states. Selected = neutral-elevated, never gold — gold is
// reserved for the per-offer "Book" CTA.
const CHIP_ON  = { background: 'var(--surface-3)', border: '1px solid var(--border-strong)', color: 'var(--text-primary)' }
const CHIP_OFF = { background: 'var(--overlay)', border: '1px solid var(--border)', color: 'var(--text-muted)' }

// Prettify an activity_type slug into a human label ("deep_chat" → "Deep Chat").
const prettify = (s: string) =>
  (s || '').split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')

export default function OffersPage() {
  const [offers, setOffers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [myId, setMyId] = useState<string | null>(null)
  const [myType, setMyType] = useState<string | null>(null)
  const [myUsername, setMyUsername] = useState<string | null>(null)
  const [q, setQ] = useState('')
  const [type, setType] = useState('all')

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setMyId(session?.user?.id || null)
      if (session?.user?.id) {
        // My eterotype → per-host compatibility percent on each offer card;
        // my username → personal invite link for the end-of-list banner.
        supabase.from('users').select('eterotype, username').eq('id', session.user.id).single()
          .then(({ data: me }) => {
            setMyType(me?.eterotype || null)
            setMyUsername(me?.username || null)
          })
      }

      const { data } = await supabase
        .from('activity_packages')
        .select('id, title, activity_type, description, price_per_session, is_free, user:users!user_id(id, full_name, username, avatar_url, bestie_score, city, eterotype, hide_from_graph)')
        .order('created_at', { ascending: false })
        .limit(300)

      // Keep only offers with a visible owner (drop orphans / hidden profiles),
      // and put higher-score hosts first so the feed leads with strong profiles.
      const clean = (data || [])
        .filter((o: any) => o.user && o.user.username)
        .sort((a: any, b: any) => (b.user.bestie_score || 0) - (a.user.bestie_score || 0))
      setOffers(clean)
      setLoading(false)
    }
    init()
  }, [])

  // Distinct activity types present, for the filter row
  const types = Array.from(new Set(offers.map(o => o.activity_type))).sort()

  const filtered = offers.filter(o => {
    if (type !== 'all' && o.activity_type !== type) return false
    if (q) {
      const hay = `${o.title} ${prettify(o.activity_type)} ${o.user.full_name || ''} ${o.user.city || ''} ${o.description || ''}`.toLowerCase()
      if (!hay.includes(q.toLowerCase())) return false
    }
    return true
  })

  // Native share sheet when available (mobile); otherwise copy the invite link.
  const handleInvite = async () => {
    if (!myUsername) return
    const url = `https://bestiehere.com/invite/${myUsername}`
    const text = `Join me on Bestie — real people, real plans. Sign up with my link and we both get +10 Sparks ✨`
    if (typeof navigator !== 'undefined' && navigator.share) {
      try { await navigator.share({ title: 'Join me on Bestie', text, url }); return } catch { return }
    }
    try {
      await navigator.clipboard.writeText(`${text}\n${url}`)
      showToast('Invite link copied')
    } catch {
      showToast("Couldn't copy the link", { type: 'error' })
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
      <nav style={{ position: 'sticky', top: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', background: 'var(--nav-bg)', backdropFilter: 'blur(20px)', borderBottom: '1px solid var(--border)' }}>
        <Link href="/" style={{ fontFamily: 'DM Serif Display, serif', fontSize: '20px', fontWeight: 700, color: '#D4AF37', textDecoration: 'none' }}>BESTIE</Link>
        <ProfileNav />
      </nav>

      <div style={{ maxWidth: '760px', margin: '0 auto', padding: '28px 16px 100px' }}>
        <div style={{ marginBottom: '20px' }}>
          <h1 style={{ fontFamily: 'DM Serif Display, serif', fontSize: 'clamp(26px, 7vw, 34px)', color: 'var(--text-primary)', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Compass size={26} color="#9B7FFF" /> Offers
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
            {loading ? 'Loading…' : `${offers.length} things people want to do with you`}
          </p>
        </div>

        {/* Search */}
        <div style={{ position: 'relative', marginBottom: '14px' }}>
          <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
          <input
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Search offers, people, cities…"
            aria-label="Search offers"
            style={{ width: '100%', minHeight: '44px', padding: '12px 14px 12px 40px', borderRadius: '12px', fontSize: '14px', background: 'var(--surface-1)', border: '1px solid var(--border)', color: 'var(--text-primary)', outline: 'none', boxSizing: 'border-box' }}
          />
        </div>

        {/* Type filter */}
        {!loading && types.length > 0 && (
          <div className="filters-scroll" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '20px' }}>
            {['all', ...types].map(t => {
              const on = type === t
              return (
                <button key={t} onClick={() => setType(t)} aria-pressed={on}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', minHeight: '44px', padding: '10px 14px', borderRadius: '999px', fontSize: '13px', fontWeight: 600, whiteSpace: 'nowrap', flexShrink: 0, cursor: 'pointer', boxSizing: 'border-box', ...(on ? CHIP_ON : CHIP_OFF), fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                  {t !== 'all' && <ActivityIcon type={t} size={14} color={on ? 'var(--text-primary)' : 'var(--text-muted)'} strokeWidth={1.8} />}
                  {t === 'all' ? 'All' : prettify(t)}
                </button>
              )
            })}
          </div>
        )}

        {loading ? (
          <PageLoader fullscreen={false} message="Loading offers…" />
        ) : filtered.length === 0 ? (
          <EmptyState
            Icon={Compass}
            title="No offers yet"
            description="Add what you'd love to do with others on your profile — they'll show up here."
            primaryCTA={{ label: 'Add an offer', href: '/activities' }}
            accent="gold"
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {filtered.map(o => {
              const mine = o.user.id === myId
              const price = o.is_free || !o.price_per_session ? 'Free' : `$${o.price_per_session}`
              // Compatibility percent with this host (needs both types)
              const rel = !mine && myType ? relation(myType, o.user.eterotype) : null
              const compat = rel && rel.score >= 50
                ? { pct: rel.score, color: rel.score >= 85 ? '#34D399' : rel.score >= 65 ? '#D4AF37' : 'var(--text-muted)', Icon: rel.score >= 85 ? Flame : Sparkles }
                : null
              return (
                <div key={o.id} style={{ display: 'flex', gap: '14px', padding: '16px', borderRadius: '16px', background: 'var(--surface-1)', border: '1px solid var(--border)' }}>
                  {/* Activity tile — purple tint so gold stays on the Book CTA */}
                  <span style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(155,127,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <ActivityIcon type={o.activity_type} size={18} color="#9B7FFF" strokeWidth={1.8} />
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <p style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o.title}</p>
                      <span style={{ fontSize: '12px', fontWeight: 700, color: o.is_free || !o.price_per_session ? '#34D399' : 'var(--text-primary)', flexShrink: 0 }}>{price}</span>
                    </div>
                    <span style={{ display: 'inline-block', fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', background: 'var(--overlay)', border: '1px solid var(--border)', padding: '2px 8px', borderRadius: '999px', marginBottom: '8px' }}>{prettify(o.activity_type)}</span>
                    {o.description && <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '0 0 10px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{o.description}</p>}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                      <Link href={`/${o.user.username}`} style={{ display: 'flex', alignItems: 'center', gap: '7px', minHeight: '44px', textDecoration: 'none', minWidth: 0 }}>
                        {o.user.avatar_url
                          ? <img src={o.user.avatar_url} alt="" style={{ width: '22px', height: '22px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                          : <span style={{ width: '22px', height: '22px', borderRadius: '50%', background: 'var(--surface-3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', flexShrink: 0 }}>{(o.user.full_name || '?')[0]}</span>}
                        <span style={{ fontSize: '12px', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {o.user.full_name?.split(' ')[0] || 'Bestie'}{o.user.city ? ` · ${o.user.city}` : ''}
                        </span>
                        {compat && (
                          <span title={rel.label} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', flexShrink: 0, fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '999px', background: `${compat.color === 'var(--text-muted)' ? 'var(--overlay)' : compat.color + '1A'}`, border: `1px solid ${compat.color === 'var(--text-muted)' ? 'var(--border)' : compat.color + '45'}`, color: compat.color }}>
                            <compat.Icon size={11} strokeWidth={2} /> {compat.pct}%
                          </span>
                        )}
                      </Link>
                      {!mine && (
                        <Link href={`/book/${o.user.username}`} style={{ flexShrink: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minHeight: '44px', padding: '10px 18px', borderRadius: '12px', fontSize: '13px', fontWeight: 700, background: 'linear-gradient(135deg, #D4AF37 0%, #B8960C 100%)', color: '#09090F', textDecoration: 'none', boxSizing: 'border-box' }}>Book</Link>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}

            {/* Invite banner — after the last card (needs my username for the link) */}
            {myUsername && (
              <button onClick={handleInvite} style={{ display: 'flex', alignItems: 'center', gap: '14px', width: '100%', minHeight: '44px', padding: '16px', borderRadius: '16px', background: 'rgba(155,127,255,0.08)', border: '1px solid rgba(155,127,255,0.28)', cursor: 'pointer', textAlign: 'left', fontFamily: 'Plus Jakarta Sans, sans-serif', boxSizing: 'border-box' }}>
                <span style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(155,127,255,0.14)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <UserPlus size={18} color="#9B7FFF" strokeWidth={1.8} />
                </span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: 'block', fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '2px' }}>Know someone who'd love this?</span>
                  <span style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)' }}>Invite them — you both get +10 ✨</span>
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', flexShrink: 0, fontSize: '13px', fontWeight: 700, color: '#9B7FFF' }}>
                  <Share2 size={14} strokeWidth={2} /> Invite
                </span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
