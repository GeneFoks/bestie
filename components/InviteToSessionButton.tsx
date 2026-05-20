'use client'

import { useState } from 'react'
import { Send } from 'lucide-react'

type Props = {
  username: string
  activityType?: string
}

export default function InviteToSessionButton({ username, activityType }: Props) {
  const [copied, setCopied] = useState(false)
  const [open, setOpen] = useState(false)
  const [msg, setMsg] = useState('')

  const getLink = () => {
    let url = `https://bestiehere.com/invite/${username}`
    const params = new URLSearchParams()
    if (activityType) params.set('activity', activityType)
    if (msg.trim()) params.set('msg', msg.trim())
    const qs = params.toString()
    return qs ? `${url}?${qs}` : url
  }

  const copy = () => {
    navigator.clipboard.writeText(getLink())
    setCopied(true)
    setOpen(false)
    setTimeout(() => setCopied(false), 2000)
  }

  if (open) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <textarea
          value={msg}
          onChange={e => setMsg(e.target.value)}
          placeholder="Add a personal message (optional)..."
          rows={2}
          style={{ padding: '10px 14px', borderRadius: '10px', fontSize: '13px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#E8E0FF', resize: 'none', fontFamily: 'Plus Jakarta Sans, sans-serif', outline: 'none' }}
        />
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={copy} style={{ flex: 1, padding: '10px', borderRadius: '10px', fontSize: '13px', fontWeight: 700, background: 'linear-gradient(135deg, #D4AF37 0%, #B8960C 100%)', color: '#080810', border: 'none', cursor: 'pointer' }}>
            Copy invite link
          </button>
          <button onClick={() => setOpen(false)} style={{ padding: '10px 14px', borderRadius: '10px', fontSize: '13px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#9B93C0', cursor: 'pointer' }}>
            Cancel
          </button>
        </div>
      </div>
    )
  }

  return (
    <button
      onClick={() => setOpen(true)}
      style={{
        display: 'block',
        width: '100%',
        padding: '12px',
        borderRadius: '12px',
        fontSize: '14px',
        fontWeight: 600,
        textAlign: 'center',
        background: copied ? 'rgba(57,255,20,0.1)' : 'rgba(255,255,255,0.06)',
        border: copied ? '1px solid rgba(57,255,20,0.3)' : '1px solid rgba(255,255,255,0.1)',
        color: copied ? '#39FF14' : '#9B93C0',
        cursor: 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
      }}
    >
      {copied ? '✓ Link copied!' : (<><Send size={13} strokeWidth={2} /> Invite to session</>)}
    </button>
  )
}
