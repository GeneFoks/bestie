'use client'

import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || ''

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i)
  return outputArray
}

async function subscribePush(accessToken: string) {
  if (!VAPID_PUBLIC_KEY || !('serviceWorker' in navigator) || !('PushManager' in window)) return

  try {
    const reg = await navigator.serviceWorker.ready

    let subscription = await reg.pushManager.getSubscription()

    if (!subscription) {
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') return

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

export default function PWARegister() {
  useEffect(() => {
    // Register service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {})
    }

    // Subscribe when user is already logged in
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.access_token) subscribePush(session.access_token)
    })

    // Also subscribe on login (handles the case where user logs in later)
    const { data: { subscription: authSub } } = supabase.auth.onAuthStateChange((event, session) => {
      if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && session?.access_token) {
        subscribePush(session.access_token)
      }
    })

    return () => authSub.unsubscribe()
  }, [])

  return null
}
