'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { Users, Camera, Loader2, Plus } from 'lucide-react'

type Props = {
  crewId: string
  captainId: string
  initialUrl: string | null
  crewName: string
}

export default function CrewAvatarSection({ crewId, captainId, initialUrl, crewName }: Props) {
  const [userId, setUserId] = useState<string | null>(null)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(initialUrl)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUserId(session?.user?.id ?? null)
    })
  }, [])

  const isCaptain = userId === captainId

  const handleFile = async (file: File) => {
    if (!file) return
    if (file.size > 5 * 1024 * 1024) { setError('Max 5MB'); return }
    if (!file.type.startsWith('image/')) { setError('Images only'); return }

    setUploading(true)
    setError(null)

    const ext = file.name.split('.').pop()
    const path = `${crewId}/avatar.${ext}`

    const { error: uploadErr } = await supabase.storage
      .from('crew-avatars')
      .upload(path, file, { upsert: true })

    if (uploadErr) { setError(uploadErr.message); setUploading(false); return }

    const { data } = supabase.storage.from('crew-avatars').getPublicUrl(path)
    const url = `${data.publicUrl}?t=${Date.now()}`

    await supabase.from('crews').update({ avatar_url: url }).eq('id', crewId)
    setAvatarUrl(url)
    setUploading(false)
  }

  return (
    <div style={{ position: 'relative', flexShrink: 0 }}>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={e => { if (e.target.files?.[0]) handleFile(e.target.files[0]) }}
      />
      <div
        onClick={() => isCaptain && inputRef.current?.click()}
        style={{ width: '80px', height: '80px', borderRadius: '20px', overflow: 'hidden', background: '#1A1A2E', border: '2px solid rgba(212,175,55,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: isCaptain ? 'pointer' : 'default', position: 'relative' }}
      >
        {uploading ? (
          <Loader2 size={20} color="#D4AF37" strokeWidth={2} />
        ) : avatarUrl ? (
          <img src={avatarUrl} alt={crewName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <Users size={36} color="#D4AF37" strokeWidth={1.6} />
        )}
        {isCaptain && !uploading && (
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0)', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '18px', transition: 'background 0.15s' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(0,0,0,0.45)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'rgba(0,0,0,0)')}>
            <span style={{ opacity: 0, transition: 'opacity 0.15s', display: 'inline-flex' }}
              onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
              onMouseLeave={e => (e.currentTarget.style.opacity = '0')}><Camera size={18} color="#F0EAFF" strokeWidth={2} /></span>
          </div>
        )}
      </div>
      {error && <p style={{ fontSize: '10px', color: '#FF6B35', marginTop: '4px', maxWidth: '80px' }}>{error}</p>}
      {isCaptain && (
        <button onClick={() => inputRef.current?.click()} disabled={uploading}
          style={{ marginTop: '6px', fontSize: '10px', fontWeight: 600, padding: '3px 8px', borderRadius: '6px', background: 'rgba(212,175,55,0.1)', border: '1px solid rgba(212,175,55,0.2)', color: '#D4AF37', cursor: 'pointer', width: '80px', textAlign: 'center', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '3px' }}>
          {uploading ? '…' : avatarUrl ? 'Change' : (<><Plus size={10} strokeWidth={2.5} /> Photo</>)}
        </button>
      )}
    </div>
  )
}
