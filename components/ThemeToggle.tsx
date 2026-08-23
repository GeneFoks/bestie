'use client'

import { useState, useEffect } from 'react'
import { Sun, Moon, Monitor } from 'lucide-react'

type Theme = 'light' | 'dark' | 'system'

// Reads/writes the same 'bestie-theme' key the no-flash script in layout uses,
// and applies the choice to <html data-theme> live (no reload).
function applyTheme(t: Theme) {
  const root = document.documentElement
  if (t === 'system') {
    root.removeAttribute('data-theme')
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
      root.setAttribute('data-theme', 'light')
    }
  } else {
    root.setAttribute('data-theme', t)
  }
}

export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>('dark')

  useEffect(() => {
    const saved = (localStorage.getItem('bestie-theme') as Theme) || 'system'
    setTheme(saved)
  }, [])

  const choose = (t: Theme) => {
    setTheme(t)
    if (t === 'system') localStorage.removeItem('bestie-theme')
    else localStorage.setItem('bestie-theme', t)
    applyTheme(t)
  }

  const options: { id: Theme; label: string; icon: any }[] = [
    { id: 'light', label: 'Light', icon: Sun },
    { id: 'dark', label: 'Dark', icon: Moon },
    { id: 'system', label: 'Auto', icon: Monitor },
  ]

  return (
    <div>
      <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.5px', marginBottom: '8px', display: 'block' }}>
        Appearance
      </label>
      <div style={{ display: 'flex', gap: '8px' }}>
        {options.map(o => {
          const on = theme === o.id
          const Icon = o.icon
          return (
            <button
              key={o.id}
              type="button"
              onClick={() => choose(o.id)}
              style={{
                flex: 1,
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px',
                padding: '14px 10px',
                borderRadius: '14px',
                fontSize: '13px', fontWeight: 700,
                background: on ? 'rgba(212,175,55,0.12)' : 'var(--overlay)',
                border: on ? '1px solid var(--border-gold)' : '1px solid var(--border)',
                color: on ? 'var(--gold)' : 'var(--text-muted)',
                cursor: 'pointer',
                fontFamily: 'Plus Jakarta Sans, sans-serif',
              }}
            >
              <Icon size={18} strokeWidth={2} />
              {o.label}
            </button>
          )
        })}
      </div>
      <p style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '8px' }}>
        “Auto” follows your phone or computer setting.
      </p>
    </div>
  )
}
