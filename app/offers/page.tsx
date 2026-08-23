// @ts-nocheck
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import ProfileNav from '@/components/ProfileNav'
import BottomNav from '@/components/BottomNav'
import { PageLoader } from '@/components/Loading'
import { EmptyState } from '@/components/EmptyState'
import { ActivityIcon } from '@/lib/activityIcons'
import { Search, Compass } from 'lucide-react'

// Prettify an activity_type slug into a human label ("deep_chat" → "Deep Chat").
const prettify = (s: string) =>
  (s || '').split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')

export default function OffersPage() {
  const [offers, setOffers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [myId, setMyId] = useState<string | null>(null)
  const [q, setQ] = useState('')
  const [type, setType] = useState('all')

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setMyId(session?.user?.id || null)

      const { data } = await supabase
        .from('activity_packages')
        .select('id, title, activity_type, description, price_per_session, is_free, user:users!user_id(id, full_name, username, avatar_url, bestie_score, city, hide_from_graph)')
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

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
      <nav style={{ position: 'sticky', top: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', background: 'var(--nav-bg)', backdropFilter: 'blur(20px)', borderBottom: '1px solid var(--border)' }}>
        <Link href="/" style={{ fontFamily: 'DM Serif Display, serif', fontSize: '20px', fontWeight: 700, color: '#D4AF37', textDecoration: 'none' }}>BESTIE</Link>
        <ProfileNav />
      </nav>

      <div style={{ maxWidth: '760px', margin: '0 auto', padding: '28px 16px 100px' }}>
        <div style={{ marginBottom: '20px' }}>
          <h1 style={{ fontFamily: 'DM Serif Display, serif', fontSize: 'clamp(26px, 7vw, 34px)', color: 'var(--text-primary)', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Compass size={26} color="#D4AF37" /> Offers
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
            style={{ width: '100%', padding: '12px 14px 12px 40px', borderRadius: '14px', fontSize: '14px', background: 'var(--surface-1)', border: '1px solid var(--border)', color: 'var(--text-primary)', outline: 'none', boxSizing: 'border-box' }}
          />
        </div>

        {/* Type filter */}
        {!loading && types.length > 0 && (
          <div className="filters-scroll" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '20px' }}>
            {['all', ...types].map(t => {
              const on = type === t
              return (
                <button key={t} onClick={() => setType(t)}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 13px', borderRadius: '999px', fontSize: '12px', fontWeight: 600, whiteSpace: 'nowrap', cursor: 'pointer', background: on ? 'rgba(212,175,55,0.14)' : 'var(--overlay)', border: on ? '1px solid var(--border-gold)' : '1px solid var(--border)', color: on ? '#D4AF37' : 'var(--text-muted)', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                  {t !== 'all' && <ActivityIcon type={t} size={13} color={on ? '#D4AF37' : 'var(--text-muted)'} strokeWidth={1.8} />}
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
              return (
                <div key={o.id} style={{ display: 'flex', gap: '14px', padding: '16px', borderRadius: '16px', background: 'var(--surface-1)', border: '1px solid var(--border)' }}>
                  <span style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(212,175,55,0.10)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <ActivityIcon type={o.activity_type} size={18} color="#D4AF37" strokeWidth={1.8} />
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <p style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o.title}</p>
                      <span style={{ fontSize: '11px', fontWeight: 700, color: o.is_free || !o.price_per_session ? '#34D399' : '#D4AF37', flexShrink: 0 }}>{price}</span>
                    </div>
                    <span style={{ display: 'inline-block', fontSize: '10px', fontWeight: 600, color: 'var(--text-muted)', background: 'var(--overlay)', border: '1px solid var(--border)', padding: '2px 8px', borderRadius: '999px', marginBottom: '8px' }}>{prettify(o.activity_type)}</span>
                    {o.description && <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '0 0 10px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{o.description}</p>}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                      <Link href={`/${o.user.username}`} style={{ display: 'flex', alignItems: 'center', gap: '7px', textDecoration: 'none', minWidth: 0 }}>
                        {o.user.avatar_url
                          ? <img src={o.user.avatar_url} alt="" style={{ width: '22px', height: '22px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                          : <span style={{ width: '22px', height: '22px', borderRadius: '50%', background: 'var(--surface-3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 700, color: '#D4AF37', flexShrink: 0 }}>{(o.user.full_name || '?')[0]}</span>}
                        <span style={{ fontSize: '12px', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {o.user.full_name?.split(' ')[0] || 'Bestie'}{o.user.city ? ` · ${o.user.city}` : ''}
                        </span>
                      </Link>
                      {!mine && (
                        <Link href={`/book/${o.user.username}`} style={{ flexShrink: 0, padding: '8px 16px', borderRadius: '11px', fontSize: '13px', fontWeight: 700, background: 'linear-gradient(135deg, #D4AF37 0%, #B8960C 100%)', color: '#09090F', textDecoration: 'none' }}>Book</Link>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
      <BottomNav />
    </div>
  )
}
