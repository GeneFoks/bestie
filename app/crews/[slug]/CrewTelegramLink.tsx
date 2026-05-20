'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Send, Plus } from 'lucide-react'

type Props = {
  crewId: string
  captainId: string
  initialUrl: string | null
}

export default function CrewTelegramLink({ crewId, captainId, initialUrl }: Props) {
  const [userId, setUserId] = useState<string | null>(null)
  const [url, setUrl] = useState(initialUrl || '')
  const [editing, setEditing] = useState(false)
  const [input, setInput] = useState(initialUrl || '')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUserId(session?.user?.id ?? null)
    })
  }, [])

  const isCaptain = userId === captainId

  const save = async () => {
    setSaving(true)
    const clean = input.trim()
    await supabase.from('crews').update({ telegram_url: clean || null }).eq('id', crewId)
    setUrl(clean)
    setEditing(false)
    setSaving(false)
  }

  // Captain editing
  if (isCaptain) {
    if (editing) {
      return (
        <div style={{ marginTop: '12px', display: 'flex', gap: '8px', alignItems: 'center' }}>
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="https://t.me/yourcommunity"
            style={{ flex: 1, padding: '10px 14px', borderRadius: '10px', fontSize: '13px', background: '#161628', border: '1px solid rgba(255,255,255,0.15)', color: '#F0EAFF', outline: 'none' }}
          />
          <button onClick={save} disabled={saving} style={{ padding: '10px 16px', borderRadius: '10px', fontSize: '13px', fontWeight: 600, background: 'linear-gradient(135deg, #D4AF37 0%, #B8960C 100%)', color: '#09090F', border: 'none', cursor: 'pointer' }}>
            {saving ? '…' : 'Save'}
          </button>
          <button onClick={() => { setEditing(false); setInput(url) }} style={{ padding: '10px 14px', borderRadius: '10px', fontSize: '13px', background: 'rgba(255,255,255,0.10)', border: '1px solid rgba(255,255,255,0.1)', color: '#A99ECC', cursor: 'pointer' }}>
            Cancel
          </button>
        </div>
      )
    }

    return (
      <div style={{ marginTop: '12px' }}>
        {url ? (
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <a href={url} target="_blank" rel="noopener noreferrer" style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 16px', borderRadius: '12px', background: 'rgba(39,174,239,0.08)', border: '1px solid rgba(39,174,239,0.2)', textDecoration: 'none' }}>
              <Send size={18} color="#29B6F6" strokeWidth={2} />
              <span style={{ fontSize: '14px', fontWeight: 600, color: '#29B6F6' }}>Join Telegram Community</span>
            </a>
            <button onClick={() => { setEditing(true); setInput(url) }} style={{ padding: '12px 14px', borderRadius: '12px', fontSize: '12px', background: '#161628', border: '1px solid rgba(255,255,255,0.1)', color: '#A99ECC', cursor: 'pointer' }}>
              Edit
            </button>
          </div>
        ) : (
          <button onClick={() => setEditing(true)} style={{ width: '100%', padding: '10px', borderRadius: '12px', fontSize: '13px', fontWeight: 600, background: 'transparent', border: '1px dashed rgba(39,174,239,0.3)', color: 'rgba(39,174,239,0.7)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
            <Plus size={13} strokeWidth={2.5} /> Add Telegram community link
          </button>
        )}
      </div>
    )
  }

  // Non-captain: just show button if link exists
  if (!url) return null

  return (
    <a href={url} target="_blank" rel="noopener noreferrer" style={{ marginTop: '12px', display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 16px', borderRadius: '12px', background: 'rgba(39,174,239,0.08)', border: '1px solid rgba(39,174,239,0.2)', textDecoration: 'none' }}>
      <Send size={18} color="#29B6F6" strokeWidth={2} />
      <span style={{ fontSize: '14px', fontWeight: 600, color: '#29B6F6' }}>Join Telegram Community</span>
      <span style={{ marginLeft: 'auto', fontSize: '12px', color: '#29B6F6' }}>→</span>
    </a>
  )
}
