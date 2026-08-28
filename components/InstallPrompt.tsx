// @ts-nocheck
'use client'

// Slim "add to home screen" banner shown above the bottom nav after 2+ visits.
// Chrome/Android: captures beforeinstallprompt and triggers the native prompt
// on 'Add'. iOS Safari (no beforeinstallprompt): shows a one-line hint with
// the share-icon instructions instead. '✕' snoozes for 14 days.

import { useEffect, useState } from 'react'

const VISITS_KEY = 'bestie_visit_count'
const VISIT_SESSION_KEY = 'bestie_visit_counted'
const INSTALL_SNOOZE_KEY = 'bestie_install_snooze_until'
const SNOOZE_DAYS = 14
const MIN_VISITS = 2

function isStandalone() {
  return (
    window.matchMedia?.('(display-mode: standalone)')?.matches ||
    navigator.standalone === true
  )
}

function isIOS() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent)
}

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [mode, setMode] = useState(null) // null | 'native' | 'ios'

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (isStandalone()) return

    let visits = 0
    try {
      visits = parseInt(localStorage.getItem(VISITS_KEY) || '0', 10) || 0
      // Count each browser session as one visit, not each remount
      if (!sessionStorage.getItem(VISIT_SESSION_KEY)) {
        visits += 1
        localStorage.setItem(VISITS_KEY, String(visits))
        sessionStorage.setItem(VISIT_SESSION_KEY, '1')
      }
      const until = parseInt(localStorage.getItem(INSTALL_SNOOZE_KEY) || '0', 10)
      if (until && Date.now() < until) return
    } catch { return }
    if (visits < MIN_VISITS) return

    const onBeforeInstall = (e) => {
      e.preventDefault()
      setDeferredPrompt(e)
      setMode('native')
    }
    const onInstalled = () => {
      setDeferredPrompt(null)
      setMode(null)
    }

    window.addEventListener('beforeinstallprompt', onBeforeInstall)
    window.addEventListener('appinstalled', onInstalled)

    // iOS Safari never fires beforeinstallprompt — show manual instructions
    if (isIOS()) setMode('ios')

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  const snooze = () => {
    try {
      localStorage.setItem(INSTALL_SNOOZE_KEY, String(Date.now() + SNOOZE_DAYS * 86400000))
    } catch {/* silent */}
    setMode(null)
  }

  const onAdd = async () => {
    if (!deferredPrompt) return
    try {
      deferredPrompt.prompt()
      await deferredPrompt.userChoice
    } catch {/* silent */}
    setDeferredPrompt(null)
    setMode(null)
  }

  if (!mode) return null

  return (
    <div
      style={{
        position: 'fixed',
        left: '50%',
        transform: 'translateX(-50%)',
        bottom: 'calc(68px + env(safe-area-inset-bottom, 0px))',
        width: 'calc(100% - 24px)',
        maxWidth: '480px',
        zIndex: 95,
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        padding: '10px 12px',
        borderRadius: '14px',
        background: 'var(--surface-2, #16162A)',
        border: '1px solid var(--border-strong, rgba(255,255,255,0.14))',
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        fontSize: '13px',
        color: 'var(--text-primary, #F0EAFF)',
        boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
      }}
    >
      <span style={{ flex: 1, lineHeight: 1.4 }}>
        {mode === 'native'
          ? '📲 Add Bestie to your home screen'
          : '📲 Install Bestie: tap the Share icon, then "Add to Home Screen"'}
      </span>
      {mode === 'native' && (
        <button
          onClick={onAdd}
          style={{
            padding: '7px 14px',
            borderRadius: '10px',
            border: 'none',
            background: 'linear-gradient(135deg, #D4AF37 0%, #B8960C 100%)',
            color: '#09090F',
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            fontSize: '13px',
            fontWeight: 700,
            cursor: 'pointer',
            flexShrink: 0,
          }}
        >
          Add
        </button>
      )}
      <button
        onClick={snooze}
        aria-label="Dismiss"
        style={{
          background: 'transparent',
          border: 'none',
          color: 'var(--text-muted, #A99ECC)',
          fontSize: '15px',
          cursor: 'pointer',
          padding: '4px 6px',
          lineHeight: 1,
          flexShrink: 0,
        }}
      >
        ✕
      </button>
    </div>
  )
}
