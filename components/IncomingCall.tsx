// @ts-nocheck
'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Phone, PhoneOff } from 'lucide-react'

export default function IncomingCall() {
  const router = useRouter()
  const [call, setCall] = useState<any>(null)
  const [caller, setCaller] = useState<any>(null)
  const [acting, setActing] = useState(false)
  const channelRef = useRef<any>(null)
  const timeoutRef = useRef<any>(null)
  const acceptBtnRef = useRef<HTMLButtonElement>(null)

  // Auto-focus Accept when a call comes in, allow Escape to decline
  useEffect(() => {
    if (!call) return
    acceptBtnRef.current?.focus()
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') decline() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [call])

  useEffect(() => {
    const setup = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      channelRef.current = supabase
        .channel(`incoming-call-${user.id}`)
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'calls',
          filter: `callee_id=eq.${user.id}`,
        }, async (payload) => {
          const newCall = payload.new
          if (newCall.status !== 'ringing') return

          const { data: callerUser } = await supabase
            .from('users')
            .select('id, full_name, username, avatar_url')
            .eq('id', newCall.caller_id)
            .single()

          setCall(newCall)
          setCaller(callerUser)

          // Auto-miss after 45s
          timeoutRef.current = setTimeout(() => {
            supabase.from('calls').update({ status: 'missed' }).eq('id', newCall.id).eq('status', 'ringing')
            dismiss()
          }, 45000)
        })
        .on('postgres_changes', {
          event: 'UPDATE',
          schema: 'public',
          table: 'calls',
          filter: `callee_id=eq.${user.id}`,
        }, (payload) => {
          if (payload.new.status !== 'ringing') dismiss()
        })
        .subscribe()
    }

    setup()
    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current)
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [])

  const dismiss = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    setCall(null)
    setCaller(null)
  }

  const accept = async () => {
    if (!call || acting) return
    setActing(true)

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { dismiss(); return }

    // Mark call active
    await fetch('/api/call/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
      body: JSON.stringify({ call_id: call.id }),
    })

    const roomName = call.room_name
    dismiss()
    router.push(`/call/${roomName}?call_id=${call.id}`)
  }

  const decline = async () => {
    if (!call || acting) return
    setActing(true)
    await supabase.from('calls').update({ status: 'declined' }).eq('id', call.id)
    dismiss()
  }

  if (!call || !caller) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Incoming call from ${caller.full_name}`}
      style={{
      position: 'fixed', top: '16px', left: '50%', transform: 'translateX(-50%)',
      zIndex: 9999, width: 'min(400px, calc(100vw - 32px))',
      background: '#0F0F1E', border: '1px solid rgba(52,211,153,0.4)',
      borderRadius: '24px', padding: '20px',
      boxShadow: '0 8px 40px rgba(52,211,153,0.15), 0 4px 20px rgba(0,0,0,0.6)',
      fontFamily: 'Plus Jakarta Sans, sans-serif',
      animation: 'icSlideDown 0.3s ease',
    }}>
      <style>{`
        @keyframes icSlideDown {
          from { opacity: 0; transform: translateX(-50%) translateY(-20px); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
        @keyframes icPulse {
          0%,100% { box-shadow: 0 0 0 0 rgba(52,211,153,0.5); }
          50%      { box-shadow: 0 0 0 10px rgba(52,211,153,0); }
        }
      `}</style>

      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '18px' }}>
        <div style={{
          width: '52px', height: '52px', borderRadius: '16px', overflow: 'hidden',
          background: '#1a1a35', flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          animation: 'icPulse 1.5s ease-in-out infinite',
          border: '2px solid rgba(52,211,153,0.6)',
        }}>
          {caller.avatar_url
            ? <img src={caller.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : <span style={{ color: '#D4AF37', fontWeight: 700, fontSize: '18px' }}>{caller.full_name?.[0]}</span>
          }
        </div>
        <div>
          <p style={{ fontSize: '12px', fontWeight: 600, letterSpacing: '1.5px', color: '#34D399', marginBottom: '2px' }}>INCOMING CALL</p>
          <p style={{ fontSize: '16px', fontWeight: 700, color: '#E8E0FF' }}>{caller.full_name}</p>
          <p style={{ fontSize: '12px', color: '#9B93C0' }}>@{caller.username}</p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '10px' }}>
        <button onClick={decline} disabled={acting} style={{
          flex: 1, padding: '13px', borderRadius: '14px', fontSize: '14px', fontWeight: 700,
          background: 'rgba(255,59,48,0.12)', border: '1px solid rgba(255,59,48,0.3)',
          color: '#FF3B30', cursor: acting ? 'not-allowed' : 'pointer',
          fontFamily: 'Plus Jakarta Sans, sans-serif',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
        }}>
          <PhoneOff size={16} strokeWidth={2.2} /> Decline
        </button>
        <button ref={acceptBtnRef} onClick={accept} disabled={acting} style={{
          flex: 1, padding: '13px', borderRadius: '14px', fontSize: '14px', fontWeight: 700,
          background: 'linear-gradient(135deg, #34D399 0%, #10B981 100%)',
          border: 'none', color: '#080810', cursor: acting ? 'not-allowed' : 'pointer',
          fontFamily: 'Plus Jakarta Sans, sans-serif',
          boxShadow: '0 4px 16px rgba(52,211,153,0.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
        }}>
          <Phone size={16} strokeWidth={2.2} /> Accept
        </button>
      </div>
    </div>
  )
}
