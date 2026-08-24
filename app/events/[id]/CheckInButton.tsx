// @ts-nocheck
'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Camera, CheckCircle2, MapPin } from 'lucide-react'
import { celebrate, buzz } from '@/lib/celebrate'

type Props = {
  eventId: string
  eventTitle: string
  isPast: boolean
  startsAt: string // ISO
}

/**
 * Check-in flow for an event.
 * Eligibility: the user has RSVP'd 'going' AND the event is within a
 * reasonable check-in window (from 1h before to 24h after the start).
 *
 * Records: photo_url (optional) + lat/lng (best-effort) + checked_in_at.
 *
 * On mutual check-in with another user at the same event, a DB trigger
 * marks any pending booking between them as confirmed.
 */
export default function CheckInButton({ eventId, eventTitle, isPast, startsAt }: Props) {
  const router = useRouter()
  const [userId, setUserId] = useState<string | null>(null)
  const [isGoing, setIsGoing] = useState(false)
  const [checkedIn, setCheckedIn] = useState(false)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { setLoading(false); return }
      const uid = session.user.id
      setUserId(uid)
      const [{ data: att }, { data: ci }] = await Promise.all([
        supabase.from('crew_event_attendees').select('status').eq('event_id', eventId).eq('user_id', uid).maybeSingle(),
        supabase.from('event_checkins').select('id').eq('event_id', eventId).eq('user_id', uid).maybeSingle(),
      ])
      setIsGoing((att?.status || 'going') === 'going' && !!att)
      setCheckedIn(!!ci)
      setLoading(false)
    })
  }, [eventId])

  // Eligibility: from 1h before start, until 24h after start
  const now = Date.now()
  const startMs = new Date(startsAt).getTime()
  const inWindow = now >= startMs - 60 * 60 * 1000 && now <= startMs + 24 * 60 * 60 * 1000

  if (loading || !userId) return null
  if (!isGoing) return null // Only Going attendees can check in
  if (!inWindow && !checkedIn) return null

  const handleCheckIn = async () => {
    if (uploading || !userId) return
    setUploading(true)
    setError(null)

    // Best-effort geolocation (silently fails if denied)
    let lat: number | null = null
    let lng: number | null = null
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
        if (!navigator.geolocation) return reject()
        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000, maximumAge: 60_000 })
      })
      lat = pos.coords.latitude
      lng = pos.coords.longitude
    } catch {}

    const { error: insErr } = await supabase
      .from('event_checkins')
      .insert({ event_id: eventId, user_id: userId, lat, lng })

    if (insErr) {
      setError(insErr.message)
      setUploading(false)
      return
    }

    setCheckedIn(true)
    buzz('success')
    celebrate({ count: 40, spread: 80 })
    setUploading(false)
    router.refresh()
  }

  const handlePhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !userId) return
    setUploading(true)
    setError(null)

    const ext = file.name.split('.').pop() || 'jpg'
    const path = `${userId}/${eventId}-${Date.now()}.${ext}`

    const { error: upErr } = await supabase.storage
      .from('event-photos')
      .upload(path, file, { cacheControl: '3600', upsert: false })

    if (upErr) {
      setError(upErr.message)
      setUploading(false)
      return
    }

    const { data: { publicUrl } } = supabase.storage.from('event-photos').getPublicUrl(path)

    // Save photo on the existing check-in row + also as event_photo
    await supabase.from('event_checkins').update({ photo_url: publicUrl })
      .eq('event_id', eventId).eq('user_id', userId)
    await supabase.from('event_photos').insert({ event_id: eventId, user_id: userId, photo_url: publicUrl })

    setUploading(false)
    router.refresh()
  }

  if (checkedIn) {
    return (
      <div style={{ marginTop: '14px', padding: '14px 16px', borderRadius: '14px', background: 'rgba(52,211,153,0.10)', border: '1px solid rgba(52,211,153,0.30)', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <CheckCircle2 size={20} color="#34D399" strokeWidth={2} style={{ flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: '14px', fontWeight: 700, color: '#34D399', margin: 0 }}>Checked in!</p>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0 }}>Add a photo to remember this moment</p>
        </div>
        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          aria-label="Add a photo"
          style={{ padding: '8px 12px', borderRadius: '10px', fontSize: '12px', fontWeight: 700, background: 'rgba(212,175,55,0.12)', border: '1px solid rgba(212,175,55,0.35)', color: '#D4AF37', cursor: uploading ? 'not-allowed' : 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px', fontFamily: 'Plus Jakarta Sans, sans-serif', flexShrink: 0 }}
        >
          <Camera size={13} strokeWidth={2} /> {uploading ? '…' : 'Photo'}
        </button>
        <input ref={fileRef} type="file" accept="image/*" capture="environment" onChange={handlePhoto} aria-label="Upload event photo" style={{ display: 'none' }} />
      </div>
    )
  }

  return (
    <div style={{ marginTop: '14px' }}>
      <button
        onClick={handleCheckIn}
        disabled={uploading}
        style={{ width: '100%', padding: '14px', borderRadius: '14px', fontSize: '15px', fontWeight: 700, background: 'linear-gradient(135deg, #34D399 0%, #2AAA75 100%)', color: '#09090F', border: 'none', cursor: uploading ? 'not-allowed' : 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontFamily: 'Plus Jakarta Sans, sans-serif', boxShadow: '0 4px 16px rgba(52,211,153,0.20)' }}
      >
        <MapPin size={16} strokeWidth={2} />
        {uploading ? 'Checking in…' : "I'm here — check me in"}
      </button>
      <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '8px', textAlign: 'center' }}>
        Confirms you showed up. Adds you to the photo album.
      </p>
      {error && <p style={{ fontSize: '12px', color: '#FF6B35', marginTop: '6px', textAlign: 'center' }}>{error}</p>}
    </div>
  )
}
