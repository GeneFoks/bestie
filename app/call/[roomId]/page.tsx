// @ts-nocheck
'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { PageLoader } from '@/components/Loading'
import { Phone, PhoneOff, AlertTriangle } from 'lucide-react'

export default function CallPage({ params }: { params: { roomId: string } }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const callId = searchParams.get('call_id')

  const [loading, setLoading] = useState(true)
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

      if (callId) {
        const { data: call } = await supabase
          .from('calls')
          .select('*, caller:users!caller_id(full_name, username, avatar_url), callee:users!callee_id(full_name, username, avatar_url)')
          .eq('id', callId)
          .single()

        if (call) {
          setOtherUser(call.caller_id === session.user.id ? call.callee : call.caller)

          // If callee (no token in URL), mark call as active
          if (call.callee_id === session.user.id && call.status === 'ringing') {
            await supabase.from('calls').update({
              status: 'active',
              started_at: new Date().toISOString(),
            }).eq('id', callId)
          }
        }
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

  // Jitsi Meet room URL — completely free, no API key needed
  const jitsiUrl = `https://meet.jit.si/${params.roomId}`

  if (ended) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: 'Plus Jakarta Sans, sans-serif', gap: '16px' }}>
        <div style={{ width: '72px', height: '72px', borderRadius: '18px', background: 'rgba(212,175,55,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Phone size={36} color="#D4AF37" strokeWidth={2} />
        </div>
        <p style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)' }}>Call ended</p>
        <button onClick={() => router.back()} style={{ marginTop: '8px', padding: '12px 28px', borderRadius: '14px', fontSize: '14px', fontWeight: 700, background: 'linear-gradient(135deg, #D4AF37 0%, #B8960C 100%)', color: '#09090F', border: 'none', cursor: 'pointer', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
          Back
        </button>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: 'Plus Jakarta Sans, sans-serif', gap: '16px', padding: '24px' }}>
        <div style={{ width: '64px', height: '64px', borderRadius: '16px', background: 'rgba(255,107,53,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <AlertTriangle size={32} color="#FF6B35" strokeWidth={2} />
        </div>
        <p style={{ fontSize: '16px', color: '#FF6B35', textAlign: 'center' }}>{error}</p>
        <button onClick={() => router.back()} style={{ padding: '10px 24px', borderRadius: '12px', fontSize: '14px', fontWeight: 600, background: 'var(--overlay-2)', color: 'var(--text-primary)', border: 'none', cursor: 'pointer', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Go back</button>
      </div>
    )
  }

  if (loading) {
    return <PageLoader message="Connecting…" />
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'var(--bg)', display: 'flex', flexDirection: 'column', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>

      {/* Top bar */}
      <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: 'var(--nav-bg)', borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {otherUser?.avatar_url && (
            <img src={otherUser.avatar_url} alt="" style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover', border: '2px solid rgba(212,175,55,0.4)' }} />
          )}
          <div>
            <p style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>{otherUser?.full_name || 'Bestie'}</p>
            <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: 0 }}>BESTIE CALL</p>
          </div>
        </div>

        <button
          onClick={leaveCall}
          style={{ padding: '8px 18px', borderRadius: '20px', border: 'none', background: '#FF3B30', color: '#fff', fontSize: '13px', fontWeight: 700, cursor: 'pointer', fontFamily: 'Plus Jakarta Sans, sans-serif', display: 'inline-flex', alignItems: 'center', gap: '8px' }}
        >
          <PhoneOff size={14} strokeWidth={2} /> End call
        </button>
      </div>

      {/* Jitsi Meet iframe */}
      <iframe
        src={jitsiUrl}
        allow="camera; microphone; fullscreen; speaker; display-capture; autoplay"
        style={{ flex: 1, border: 'none', background: '#0a0a18' }}
        title="Bestie Call"
      />
    </div>
  )
}
