'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { X, Sparkles } from 'lucide-react'

interface MatchModalProps {
  onClose: () => void
}

const ACTIVITIES = [
  { id: 'meet_irl', emoji: '🤝', label: 'Meet IRL' },
  { id: 'dance_crew', emoji: '💃', label: 'Dance Crew' },
  { id: 'trail_crew', emoji: '🥾', label: 'Trail Crew' },
  { id: 'travel_buddy', emoji: '✈️', label: 'Travel Buddy' },
  { id: 'game_night', emoji: '🎮', label: 'Game Night' },
  { id: 'watch_together', emoji: '🎬', label: 'Watch Together' },
  { id: 'vibe_call', emoji: '📱', label: 'Vibe Call' },
  { id: 'deep_chat', emoji: '🫂', label: 'Deep Chat' },
  { id: 'real_talk', emoji: '💬', label: 'Real Talk' },
  { id: 'festival_crew', emoji: '🎪', label: 'Festival Crew' },
  { id: 'epic_journey', emoji: '🌍', label: 'Epic Journey' },
  { id: 'fishing_crew', emoji: '🎣', label: 'Fishing Crew' },
]

export default function MatchModal({ onClose }: MatchModalProps) {
  const [step, setStep] = useState(1)
  const [selected, setSelected] = useState<string[]>([])
  const [city, setCity] = useState('')
  const [budget, setBudget] = useState<'free' | 'paid' | 'both'>('both')
  const closeBtnRef = useRef<HTMLButtonElement>(null)

  // Escape closes; focus close button on mount so keyboard users can dismiss
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    closeBtnRef.current?.focus()
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const toggle = (id: string) =>
    setSelected((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id])

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{ background: 'rgba(8,8,16,0.88)', backdropFilter: 'blur(16px)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="match-modal-title"
        className="w-full max-w-lg rounded-3xl overflow-hidden"
        style={{
          background: '#0F0F1E',
          border: '1px solid rgba(212,175,55,0.2)',
          boxShadow: '0 40px 100px rgba(0,0,0,0.7)',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-5"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
        >
          <div>
            <p className="text-xs font-semibold tracking-widest mb-1" style={{ color: '#D4AF37' }}>
              SMART MATCH
            </p>
            <h3
              id="match-modal-title"
              className="text-xl font-bold"
              style={{ color: '#E8E0FF', fontFamily: 'DM Serif Display, serif' }}
            >
              {step === 1 ? 'What are you into?' : step === 2 ? 'Where are you?' : 'Your budget?'}
            </h3>
          </div>
          <button
            ref={closeBtnRef}
            onClick={onClose}
            aria-label="Close Smart Match"
            className="w-10 h-10 flex items-center justify-center rounded-full transition-colors hover:bg-white/10"
            style={{ color: '#9B93C0' }}
          >
            <X size={18} strokeWidth={2} />
          </button>
        </div>

        {/* Step progress */}
        <div className="px-6 pt-5 flex gap-1.5">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className="h-1 flex-1 rounded-full transition-all duration-300"
              style={{ background: s <= step ? '#D4AF37' : 'rgba(255,255,255,0.08)' }}
            />
          ))}
        </div>

        {/* Body */}
        <div className="p-6">
          {/* Step 1: Activities */}
          {step === 1 && (
            <div>
              <p className="text-sm mb-4" style={{ color: '#9B93C0' }}>
                Pick one or more activities:
              </p>
              <div className="grid grid-cols-3 gap-2">
                {ACTIVITIES.map((a) => {
                  const isSelected = selected.includes(a.id)
                  return (
                    <button
                      key={a.id}
                      onClick={() => toggle(a.id)}
                      className="flex flex-col items-center gap-1.5 p-3 rounded-xl text-center transition-all duration-150 active:scale-95"
                      style={{
                        background: isSelected ? 'rgba(212,175,55,0.12)' : 'rgba(255,255,255,0.04)',
                        border: isSelected ? '1px solid rgba(212,175,55,0.45)' : '1px solid rgba(255,255,255,0.06)',
                      }}
                    >
                      <span className="text-2xl">{a.emoji}</span>
                      <span
                        className="text-xs font-medium leading-tight"
                        style={{ color: isSelected ? '#D4AF37' : '#9B93C0' }}
                      >
                        {a.label}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Step 2: City */}
          {step === 2 && (
            <div>
              <p className="text-sm mb-4" style={{ color: '#9B93C0' }}>
                What city are you in?
              </p>
              <input
                type="text"
                placeholder="e.g. Austin, TX"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                autoFocus
                className="w-full px-4 py-3 rounded-xl text-sm outline-none"
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(212,175,55,0.3)',
                  color: '#E8E0FF',
                }}
              />
              <p className="text-xs mt-3" style={{ color: '#9B93C0' }}>
                Vibe calls & online sessions work anywhere 🌐
              </p>
            </div>
          )}

          {/* Step 3: Budget */}
          {step === 3 && (
            <div className="space-y-2">
              {(
                [
                  { id: 'free', label: 'Free matches only', desc: 'Mutual connections, no payment needed' },
                  { id: 'paid', label: 'Paid sessions', desc: 'Book verified Besties from $10/session' },
                  { id: 'both', label: 'Show me everything', desc: 'Mix of free and paid options' },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => setBudget(opt.id)}
                  className="w-full flex items-start gap-3 p-4 rounded-xl text-left transition-all"
                  style={{
                    background: budget === opt.id ? 'rgba(212,175,55,0.1)' : 'rgba(255,255,255,0.04)',
                    border: budget === opt.id ? '1px solid rgba(212,175,55,0.4)' : '1px solid rgba(255,255,255,0.06)',
                  }}
                >
                  <div
                    className="w-4 h-4 rounded-full mt-0.5 flex-shrink-0 flex items-center justify-center"
                    style={{
                      background: budget === opt.id ? '#D4AF37' : 'transparent',
                      border: budget === opt.id ? '2px solid #D4AF37' : '2px solid rgba(255,255,255,0.2)',
                    }}
                  >
                    {budget === opt.id && (
                      <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#080810' }} />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-semibold" style={{ color: '#E8E0FF' }}>{opt.label}</p>
                    <p className="text-xs mt-0.5" style={{ color: '#9B93C0' }}>{opt.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className="flex items-center justify-between px-6 py-5"
          style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
        >
          {step > 1 ? (
            <button
              onClick={() => setStep((s) => s - 1)}
              className="text-sm transition-colors hover:text-[#E8E0FF]"
              style={{ color: '#9B93C0' }}
            >
              ← Back
            </button>
          ) : (
            <div />
          )}

          {step < 3 ? (
            <button
              onClick={() => setStep((s) => s + 1)}
              disabled={step === 1 && selected.length === 0}
              className="px-6 py-2.5 rounded-xl text-sm font-semibold transition-all hover:opacity-90 disabled:opacity-40"
              style={{
                background: 'linear-gradient(135deg, #D4AF37 0%, #B8960C 100%)',
                color: '#080810',
              }}
            >
              Continue →
            </button>
          ) : (
            <Link
              href={`/browse?activities=${selected.join(',')}&city=${encodeURIComponent(city)}&budget=${budget}`}
              className="px-6 py-2.5 rounded-xl text-sm font-semibold transition-all hover:opacity-90 inline-flex items-center gap-1.5"
              style={{
                background: 'linear-gradient(135deg, #D4AF37 0%, #B8960C 100%)',
                color: '#080810',
              }}
              onClick={onClose}
            >
              Find my Bestie <Sparkles size={14} strokeWidth={2} />
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}
