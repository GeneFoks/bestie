// @ts-nocheck
'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function CallPage({ params }: { params: { roomId: string } }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const callId = searchParams.get('call_id')
  const preToken = searchParams.get('token')

  const [token, setToken] = useState<string | null>(preToken)
  const [loading, setLoading] = useState(!preToken)
  const [error, setError] = useState<string | null>(null)
  const [otherUser, setOtherUser] = useState<any>(null)
  const [ended, setEnded] = useState(false)

  useEffect(() => {
    init()
  }, [])

  const init = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }

      // Load other user info
      if (callId) {
        const { data: call } = await supabase
          .from('calls')
          .select('*, caller:users!caller_id(full_name, username, avatar_url), callee:users!callee_id(full_name, username, avatar_url)')
          .eq('id', callId)
          .single()
        if (call) {
          setOtherUser(call.caller_id === session.user.id ? call.callee : call.caller)
        }
      }

      // If no token in URL (callee), fetch one
      if (!preToken && callId) {
        const res = await fetch('/api/call/token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ call_id: callId }),
        })
        const data = await res.json()
        if (!res.ok) { setError(data.error || 'Could not get token'); return }
        setToken(data.token)
      }

      setLoading(false)
    } catch (e: any) {
      setError(e.message || 'Failed to join call')
      setLoading(false)
    }
  }

  const leaveCall = async () => {
    setEnded(true)
    if (callId) {
      await supabase.from('calls').update({
        status: 'ended',
        ended_at: new Date().toISOString(),
      }).eq('id', callId)
    }
    router.back()
  }

  const roomUrl = token
    ? `https://bestieapp.daily.co/${params.roomId}?t=${token}`
    : `https://bestieapp.daily.co/${params.roomId}`

  if (ended) {
    return (
      <div style={{ minHeight: '100vh', background: '#080810', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: 'Plus Jakarta Sans, sans-serif', gap: '16px' }}>
        <span style={{ fontSize: '56px' }}>📞</span>
        <p style={{ fontSize: '20px', fontWeight: 700, color: '#E8E0FF' }}>Call ended</p>
        <button onClick={() => router.back()} style={{ marginTop: '8px', padding: '12px 28px', borderRadius: '14px', fontSize: '14px', fontWeight: 700, background: 'linear-gradient(135deg, #D4AF37 0%, #B8960C 100%)', color: '#080810', border: 'none', cursor: 'pointer', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
          Back
        </button>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ minHeight: '100vh', background: '#080810', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: 'Plus Jakarta Sans, sans-serif', gap: '16px', padding: '24px' }}>
        <span style={{ fontSize: '48px' }}>⚠️</span>
        <p style={{ fontSize: '16px', color: '#FF6B35', textAlign: 'center' }}>{error}</p>
        <button onClick={() => router.back()} style={{ padding: '10px 24px', borderRadius: '12px', fontSize: '14px', fontWeight: 600, background: 'rgba(255,255,255,0.08)', color: '#E8E0FF', border: 'none', cursor: 'pointer', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Go back</button>
      </div>
    )
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#080810', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: 'Plus Jakarta Sans, sans-serif', gap: '16px' }}>
        <div style={{ width: '48px', height: '48px', border: '3px solid rgba(212,175,55,0.2)', borderTop: '3px solid #D4AF37', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        <p style={{ fontSize: '14px', color: '#9B93C0' }}>Connecting…</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    )
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#080810', display: 'flex', flexDirection: 'column', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>

      {/* Top bar */}
      <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: 'rgba(8,8,16,0.95)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {otherUser?.avatar_url && (
            <img src={otherUser.avatar_url} alt="" style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover', border: '2px solid rgba(212,175,55,0.4)' }} />
          )}
          <div>
            <p style={{ fontSize: '14px', fontWeight: 700, color: '#E8E0FF', margin: 0 }}>{otherUser?.full_name || 'Bestie'}</p>
            <p style={{ fontSize: '11px', color: '#9B93C0', margin: 0 }}>BESTIE CALL</p>
          </div>
        </div>

        {/* End call button */}
        <button
          onClick={leaveCall}
          style={{ padding: '8px 16px', borderRadius: '20px', border: 'none', background: '#FF3B30', color: '#fff', fontSize: '13px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontFamily: 'Plus Jakarta Sans, sans-serif' }}
        >
          📵 End call
        </button>
      </div>

      {/* Daily.co iframe — full screen, no SDK needed */}
      <iframe
        src={roomUrl}
        allow="camera; microphone; fullscreen; speaker; display-capture; autoplay"
        style={{ flex: 1, border: 'none', background: '#0a0a18' }}
        title="Bestie Call"
      />
    </div>
  )
}
