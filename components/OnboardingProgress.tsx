// @ts-nocheck
'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function OnboardingProgress() {
  const [total, setTotal]       = useState(0)
  const [done, setDone]         = useState(0)
  const [quests, setQuests]     = useState<any[]>([])
  const [loading, setLoading]   = useState(true)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    const dismissed = typeof window !== 'undefined'
      ? localStorage.getItem('onboarding_progress_dismissed')
      : null
    if (dismissed) { setLoading(false); return }

    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { setLoading(false); return }

      // Get all onboarding quests with user status
      const { data } = await supabase
        .from('user_quests')
        .select('status, quest:quests!inner(title, icon, slug, quest_type)')
        .eq('user_id', session.user.id)
        .eq('quests.quest_type', 'onboarding')

      if (!data || data.length === 0) { setLoading(false); return }

      setQuests(data)
      setTotal(data.length)
      setDone(data.filter(q => q.status === 'completed').length)
      setLoading(false)
    }
    load()

    // Realtime: refresh when a quest is completed
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) return
      const channel = supabase
        .channel('onboarding-progress')
        .on('postgres_changes', {
          event: 'UPDATE',
          schema: 'public',
          table: 'user_quests',
          filter: `user_id=eq.${session.user.id}`,
        }, () => load())
        .subscribe()
      return () => supabase.removeChannel(channel)
    })
  }, [])

  if (loading || dismissed || total === 0) return null
  // Hide when all done (with a small delay so user sees 100%)
  if (done === total) return null

  const pct = Math.round((done / total) * 100)

  const handleOpen = () => {
    window.dispatchEvent(new CustomEvent('open-companion-quests'))
  }

  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation()
    localStorage.setItem('onboarding_progress_dismissed', '1')
    setDismissed(true)
  }

  return (
    <div
      onClick={handleOpen}
      style={{
        margin: '0 0 16px',
        padding: '14px 16px',
        borderRadius: '16px',
        background: 'linear-gradient(135deg, rgba(52,211,153,0.07), rgba(123,143,245,0.07))',
        border: '1px solid rgba(52,211,153,0.2)',
        cursor: 'pointer',
        position: 'relative',
        userSelect: 'none',
      }}
    >
      {/* Dismiss */}
      <button
        onClick={handleDismiss}
        style={{
          position: 'absolute', top: '10px', right: '12px',
          background: 'none', border: 'none', color: 'var(--text-dim)',
          fontSize: '16px', cursor: 'pointer', lineHeight: 1,
          padding: '2px 4px',
        }}
      >
        ×
      </button>

      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
        <span style={{ fontSize: '20px' }}>🎯</span>
        <div>
          <p style={{
            fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)',
            margin: 0,
          }}>
            Complete your profile
          </p>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0 }}>
            {done} of {total} tasks done · tap to view
          </p>
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ height: '6px', borderRadius: '999px', background: 'rgba(255,255,255,0.08)' }}>
        <div style={{
          width: `${pct}%`,
          height: '100%',
          borderRadius: '999px',
          background: 'linear-gradient(90deg, #34D399, #7B8FF5)',
          transition: 'width 0.6s ease',
          boxShadow: '0 0 8px rgba(52,211,153,0.4)',
        }} />
      </div>

      {/* Quest pills */}
      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '10px' }}>
        {quests.map((uq, i) => {
          const q = uq.quest
          const completed = uq.status === 'completed'
          return (
            <span key={i} style={{
              fontSize: '11px', fontWeight: 600,
              padding: '3px 10px', borderRadius: '999px',
              background: completed ? 'rgba(52,211,153,0.12)' : 'var(--overlay)',
              border: completed ? '1px solid rgba(52,211,153,0.3)' : '1px solid var(--border)',
              color: completed ? '#34D399' : 'var(--text-dim)',
              textDecoration: completed ? 'line-through' : 'none',
            }}>
              {q.icon} {q.title}
            </span>
          )
        })}
      </div>
    </div>
  )
}
