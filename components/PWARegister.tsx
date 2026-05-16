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

export default function PWARegister() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return

    navigator.serviceWorker
      .register('/sw.js')
      .then(async (reg) => {
        // Only subscribe if VAPID key is configured
        if (!VAPID_PUBLIC_KEY) return

        // Check if already subscribed
        const existing = await reg.pushManager.getSubscription()
        if (existing) {
          await saveSubscription(existing)
          return
        }

        // Request permission
        const permission = await Notification.requestPermission()
        if (permission !== 'granted') return

        // Subscribe
        const subscription = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
        })

        await saveSubscription(subscription)
      })
      .catch(() => {/* silent */})
  }, [])

  return null
}

async function saveSubscription(subscription: PushSubscription) {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return

    await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ subscription: subscription.toJSON() }),
    })
  } catch {/* silent */}
}
