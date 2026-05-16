// @ts-nocheck
'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function CallPage({ params }: { params: { roomId: string } }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const callId = searchParams.get('call_id')
  const preToken = searchParams.get('token')

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState<'connecting' | 'active' | 'ended'>('connecting')
  const [muted, setMuted] = useState(false)
  const [videoOff, setVideoOff] = useState(false)
  const [callDuration, setCallDuration] = useState(0)
  const [otherUser, setOtherUser] = useState<any>(null)

  const containerRef = useRef<HTMLDivElement>(null)
  const callFrameRef = useRef<any>(null)
  const timerRef = useRef<any>(null)
  const startedAtRef = useRef<number | null>(null)
  const endedRef = useRef(false)

  useEffect(() => {
    initCall()
    return () => {
      cleanup(false)
    }
  }, [])

  const initCall = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }

      // Load call info
      if (callId) {
        const { data: call } = await supabase
          .from('calls')
          .select('*, caller:users!caller_id(full_name, username, avatar_url), callee:users!callee_id(full_name, username, avatar_url)')
          .eq('id', callId)
          .single()
        if (call) {
          const other = call.caller_id === session.user.id ? call.callee : call.caller
          setOtherUser(other)
        }
      }

      // Get token
      let token = preToken
      if (!token && callId) {
        const res = await fetch('/api/call/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
          body: JSON.stringify({ call_id: callId }),
        })
        const data = await res.json()
        if (!res.ok) { setError(data.error); return }
        token = data.token
      }

      // Load Daily.co SDK
      if (!(window as any).DailyIframe) {
        await new Promise<void>((resolve, reject) => {
          const s = document.createElement('script')
          s.src = 'https://unpkg.com/@daily-co/daily-js'
          s.onload = () => resolve()
          s.onerror = () => reject(new Error('Failed to load Daily.co SDK'))
          document.head.appendChild(s)
        })
      }

      if (!containerRef.current) return

      const DailyIframe = (window as any).DailyIframe
      const roomUrl = `https://bestieapp.daily.co/${params.roomId}`

      // Use createFrame — renders video in an iframe, much more reliable
      const frame = DailyIframe.createFrame(containerRef.current, {
        iframeStyle: {
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          border: 'none',
          borderRadius: '0',
        },
        showLeaveButton: false,
        showFullscreenButton: false,
        showParticipantsBar: false,
        showLocalVideo: true,
        showUserNameChangeUI: false,
      })

      callFrameRef.current = frame

      frame.on('joined-meeting', () => {
        setStatus('active')
        setLoading(false)
        startedAtRef.current = Date.now()
        timerRef.current = setInterval(() => {
          if (startedAtRef.current) {
            setCallDuration(Math.floor((Date.now() - startedAtRef.current) / 1000))
          }
        }, 1000)
      })

      frame.on('left-meeting', () => {
        if (!endedRef.current) {
          endedRef.current = true
          setStatus('ended')
          if (timerRef.current) clearInterval(timerRef.current)
        }
      })

      frame.on('error', (e: any) => {
        console.error('Daily error:', e)
        setError(e.errorMsg || e.error?.msg || 'Call error')
        setLoading(false)
      })

      await frame.join({
        url: roomUrl,
        token: token || undefined,
        startVideoOff: false,
        startAudioOff: false,
      })

    } catch (e: any) {
      console.error('initCall error:', e)
      setError(e.message || 'Failed to start call')
      setLoading(false)
    }
  }

  const cleanup = async (navigate = true) => {
    if (timerRef.current) clearInterval(timerRef.current)
    if (callFrameRef.current) {
      try { await callFrameRef.current.leave() } catch {}
      try { callFrameRef.current.destroy() } catch {}
      callFrameRef.current = null
    }
    if (callId) {
      supabase.from('calls').update({ status: 'ended', ended_at: new Date().toISOString() }).eq('id', callId).then(() => {})
    }
    if (navigate) router.back()
  }

  const endCall = () => {
    endedRef.current = true
    cleanup(true)
  }

  const toggleMute = () => {
    if (!callFrameRef.current) return
    callFrameRef.current.setLocalAudio(muted) // setLocalAudio(true) = unmute
    setMuted(!muted)
  }

  const toggleVideo = () => {
    if (!callFrameRef.current) return
    callFrameRef.current.setLocalVideo(videoOff) // setLocalVideo(true) = turn on
    setVideoOff(!videoOff)
  }

  const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`

  if (status === 'ended') {
    return (
      <div style={{ minHeight: '100vh', background: '#080810', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: 'Plus Jakarta Sans, sans-serif', gap: '16px' }}>
        <span style={{ fontSize: '56px' }}>📞</span>
        <p style={{ fontSize: '20px', fontWeight: 700, color: '#E8E0FF' }}>Call ended</p>
        {callDuration > 0 && <p style={{ fontSize: '14px', color: '#9B93C0' }}>Duration: {fmt(callDuration)}</p>}
        <button onClick={() => router.back()} style={{ marginTop: '8px', padding: '12px 28px', borderRadius: '14px', fontSize: '14px', fontWeight: 700, background: 'linear-gradient(135deg, #D4AF37 0%, #B8960C 100%)', color: '#080810', border: 'none', cursor: 'pointer', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
          Back
        </button>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ minHeight: '100vh', background: '#080810', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: 'Plus Jakarta Sans, sans-serif', gap: '16px' }}>
        <span style={{ fontSize: '48px' }}>⚠️</span>
        <p style={{ fontSize: '16px', color: '#FF6B35', textAlign: 'center', maxWidth: '300px' }}>{error}</p>
        <button onClick={() => router.back()} style={{ padding: '10px 24px', borderRadius: '12px', fontSize: '14px', fontWeight: 600, background: 'rgba(255,255,255,0.08)', color: '#E8E0FF', border: 'none', cursor: 'pointer', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Go back</button>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#080810', display: 'flex', flexDirection: 'column', fontFamily: 'Plus Jakarta Sans, sans-serif', position: 'relative' }}>

      {/* Top bar */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10, padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'linear-gradient(180deg, rgba(8,8,16,0.9) 0%, transparent 100%)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {otherUser?.avatar_url && (
            <img src={otherUser.avatar_url} alt="" style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover', border: '2px solid rgba(212,175,55,0.4)' }} />
          )}
          <div>
            <p style={{ fontSize: '14px', fontWeight: 700, color: '#E8E0FF', margin: 0 }}>{otherUser?.full_name || 'Bestie'}</p>
            <p style={{ fontSize: '11px', color: status === 'active' ? '#39FF14' : '#9B93C0', margin: 0 }}>
              {status === 'active' ? fmt(callDuration) : 'Connecting…'}
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: status === 'active' ? '#39FF14' : '#9B93C0', animation: status !== 'active' ? 'pulse 1.5s ease-in-out infinite' : 'none' }} />
          <span style={{ fontSize: '11px', color: '#9B93C0' }}>BESTIE CALL</span>
        </div>
      </div>

      {/* Daily.co iframe container */}
      <div ref={containerRef} style={{ flex: 1, position: 'relative', background: '#0a0a18', minHeight: '100vh' }}>
        {loading && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px', zIndex: 5, background: '#080810' }}>
            <div style={{ width: '48px', height: '48px', border: '3px solid rgba(212,175,55,0.2)', borderTop: '3px solid #D4AF37', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
            <p style={{ fontSize: '14px', color: '#9B93C0' }}>Connecting…</p>
          </div>
        )}
      </div>

      {/* Bottom controls */}
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 20, padding: '20px', paddingBottom: 'max(20px, env(safe-area-inset-bottom))', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px', background: 'linear-gradient(0deg, rgba(8,8,16,0.95) 0%, transparent 100%)' }}>

        {/* Mute */}
        <button onClick={toggleMute} style={{ width: '56px', height: '56px', borderRadius: '50%', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', background: muted ? 'rgba(255,107,53,0.25)' : 'rgba(255,255,255,0.12)', transition: 'all 0.15s' }}>
          {muted ? '🔇' : '🎤'}
        </button>

        {/* End call */}
        <button onClick={endCall} style={{ width: '68px', height: '68px', borderRadius: '50%', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '26px', background: '#FF3B30', boxShadow: '0 4px 20px rgba(255,59,48,0.4)', transition: 'all 0.15s' }}>
          📵
        </button>

        {/* Video */}
        <button onClick={toggleVideo} style={{ width: '56px', height: '56px', borderRadius: '50%', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', background: videoOff ? 'rgba(255,107,53,0.25)' : 'rgba(255,255,255,0.12)', transition: 'all 0.15s' }}>
          {videoOff ? '📷' : '🎥'}
        </button>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg) } }
        @keyframes pulse { 0%,100% { opacity:1 } 50% { opacity:0.3 } }
      `}</style>
    </div>
  )
}
