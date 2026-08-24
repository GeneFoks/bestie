// @ts-nocheck
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { showToast } from '@/components/Toast'
import { Crown, Ticket, Sparkles, Star } from 'lucide-react'

const GOLD = '#D4AF37'

export default function AmbassadorPage() {
  const router = useRouter()
  const [me, setMe] = useState<any>(null)
  const [application, setApplication] = useState<any>(null)
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      const [{ data: profile }, { data: app }] = await Promise.all([
        supabase.from('users').select('id, is_ambassador').eq('id', user.id).single(),
        supabase.from('ambassador_applications').select('status, created_at').eq('user_id', user.id).maybeSingle(),
      ])
      setMe(profile)
      setApplication(app)
    })
  }, [])

  const apply = async () => {
    if (!me) { router.push('/login?next=/ambassador'); return }
    setSending(true)
    const { error } = await supabase.from('ambassador_applications').insert({
      user_id: me.id,
      message: message.trim() || null,
    })
    setSending(false)
    if (error) {
      if (error.message.includes('duplicate')) {
        showToast("You already applied — we'll get back to you soon!", { type: 'info' })
      } else {
        console.error(error)
        showToast("Couldn't send your application — try again", { type: 'error' })
      }
      return
    }
    setApplication({ status: 'pending' })
  }

  const PERKS = [
    { Icon: Ticket,   title: 'Host paid events', desc: 'Set a ticket price on your events — guests pay on join, you get 90% (platform fee 10%, weekly payouts).' },
    { Icon: Crown,    title: 'Ambassador badge', desc: 'A gold crown on your passport and events — people trust and join hosts they can recognize.' },
    { Icon: Sparkles, title: 'Bestie Plus — free', desc: 'Full Plus subscription on the house while you stay active.' },
    { Icon: Star,     title: 'First in line', desc: 'Early access to new features and a direct line to the founder.' },
  ]

  return (
    <div style={{ minHeight: '100vh', background: '#09090F', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
      <nav style={{ position: 'sticky', top: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', background: 'rgba(8,8,16,0.9)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.10)' }}>
        <Link href="/" style={{ fontFamily: 'DM Serif Display, serif', fontSize: '20px', fontWeight: 700, color: GOLD, textDecoration: 'none' }}>BESTIE</Link>
        <Link href="/events" style={{ fontSize: '14px', color: '#A99ECC', textDecoration: 'none', padding: '8px 16px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.1)' }}>← Events</Link>
      </nav>

      <div style={{ maxWidth: '560px', margin: '0 auto', padding: '48px 24px 100px' }}>
        <div style={{ textAlign: 'center', marginBottom: '36px' }}>
          <div style={{ fontSize: '52px', marginBottom: '16px' }}>👑</div>
          <p style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '2px', color: GOLD, marginBottom: '10px' }}>BESTIE AMBASSADORS</p>
          <h1 style={{ fontFamily: 'DM Serif Display, serif', fontSize: '32px', color: '#F0EAFF', marginBottom: '12px', lineHeight: 1.15 }}>Host events. Get paid. Build the scene.</h1>
          <p style={{ fontSize: '15px', color: '#A99ECC', lineHeight: 1.7 }}>
            Ambassadors are the hosts who bring people together — dinners, hikes, game nights.
            They're the only ones who can sell tickets to their events.
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '32px' }}>
          {PERKS.map(p => (
            <div key={p.title} style={{ display: 'flex', gap: '14px', padding: '16px', borderRadius: '16px', background: '#111120', border: '1px solid rgba(255,255,255,0.10)' }}>
              <span style={{ width: '42px', height: '42px', borderRadius: '12px', background: 'rgba(212,175,55,0.10)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <p.Icon size={20} color={GOLD} strokeWidth={1.8} />
              </span>
              <div>
                <p style={{ fontSize: '14px', fontWeight: 700, color: '#F0EAFF', marginBottom: '2px' }}>{p.title}</p>
                <p style={{ fontSize: '13px', color: '#A99ECC', lineHeight: 1.5 }}>{p.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <div style={{ padding: '14px 16px', borderRadius: '14px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', marginBottom: '28px' }}>
          <p style={{ fontSize: '12px', color: '#A99ECC', lineHeight: 1.6 }}>
            <b style={{ color: '#F0EAFF' }}>What we look for:</b> you've hosted (or want to host) real meetups, you show up reliably, and people feel good around you. Being new is fine — energy matters more than numbers.
          </p>
        </div>

        {me?.is_ambassador ? (
          <div style={{ textAlign: 'center', padding: '22px', borderRadius: '16px', background: 'rgba(52,211,153,0.06)', border: '1px solid rgba(52,211,153,0.25)' }}>
            <p style={{ fontSize: '16px', fontWeight: 700, color: '#34D399', marginBottom: '6px' }}>👑 You're an Ambassador</p>
            <Link href="/group-sessions/new" style={{ fontSize: '14px', fontWeight: 600, color: GOLD, textDecoration: 'none' }}>Create a paid event →</Link>
          </div>
        ) : application ? (
          <div style={{ textAlign: 'center', padding: '22px', borderRadius: '16px', background: 'rgba(212,175,55,0.06)', border: '1px solid rgba(212,175,55,0.25)' }}>
            <p style={{ fontSize: '15px', fontWeight: 700, color: GOLD, marginBottom: '4px' }}>
              {application.status === 'pending' ? '⏳ Application received' : application.status === 'rejected' ? 'Application reviewed' : '✓'}
            </p>
            <p style={{ fontSize: '13px', color: '#A99ECC' }}>
              {application.status === 'pending'
                ? "We'll get back to you within a couple of days."
                : 'Not this time — keep hosting free events and apply again soon!'}
            </p>
          </div>
        ) : (
          <div>
            <label style={{ fontSize: '12px', fontWeight: 600, color: '#A99ECC', letterSpacing: '0.5px', marginBottom: '6px', display: 'block' }}>
              Tell us about yourself <span style={{ fontWeight: 400 }}>(optional)</span>
            </label>
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="What would you host? Dinners, hikes, girls circles, game nights…"
              rows={3}
              style={{ width: '100%', padding: '12px 14px', borderRadius: '12px', fontSize: '14px', background: '#111120', border: '1px solid rgba(255,255,255,0.1)', color: '#F0EAFF', outline: 'none', boxSizing: 'border-box', resize: 'vertical', marginBottom: '12px', fontFamily: 'inherit' }}
            />
            <button
              onClick={apply}
              disabled={sending}
              style={{ width: '100%', padding: '16px', borderRadius: '14px', fontSize: '15px', fontWeight: 700, background: `linear-gradient(135deg, ${GOLD} 0%, #B8960C 100%)`, color: '#09090F', border: 'none', cursor: 'pointer' }}
            >
              {sending ? 'Sending…' : me ? 'Apply to become an Ambassador →' : 'Log in & apply →'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
