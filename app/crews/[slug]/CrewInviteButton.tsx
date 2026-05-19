'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

type Props = {
  crewId: string
  captainId: string
  crewSlug: string
  inviteCode: string
}

export default function CrewInviteButton({ crewId, captainId, crewSlug, inviteCode }: Props) {
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setCurrentUserId(session?.user?.id ?? null)
    })
  }, [])

  if (!currentUserId || currentUserId !== captainId) return null

  const link = `https://bestiehere.com/crews/${crewSlug}?invite=${inviteCode}`

  const copy = () => {
    navigator.clipboard.writeText(link)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div style={{ marginTop: '12px', padding: '14px 16px', borderRadius: '14px', background: 'rgba(212,175,55,0.05)', border: '1px solid rgba(212,175,55,0.15)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
        <span style={{ fontSize: '12px', fontWeight: 600, color: '#D4AF37', letterSpacing: '1px' }}>INVITE LINK</span>
        <span style={{ fontSize: '11px', color: '#A99ECC' }}>Anyone with this link joins instantly</span>
      </div>
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        <div style={{ flex: 1, padding: '8px 12px', borderRadius: '10px', background: 'rgba(0,0,0,0.3)', fontSize: '12px', color: '#A99ECC', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          bestiehere.com/crews/{crewSlug}?invite={inviteCode}
        </div>
        <button onClick={copy} style={{ padding: '8px 16px', borderRadius: '10px', fontSize: '13px', fontWeight: 600, background: copied ? 'rgba(57,255,20,0.15)' : 'linear-gradient(135deg, #D4AF37 0%, #B8960C 100%)', border: copied ? '1px solid rgba(57,255,20,0.3)' : 'none', color: copied ? '#34D399' : '#09090F', cursor: 'pointer', flexShrink: 0 }}>
          {copied ? '✓ Copied' : 'Copy'}
        </button>
      </div>
    </div>
  )
}
