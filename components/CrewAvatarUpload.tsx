'use client'

import { useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'

type Props = {
  crewId: string
  currentUrl: string | null
  onUploaded: (url: string) => void
}

export default function CrewAvatarUpload({ crewId, currentUrl, onUploaded }: Props) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

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
    onUploaded(url)
    setUploading(false)
  }

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={e => { if (e.target.files?.[0]) handleFile(e.target.files[0]) }}
      />
      <button
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        style={{ fontSize: '12px', fontWeight: 600, padding: '6px 12px', borderRadius: '8px', background: 'rgba(212,175,55,0.1)', border: '1px solid rgba(212,175,55,0.2)', color: '#D4AF37', cursor: uploading ? 'not-allowed' : 'pointer', opacity: uploading ? 0.6 : 1 }}
      >
        {uploading ? 'Uploading…' : currentUrl ? 'Change photo' : 'Add photo'}
      </button>
      {error && <p style={{ fontSize: '11px', color: '#FF6B35', marginTop: '4px' }}>{error}</p>}
    </div>
  )
}
