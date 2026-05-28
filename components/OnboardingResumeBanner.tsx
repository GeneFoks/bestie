'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { Sparkles } from 'lucide-react'

type Profile = {
  full_name?: string | null
  city?: string | null
  bio?: string | null
  bestie_type_completed?: boolean
  onboarding_completed?: boolean
}

/**
 * Non-blocking nudge for users who haven't finished onboarding (or skipped
 * the Bestie Type quiz). Shows up at the top of post-auth pages with a
 * progress bar and a CTA. Returns null when nothing to nudge about.
 */
export default function OnboardingResumeBanner() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    let cancelled = false
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session || cancelled) return
      const { data } = await supabase
        .from('users')
        .select('full_name, city, bio, bestie_type_completed, onboarding_completed')
        .eq('id', session.user.id)
        .single()
      if (!cancelled) setProfile(data)
    })
    return () => { cancelled = true }
  }, [])

  if (!profile || dismissed) return null

  // Sub-steps the user can finish — score them out of 5
  const steps = [
    { done: !!profile.full_name, label: 'Add your name', href: '/profile/edit' },
    { done: !!profile.bio,        label: 'Write a bio',   href: '/profile/edit' },
    { done: !!profile.city,       label: 'Set your city', href: '/profile/edit' },
    { done: !!profile.bestie_type_completed, label: 'Take the Bestie Type quiz', href: '/bestie-type' },
    { done: !!profile.onboarding_completed, label: 'Finish setup', href: '/onboarding' },
  ]
  const remaining = steps.filter(s => !s.done)
  if (remaining.length === 0) return null

  const nextStep = remaining[0]
  const progress = Math.round(((steps.length - remaining.length) / steps.length) * 100)

  return (
    <div style={{ maxWidth: '960px', margin: '0 auto 20px', padding: '14px 18px', borderRadius: '14px', background: 'linear-gradient(90deg, rgba(212,175,55,0.10) 0%, rgba(155,127,255,0.06) 100%)', border: '1px solid rgba(212,175,55,0.25)', display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
      <span style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(212,175,55,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Sparkles size={18} color="#D4AF37" strokeWidth={1.8} />
      </span>
      <div style={{ flex: 1, minWidth: '160px' }}>
        <p style={{ fontSize: '13px', fontWeight: 700, color: '#F0EAFF', marginBottom: '6px' }}>
          {remaining.length === 1 ? 'One step left' : `${remaining.length} steps to a full passport`}
        </p>
        <div style={{ height: '4px', borderRadius: '999px', background: 'rgba(255,255,255,0.10)', overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${progress}%`, borderRadius: '999px', background: 'linear-gradient(90deg, #D4AF37 0%, #B8960C 100%)', transition: 'width 0.4s' }} />
        </div>
      </div>
      <Link href={nextStep.href} style={{ padding: '8px 18px', borderRadius: '10px', fontSize: '13px', fontWeight: 700, background: 'linear-gradient(135deg, #D4AF37 0%, #B8960C 100%)', color: '#09090F', textDecoration: 'none', whiteSpace: 'nowrap', flexShrink: 0 }}>
        {nextStep.label} →
      </Link>
      <button
        onClick={() => setDismissed(true)}
        aria-label="Dismiss"
        style={{ background: 'none', border: 'none', color: '#A99ECC', cursor: 'pointer', padding: '4px 6px', fontSize: '14px', flexShrink: 0 }}
      >
        ×
      </button>
    </div>
  )
}
