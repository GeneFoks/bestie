'use client'
// @ts-nocheck
// Sticky bottom "Book a session" button — hidden on own profile

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

interface Props {
  profileId: string
  username: string
  firstName: string
}

export default function StickyBookCTA({ profileId, username, firstName }: Props) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const check = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { setVisible(true); return }
      if (session.user.id === profileId) return // own profile — hide
      setVisible(true)
    }
    check()
  }, [profileId])

  if (!visible) return null

  return (
    <>
      <style>{`
        @keyframes slideUp {
          from { transform: translateY(100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .sticky-cta { animation: slideUp 0.3s ease; }
      `}</style>
      <div className="sticky-cta" style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 40, padding: '12px 16px 20px', background: 'linear-gradient(to top, rgba(8,8,16,0.98) 60%, transparent)', backdropFilter: 'blur(12px)' }}>
        <div style={{ maxWidth: '720px', margin: '0 auto', display: 'flex', gap: '10px' }}>
          <Link
            href={`/book/${username}`}
            style={{ flex: 1, display: 'block', padding: '14px', borderRadius: '14px', textAlign: 'center', fontSize: '15px', fontWeight: 700, background: 'linear-gradient(135deg, #D4AF37 0%, #B8960C 100%)', color: '#09090F', textDecoration: 'none', fontFamily: 'Plus Jakarta Sans, sans-serif' }}
          >
            Book a session →
          </Link>
          <Link
            href={`/messages?to=${username}`}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '52px', height: '52px', borderRadius: '14px', background: 'rgba(255,255,255,0.11)', border: '1px solid rgba(255,255,255,0.12)', textDecoration: 'none', fontSize: '20px', flexShrink: 0 }}
          >
            💬
          </Link>
        </div>
      </div>
    </>
  )
}
