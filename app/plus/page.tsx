// @ts-nocheck
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import ProfileNav from '@/components/ProfileNav'
import { showToast } from '@/components/Toast'
import { isPlusActive, PLUS_PRICE, PLUS_FEATURES } from '@/lib/plus'

export default function PlusPage() {
  const router = useRouter()
  const [session, setSession] = useState<any>(null)
  const [me, setMe] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    const load = async () => {
      const { data: { session: s } } = await supabase.auth.getSession()
      if (!s) { router.push('/login'); return }
      setSession(s)
      const { data: u } = await supabase
        .from('users')
        .select('subscription_tier, plus_expires_at')
        .eq('id', s.user.id)
        .single()
      setMe(u)
      setLoading(false)
    }
    load()
  }, [])

  const active = isPlusActive(me)

  const subscribe = async () => {
    if (!session || busy) return
    setBusy(true)
    try {
      const res = await fetch('/api/stripe/checkout-plus', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
      })
      const data = await res.json()
      if (data.url) { window.location.href = data.url }
      else { console.error(data.error); showToast("Couldn't start checkout — try again", { type: 'error' }); setBusy(false) }
    } catch {
      setBusy(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#09090F', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
      <nav style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: '1px solid rgba(255,255,255,0.10)' }}>
        <Link href="/" style={{ fontFamily: 'DM Serif Display, serif', fontSize: '20px', fontWeight: 700, color: '#D4AF37', textDecoration: 'none' }}>BESTIE</Link>
        <ProfileNav />
      </nav>

      <div style={{ maxWidth: '520px', margin: '0 auto', padding: '48px 24px 80px' }}>
        <div style={{ textAlign: 'center', marginBottom: '36px' }}>
          <div style={{ display: 'inline-block', padding: '6px 14px', borderRadius: '999px', background: 'rgba(155,127,255,0.15)', border: '1px solid rgba(155,127,255,0.4)', color: '#9B7FFF', fontSize: '12px', fontWeight: 700, letterSpacing: '1px', marginBottom: '16px' }}>
            BESTIE PLUS
          </div>
          <h1 style={{ fontFamily: 'DM Serif Display, serif', fontSize: '34px', color: '#F0EAFF', margin: '0 0 10px' }}>
            Unlock everything for {PLUS_PRICE}<span style={{ fontSize: '18px', color: '#A99ECC' }}>/mo</span>
          </h1>
          <p style={{ color: '#A99ECC', fontSize: '15px', lineHeight: 1.5, margin: 0 }}>
            One simple plan. Cancel anytime.
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '32px' }}>
          {PLUS_FEATURES.map((f) => (
            <div key={f.title} style={{ display: 'flex', gap: '14px', padding: '18px', borderRadius: '16px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div style={{ fontSize: '26px', lineHeight: 1 }}>{f.icon}</div>
              <div>
                <p style={{ color: '#F0EAFF', fontWeight: 700, fontSize: '15px', margin: '0 0 4px' }}>{f.title}</p>
                <p style={{ color: '#A99ECC', fontSize: '13px', lineHeight: 1.5, margin: 0 }}>{f.body}</p>
              </div>
            </div>
          ))}
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', color: '#A99ECC', fontSize: '14px' }}>Loading…</div>
        ) : active ? (
          <div style={{ textAlign: 'center', padding: '20px', borderRadius: '16px', background: 'rgba(52,211,153,0.12)', border: '1px solid rgba(52,211,153,0.4)' }}>
            <p style={{ color: '#34D399', fontWeight: 700, fontSize: '16px', margin: '0 0 4px' }}>✅ You're a Plus member</p>
            {me?.plus_expires_at && (
              <p style={{ color: '#A99ECC', fontSize: '13px', margin: 0 }}>
                Renews {new Date(me.plus_expires_at).toLocaleDateString()}
              </p>
            )}
          </div>
        ) : (
          <button
            onClick={subscribe}
            disabled={busy}
            style={{
              width: '100%', padding: '16px', borderRadius: '14px', border: 'none',
              background: 'linear-gradient(135deg, #9B7FFF, #7C5CFF)', color: '#fff',
              fontSize: '16px', fontWeight: 700, cursor: busy ? 'wait' : 'pointer',
              opacity: busy ? 0.7 : 1,
            }}
          >
            {busy ? 'Redirecting…' : `Get Bestie Plus — ${PLUS_PRICE}/mo`}
          </button>
        )}

        <p style={{ textAlign: 'center', color: '#6B6480', fontSize: '12px', marginTop: '16px' }}>
          Secure payment via Stripe. You can cancel from your account anytime.
        </p>
      </div>
    </div>
  )
}
