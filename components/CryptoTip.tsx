// @ts-nocheck
'use client'

import { useState } from 'react'
import { Copy, Check, Wallet } from 'lucide-react'

// Non-custodial: Bestie never touches the funds. We just display the user's
// wallet address so people can tip them directly.
export default function CryptoTip({ address, chain, name }: { address: string; chain?: string; name?: string }) {
  const [copied, setCopied] = useState(false)
  if (!address) return null

  const copy = () => {
    navigator.clipboard.writeText(address)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const short = address.length > 22 ? `${address.slice(0, 10)}…${address.slice(-8)}` : address

  return (
    <div style={{ background: 'var(--surface-1)', border: '1px solid rgba(212,175,55,0.22)', borderRadius: '18px', padding: '18px', marginBottom: '16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
        <span style={{ width: '34px', height: '34px', borderRadius: '10px', background: 'rgba(212,175,55,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Wallet size={17} color="#D4AF37" strokeWidth={1.9} />
        </span>
        <div>
          <p style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Tip {name || 'them'} in crypto</p>
          <p style={{ fontSize: '11px', color: 'var(--text-dim)', margin: 0 }}>{chain || 'Crypto'} · straight to their wallet, no middleman</p>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '12px' }}>
        <code style={{ flex: 1, minWidth: 0, fontSize: '13px', color: '#D4AF37', background: 'var(--surface-1)', border: '1px solid var(--border)', borderRadius: '10px', padding: '10px 12px', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {short}
        </code>
        <button onClick={copy} style={{ flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '10px 14px', borderRadius: '10px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', background: copied ? 'rgba(52,211,153,0.12)' : 'rgba(212,175,55,0.12)', border: copied ? '1px solid rgba(52,211,153,0.35)' : '1px solid rgba(212,175,55,0.35)', color: copied ? '#34D399' : '#D4AF37', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
          {copied ? <><Check size={14} strokeWidth={2.5} /> Copied</> : <><Copy size={14} strokeWidth={2} /> Copy</>}
        </button>
      </div>
    </div>
  )
}
