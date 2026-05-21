'use client'

import { useState, useRef, useEffect } from 'react'
import { Mic, X, Send, Square } from 'lucide-react'

type Props = {
  onSend: (blob: Blob, durationSec: number) => Promise<void> | void
  disabled?: boolean
}

/**
 * Hold-to-record audio recorder. Renders as an icon button by default.
 * While recording, expands into a row with timer + cancel + send buttons.
 *
 * Uses MediaRecorder (webm/opus) — supported in Chrome / Edge / Firefox.
 * iOS Safari 14.5+ supports it too. Falls back to mp4 if available.
 *
 * Caps recordings at 60 seconds.
 */
export default function AudioRecorder({ onSend, disabled }: Props) {
  const [permissionDenied, setPermissionDenied] = useState(false)
  const [recording, setRecording] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [sending, setSending] = useState(false)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const streamRef = useRef<MediaStream | null>(null)
  const startedAtRef = useRef<number>(0)
  const tickerRef = useRef<any>(null)
  const cancelledRef = useRef<boolean>(false)

  const MAX_SECONDS = 60

  useEffect(() => () => {
    // Cleanup on unmount
    if (tickerRef.current) clearInterval(tickerRef.current)
    streamRef.current?.getTracks().forEach(t => t.stop())
  }, [])

  const start = async () => {
    if (disabled || recording || sending) return
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/mp4')
          ? 'audio/mp4'
          : ''
      const rec = new MediaRecorder(stream, mimeType ? { mimeType } : undefined)
      recorderRef.current = rec
      chunksRef.current = []
      cancelledRef.current = false

      rec.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data) }
      rec.onstop = async () => {
        const duration = Math.round((Date.now() - startedAtRef.current) / 1000)
        streamRef.current?.getTracks().forEach(t => t.stop())
        streamRef.current = null
        if (cancelledRef.current || chunksRef.current.length === 0 || duration < 1) {
          chunksRef.current = []
          return
        }
        const blob = new Blob(chunksRef.current, { type: rec.mimeType || 'audio/webm' })
        chunksRef.current = []
        setSending(true)
        try { await onSend(blob, duration) } finally { setSending(false) }
      }

      rec.start()
      startedAtRef.current = Date.now()
      setRecording(true)
      setElapsed(0)
      tickerRef.current = setInterval(() => {
        const sec = Math.floor((Date.now() - startedAtRef.current) / 1000)
        setElapsed(sec)
        if (sec >= MAX_SECONDS) finish()
      }, 250)
    } catch (e) {
      setPermissionDenied(true)
    }
  }

  const finish = () => {
    if (tickerRef.current) { clearInterval(tickerRef.current); tickerRef.current = null }
    setRecording(false)
    recorderRef.current?.stop()
  }

  const cancel = () => {
    cancelledRef.current = true
    if (tickerRef.current) { clearInterval(tickerRef.current); tickerRef.current = null }
    setRecording(false)
    recorderRef.current?.stop()
  }

  const fmt = (s: number) => {
    const m = Math.floor(s / 60).toString().padStart(2, '0')
    const sec = (s % 60).toString().padStart(2, '0')
    return `${m}:${sec}`
  }

  if (permissionDenied) {
    return (
      <button
        onClick={() => setPermissionDenied(false)}
        title="Mic permission denied"
        aria-label="Microphone permission denied"
        style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'rgba(255,107,53,0.10)', border: '1px solid rgba(255,107,53,0.30)', color: '#FF6B35', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
      >
        <Mic size={18} strokeWidth={1.8} />
      </button>
    )
  }

  if (recording) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 10px', borderRadius: '12px', background: 'rgba(212,175,55,0.10)', border: '1px solid rgba(212,175,55,0.35)' }}>
        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#FF6B35', boxShadow: '0 0 8px rgba(255,107,53,0.6)', animation: 'rec-pulse 1.2s ease-in-out infinite' }} />
        <span style={{ fontSize: '13px', fontFamily: 'monospace', color: '#F0EAFF', minWidth: '42px' }}>{fmt(elapsed)}</span>
        <button onClick={cancel} aria-label="Cancel recording" style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(255,107,53,0.10)', border: '1px solid rgba(255,107,53,0.30)', color: '#FF6B35', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <X size={14} strokeWidth={2} />
        </button>
        <button onClick={finish} aria-label="Send audio" style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'linear-gradient(135deg, #D4AF37 0%, #B8960C 100%)', border: 'none', color: '#09090F', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Send size={14} strokeWidth={2.2} />
        </button>
        <style>{`@keyframes rec-pulse { 0%,100% { opacity: 1 } 50% { opacity: 0.5 } }`}</style>
      </div>
    )
  }

  return (
    <button
      onClick={start}
      disabled={disabled || sending}
      title="Record audio (up to 60s)"
      aria-label="Record audio message"
      style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.10)', color: '#A99ECC', cursor: disabled || sending ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
    >
      <Mic size={18} strokeWidth={1.8} />
    </button>
  )
}
