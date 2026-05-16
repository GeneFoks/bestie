// @ts-nocheck
'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function IncomingCall() {
  const router = useRouter()
  const [call, setCall] = useState<any>(null)
  const [caller, setCaller] = useState<any>(null)
  const [declining, setDeclining] = useState(false)
  const channelRef = useRef<any>(null)
  const timeoutRef = useRef<any>(null)

  useEffect(() => {
    let userId: string | null = null

    const setup = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      userId = user.id

      // Subscribe to new calls where I am the callee
      channelRef.current = supabase
        .channel(`incoming-call-${userId}`)
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'calls',
          filter: `callee_id=eq.${userId}`,
        }, async (payload) => {
          const newCall = payload.new
          if (newCall.status !== 'ringing') return

          // Fetch caller info
          const { data: callerUser } = await supabase
            .from('users')
            .select('id, full_name, username, avatar_url')
            .eq('id', newCall.caller_id)
            .single()

          setCall(newCall)
          setCaller(callerUser)

          // Auto-dismiss after 45s (missed call)
          timeoutRef.current = setTimeout(() => {
            handleMiss(newCall.id)
          }, 45000)
        })
        .on('postgres_changes', {
          event: 'UPDATE',
          schema: 'public',
          table: 'calls',
          filter: `callee_id=eq.${userId}`,
        }, (payload) => {
          // If call was ended/declined by caller while ringing, dismiss banner
          if (payload.new.status !== 'ringing') {
            dismissBanner()
          }
        })
        .subscribe()
    }

    setup()

    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current)
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [])

  const dismissBanner = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    setCall(null)
    setCaller(null)
  }

  const handleMiss = async (callId: string) => {
    await supabase.from('calls').update({ status: 'missed' }).eq('id', callId).eq('status', 'ringing')
    dismissBanner()
  }

  const accept = async () => {
    if (!call) return
    if (timeoutRef.current) clearTimeout(timeoutRef.current)

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return

    // Get token for callee
    const res = await fetch('/api/call/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ call_id: call.id }),
    })
    const data = await res.json()
    if (!res.ok) {
      alert(data.error || 'Could not join call')
      dismissBanner()
      return
    }

    dismissBanner()
    const roomName = call.room_url.split('/').pop()
    router.push(`/call/${roomName}?call_id=${call.id}&token=${data.token}`)
  }

  const decline = async () => {
    if (!call || declining) return
    setDeclining(true)
    await supabase.from('calls').update({ status: 'declined' }).eq('id', call.id)
    setDeclining(false)
    dismissBanner()
  }

  if (!call || !caller) return null

  return (
    <div style={{
      position: 'fixed',
      top: '16px',
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 9999,
      width: 'min(400px, calc(100vw - 32px))',
      background: '#0F0F1E',
      border: '1px solid rgba(57,255,20,0.4)',
      borderRadius: '24px',
      padding: '20px',
      boxShadow: '0 8px 40px rgba(57,255,20,0.15), 0 4px 20px rgba(0,0,0,0.6)',
      fontFamily: 'Plus Jakarta Sans, sans-serif',
      animation: 'slideDown 0.3s ease',
    }}>
      <style>{`
        @keyframes slideDown {
          from { opacity: 0; transform: translateX(-50%) translateY(-20px); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
        @keyframes pulse-ring {
          0%,100% { box-shadow: 0 0 0 0 rgba(57,255,20,0.5); }
          50%      { box-shadow: 0 0 0 10px rgba(57,255,20,0); }
        }
      `}</style>

      {/* Pulse ring around avatar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '18px' }}>
        <div style={{
          width: '52px', height: '52px', borderRadius: '16px', overflow: 'hidden',
          background: '#1a1a35', flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          animation: 'pulse-ring 1.5s ease-in-out infinite',
          border: '2px solid rgba(57,255,20,0.6)',
        }}>
          {caller.avatar_url
            ? <img src={caller.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : <span style={{ color: '#D4AF37', fontWeight: 700, fontSize: '18px' }}>{caller.full_name?.[0]}</span>
          }
        </div>
        <div>
          <p style={{ fontSize: '12px', fontWeight: 600, letterSpacing: '1.5px', color: '#39FF14', marginBottom: '2px' }}>INCOMING CALL</p>
          <p style={{ fontSize: '16px', fontWeight: 700, color: '#E8E0FF' }}>{caller.full_name}</p>
          <p style={{ fontSize: '12px', color: '#9B93C0' }}>@{caller.username}</p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '10px' }}>
        {/* Decline */}
        <button
          onClick={decline}
          disabled={declining}
          style={{
            flex: 1, padding: '13px', borderRadius: '14px', fontSize: '14px', fontWeight: 700,
            background: 'rgba(255,59,48,0.12)', border: '1px solid rgba(255,59,48,0.3)',
            color: '#FF3B30', cursor: 'pointer', fontFamily: 'Plus Jakarta Sans, sans-serif',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
          }}
        >
          📵 Decline
        </button>

        {/* Accept */}
        <button
          onClick={accept}
          style={{
            flex: 1, padding: '13px', borderRadius: '14px', fontSize: '14px', fontWeight: 700,
            background: 'linear-gradient(135deg, #39FF14 0%, #2AE600 100%)',
            border: 'none', color: '#080810', cursor: 'pointer',
            fontFamily: 'Plus Jakarta Sans, sans-serif',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
            boxShadow: '0 4px 16px rgba(57,255,20,0.3)',
          }}
        >
          📞 Accept
        </button>
      </div>
    </div>
  )
}
