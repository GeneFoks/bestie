// @ts-nocheck
'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { X, Share2, Sparkles, ArrowRight } from 'lucide-react'

// Shown at the peak moment of joy — right after a mutual knock becomes a
// match. The star of the moment is the PERSON you matched with (avatars +
// "Schedule a session with {name}"); the referral ask is demoted to a quiet
// secondary link.

const AVATAR_SIZE = 52

function Avatar({ url, name, offset = false }: { url?: string | null; name?: string | null; offset?: boolean }) {
  return (
    <div
      style={{
        width: `${AVATAR_SIZE}px`,
        height: `${AVATAR_SIZE}px`,
        borderRadius: '50%',
        overflow: 'hidden',
        flexShrink: 0,
        background: '#1A1A2E',
        border: '2px solid #D4AF37',
        boxShadow: '0 0 16px rgba(212,175,55,0.35)',
        marginLeft: offset ? '-14px' : 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {url
        ? <img src={url} alt={name || ''} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        : <span style={{ fontSize: '20px', fontWeight: 700, color: '#D4AF37', fontFamily: 'DM Serif Display, serif' }}>{(name || '?')[0]?.toUpperCase()}</span>
      }
    </div>
  )
}

export default function MatchCelebration({
  profileUsername,
  profileName,
  profileAvatarUrl,
  onClose,
}: {
  profileUsername?: string
  profileName?: string        // matched person's full name
  profileAvatarUrl?: string   // matched person's avatar
  onClose: () => void
}) {
  const [refCode, setRefCode] = useState<string | null>(null)
  const [myAvatar, setMyAvatar] = useState<string | null>(null)
  const [myName, setMyName] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) return
      const { data } = await supabase
        .from('users')
        .select('referral_code, avatar_url, full_name')
        .eq('id', session.user.id)
        .single()
      if (data?.referral_code) setRefCode(data.referral_code)
      if (data?.avatar_url) setMyAvatar(data.avatar_url)
      if (data?.full_name) setMyName(data.full_name)
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

  const firstName = profileName?.split(' ')[0]

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
      style={{ position: 'fixed', inset: 0, zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(5,5,12,0.78)', backdropFilter: 'blur(6px)', padding: '20px', fontFamily: 'Plus Jakarta Sans, sans-serif' }}
    >
      <div style={{ position: 'relative', width: '100%', maxWidth: '380px', background: '#111120', border: '1px solid rgba(212,175,55,0.35)', borderRadius: '24px', padding: '32px 26px', textAlign: 'center', boxShadow: '0 24px 70px rgba(0,0,0,0.6), 0 0 40px rgba(212,175,55,0.12)' }}>
        <button
          onClick={onClose}
          aria-label="Close"
          style={{ position: 'absolute', top: '14px', right: '14px', width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.05)', border: 'none', color: '#A99ECC', cursor: 'pointer' }}
        >
          <X size={16} />
        </button>

        {/* The two of you — overlapping avatars, gold rings */}
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: '14px' }}>
          <Avatar url={myAvatar} name={myName} />
          <Avatar url={profileAvatarUrl} name={profileName} offset />
        </div>

        <h2 style={{ fontFamily: 'DM Serif Display, serif', fontSize: '26px', color: '#D4AF37', marginBottom: '6px' }}>It's a match!</h2>
        <p style={{ fontSize: '14px', color: '#A99ECC', lineHeight: 1.6, marginBottom: '24px' }}>
          {firstName
            ? <>You and <span style={{ color: '#F0EAFF', fontWeight: 700 }}>{firstName}</span> both knocked. Time to plan something real.</>
            : <>You both knocked. Time to plan something real.</>}
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {profileUsername && (
            <Link
              href={`/book/${profileUsername}`}
              style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '13px 18px', borderRadius: '14px', fontSize: '15px', fontWeight: 700, background: 'linear-gradient(135deg, #D4AF37 0%, #B8960C 100%)', border: 'none', color: '#09090F', textDecoration: 'none', width: '100%', boxSizing: 'border-box', boxShadow: '0 4px 16px rgba(212,175,55,0.25)' }}
            >
              <Sparkles size={15} strokeWidth={2.2} /> Schedule a session{firstName ? ` with ${firstName}` : ''} <ArrowRight size={15} strokeWidth={2.2} />
            </Link>
          )}

          {/* Referral ask — demoted to a quiet secondary link */}
          <button
            onClick={shareInvite}
            style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '7px', padding: '11px 18px', borderRadius: '12px', fontSize: '13px', fontWeight: 600, background: 'transparent', border: 'none', color: '#A99ECC', cursor: 'pointer', width: '100%' }}
          >
            <Share2 size={14} strokeWidth={2} /> {copied ? '✓ Link copied!' : 'Invite a friend · +10 Sparks each'}
          </button>

          <button
            onClick={onClose}
            style={{ padding: '9px', borderRadius: '12px', fontSize: '13px', fontWeight: 500, background: 'transparent', border: 'none', color: '#6B6280', cursor: 'pointer' }}
          >
            Maybe later
          </button>
        </div>
      </div>
    </div>
  )
}
