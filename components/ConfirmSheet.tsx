// @ts-nocheck
'use client'

// Native-feel confirm dialog as a bottom sheet — DOM-injected, no dependencies.
// Usage (client side):
//   import { confirmSheet } from '@/components/ConfirmSheet'
//   const ok = await confirmSheet({ title: 'Delete this event?', danger: true })
//   if (ok) { ... }
// SSR-safe: resolves false on the server.

const STYLE_ID = 'bestie-confirm-sheet-style'

function ensureStyle() {
  if (document.getElementById(STYLE_ID)) return
  const style = document.createElement('style')
  style.id = STYLE_ID
  style.textContent = `
    .bestie-sheet-backdrop {
      position: fixed;
      inset: 0;
      z-index: 500;
      background: rgba(0,0,0,0.6);
      backdrop-filter: blur(4px);
      -webkit-backdrop-filter: blur(4px);
      display: flex;
      align-items: flex-end;
      justify-content: center;
      opacity: 0;
      transition: opacity 0.2s ease;
    }
    .bestie-sheet-backdrop.bestie-sheet-in { opacity: 1; }
    .bestie-sheet {
      width: 100%;
      max-width: 480px;
      background: var(--surface-1, #111120);
      border: 1px solid var(--border-strong, rgba(255,255,255,0.14));
      border-bottom: none;
      border-radius: 20px 20px 0 0;
      padding: 22px 20px calc(24px + env(safe-area-inset-bottom));
      font-family: 'Plus Jakarta Sans', sans-serif;
      transform: translateY(100%);
      transition: transform 0.24s ease;
    }
    .bestie-sheet-backdrop.bestie-sheet-in .bestie-sheet { transform: translateY(0); }
    .bestie-sheet-handle {
      width: 40px;
      height: 4px;
      border-radius: 2px;
      background: var(--border-strong, rgba(255,255,255,0.14));
      margin: 0 auto 16px;
    }
    .bestie-sheet-title {
      font-family: 'DM Serif Display', serif;
      font-size: 20px;
      color: var(--text-primary, #F0EAFF);
      margin: 0 0 8px;
      text-align: center;
    }
    .bestie-sheet-body {
      font-size: 14px;
      color: var(--text-muted, #A99ECC);
      line-height: 1.5;
      margin: 0 0 20px;
      text-align: center;
    }
    .bestie-sheet-actions {
      display: flex;
      gap: 10px;
    }
    .bestie-sheet-btn {
      flex: 1;
      padding: 14px;
      border-radius: 14px;
      font-family: 'Plus Jakarta Sans', sans-serif;
      font-size: 15px;
      font-weight: 700;
      cursor: pointer;
      border: none;
    }
    .bestie-sheet-cancel {
      background: var(--surface-3, rgba(255,255,255,0.06));
      border: 1px solid var(--border, rgba(255,255,255,0.08));
      color: var(--text-primary, #F0EAFF);
    }
    .bestie-sheet-confirm {
      background: linear-gradient(135deg, #D4AF37 0%, #B8960C 100%);
      color: #09090F;
    }
    .bestie-sheet-confirm.bestie-sheet-danger {
      background: #FF6B6B;
      color: #09090F;
    }
  `
  document.head.appendChild(style)
}

export function confirmSheet(opts: {
  title: string
  body?: string
  confirmLabel?: string
  danger?: boolean
}): Promise<boolean> {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return Promise.resolve(false)
  }

  return new Promise(resolve => {
    ensureStyle()

    const backdrop = document.createElement('div')
    backdrop.className = 'bestie-sheet-backdrop'

    const sheet = document.createElement('div')
    sheet.className = 'bestie-sheet'
    sheet.setAttribute('role', 'dialog')
    sheet.setAttribute('aria-modal', 'true')

    const handle = document.createElement('div')
    handle.className = 'bestie-sheet-handle'

    const title = document.createElement('h3')
    title.className = 'bestie-sheet-title'
    title.textContent = opts.title

    sheet.appendChild(handle)
    sheet.appendChild(title)

    if (opts.body) {
      const body = document.createElement('p')
      body.className = 'bestie-sheet-body'
      body.textContent = opts.body
      sheet.appendChild(body)
    }

    const actions = document.createElement('div')
    actions.className = 'bestie-sheet-actions'

    const cancelBtn = document.createElement('button')
    cancelBtn.className = 'bestie-sheet-btn bestie-sheet-cancel'
    cancelBtn.textContent = 'Cancel'

    const confirmBtn = document.createElement('button')
    confirmBtn.className =
      'bestie-sheet-btn bestie-sheet-confirm' + (opts.danger ? ' bestie-sheet-danger' : '')
    confirmBtn.textContent = opts.confirmLabel || 'Confirm'

    actions.appendChild(cancelBtn)
    actions.appendChild(confirmBtn)
    sheet.appendChild(actions)
    backdrop.appendChild(sheet)
    document.body.appendChild(backdrop)

    let settled = false
    const close = (result: boolean) => {
      if (settled) return
      settled = true
      backdrop.classList.remove('bestie-sheet-in')
      document.removeEventListener('keydown', onKey)
      setTimeout(() => backdrop.remove(), 260)
      resolve(result)
    }

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close(false)
    }

    sheet.addEventListener('click', e => e.stopPropagation())
    backdrop.addEventListener('click', () => close(false))
    cancelBtn.addEventListener('click', () => close(false))
    confirmBtn.addEventListener('click', () => close(true))
    document.addEventListener('keydown', onKey)

    // Slide in on next frame
    requestAnimationFrame(() => {
      requestAnimationFrame(() => backdrop.classList.add('bestie-sheet-in'))
    })
  })
}

export default confirmSheet
