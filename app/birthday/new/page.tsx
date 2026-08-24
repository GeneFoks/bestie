// @ts-nocheck
'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { ImagePlus, X, Cake } from 'lucide-react'
import LocationPicker from '@/components/LocationPicker'
import { showToast } from '@/components/Toast'

export default function NewBirthdayPage() {
  const router = useRouter()
  const [userId, setUserId] = useState(null)
  const [firstName, setFirstName] = useState('')
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    celebrant: '',
    title: '',
    description: '',
    event_date: '',
    location: '',
    location_url: '',
    allow_photos: true,
    allow_wishlist: true,
    allow_chat: true,
  })
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [coverPreview, setCoverPreview] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { router.push('/login'); return }
      setUserId(user.id)
      const { data } = await supabase.from('users').select('full_name').eq('id', user.id).single()
      const fn = data?.full_name?.split(' ')[0] || ''
      setFirstName(fn)
      // Default: it's usually your own birthday
      setForm(f => ({ ...f, celebrant: fn }))
    })
  }, [])

  const handleCoverPick = (e: any) => {
    const f = e.target.files?.[0]
    if (!f) return
    setCoverFile(f)
    setCoverPreview(URL.createObjectURL(f))
  }
  const clearCover = () => {
    setCoverFile(null); setCoverPreview(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  const handleCreate = async () => {
    if (!form.celebrant || !form.event_date) return
    setSaving(true)
    let cover_image: string | null = null
    if (coverFile && userId) {
      const ext = coverFile.name.split('.').pop()?.toLowerCase() || 'jpg'
      const path = `birthday/${userId}/${Date.now()}.${ext}`
      const { error: upErr } = await supabase.storage.from('event-photos').upload(path, coverFile, { contentType: coverFile.type, upsert: false })
      if (upErr) {
        console.error('Cover upload failed:', upErr.message, '— check that the "event-photos" Storage bucket exists and is public.')
        showToast("Couldn't upload the cover image — try again.", { type: 'error' })
        setSaving(false)
        return
      }
      const { data: pub } = supabase.storage.from('event-photos').getPublicUrl(path)
      cover_image = pub.publicUrl
    }

    const { data, error } = await supabase.from('birthday_events').insert({
      host_id: userId,
      celebrant: form.celebrant,
      title: form.title || null,
      description: form.description || null,
      event_date: new Date(form.event_date).toISOString(),
      location: form.location || null,
      location_url: form.location_url || null,
      cover_image,
      allow_photos: form.allow_photos,
      allow_wishlist: form.allow_wishlist,
      allow_chat: form.allow_chat,
    }).select('share_slug').single()

    setSaving(false)
    if (error) {
      console.error('Birthday create failed:', error.message)
      showToast("Couldn't create the birthday page — try again.", { type: 'error' })
      return
    }
    if (data?.share_slug) router.push(`/birthday/${data.share_slug}`)
  }

  const inputStyle = { width: '100%', padding: '12px 14px', borderRadius: '12px', fontSize: '14px', background: 'var(--surface-1)', border: '1px solid var(--border)', color: 'var(--text-primary)', outline: 'none', boxSizing: 'border-box' as const }
  const labelStyle = { fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.5px', marginBottom: '6px', display: 'block' }

  const canSubmit = form.celebrant && form.event_date

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
      <nav style={{ position: 'sticky', top: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', background: 'var(--nav-bg)', backdropFilter: 'blur(20px)', borderBottom: '1px solid var(--border)' }}>
        <Link href="/" style={{ fontFamily: 'DM Serif Display, serif', fontSize: '20px', fontWeight: 700, color: '#D4AF37', textDecoration: 'none' }}>BESTIE</Link>
        <Link href="/events" style={{ fontSize: '14px', color: 'var(--text-muted)', textDecoration: 'none', padding: '8px 16px', borderRadius: '10px', border: '1px solid var(--border)' }}>← Events</Link>
      </nav>

      <div style={{ maxWidth: '560px', margin: '0 auto', padding: '40px 24px 100px' }}>
        <p style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '2px', color: '#FF6B35', marginBottom: '8px', display: 'inline-flex', alignItems: 'center', gap: '7px' }}><Cake size={14} strokeWidth={2} /> BIRTHDAY</p>
        <h1 style={{ fontFamily: 'DM Serif Display, serif', fontSize: '28px', color: 'var(--text-primary)', marginBottom: '8px' }}>Create a birthday page</h1>
        <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '32px' }}>Get one shareable link — guests RSVP, share photos, pick gifts off the wishlist, and chat in one place.</p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={labelStyle}>Cover image</label>
            {coverPreview ? (
              <div style={{ position: 'relative', borderRadius: '14px', overflow: 'hidden', aspectRatio: '16/9', background: 'var(--surface-1)' }}>
                <img src={coverPreview} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                <button type="button" onClick={clearCover} aria-label="Remove cover" style={{ position: 'absolute', top: '10px', right: '10px', width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(0,0,0,0.65)', border: '1px solid rgba(255,255,255,0.15)', color: '#F0EAFF', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <X size={16} strokeWidth={2.2} />
                </button>
              </div>
            ) : (
              <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '28px 16px', borderRadius: '14px', background: 'rgba(255,107,53,0.04)', border: '2px dashed rgba(255,107,53,0.3)', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <ImagePlus size={22} strokeWidth={1.8} color="#FF6B35" />
                <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>Add a cover image</span>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Optional · shows at the top of the page & in shared previews</span>
                <input ref={fileRef} type="file" accept="image/*" onChange={handleCoverPick} style={{ display: 'none' }} />
              </label>
            )}
          </div>

          <div>
            <label style={labelStyle}>Whose birthday? *</label>
            <input value={form.celebrant} onChange={e => setForm(f => ({ ...f, celebrant: e.target.value }))} placeholder="e.g. Alex" style={inputStyle} />
          </div>

          <div>
            <label style={labelStyle}>Title <span style={{ fontWeight: 400 }}>(optional)</span></label>
            <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder={form.celebrant ? `${form.celebrant}'s Birthday Bash 🎉` : "Alex's Birthday Bash 🎉"} style={inputStyle} />
          </div>

          <div>
            <label style={labelStyle}>Description</label>
            <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="What's the plan? Dress code? What to bring?" rows={3} style={{ ...inputStyle, resize: 'vertical' as const }} />
          </div>

          <div>
            <label style={labelStyle}>Date & Time *</label>
            <input type="datetime-local" value={form.event_date} onChange={e => setForm(f => ({ ...f, event_date: e.target.value }))} style={{ ...inputStyle, colorScheme: 'dark' }} />
          </div>

          <div>
            <label style={labelStyle}>Location</label>
            <LocationPicker
              value={form.location}
              onChange={v => setForm(f => ({ ...f, location: v }))}
              placeholder="The Rooftop Bar, Austin"
            />
          </div>

          <div>
            <label style={labelStyle}>Map / location link <span style={{ fontWeight: 400 }}>(optional)</span></label>
            <input value={form.location_url} onChange={e => setForm(f => ({ ...f, location_url: e.target.value }))} placeholder="Paste a Google Maps link" style={inputStyle} />
          </div>

          {/* Feature toggles */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', background: 'var(--surface-1)', border: '1px solid var(--border)', borderRadius: '14px', padding: '6px 14px' }}>
            <Toggle label="📸 Shared photo wall" sub="Guests add photos everyone can see" checked={form.allow_photos} onChange={v => setForm(f => ({ ...f, allow_photos: v }))} />
            <Toggle label="🎁 Gift wishlist" sub="Guests claim gifts so nothing's doubled" checked={form.allow_wishlist} onChange={v => setForm(f => ({ ...f, allow_wishlist: v }))} />
            <Toggle label="💬 Guest chat" sub="Everyone coordinates in one thread" checked={form.allow_chat} onChange={v => setForm(f => ({ ...f, allow_chat: v }))} />
          </div>

          <button onClick={handleCreate} disabled={saving || !canSubmit}
            style={{ padding: '14px', borderRadius: '14px', fontSize: '15px', fontWeight: 700, background: 'linear-gradient(135deg, #FF6B35 0%, #E0561F 100%)', color: '#fff', border: 'none', cursor: canSubmit ? 'pointer' : 'not-allowed', opacity: canSubmit ? 1 : 0.5, marginTop: '8px' }}>
            {saving ? 'Creating…' : '🎂 Create & get share link'}
          </button>
        </div>
      </div>
    </div>
  )
}

function Toggle({ label, sub, checked, onChange }: { label: string; sub: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button type="button" onClick={() => onChange(!checked)} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 4px', background: 'transparent', border: 'none', borderBottom: '1px solid rgba(255,255,255,0.06)', cursor: 'pointer', textAlign: 'left', width: '100%' }}>
      <span style={{ flex: 1 }}>
        <span style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>{label}</span>
        <span style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)' }}>{sub}</span>
      </span>
      <span style={{ flexShrink: 0, width: '44px', height: '26px', borderRadius: '999px', background: checked ? '#FF6B35' : 'rgba(255,255,255,0.14)', position: 'relative', transition: 'background 0.2s' }}>
        <span style={{ position: 'absolute', top: '3px', left: checked ? '21px' : '3px', width: '20px', height: '20px', borderRadius: '50%', background: '#fff', transition: 'left 0.2s' }} />
      </span>
    </button>
  )
}
