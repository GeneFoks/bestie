// @ts-nocheck
'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || ''

// Push permission is only ever offered after a VALUE moment (a match, a join,
// a knock back) — never on load. A value moment sets this flag, then the
// soft pre-permission sheet below asks first; the real browser prompt only
// fires after the user taps 'Enable'.
const VALUE_MOMENT_KEY = 'bestie_value_moment'
const PUSH_SNOOZE_KEY = 'bestie_push_snooze_until'
const PUSH_SNOOZE_DAYS = 7

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i)
  return outputArray
}

function pushSupported() {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  )
}

// Silent sync: only runs when permission is ALREADY granted — never prompts.
async function syncSubscription(accessToken: string) {
  if (!VAPID_PUBLIC_KEY || !pushSupported()) return
  if (Notification.permission !== 'granted') return

  try {
    const reg = await navigator.serviceWorker.ready

    let subscription = await reg.pushManager.getSubscription()

    if (!subscription) {
      subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      })
    }

    await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ subscription: subscription.toJSON() }),
    })
  } catch {/* silent */}
}

// Call this right after a value moment (match, join, knock back). It marks the
// moment and nudges the mounted PWARegister to offer notifications via the
// soft sheet — it never triggers the browser permission prompt directly.
export function requestPushWhenReady() {
  if (typeof window === 'undefined') return
  try { localStorage.setItem(VALUE_MOMENT_KEY, '1') } catch {/* silent */}
  window.dispatchEvent(new Event('bestie:push-value-moment'))
}

export default function PWARegister() {
  const [offerVisible, setOfferVisible] = useState(false)
  const [sheetIn, setSheetIn] = useState(false)

  useEffect(() => {
    // Register service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {})
    }

    const maybeOffer = async () => {
      if (!VAPID_PUBLIC_KEY || !pushSupported()) return
      if (Notification.permission !== 'default') return
      try {
        if (localStorage.getItem(VALUE_MOMENT_KEY) !== '1') return
        const until = parseInt(localStorage.getItem(PUSH_SNOOZE_KEY) || '0', 10)
        if (until && Date.now() < until) return
      } catch { return }
      const { data: { session } } = await supabase.auth.getSession()
      if (session) setOfferVisible(true)
    }

    // Sync an existing granted subscription when user is already logged in
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.access_token) syncSubscription(session.access_token)
    })
    maybeOffer()

    // Also sync on login (handles the case where user logs in later)
    const { data: { subscription: authSub } } = supabase.auth.onAuthStateChange((event, session) => {
      if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && session?.access_token) {
        syncSubscription(session.access_token)
      }
      if (event === 'SIGNED_IN') maybeOffer()
    })

    // A value moment just happened somewhere in the app
    window.addEventListener('bestie:push-value-moment', maybeOffer)

    return () => {
      authSub.unsubscribe()
      window.removeEventListener('bestie:push-value-moment', maybeOffer)
    }
  }, [])

  // Slide the sheet in on the next frame once it mounts
  useEffect(() => {
    if (!offerVisible) return
    const raf = requestAnimationFrame(() => {
      requestAnimationFrame(() => setSheetIn(true))
    })
    return () => cancelAnimationFrame(raf)
  }, [offerVisible])

  const closeSheet = () => {
    setSheetIn(false)
    setTimeout(() => setOfferVisible(false), 260)
  }

  const onNotNow = () => {
    try {
      localStorage.setItem(PUSH_SNOOZE_KEY, String(Date.now() + PUSH_SNOOZE_DAYS * 86400000))
    } catch {/* silent */}
    closeSheet()
  }

  const onEnable = async () => {
    closeSheet()
    try {
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') return
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.access_token) await syncSubscription(session.access_token)
    } catch {/* silent */}
  }

  if (!offerVisible) return null

  return (
    <div
      onClick={onNotNow}
      style={{
        position: 'fixed', inset: 0, zIndex: 500,
        background: 'rgba(0,0,0,0.6)',
        backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
        opacity: sheetIn ? 1 : 0,
        transition: 'opacity 0.2s ease',
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: '480px',
          background: 'var(--surface-1, #111120)',
          border: '1px solid var(--border-strong, rgba(255,255,255,0.14))',
          borderBottom: 'none',
          borderRadius: '20px 20px 0 0',
          padding: '22px 20px calc(24px + env(safe-area-inset-bottom))',
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          transform: sheetIn ? 'translateY(0)' : 'translateY(100%)',
          transition: 'transform 0.24s ease',
        }}
      >
        <div
          style={{
            width: '40px', height: '4px', borderRadius: '2px',
            background: 'var(--border-strong, rgba(255,255,255,0.14))',
            margin: '0 auto 16px',
          }}
        />
        <h3
          style={{
            fontFamily: "'DM Serif Display', serif",
            fontSize: '20px',
            color: 'var(--text-primary, #F0EAFF)',
            margin: '0 0 8px',
            textAlign: 'center',
          }}
        >
          Get notified when someone knocks back 👋
        </h3>
        <p
          style={{
            fontSize: '14px',
            color: 'var(--text-muted, #A99ECC)',
            lineHeight: 1.5,
            margin: '0 0 20px',
            textAlign: 'center',
          }}
        >
          Enable notifications? We only ping you for real moments — no spam.
        </p>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={onNotNow}
            style={{
              flex: 1, padding: '14px', borderRadius: '14px',
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              fontSize: '15px', fontWeight: 700, cursor: 'pointer',
              background: 'var(--surface-3, rgba(255,255,255,0.06))',
              border: '1px solid var(--border, rgba(255,255,255,0.08))',
              color: 'var(--text-primary, #F0EAFF)',
            }}
          >
            Not now
          </button>
          <button
            onClick={onEnable}
            style={{
              flex: 1, padding: '14px', borderRadius: '14px',
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              fontSize: '15px', fontWeight: 700, cursor: 'pointer',
              border: 'none',
              background: 'linear-gradient(135deg, #D4AF37 0%, #B8960C 100%)',
              color: '#09090F',
            }}
          >
            Enable
          </button>
        </div>
      </div>
    </div>
  )
}
