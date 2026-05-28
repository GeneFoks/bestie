'use client'
// @ts-nocheck
// Sticky bottom CTA — hidden on own profile.
// If the user has bookable activities, primary action is "Book". Otherwise
// it degrades to "Knock" so the page never dead-ends.

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { MessageCircle, Hand } from 'lucide-react'

interface Props {
  profileId: string
  username: string
  firstName: string
  hasActivities?: boolean
}

export default function StickyBookCTA({ profileId, username, firstName, hasActivities = true }: Props) {
  const [visible, setVisible] = useState(false)
  const [hasKnocked, setHasKnocked] = useState(false)

  useEffect(() => {
    const check = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { setVisible(true); return }
      if (session.user.id === profileId) return // own profile — hide
      setVisible(true)

      // If no activities, check whether we've already sent a knock so we can
      // adapt the secondary action (Knock vs Message).
      if (!hasActivities) {
        const { data } = await supabase
          .from('knocks')
          .select('id')
          .eq('sender_id', session.user.id)
          .eq('receiver_id', profileId)
          .maybeSingle()
        if (data) setHasKnocked(true)
      }
    }
    check()
  }, [profileId, hasActivities])

  if (!visible) return null

  // PRIMARY: if user is bookable → Book. Otherwise → Send a message (the
  // friendliest path for unbookable profiles, no dead end).
  const primary = hasActivities
    ? { href: `/book/${username}`, label: `Book a session with ${firstName} →` }
    : { href: `/messages?to=${username}`, label: `Message ${firstName} →` }

  return (
    <>
      <style>{`
        @keyframes slideUp {
          from { transform: translateY(100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .sticky-cta { animation: slideUp 0.3s ease; }
      `}</style>
      <div className="sticky-cta" style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 40, padding: '12px 16px calc(20px + env(safe-area-inset-bottom))', background: 'linear-gradient(to top, rgba(8,8,16,0.98) 60%, transparent)', backdropFilter: 'blur(12px)' }}>
        <div style={{ maxWidth: '720px', margin: '0 auto', display: 'flex', gap: '10px' }}>
          <Link
            href={primary.href}
            style={{ flex: 1, display: 'block', padding: '14px', borderRadius: '14px', textAlign: 'center', fontSize: '15px', fontWeight: 700, background: 'linear-gradient(135deg, #D4AF37 0%, #B8960C 100%)', color: '#09090F', textDecoration: 'none', fontFamily: 'Plus Jakarta Sans, sans-serif', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
          >
            {primary.label}
          </Link>
          {hasActivities ? (
            <Link
              href={`/messages?to=${username}`}
              aria-label={`Message ${firstName}`}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '52px', height: '52px', borderRadius: '14px', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', textDecoration: 'none', color: '#F0EAFF', flexShrink: 0 }}
            >
              <MessageCircle size={20} strokeWidth={1.8} />
            </Link>
          ) : (
            <Link
              href={`#knock`}
              aria-label="Scroll to knock button"
              onClick={(e) => {
                e.preventDefault()
                const btn = document.querySelector('[aria-label="Send a knock"], [aria-label="Knock back"]') as HTMLElement | null
                btn?.scrollIntoView({ behavior: 'smooth', block: 'center' })
                btn?.focus?.()
              }}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '52px', height: '52px', borderRadius: '14px', background: hasKnocked ? 'rgba(255,255,255,0.08)' : 'rgba(212,175,55,0.10)', border: hasKnocked ? '1px solid rgba(255,255,255,0.12)' : '1px solid rgba(212,175,55,0.30)', textDecoration: 'none', color: hasKnocked ? '#A99ECC' : '#D4AF37', flexShrink: 0 }}
            >
              <Hand size={20} strokeWidth={1.8} />
            </Link>
          )}
        </div>
      </div>
    </>
  )
}
