'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { X, Share2, Sparkles, ArrowRight } from 'lucide-react'

// Shown at the peak moment of joy — right after a mutual knock becomes a
// match. This is the highest-intent moment to ask someone to invite a friend,
// so we surface a one-tap native share of their referral link.
export default function MatchCelebration({
  profileUsername,
  onClose,
}: {
  profileUsername?: string
  onClose: () => void
}) {
  const [refCode, setRefCode] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) return
      const { data } = await supabase
        .from('users')
        .select('referral_code')
        .eq('id', session.user.id)
        .single()
      if (data?.referral_code) setRefCode(data.referral_code)
    })
  }, [])

  const shareInvite = async () => {
    const url = refCode
      ? `https://bestiehere.com/signup?ref=${refCode}`
      : 'https://bestiehere.com'
    const text = `I'm matching with people on Bestie — real people, real moments. Join with my link and we both get +10 Sparks ⚡`
    if (typeof navigator !== 'undefined' && navigator.share) {
      try { await navigator.share({ title: 'Join me on Bestie', text, url }) } catch {}
      return
    }
    navigator.clipboard.writeText(`${text}\n${url}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
      style={{ position: 'fixed', inset: 0, zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(5,5,12,0.78)', backdropFilter: 'blur(6px)', padding: '20px', fontFamily: 'Plus Jakarta Sans, sans-serif' }}
    >
      <div style={{ position: 'relative', width: '100%', maxWidth: '380px', background: '#111120', border: '1px solid rgba(52,211,153,0.35)', borderRadius: '24px', padding: '32px 26px', textAlign: 'center', boxShadow: '0 24px 70px rgba(0,0,0,0.6), 0 0 40px rgba(52,211,153,0.12)' }}>
        <button
          onClick={onClose}
          aria-label="Close"
          style={{ position: 'absolute', top: '14px', right: '14px', width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.05)', border: 'none', color: '#A99ECC', cursor: 'pointer' }}
        >
          <X size={16} />
        </button>

        <div style={{ fontSize: '44px', lineHeight: 1, marginBottom: '12px' }}>🎉</div>
        <h2 style={{ fontFamily: 'DM Serif Display, serif', fontSize: '26px', color: '#34D399', marginBottom: '6px' }}>It's a match!</h2>
        <p style={{ fontSize: '14px', color: '#A99ECC', lineHeight: 1.6, marginBottom: '24px' }}>
          You both knocked. Plan something real — and bring more of your people onto Bestie.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <button
            onClick={shareInvite}
            style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '13px 18px', borderRadius: '14px', fontSize: '15px', fontWeight: 700, background: 'linear-gradient(135deg, #D4AF37 0%, #B8960C 100%)', border: 'none', color: '#09090F', cursor: 'pointer', width: '100%' }}
          >
            <Share2 size={16} strokeWidth={2.2} /> {copied ? '✓ Link copied!' : 'Invite a friend · +10 Sparks each'}
          </button>

          {profileUsername && (
            <Link
              href={`/book/${profileUsername}`}
              style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '7px', padding: '13px 18px', borderRadius: '14px', fontSize: '15px', fontWeight: 700, background: 'rgba(52,211,153,0.12)', border: '1px solid rgba(52,211,153,0.35)', color: '#34D399', textDecoration: 'none', width: '100%', boxSizing: 'border-box' }}
            >
              <Sparkles size={15} strokeWidth={2} /> Schedule a session <ArrowRight size={15} strokeWidth={2} />
            </Link>
          )}

          <button
            onClick={onClose}
            style={{ padding: '11px', borderRadius: '12px', fontSize: '13px', fontWeight: 500, background: 'transparent', border: 'none', color: '#6B6280', cursor: 'pointer' }}
          >
            Maybe later
          </button>
        </div>
      </div>
    </div>
  )
}
