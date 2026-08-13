'use client'
// @ts-nocheck
// Paid crew membership block.
// - Captain (no payouts set up): "Set up payouts" → Stripe Connect onboarding
// - Captain (payouts ready): set price + "what's included", toggle active
// - Member (sub active): "Join for $X/mo" → Stripe Checkout
// - Member (already subscribed): shows active

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Wallet, Crown } from 'lucide-react'

export default function CrewMembership({ crew }: { crew: any }) {
  const [me, setMe] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [price, setPrice] = useState(crew.sub_price ? String(crew.sub_price) : '')
  const [desc, setDesc] = useState(crew.sub_description || '')
  const [active, setActive] = useState(!!crew.sub_active)
  const [connectReady, setConnectReady] = useState(!!crew.connect_charges_enabled)
  const [mySub, setMySub] = useState<any>(null)
  const [isMember, setIsMember] = useState(false)
  const [savedMsg, setSavedMsg] = useState('')

  const isCaptain = me && me === crew.captain_id

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      setMe(user.id)
      const [{ data }, { data: mem }] = await Promise.all([
        supabase.from('crew_subscriptions').select('status').eq('crew_id', crew.id).eq('user_id', user.id).maybeSingle(),
        supabase.from('crew_members').select('user_id').eq('crew_id', crew.id).eq('user_id', user.id).maybeSingle(),
      ])
      setMySub(data)
      setIsMember(!!mem)
      // If captain just came back from onboarding, sync status
      if (user.id === crew.captain_id && new URLSearchParams(window.location.search).get('connect')) {
        const { data: { session } } = await supabase.auth.getSession()
        const res = await fetch('/api/stripe/connect/refresh', {
          method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
          body: JSON.stringify({ crewId: crew.id }),
        })
        const j = await res.json()
        if (typeof j.ready === 'boolean') setConnectReady(j.ready)
      }
    })
  }, [])

  const authHeader = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    return { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` }
  }

  const startOnboard = async () => {
    setBusy(true)
    const res = await fetch('/api/stripe/connect/onboard', { method: 'POST', headers: await authHeader(), body: JSON.stringify({ crewId: crew.id }) })
    const j = await res.json()
    setBusy(false)
    if (j.url) window.location.href = j.url
    else alert(j.error || 'Could not start payout setup')
  }

  const saveSettings = async () => {
    setBusy(true)
    const p = parseFloat(price)
    const { error } = await supabase.from('crews').update({
      sub_price: isNaN(p) ? null : Math.max(0, p),
      sub_description: desc.trim() || null,
      sub_active: active && !isNaN(p) && p > 0 && connectReady,
    }).eq('id', crew.id)
    setBusy(false)
    if (error) { alert(error.message); return }
    setSavedMsg('Saved ✓'); setTimeout(() => setSavedMsg(''), 2500)
  }

  const subscribe = async () => {
    if (!me) { window.location.href = `/login?next=/crews/${crew.slug}`; return }
    setBusy(true)
    const res = await fetch('/api/stripe/crew/subscribe', { method: 'POST', headers: await authHeader(), body: JSON.stringify({ crewId: crew.id }) })
    const j = await res.json()
    setBusy(false)
    if (j.url) window.location.href = j.url
    else alert(j.error || 'Could not start checkout')
  }

  const box: any = { background: '#111120', border: '1px solid rgba(212,175,55,0.22)', borderRadius: '18px', padding: '20px', marginBottom: '16px' }
  const input: any = { width: '100%', padding: '11px 14px', borderRadius: '11px', fontSize: '14px', background: '#0F0F1E', border: '1px solid rgba(255,255,255,0.12)', color: '#F0EAFF', outline: 'none', boxSizing: 'border-box', fontFamily: 'Plus Jakarta Sans, sans-serif' }
  const gold: any = { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px', width: '100%', padding: '14px', borderRadius: '13px', fontSize: '15px', fontWeight: 700, background: 'linear-gradient(135deg, #D4AF37, #B8960C)', color: '#09090F', border: 'none', cursor: 'pointer' }

  // ── Captain view ──
  if (isCaptain) {
    return (
      <div style={box}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
          <span style={{ width: '34px', height: '34px', borderRadius: '10px', background: 'rgba(212,175,55,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Wallet size={17} color="#D4AF37" strokeWidth={1.9} /></span>
          <p style={{ fontSize: '15px', fontWeight: 700, color: '#F0EAFF', margin: 0 }}>Paid membership</p>
        </div>
        <p style={{ fontSize: '12px', color: '#A99ECC', margin: '0 0 14px' }}>Charge a monthly fee. Bestie keeps 10%, the rest is paid out to you.</p>

        {!connectReady ? (
          <>
            <p style={{ fontSize: '13px', color: '#A99ECC', marginBottom: '12px', lineHeight: 1.5 }}>First, connect your bank via Stripe (~5 min) so you can receive payouts.</p>
            <button onClick={startOnboard} disabled={busy} style={gold}>{busy ? '…' : (crew.stripe_connect_id ? 'Finish payout setup →' : 'Set up payouts →')}</button>
          </>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <p style={{ fontSize: '12px', color: '#34D399', margin: 0 }}>✓ Payouts connected</p>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <span style={{ fontSize: '18px', fontWeight: 700, color: '#D4AF37' }}>$</span>
              <input type="number" min={1} step="1" placeholder="Price / month" value={price} onChange={e => setPrice(e.target.value)} style={{ ...input, maxWidth: '160px' }} />
              <span style={{ fontSize: '13px', color: '#A99ECC' }}>/ month</span>
            </div>
            <textarea placeholder="What's included? (e.g. weekly pickleball games for kids, court fees covered, group chat)" value={desc} onChange={e => setDesc(e.target.value)} rows={3} style={{ ...input, resize: 'vertical' }} />
            <p style={{ fontSize: '11px', color: '#6B6490' }}>New members pay to join. Existing members keep their spot.</p>
            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '14px', color: '#F0EAFF' }}>
              <input type="checkbox" checked={active} onChange={e => setActive(e.target.checked)} />
              Membership is active (visible to members)
            </label>
            <button onClick={saveSettings} disabled={busy} style={{ ...gold, marginTop: '4px' }}>{busy ? 'Saving…' : savedMsg || 'Save membership settings'}</button>
          </div>
        )}
      </div>
    )
  }

  // ── Member view — only when the crew has an active paid membership ──
  if (!crew.sub_active || !crew.sub_price) return null

  if (mySub?.status === 'active') {
    return (
      <div style={box}>
        <p style={{ fontSize: '14px', fontWeight: 700, color: '#34D399', margin: 0 }}>✓ You're a paying member</p>
        <p style={{ fontSize: '12px', color: '#A99ECC', margin: '4px 0 0' }}>${Number(crew.sub_price)}/mo · manage or cancel anytime in your Stripe receipt email.</p>
      </div>
    )
  }

  // Existing members keep their spot for free — only NEW joiners pay.
  if (isMember) return null

  return (
    <div style={box}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
        <Crown size={18} color="#D4AF37" strokeWidth={1.9} />
        <p style={{ fontSize: '15px', fontWeight: 700, color: '#F0EAFF', margin: 0 }}>Membership · ${Number(crew.sub_price)}/mo</p>
      </div>
      {crew.sub_description && <p style={{ fontSize: '13px', color: '#A99ECC', margin: '0 0 14px', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{crew.sub_description}</p>}
      <button onClick={subscribe} disabled={busy} style={gold}>{busy ? '…' : `Join for $${Number(crew.sub_price)}/mo →`}</button>
      <p style={{ fontSize: '11px', color: '#6B6490', textAlign: 'center', marginTop: '8px' }}>Secure payment via Stripe · cancel anytime</p>
    </div>
  )
}
