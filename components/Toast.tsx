// @ts-nocheck
'use client'

// Tiny global toast system — no dependencies, DOM-injected singleton.
// Usage anywhere (client side): import { showToast } from '@/components/Toast'
//   showToast('Saved')
//   showToast('Something went wrong', { type: 'error' })
// SSR-safe: calling on the server is a silent no-op.

const CONTAINER_ID = 'bestie-toast-root'
const STYLE_ID = 'bestie-toast-style'

function ensureContainer(): HTMLElement | null {
  if (typeof window === 'undefined' || typeof document === 'undefined') return null

  if (!document.getElementById(STYLE_ID)) {
    const style = document.createElement('style')
    style.id = STYLE_ID
    style.textContent = `
      #${CONTAINER_ID} {
        position: fixed;
        left: 0;
        right: 0;
        bottom: calc(84px + env(safe-area-inset-bottom));
        z-index: 400;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 8px;
        pointer-events: none;
      }
      @media (min-width: 769px) {
        #${CONTAINER_ID} { bottom: calc(24px + env(safe-area-inset-bottom)); }
      }
      .bestie-toast {
        max-width: min(92vw, 420px);
        display: flex;
        align-items: center;
        gap: 9px;
        padding: 11px 18px;
        border-radius: 999px;
        background: var(--surface-2, #14142A);
        border: 1px solid var(--border-strong, rgba(255,255,255,0.14));
        color: var(--text-primary, #F0EAFF);
        font-family: 'Plus Jakarta Sans', sans-serif;
        font-size: 14px;
        font-weight: 600;
        line-height: 1.35;
        box-shadow: 0 10px 30px rgba(0,0,0,0.45);
        opacity: 0;
        transform: translateY(10px);
        transition: opacity 0.22s ease, transform 0.22s ease;
        pointer-events: auto;
      }
      .bestie-toast.bestie-toast-in {
        opacity: 1;
        transform: translateY(0);
      }
      .bestie-toast-dot {
        width: 7px;
        height: 7px;
        border-radius: 50%;
        flex-shrink: 0;
      }
    `
    document.head.appendChild(style)
  }

  let container = document.getElementById(CONTAINER_ID)
  if (!container) {
    container = document.createElement('div')
    container.id = CONTAINER_ID
    document.body.appendChild(container)
  }
  return container
}

const DOT_COLOR = {
  success: '#34D399',
  error: '#FF6B6B',
  info: 'var(--gold, #D4AF37)',
}

export function showToast(
  message: string,
  opts?: { type?: 'success' | 'error' | 'info' }
) {
  const container = ensureContainer()
  if (!container) return

  const type = opts?.type || 'info'

  const toast = document.createElement('div')
  toast.className = 'bestie-toast'
  toast.setAttribute('role', 'status')

  const dot = document.createElement('span')
  dot.className = 'bestie-toast-dot'
  dot.style.background = DOT_COLOR[type] || DOT_COLOR.info

  const text = document.createElement('span')
  text.textContent = message

  toast.appendChild(dot)
  toast.appendChild(text)
  container.appendChild(toast)

  // Slide up on next frame
  requestAnimationFrame(() => {
    requestAnimationFrame(() => toast.classList.add('bestie-toast-in'))
  })

  const remove = () => {
    toast.classList.remove('bestie-toast-in')
    setTimeout(() => toast.remove(), 240)
  }
  const timer = setTimeout(remove, 2800)
  toast.addEventListener('click', () => {
    clearTimeout(timer)
    remove()
  })
}

// Optional mount point — showToast works standalone, so this is a safe no-op.
export function Toaster() {
  return null
}

export default Toaster
