// @ts-nocheck
'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { PageLoader } from '@/components/Loading'
import {
  Cake, MapPin, Calendar, Share2, Check, ImagePlus, Gift, MessageCircle,
  Plus, X, ExternalLink, Send, Users,
} from 'lucide-react'

type Tab = 'photos' | 'wishlist' | 'chat'

export default function BirthdayPage() {
  const params = useParams()
  const router = useRouter()
  const slug = params.slug as string

  const [me, setMe] = useState<any>(null)
  const [event, setEvent] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  const [guests, setGuests] = useState<any[]>([])
  const [myRsvp, setMyRsvp] = useState<string | null>(null)
  const [photos, setPhotos] = useState<any[]>([])
  const [wishlist, setWishlist] = useState<any[]>([])
  const [messages, setMessages] = useState<any[]>([])

  const [tab, setTab] = useState<Tab>('photos')
  const [copied, setCopied] = useState(false)

  const loadEvent = useCallback(async () => {
    const { data: ev } = await supabase
      .from('birthday_events').select('*').eq('share_slug', slug).single()
    if (!ev) { setNotFound(true); setLoading(false); return }
    setEvent(ev)

    const [{ data: { user } }, g, p, w, m] = await Promise.all([
      supabase.auth.getUser(),
      supabase.from('birthday_guests').select('user_id, status, user:users(id, full_name, username, avatar_url)').eq('event_id', ev.id),
      supabase.from('birthday_photos').select('*, user:users(full_name, username, avatar_url)').eq('event_id', ev.id).order('created_at', { ascending: false }),
      supabase.from('birthday_wishlist').select('*, claimer:users!claimed_by(full_name, username)').eq('event_id', ev.id).order('created_at'),
      supabase.from('birthday_messages').select('*, user:users(full_name, username, avatar_url)').eq('event_id', ev.id).order('created_at'),
    ])
    setGuests(g.data || [])
    setPhotos(p.data || [])
    setWishlist(w.data || [])
    setMessages(m.data || [])

    if (user) {
      const { data: profile } = await supabase.from('users').select('id, full_name, username, avatar_url').eq('id', user.id).single()
      setMe(profile)
      const mine = (g.data || []).find((x: any) => x.user_id === user.id)
      setMyRsvp(mine?.status || null)
    }
    if (!tab && ev) setTab(ev.allow_photos ? 'photos' : ev.allow_wishlist ? 'wishlist' : 'chat')
    setLoading(false)
  }, [slug])

  useEffect(() => { loadEvent() }, [loadEvent])

  // Realtime: chat + photos
  useEffect(() => {
    if (!event) return
    const ch = supabase
      .channel(`birthday:${event.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'birthday_messages', filter: `event_id=eq.${event.id}` }, async (payload) => {
        const { data: u } = await supabase.from('users').select('full_name, username, avatar_url').eq('id', payload.new.user_id).single()
        setMessages(prev => prev.some(x => x.id === payload.new.id) ? prev : [...prev, { ...payload.new, user: u }])
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'birthday_photos', filter: `event_id=eq.${event.id}` }, async (payload) => {
        const { data: u } = await supabase.from('users').select('full_name, username, avatar_url').eq('id', payload.new.user_id).single()
        setPhotos(prev => prev.some(x => x.id === payload.new.id) ? prev : [{ ...payload.new, user: u }, ...prev])
      })
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [event])

  const requireLogin = () => {
    router.push(`/login?next=/birthday/${slug}`)
  }

  const handleShare = async () => {
    const url = `https://bestiehere.com/birthday/${slug}`
    if (typeof navigator !== 'undefined' && navigator.share) {
      try { await navigator.share({ title: event?.title || `${event?.celebrant}'s Birthday`, url }); return } catch { return }
    }
    navigator.clipboard.writeText(url)
    setCopied(true); setTimeout(() => setCopied(false), 2000)
  }

  const setRsvp = async (status: string) => {
    if (!me) return requireLogin()
    setMyRsvp(status)
    await supabase.from('birthday_guests').upsert({ event_id: event.id, user_id: me.id, status }, { onConflict: 'event_id,user_id' })
    // refresh guest list
    const { data: g } = await supabase.from('birthday_guests').select('user_id, status, user:users(id, full_name, username, avatar_url)').eq('event_id', event.id)
    setGuests(g || [])
  }

  if (loading) return <PageLoader message="Loading…" />
  if (notFound) return (
    <div style={{ minHeight: '100vh', background: '#09090F', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Plus Jakarta Sans, sans-serif', textAlign: 'center', padding: '24px' }}>
      <div>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎂</div>
        <h1 style={{ fontFamily: 'DM Serif Display, serif', fontSize: '24px', color: '#F0EAFF', marginBottom: '8px' }}>Birthday not found</h1>
        <p style={{ fontSize: '14px', color: '#A99ECC', marginBottom: '24px' }}>This link may be wrong or the event was removed.</p>
        <Link href="/events" style={{ padding: '12px 24px', borderRadius: '12px', background: 'linear-gradient(135deg, #D4AF37 0%, #B8960C 100%)', color: '#09090F', textDecoration: 'none', fontWeight: 700 }}>Explore events</Link>
      </div>
    </div>
  )

  const d = new Date(event.event_date)
  const dateStr = d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
  const timeStr = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
  const going = guests.filter(g => g.status === 'going')
  const isHost = me && me.id === event.host_id
  const title = event.title || `${event.celebrant}'s Birthday 🎉`

  const TABS: { id: Tab; label: string; Icon: any; on: boolean; count: number }[] = [
    { id: 'photos', label: 'Photos', Icon: ImagePlus, on: event.allow_photos, count: photos.length },
    { id: 'wishlist', label: 'Wishlist', Icon: Gift, on: event.allow_wishlist, count: wishlist.length },
    { id: 'chat', label: 'Chat', Icon: MessageCircle, on: event.allow_chat, count: messages.length },
  ]
  const activeTabs = TABS.filter(t => t.on)

  return (
    <div style={{ minHeight: '100vh', background: '#09090F', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
      {/* Cover */}
      <div style={{ position: 'relative', height: 'clamp(200px, 40vw, 320px)', background: event.cover_image ? `#111120 url(${event.cover_image}) center/cover` : 'linear-gradient(135deg, #FF6B35 0%, #9B7FFF 100%)' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, #09090F 0%, transparent 55%)' }} />
        <nav style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px' }}>
          <Link href="/" style={{ fontFamily: 'DM Serif Display, serif', fontSize: '18px', fontWeight: 700, color: '#fff', textDecoration: 'none', textShadow: '0 1px 8px rgba(0,0,0,0.5)' }}>BESTIE</Link>
          <button onClick={handleShare} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 14px', borderRadius: '10px', fontSize: '13px', fontWeight: 700, background: copied ? 'rgba(52,211,153,0.9)' : 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.25)', color: '#fff', cursor: 'pointer', backdropFilter: 'blur(8px)' }}>
            {copied ? <><Check size={14} strokeWidth={2.5} /> Copied</> : <><Share2 size={14} strokeWidth={2} /> Share</>}
          </button>
        </nav>
      </div>

      <div style={{ maxWidth: '640px', margin: '0 auto', padding: '0 16px 120px', marginTop: '-40px', position: 'relative' }}>
        {/* Title card */}
        <div style={{ background: '#111120', border: '1px solid rgba(255,255,255,0.10)', borderRadius: '22px', padding: '22px', marginBottom: '16px' }}>
          <p style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '2px', color: '#FF6B35', marginBottom: '8px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}><Cake size={14} strokeWidth={2} /> BIRTHDAY</p>
          <h1 style={{ fontFamily: 'DM Serif Display, serif', fontSize: 'clamp(24px, 6vw, 32px)', color: '#F0EAFF', marginBottom: '14px', lineHeight: 1.15 }}>{title}</h1>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: event.description ? '14px' : 0 }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '9px', fontSize: '14px', color: '#F0EAFF' }}>
              <Calendar size={16} color="#D4AF37" strokeWidth={1.9} /> {dateStr} · {timeStr}
            </span>
            {event.location && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '9px', fontSize: '14px', color: '#F0EAFF' }}>
                <MapPin size={16} color="#D4AF37" strokeWidth={1.9} />
                {event.location_url
                  ? <a href={event.location_url} target="_blank" rel="noopener noreferrer" style={{ color: '#D4AF37', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>{event.location} <ExternalLink size={12} /></a>
                  : event.location}
              </span>
            )}
          </div>
          {event.description && <p style={{ fontSize: '14px', color: '#A99ECC', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{event.description}</p>}
        </div>

        {/* RSVP */}
        <div style={{ background: '#111120', border: '1px solid rgba(255,255,255,0.10)', borderRadius: '18px', padding: '18px', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <p style={{ fontSize: '14px', fontWeight: 700, color: '#F0EAFF', margin: 0 }}>Are you coming?</p>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '12px', color: '#A99ECC' }}><Users size={13} strokeWidth={2} /> {going.length} going</span>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            {[{ id: 'going', label: "I'm in! 🎉" }, { id: 'maybe', label: 'Maybe' }, { id: 'cant', label: "Can't make it" }].map(o => (
              <button key={o.id} onClick={() => setRsvp(o.id)} style={{ flex: 1, padding: '11px 8px', borderRadius: '12px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', fontFamily: 'Plus Jakarta Sans, sans-serif',
                background: myRsvp === o.id ? (o.id === 'going' ? 'linear-gradient(135deg, #FF6B35, #E0561F)' : 'rgba(212,175,55,0.18)') : '#0F0F1E',
                border: myRsvp === o.id ? '1px solid transparent' : '1px solid rgba(255,255,255,0.12)',
                color: myRsvp === o.id ? (o.id === 'going' ? '#fff' : '#D4AF37') : '#A99ECC' }}>
                {o.label}
              </button>
            ))}
          </div>
          {going.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '14px' }}>
              {going.slice(0, 12).map(g => (
                <Link key={g.user_id} href={g.user?.username ? `/${g.user.username}` : '#'} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '5px 10px 5px 5px', borderRadius: '999px', background: '#0F0F1E', border: '1px solid rgba(255,255,255,0.10)', textDecoration: 'none' }}>
                  <span style={{ width: '22px', height: '22px', borderRadius: '50%', overflow: 'hidden', background: '#1A1A2E', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {g.user?.avatar_url ? <img src={g.user.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: '10px', color: '#D4AF37', fontWeight: 700 }}>{g.user?.full_name?.[0]}</span>}
                  </span>
                  <span style={{ fontSize: '12px', color: '#F0EAFF' }}>{g.user?.full_name?.split(' ')[0]}</span>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Tabs */}
        {activeTabs.length > 0 && (
          <>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
              {activeTabs.map(t => (
                <button key={t.id} onClick={() => setTab(t.id)} style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '10px', borderRadius: '12px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', fontFamily: 'Plus Jakarta Sans, sans-serif',
                  background: tab === t.id ? 'rgba(212,175,55,0.15)' : '#131323',
                  border: tab === t.id ? '1px solid rgba(212,175,55,0.4)' : '1px solid rgba(255,255,255,0.12)',
                  color: tab === t.id ? '#D4AF37' : '#A99ECC' }}>
                  <t.Icon size={15} strokeWidth={1.9} /> {t.label}{t.count > 0 ? ` (${t.count})` : ''}
                </button>
              ))}
            </div>

            {tab === 'photos' && event.allow_photos && (
              <PhotoWall event={event} me={me} photos={photos} onNeedLogin={requireLogin} />
            )}
            {tab === 'wishlist' && event.allow_wishlist && (
              <Wishlist event={event} me={me} items={wishlist} setItems={setWishlist} onNeedLogin={requireLogin} />
            )}
            {tab === 'chat' && event.allow_chat && (
              <Chat event={event} me={me} messages={messages} onNeedLogin={requireLogin} />
            )}
          </>
        )}

        {isHost && (
          <div style={{ textAlign: 'center', marginTop: '24px' }}>
            <p style={{ fontSize: '12px', color: '#6B6490', marginBottom: '10px' }}>You're the host · share the link above to invite guests</p>
            <button
              onClick={async () => {
                if (!confirm('Delete this birthday page permanently? Guests, photos, wishlist and chat will be removed.')) return
                const { error } = await supabase.from('birthday_events').delete().eq('id', event.id)
                if (error) { alert(`Could not delete: ${error.message}`); return }
                router.push('/events')
              }}
              style={{ fontSize: '12px', color: '#FF6B6B', background: 'none', border: '1px solid rgba(255,80,80,0.25)', borderRadius: '10px', padding: '8px 16px', cursor: 'pointer', fontFamily: 'Plus Jakarta Sans, sans-serif' }}
            >
              🗑 Delete event
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ── PHOTO WALL ────────────────────────────────────────────────────────────────
function PhotoWall({ event, me, photos, onNeedLogin }: any) {
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const [lightbox, setLightbox] = useState<string | null>(null)

  const handlePick = async (e: any) => {
    if (!me) return onNeedLogin()
    const files = Array.from(e.target.files || [])
    if (!files.length) return
    setUploading(true)
    for (const f of files as File[]) {
      const ext = f.name.split('.').pop()?.toLowerCase() || 'jpg'
      const path = `birthday/${event.id}/${me.id}/${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${ext}`
      const { error } = await supabase.storage.from('event-photos').upload(path, f, { contentType: f.type, upsert: false })
      if (error) { alert(`Upload failed: ${error.message}`); continue }
      const { data: pub } = supabase.storage.from('event-photos').getPublicUrl(path)
      await supabase.from('birthday_photos').insert({ event_id: event.id, user_id: me.id, photo_url: pub.publicUrl })
    }
    setUploading(false)
    if (fileRef.current) fileRef.current.value = ''
  }

  return (
    <div>
      <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '14px', borderRadius: '14px', background: 'rgba(212,175,55,0.06)', border: '2px dashed rgba(212,175,55,0.3)', color: '#D4AF37', cursor: 'pointer', fontWeight: 700, fontSize: '14px', marginBottom: '16px' }}>
        <ImagePlus size={18} strokeWidth={2} /> {uploading ? 'Uploading…' : 'Add photos'}
        <input ref={fileRef} type="file" accept="image/*" multiple onChange={handlePick} style={{ display: 'none' }} disabled={uploading} />
      </label>

      {photos.length === 0 ? (
        <EmptyBox emoji="📸" text="No photos yet — be the first to add one." />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
          {photos.map((p: any) => (
            <button key={p.id} onClick={() => setLightbox(p.photo_url)} style={{ aspectRatio: '1', borderRadius: '10px', overflow: 'hidden', border: 'none', padding: 0, cursor: 'pointer', background: '#111120' }}>
              <img src={p.photo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </button>
          ))}
        </div>
      )}

      {lightbox && (
        <div onClick={() => setLightbox(null)} style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(0,0,0,0.92)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <img src={lightbox} alt="" style={{ maxWidth: '100%', maxHeight: '100%', borderRadius: '12px' }} />
          <button onClick={() => setLightbox(null)} style={{ position: 'absolute', top: '20px', right: '20px', width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={20} /></button>
        </div>
      )}
    </div>
  )
}

// ── WISHLIST ──────────────────────────────────────────────────────────────────
function Wishlist({ event, me, items, setItems, onNeedLogin }: any) {
  const [adding, setAdding] = useState(false)
  const [url, setUrl] = useState('')
  const [title, setTitle] = useState('')
  const [image, setImage] = useState<string | null>(null)
  const [price, setPrice] = useState('')
  const [fetching, setFetching] = useState(false)
  const [saving, setSaving] = useState(false)

  const fetchPreview = async () => {
    if (!url || !/^https?:\/\//i.test(url)) return
    setFetching(true)
    try {
      const res = await fetch('/api/link-preview', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url }) })
      const data = await res.json()
      if (data.title && !title) setTitle(data.title)
      if (data.image) setImage(data.image)
      if (data.price) setPrice(data.price)
    } catch {}
    setFetching(false)
  }

  const addItem = async () => {
    if (!me) return onNeedLogin()
    if (!title.trim()) return
    setSaving(true)
    const { data, error } = await supabase.from('birthday_wishlist').insert({
      event_id: event.id, added_by: me.id, title: title.trim(), url: url || null, image_url: image, price: price || null,
    }).select('*, claimer:users!claimed_by(full_name, username)').single()
    setSaving(false)
    if (!error && data) {
      setItems((prev: any[]) => [...prev, data])
      setUrl(''); setTitle(''); setImage(null); setPrice(''); setAdding(false)
    }
  }

  const toggleClaim = async (item: any) => {
    if (!me) return onNeedLogin()
    const claiming = !item.claimed_by
    // Only allow unclaim by the person who claimed it
    if (!claiming && item.claimed_by !== me.id) return
    const newClaim = claiming ? me.id : null
    setItems((prev: any[]) => prev.map(i => i.id === item.id ? { ...i, claimed_by: newClaim, claimer: claiming ? { full_name: me.full_name, username: me.username } : null } : i))
    await supabase.from('birthday_wishlist').update({ claimed_by: newClaim }).eq('id', item.id)
  }

  const removeItem = async (item: any) => {
    if (!me || (item.added_by !== me.id && me.id !== event.host_id)) return
    setItems((prev: any[]) => prev.filter(i => i.id !== item.id))
    await supabase.from('birthday_wishlist').delete().eq('id', item.id)
  }

  return (
    <div>
      {!adding ? (
        <button onClick={() => me ? setAdding(true) : onNeedLogin()} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', width: '100%', padding: '14px', borderRadius: '14px', background: 'rgba(212,175,55,0.06)', border: '2px dashed rgba(212,175,55,0.3)', color: '#D4AF37', cursor: 'pointer', fontWeight: 700, fontSize: '14px', marginBottom: '16px' }}>
          <Plus size={18} strokeWidth={2.2} /> Add a gift idea
        </button>
      ) : (
        <div style={{ background: '#111120', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '16px', padding: '16px', marginBottom: '16px' }}>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
            <input value={url} onChange={e => setUrl(e.target.value)} onBlur={fetchPreview} placeholder="Paste Amazon (or any store) link" style={inputSm} />
            <button onClick={fetchPreview} disabled={fetching || !url} style={{ flexShrink: 0, padding: '0 14px', borderRadius: '10px', background: 'rgba(212,175,55,0.15)', border: '1px solid rgba(212,175,55,0.35)', color: '#D4AF37', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}>{fetching ? '…' : 'Fetch'}</button>
          </div>
          {image && <img src={image} alt="" style={{ width: '100%', maxHeight: '160px', objectFit: 'contain', borderRadius: '10px', background: '#fff', marginBottom: '10px' }} />}
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Gift name *" style={{ ...inputSm, marginBottom: '10px' }} />
          <input value={price} onChange={e => setPrice(e.target.value)} placeholder="Price (optional)" style={{ ...inputSm, marginBottom: '12px' }} />
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={() => { setAdding(false); setUrl(''); setTitle(''); setImage(null); setPrice('') }} style={{ flex: 1, padding: '11px', borderRadius: '11px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: '#A99ECC', fontWeight: 600, fontSize: '14px', cursor: 'pointer' }}>Cancel</button>
            <button onClick={addItem} disabled={saving || !title.trim()} style={{ flex: 2, padding: '11px', borderRadius: '11px', background: 'linear-gradient(135deg, #D4AF37, #B8960C)', border: 'none', color: '#09090F', fontWeight: 700, fontSize: '14px', cursor: title.trim() ? 'pointer' : 'not-allowed', opacity: title.trim() ? 1 : 0.5 }}>{saving ? 'Adding…' : 'Add to wishlist'}</button>
          </div>
        </div>
      )}

      {items.length === 0 ? (
        <EmptyBox emoji="🎁" text="No gift ideas yet. Add one so guests know what to get." />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {items.map((item: any) => {
            const claimed = !!item.claimed_by
            const mineClaim = claimed && item.claimed_by === me?.id
            return (
              <div key={item.id} style={{ display: 'flex', gap: '12px', padding: '12px', borderRadius: '14px', background: '#111120', border: '1px solid rgba(255,255,255,0.10)', opacity: claimed && !mineClaim ? 0.6 : 1 }}>
                {item.image_url
                  ? <img src={item.image_url} alt="" style={{ width: '60px', height: '60px', objectFit: 'contain', borderRadius: '10px', background: '#fff', flexShrink: 0 }} />
                  : <span style={{ width: '60px', height: '60px', borderRadius: '10px', background: 'rgba(212,175,55,0.10)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Gift size={24} color="#D4AF37" strokeWidth={1.7} /></span>}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: '14px', fontWeight: 600, color: '#F0EAFF', marginBottom: '2px', textDecoration: claimed ? 'line-through' : 'none' }}>{item.title}</p>
                  {item.price && <p style={{ fontSize: '13px', color: '#D4AF37', fontWeight: 700, marginBottom: '4px' }}>{item.price}</p>}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                    {item.url && <a href={item.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: '12px', color: '#9B7FFF', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>View <ExternalLink size={11} /></a>}
                    {claimed
                      ? <span style={{ fontSize: '12px', color: '#34D399', fontWeight: 600 }}>{mineClaim ? "You've got this ✓" : `Claimed by ${item.claimer?.full_name?.split(' ')[0] || 'someone'}`}</span>
                      : <button onClick={() => toggleClaim(item)} style={{ fontSize: '12px', fontWeight: 700, color: '#34D399', background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.3)', borderRadius: '8px', padding: '3px 10px', cursor: 'pointer' }}>I'll get this</button>}
                    {mineClaim && <button onClick={() => toggleClaim(item)} style={{ fontSize: '12px', color: '#A99ECC', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>unclaim</button>}
                  </div>
                </div>
                {(item.added_by === me?.id || me?.id === event.host_id) && (
                  <button onClick={() => removeItem(item)} aria-label="Remove" style={{ flexShrink: 0, background: 'none', border: 'none', color: '#6B6490', cursor: 'pointer', padding: '2px' }}><X size={16} /></button>
                )}
              </div>
            )
          })}
        </div>
      )}
      <p style={{ fontSize: '11px', color: '#6B6490', textAlign: 'center', marginTop: '12px' }}>🎁 Claims are hidden from the birthday person on their own page… surprise stays safe.</p>
    </div>
  )
}

// ── CHAT ──────────────────────────────────────────────────────────────────────
function Chat({ event, me, messages, onNeedLogin }: any) {
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages.length])

  const send = async () => {
    if (!me) return onNeedLogin()
    if (!text.trim()) return
    setSending(true)
    const body = text.trim()
    setText('')
    await supabase.from('birthday_messages').insert({ event_id: event.id, user_id: me.id, body })
    setSending(false)
  }

  return (
    <div>
      <div style={{ background: '#111120', border: '1px solid rgba(255,255,255,0.10)', borderRadius: '16px', padding: '12px', minHeight: '200px', maxHeight: '440px', overflowY: 'auto', marginBottom: '12px' }}>
        {messages.length === 0 ? (
          <div style={{ padding: '40px 0' }}><EmptyBox emoji="💬" text="No messages yet — say hi 👋" /></div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {messages.map((m: any) => {
              const mine = m.user_id === me?.id
              return (
                <div key={m.id} style={{ display: 'flex', gap: '8px', flexDirection: mine ? 'row-reverse' : 'row' }}>
                  <span style={{ width: '28px', height: '28px', borderRadius: '50%', overflow: 'hidden', background: '#1A1A2E', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {m.user?.avatar_url ? <img src={m.user.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: '11px', color: '#D4AF37', fontWeight: 700 }}>{m.user?.full_name?.[0] || '?'}</span>}
                  </span>
                  <div style={{ maxWidth: '75%' }}>
                    {!mine && <p style={{ fontSize: '11px', color: '#A99ECC', marginBottom: '2px', paddingLeft: '4px' }}>{m.user?.full_name?.split(' ')[0]}</p>}
                    <div style={{ padding: '8px 12px', borderRadius: '14px', background: mine ? 'linear-gradient(135deg, #D4AF37, #B8960C)' : '#0F0F1E', border: mine ? 'none' : '1px solid rgba(255,255,255,0.10)', color: mine ? '#09090F' : '#F0EAFF', fontSize: '14px', lineHeight: 1.4, wordBreak: 'break-word' }}>{m.body}</div>
                  </div>
                </div>
              )
            })}
            <div ref={endRef} />
          </div>
        )}
      </div>
      <div style={{ display: 'flex', gap: '8px' }}>
        <input value={text} onChange={e => setText(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') send() }} placeholder={me ? 'Message the group…' : 'Log in to chat'} style={inputSm} />
        <button onClick={send} disabled={sending || !text.trim()} aria-label="Send" style={{ flexShrink: 0, width: '46px', borderRadius: '11px', background: 'linear-gradient(135deg, #D4AF37, #B8960C)', border: 'none', color: '#09090F', cursor: text.trim() ? 'pointer' : 'not-allowed', opacity: text.trim() ? 1 : 0.5, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Send size={18} strokeWidth={2} /></button>
      </div>
    </div>
  )
}

function EmptyBox({ emoji, text }: { emoji: string; text: string }) {
  return (
    <div style={{ textAlign: 'center', padding: '32px 16px', color: '#A99ECC' }}>
      <div style={{ fontSize: '32px', marginBottom: '8px' }}>{emoji}</div>
      <p style={{ fontSize: '13px' }}>{text}</p>
    </div>
  )
}

const inputSm: React.CSSProperties = {
  flex: 1, width: '100%', padding: '11px 14px', borderRadius: '11px', fontSize: '14px',
  background: '#0F0F1E', border: '1px solid rgba(255,255,255,0.12)', color: '#F0EAFF',
  outline: 'none', boxSizing: 'border-box', fontFamily: 'Plus Jakarta Sans, sans-serif',
}
