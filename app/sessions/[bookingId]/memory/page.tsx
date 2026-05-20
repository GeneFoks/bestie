// @ts-nocheck
'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { PageLoader } from '@/components/Loading'

const MOODS = ['🔥', '😊', '🤝', '💭', '😌', '🥹', '✨', '💎']

export default function SessionMemoryPage() {
  const router = useRouter()
  const { bookingId } = useParams()
  const fileRef = useRef<HTMLInputElement>(null)

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [booking, setBooking] = useState<any>(null)
  const [partner, setPartner] = useState<any>(null)
  const [myId, setMyId] = useState<string | null>(null)
  const [mood, setMood] = useState('')
  const [note, setNote] = useState('')
  const [photo, setPhoto] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const [alreadySaved, setAlreadySaved] = useState(false)

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }
      const uid = session.user.id
      setMyId(uid)

      const { data: bk } = await supabase
        .from('bookings')
        .select('id, seeker_id, provider_id, confirmed_by_seeker, confirmed_by_provider, created_at')
        .eq('id', bookingId)
        .single()

      if (!bk || (bk.seeker_id !== uid && bk.provider_id !== uid)) {
        router.push('/dashboard'); return
      }
      if (!bk.confirmed_by_seeker || !bk.confirmed_by_provider) {
        router.push('/dashboard'); return
      }

      setBooking(bk)

      const partnerId = bk.seeker_id === uid ? bk.provider_id : bk.seeker_id
      const { data: partnerData } = await supabase
        .from('users').select('id, full_name, username, avatar_url')
        .eq('id', partnerId).single()
      setPartner(partnerData)

      const { data: existing } = await supabase
        .from('session_memories').select('id').eq('booking_id', bookingId).eq('user_id', uid).maybeSingle()
      if (existing) setAlreadySaved(true)

      setLoading(false)
    }
    init()
  }, [bookingId])

  const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setPhoto(file)
    const reader = new FileReader()
    reader.onload = ev => setPhotoPreview(ev.target?.result as string)
    reader.readAsDataURL(file)
  }

  const save = async () => {
    setSaving(true)
    let photoUrl: string | null = null

    if (photo) {
      const ext = photo.name.split('.').pop()
      const path = `${myId}/${bookingId}.${ext}`
      const { error: upErr } = await supabase.storage
        .from('session-memories').upload(path, photo, { upsert: true })
      if (!upErr) {
        const { data: { publicUrl } } = supabase.storage.from('session-memories').getPublicUrl(path)
        photoUrl = publicUrl
      }
    }

    await supabase.from('session_memories').upsert({
      booking_id: bookingId,
      user_id: myId,
      mood_emoji: mood || null,
      activity_note: note || null,
      photo_url: photoUrl,
    }, { onConflict: 'booking_id,user_id' })

    setSaving(false)
    setDone(true)
  }

  if (loading) return <PageLoader fullscreen={false} message="Loading…" />

  if (done) {
    return (
      <div style={{ minHeight: '100vh', background: '#09090F', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Plus Jakarta Sans, sans-serif', padding: '24px' }}>
        <div style={{ textAlign: 'center', maxWidth: '360px' }}>
          <div style={{ fontSize: '64px', marginBottom: '16px' }}>{mood || '✨'}</div>
          <h2 style={{ fontFamily: 'DM Serif Display, serif', fontSize: '28px', color: '#F0EAFF', marginBottom: '8px' }}>Memory saved</h2>
          <p style={{ fontSize: '14px', color: '#A99ECC', marginBottom: '28px' }}>This moment is now stamped on your Social Passport.</p>
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
            {partner && (
              <Link href={`/sparks/give?to=${partner.username}`} style={{ padding: '12px 20px', borderRadius: '14px', fontSize: '14px', fontWeight: 700, background: 'linear-gradient(135deg, #D4AF37 0%, #B8960C 100%)', color: '#09090F', textDecoration: 'none' }}>
                ✨ Give a Spark
              </Link>
            )}
            <Link href="/dashboard" style={{ padding: '12px 20px', borderRadius: '14px', fontSize: '14px', fontWeight: 600, background: 'rgba(255,255,255,0.10)', border: '1px solid rgba(255,255,255,0.1)', color: '#F0EAFF', textDecoration: 'none' }}>
              Dashboard
            </Link>
          </div>
        </div>
      </div>
    )
  }

  if (alreadySaved) {
    return (
      <div style={{ minHeight: '100vh', background: '#09090F', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Plus Jakarta Sans, sans-serif', padding: '24px' }}>
        <div style={{ textAlign: 'center', maxWidth: '360px' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>✅</div>
          <h2 style={{ fontFamily: 'DM Serif Display, serif', fontSize: '24px', color: '#F0EAFF', marginBottom: '8px' }}>Already saved</h2>
          <p style={{ fontSize: '14px', color: '#A99ECC', marginBottom: '24px' }}>You already recorded this session.</p>
          <Link href="/dashboard" style={{ padding: '12px 24px', borderRadius: '14px', fontSize: '14px', fontWeight: 600, background: 'rgba(255,255,255,0.10)', border: '1px solid rgba(255,255,255,0.1)', color: '#F0EAFF', textDecoration: 'none' }}>
            Dashboard
          </Link>
        </div>
      </div>
    )
  }

  const initials = partner?.full_name?.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2) || '?'

  return (
    <div style={{ minHeight: '100vh', background: '#09090F', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
      <div style={{ maxWidth: '480px', margin: '0 auto', padding: '48px 24px' }}>

        {/* Partner */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '32px' }}>
          <div style={{ width: '56px', height: '56px', borderRadius: '16px', overflow: 'hidden', background: '#1A1A2E', border: '2px solid rgba(212,175,55,0.3)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {partner?.avatar_url
              ? <img src={partner.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <span style={{ fontSize: '20px', fontWeight: 700, color: '#D4AF37' }}>{initials}</span>
            }
          </div>
          <div>
            <p style={{ fontSize: '13px', color: '#A99ECC', marginBottom: '2px' }}>Session with</p>
            <h2 style={{ fontFamily: 'DM Serif Display, serif', fontSize: '22px', color: '#F0EAFF' }}>{partner?.full_name}</h2>
          </div>
        </div>

        <h1 style={{ fontFamily: 'DM Serif Display, serif', fontSize: '30px', color: '#F0EAFF', marginBottom: '6px' }}>How did it go?</h1>
        <p style={{ fontSize: '14px', color: '#A99ECC', marginBottom: '32px' }}>This moment stays on your passport forever.</p>

        {/* Mood */}
        <div style={{ marginBottom: '24px' }}>
          <p style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '2px', color: '#A99ECC', marginBottom: '12px' }}>VIBE</p>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            {MOODS.map(m => (
              <button key={m} onClick={() => setMood(m === mood ? '' : m)} style={{ width: '52px', height: '52px', borderRadius: '14px', fontSize: '24px', cursor: 'pointer', background: mood === m ? 'rgba(212,175,55,0.15)' : '#131323', border: mood === m ? '2px solid rgba(212,175,55,0.5)' : '2px solid rgba(255,255,255,0.12)', transition: 'all 0.15s', transform: mood === m ? 'scale(1.1)' : 'scale(1)' }}>
                {m}
              </button>
            ))}
          </div>
        </div>

        {/* Note */}
        <div style={{ marginBottom: '24px' }}>
          <p style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '2px', color: '#A99ECC', marginBottom: '12px' }}>WHAT DID YOU DO? <span style={{ fontWeight: 400, letterSpacing: 0 }}>(optional)</span></p>
          <textarea
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="Coffee, hike, deep talk..."
            rows={3}
            style={{ width: '100%', padding: '14px', borderRadius: '14px', background: '#131323', border: '1px solid rgba(255,255,255,0.1)', color: '#F0EAFF', fontSize: '14px', fontFamily: 'Plus Jakarta Sans, sans-serif', outline: 'none', resize: 'none', boxSizing: 'border-box' }}
          />
        </div>

        {/* Photo */}
        <div style={{ marginBottom: '32px' }}>
          <p style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '2px', color: '#A99ECC', marginBottom: '12px' }}>PHOTO <span style={{ fontWeight: 400, letterSpacing: 0 }}>(optional)</span></p>
          {photoPreview ? (
            <div style={{ position: 'relative', borderRadius: '14px', overflow: 'hidden', height: '180px' }}>
              <img src={photoPreview} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              <button onClick={() => { setPhoto(null); setPhotoPreview(null) }} style={{ position: 'absolute', top: '8px', right: '8px', background: 'rgba(0,0,0,0.6)', border: 'none', color: '#fff', borderRadius: '8px', padding: '4px 8px', cursor: 'pointer', fontSize: '12px' }}>Remove</button>
            </div>
          ) : (
            <button onClick={() => fileRef.current?.click()} style={{ width: '100%', padding: '20px', borderRadius: '14px', background: '#111120', border: '1px dashed rgba(255,255,255,0.12)', color: '#A99ECC', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
              📷 Add a photo from the meetup
            </button>
          )}
          <input ref={fileRef} type="file" accept="image/*" onChange={handlePhoto} style={{ display: 'none' }} />
        </div>

        {/* Save */}
        <button onClick={save} disabled={saving} style={{ width: '100%', padding: '16px', borderRadius: '16px', fontSize: '16px', fontWeight: 700, background: 'linear-gradient(135deg, #D4AF37 0%, #B8960C 100%)', color: '#09090F', border: 'none', cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}>
          {saving ? 'Saving...' : '💾 Save this memory'}
        </button>

        <button onClick={() => router.push('/dashboard')} style={{ display: 'block', width: '100%', marginTop: '12px', padding: '12px', background: 'none', border: 'none', color: '#A99ECC', fontSize: '13px', cursor: 'pointer', textAlign: 'center' }}>
          Skip for now
        </button>
      </div>
    </div>
  )
}
