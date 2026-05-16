// @ts-nocheck
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

interface CallButtonProps {
  toUserId: string
  toUserName?: string
  bookingId?: string
  variant?: 'icon' | 'full'
}

export default function CallButton({ toUserId, toUserName, bookingId, variant = 'icon' }: CallButtonProps) {
  const router = useRouter()
  const [calling, setCalling] = useState(false)

  const startCall = async (e: React.MouseEvent) => {
    e.preventDefault()
    if (calling) return
    setCalling(true)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }

      const res = await fetch('/api/call/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ to_user_id: toUserId, booking_id: bookingId || null }),
      })

      const data = await res.json()
      if (!res.ok) { alert(data.error || 'Could not start call'); return }

      router.push(`/call/${data.room_name}?call_id=${data.call_id}`)
    } catch (err: any) {
      alert(err.message || 'Failed to start call')
    } finally {
      setCalling(false)
    }
  }

  if (variant === 'full') {
    return (
      <button
        onClick={startCall}
        disabled={calling}
        style={{
          flex: 1, padding: '10px', borderRadius: '10px', fontSize: '13px', fontWeight: 600,
          background: calling ? 'rgba(57,255,20,0.04)' : 'rgba(57,255,20,0.08)',
          border: '1px solid rgba(57,255,20,0.2)',
          color: calling ? '#9B93C0' : '#39FF14',
          cursor: calling ? 'not-allowed' : 'pointer',
          fontFamily: 'Plus Jakarta Sans, sans-serif',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
        }}
      >
        {calling ? (
          <><span style={{ display: 'inline-block', width: '12px', height: '12px', border: '2px solid rgba(57,255,20,0.2)', borderTop: '2px solid #39FF14', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />Calling…</>
        ) : (
          <>📞 Call{toUserName ? ` ${toUserName.split(' ')[0]}` : ''}</>
        )}
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </button>
    )
  }

  return (
    <button
      onClick={startCall}
      disabled={calling}
      title={toUserName ? `Call ${toUserName}` : 'Start call'}
      style={{
        width: '36px', height: '36px', borderRadius: '10px',
        border: '1px solid rgba(57,255,20,0.25)',
        background: calling ? 'rgba(57,255,20,0.04)' : 'rgba(57,255,20,0.1)',
        color: '#39FF14', fontSize: '16px',
        cursor: calling ? 'not-allowed' : 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}
    >
      {calling
        ? <span style={{ display: 'inline-block', width: '14px', height: '14px', border: '2px solid rgba(57,255,20,0.2)', borderTop: '2px solid #39FF14', borderRadius: '50%', animation: 'cbspin 1s linear infinite' }} />
        : '📞'
      }
      <style>{`@keyframes cbspin { to { transform: rotate(360deg) } }`}</style>
    </button>
  )
}
