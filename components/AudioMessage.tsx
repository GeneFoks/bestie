'use client'

import { useRef, useState, useEffect } from 'react'
import { Play, Pause } from 'lucide-react'

type Props = {
  url: string
  durationSec?: number | null
}

/**
 * Compact audio message bubble for chat — play/pause + bar showing progress.
 * Uses a hidden <audio> element controlled by state.
 */
export default function AudioMessage({ url, durationSec }: Props) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [playing, setPlaying] = useState(false)
  const [progress, setProgress] = useState(0) // 0..1
  const [actualDuration, setActualDuration] = useState<number>(durationSec || 0)

  useEffect(() => {
    const a = audioRef.current
    if (!a) return
    const onTime = () => setProgress(a.duration > 0 ? a.currentTime / a.duration : 0)
    const onLoaded = () => { if (isFinite(a.duration)) setActualDuration(Math.round(a.duration)) }
    const onEnd = () => { setPlaying(false); setProgress(0); a.currentTime = 0 }
    a.addEventListener('timeupdate', onTime)
    a.addEventListener('loadedmetadata', onLoaded)
    a.addEventListener('ended', onEnd)
    return () => {
      a.removeEventListener('timeupdate', onTime)
      a.removeEventListener('loadedmetadata', onLoaded)
      a.removeEventListener('ended', onEnd)
    }
  }, [url])

  const toggle = () => {
    const a = audioRef.current
    if (!a) return
    if (playing) { a.pause(); setPlaying(false) }
    else { a.play().then(() => setPlaying(true)).catch(() => setPlaying(false)) }
  }

  const fmt = (s: number) => {
    if (!isFinite(s) || s <= 0) return '0:00'
    const m = Math.floor(s / 60)
    const sec = Math.floor(s % 60).toString().padStart(2, '0')
    return `${m}:${sec}`
  }

  // Generate a fixed-pattern "waveform" of 24 vertical bars from the URL hash
  // so each message has a unique-looking bar without storing real waveform data.
  const bars = (() => {
    let h = 0
    for (let i = 0; i < url.length; i++) h = (h * 31 + url.charCodeAt(i)) | 0
    return Array.from({ length: 24 }, (_, i) => {
      const v = Math.abs(Math.sin(h + i * 7.31))
      return 0.25 + v * 0.75
    })
  })()

  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', padding: '8px 12px', borderRadius: '14px', background: 'rgba(155,127,255,0.10)', border: '1px solid rgba(155,127,255,0.25)', maxWidth: '320px' }}>
      <audio ref={audioRef} src={url} preload="metadata" />
      <button
        onClick={toggle}
        aria-label={playing ? 'Pause audio' : 'Play audio'}
        style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'linear-gradient(135deg, #9B7FFF 0%, #7E5CFF 100%)', border: 'none', color: '#09090F', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
      >
        {playing ? <Pause size={15} strokeWidth={2.4} fill="#09090F" /> : <Play size={15} strokeWidth={2.4} fill="#09090F" style={{ marginLeft: '2px' }} />}
      </button>
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '2px', minWidth: '120px', height: '24px' }}>
        {bars.map((v, i) => {
          const reached = i / bars.length <= progress
          return (
            <div
              key={i}
              style={{
                width: '3px',
                height: `${v * 100}%`,
                borderRadius: '2px',
                background: reached ? '#9B7FFF' : 'rgba(155,127,255,0.30)',
                transition: 'background 0.12s',
              }}
            />
          )
        })}
      </div>
      <span style={{ fontSize: '11px', fontFamily: 'monospace', color: '#A99ECC', flexShrink: 0 }}>
        {fmt(actualDuration)}
      </span>
    </div>
  )
}
