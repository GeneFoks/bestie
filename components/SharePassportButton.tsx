// @ts-nocheck
'use client'

import { useState } from 'react'
import { Share2 } from 'lucide-react'

type Props = {
  username: string
}

export default function SharePassportButton({ username }: Props) {
  const [copied, setCopied] = useState(false)

  const share = async () => {
    const url = `https://bestiehere.com/${username}`
    if (navigator.share) {
      try {
        await navigator.share({ title: 'My Bestie Passport', url })
        return
      } catch {}
    }
    navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button
      onClick={share}
      style={{
        padding: '8px 16px',
        borderRadius: '12px',
        fontSize: '13px',
        fontWeight: 600,
        background: copied ? 'rgba(52,211,153,0.1)' : 'rgba(212,175,55,0.1)',
        border: copied ? '1px solid rgba(52,211,153,0.3)' : '1px solid rgba(212,175,55,0.25)',
        color: copied ? '#34D399' : '#D4AF37',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
      }}
    >
      {copied ? '✓ Copied!' : (<><Share2 size={13} strokeWidth={2} /> Share Passport</>)}
    </button>
  )
}
