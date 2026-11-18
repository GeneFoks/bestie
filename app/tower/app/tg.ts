// @ts-nocheck
'use client'

// Thin, crash-proof wrapper around window.Telegram.WebApp (telegram-web-app.js).
// Every call is version-checked and wrapped in try: an old Telegram client or a
// normal browser must never break the app.
import { useEffect } from 'react'

export function getWA() {
  if (typeof window === 'undefined') return null
  return window.Telegram?.WebApp || null
}

export function atLeast(v) {
  const wa = getWA()
  try {
    return !!wa && typeof wa.isVersionAtLeast === 'function' && wa.isVersionAtLeast(v)
  } catch {
    return false
  }
}

export function isMobileTg() {
  return /^(android|android_x|ios)$/i.test(String(getWA()?.platform || ''))
}

export const haptic = {
  select() {
    try { if (atLeast('6.1')) getWA().HapticFeedback.selectionChanged() } catch {}
  },
  tap() {
    try { if (atLeast('6.1')) getWA().HapticFeedback.impactOccurred('light') } catch {}
  },
  ok() {
    try { if (atLeast('6.1')) getWA().HapticFeedback.notificationOccurred('success') } catch {}
  },
  err() {
    try { if (atLeast('6.1')) getWA().HapticFeedback.notificationOccurred('error') } catch {}
  },
}

// Call it synchronously inside the tap handler, never after an await:
// Telegram (and browsers) only open links from a user gesture. That is why
// personal links come prefetched from the server (gate.links).
export function openLink(url) {
  if (!url) return
  const wa = getWA()
  try {
    if (wa && typeof wa.openLink === 'function') {
      wa.openLink(url)
      return
    }
  } catch {}
  try { window.open(url, '_blank', 'noopener') } catch {}
}

// t.me links stay inside Telegram (share sheet, bot chat).
export function openTg(url) {
  if (!url) return
  const wa = getWA()
  if (/^https:\/\/t\.me\//i.test(url)) {
    try {
      if (wa && typeof wa.openTelegramLink === 'function') {
        wa.openTelegramLink(url)
        return
      }
    } catch {}
  }
  try { window.location.href = url } catch {}
}

// → true when Telegram closed the app (false in a normal browser).
export function closeApp() {
  const wa = getWA()
  try {
    const inTg = !!wa && (!!wa.initData || (!!wa.platform && wa.platform !== 'unknown'))
    if (inTg && typeof wa.close === 'function') {
      wa.close()
      return true
    }
  } catch {}
  return false
}

// Telegram's header «Назад». One handler at a time: the root owns it and
// routes the press to the top screen (or open sheet). on=false hides it.
export function useTgBack(handler, on = true) {
  useEffect(() => {
    const bb = atLeast('6.1') ? getWA()?.BackButton : null
    if (!bb) return
    if (!on) {
      try { bb.hide() } catch {}
      return
    }
    try {
      bb.onClick(handler)
      bb.show()
    } catch {}
    return () => {
      try { bb.offClick(handler) } catch {}
    }
  }, [handler, on])
}

export function confirmTg(msg) {
  return new Promise((resolve) => {
    const wa = getWA()
    if (atLeast('6.2') && typeof wa?.showConfirm === 'function') {
      try {
        wa.showConfirm(msg, (ok) => resolve(!!ok))
        return
      } catch {}
    }
    try { resolve(window.confirm(msg)) } catch { resolve(false) }
  })
}

// «Закрыть приложение? Изменения не сохранятся» while the review form is open.
export function closingConfirm(on) {
  if (!atLeast('6.2')) return
  const wa = getWA()
  try {
    if (on) wa.enableClosingConfirmation()
    else wa.disableClosingConfirmation()
  } catch {}
}

// Telegram light/dark → Bestie tokens (globals.css flips them on data-theme).
// Never writes the site's own theme preference.
export function applyTheme(wa) {
  if (!wa) return
  const light = wa.colorScheme === 'light'
  try { document.documentElement.setAttribute('data-theme', light ? 'light' : 'dark') } catch {}
  const hex = light ? '#F6F4FB' : '#09090F'
  try {
    if (wa.isVersionAtLeast?.('7.0')) wa.setHeaderColor(hex)
    else if (wa.isVersionAtLeast?.('6.1')) wa.setHeaderColor('bg_color')
  } catch {}
  try { if (wa.isVersionAtLeast?.('6.1')) wa.setBackgroundColor(hex) } catch {}
  try { if (wa.isVersionAtLeast?.('7.10')) wa.setBottomBarColor?.(light ? '#FFFFFF' : '#111120') } catch {}
}
