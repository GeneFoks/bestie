// @ts-nocheck
'use client'

import { useState, useEffect, useRef } from 'react'
import { MapPin, Loader2, X } from 'lucide-react'

type Suggestion = {
  display_name: string
  lat: string
  lon: string
  place_id: number
  type?: string
  class?: string
  addresstype?: string
  address?: Record<string, string>
}

type Props = {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  style?: React.CSSProperties
  /** 'cities' restricts suggestions to cities/towns and returns a normalized "City, State, Country" string. */
  mode?: 'cities'
}

// What counts as "a city" for mode='cities' — settlements people would name
// as their home city, nothing narrower (suburbs) or broader (states, POIs).
const CITY_TYPES = new Set(['city', 'town', 'village', 'municipality', 'borough', 'hamlet', 'locality'])

const isCitySuggestion = (s: Suggestion) => {
  const t = s.addresstype || (s.class === 'place' ? s.type : null)
  return t ? CITY_TYPES.has(t) : false
}

// Normalized "City, State, Country" — density lives and dies on everyone
// spelling their city the same way, so we build the label ourselves instead
// of trusting the raw display_name.
const cityLabel = (s: Suggestion) => {
  const a = s.address || {}
  const city = a.city || a.town || a.village || a.municipality || a.borough || a.hamlet || a.locality
    || s.display_name.split(',')[0].trim()
  const parts = [city, a.state, a.country].filter(Boolean)
  // Collapse repeats like city-states ("Singapore, Singapore")
  return parts.filter((p, i) => p !== parts[i - 1]).join(', ')
}

/**
 * Debounced location autocomplete backed by OpenStreetMap Nominatim.
 * Free, no API key. Limited to ~1 req/sec — we debounce 350ms.
 * Degrades to a plain text input if the API is down: typing always
 * writes through onChange, suggestions are purely additive.
 */
export default function LocationPicker({ value, onChange, placeholder, style, mode }: Props) {
  const [query, setQuery] = useState(value)
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [focused, setFocused] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)
  const abortRef = useRef<AbortController | null>(null)
  // Only fetch after a real keystroke — programmatic value sets (pick, parent
  // sync) must not reopen the dropdown. The old `query === value` guard broke
  // for parents that write onChange straight back into `value`.
  const typedRef = useRef(false)

  useEffect(() => { setQuery(value) }, [value])

  useEffect(() => {
    if (!focused) return
    if (query.trim().length < 3 || !typedRef.current) { setSuggestions([]); setOpen(false); return }

    const timer = setTimeout(async () => {
      try {
        abortRef.current?.abort()
        const controller = new AbortController()
        abortRef.current = controller
        setLoading(true)
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&addressdetails=1&limit=${mode === 'cities' ? 10 : 6}${mode === 'cities' ? '&featureType=settlement' : ''}`,
          { signal: controller.signal, headers: { 'Accept-Language': 'en' } }
        )
        let data: Suggestion[] = (await res.json()) || []
        if (mode === 'cities') {
          // Belt and suspenders: featureType filters server-side, this guards
          // against POIs/regions slipping through, then dedupes by label.
          const seen = new Set<string>()
          data = data.filter(s => {
            if (!isCitySuggestion(s)) return false
            const label = cityLabel(s)
            if (seen.has(label)) return false
            seen.add(label)
            return true
          })
        }
        setSuggestions(data)
        setOpen(true)
      } catch (e: any) {
        if (e.name !== 'AbortError') { setSuggestions([]); setOpen(false) }
      } finally {
        setLoading(false)
      }
    }, 350)

    return () => clearTimeout(timer)
  }, [query, focused, value])

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false); setFocused(false)
      }
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [])

  const pick = (s: Suggestion) => {
    const label = mode === 'cities' ? cityLabel(s) : s.display_name
    typedRef.current = false
    onChange(label)
    setQuery(label)
    setOpen(false)
    setFocused(false)
  }

  const clear = () => {
    typedRef.current = false
    onChange('')
    setQuery('')
    setSuggestions([])
    setOpen(false)
  }

  const inputBase: React.CSSProperties = {
    width: '100%', padding: '12px 40px 12px 40px', borderRadius: '12px', fontSize: '14px',
    background: 'var(--surface-1)', border: '1px solid var(--border)', color: 'var(--text-primary)',
    outline: 'none', boxSizing: 'border-box',
    ...style,
  }

  return (
    <div ref={wrapRef} style={{ position: 'relative' }}>
      <div style={{ position: 'relative' }}>
        <MapPin size={16} strokeWidth={1.8} color="var(--text-muted)" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
        <input
          value={query}
          onChange={e => { typedRef.current = true; setQuery(e.target.value); onChange(e.target.value) }}
          onFocus={() => setFocused(true)}
          placeholder={placeholder || 'Search for a place…'}
          style={inputBase}
          autoComplete="off"
        />
        {loading ? (
          <span style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', display: 'inline-flex' }}>
            <Loader2 size={14} color="#D4AF37" strokeWidth={2} style={{ animation: 'lp-spin 0.9s linear infinite' }} />
            <style>{`@keyframes lp-spin { to { transform: rotate(360deg) } }`}</style>
          </span>
        ) : query ? (
          <button type="button" onClick={clear} aria-label="Clear location" style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', width: '24px', height: '24px', borderRadius: '50%', background: 'var(--overlay-2)', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={12} strokeWidth={2.4} />
          </button>
        ) : null}
      </div>

      {open && suggestions.length > 0 && (
        <div style={{ position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0, zIndex: 60, background: 'var(--surface-1b)', border: '1px solid var(--border)', borderRadius: '12px', boxShadow: '0 12px 32px rgba(0,0,0,0.4)', overflow: 'hidden', maxHeight: '300px', overflowY: 'auto' }}>
          {suggestions.map(s => (
            <button
              key={s.place_id}
              type="button"
              onMouseDown={e => e.preventDefault()}
              onClick={() => pick(s)}
              style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', width: '100%', padding: '10px 14px', background: 'transparent', border: 'none', borderBottom: '1px solid var(--border)', color: 'var(--text-primary)', textAlign: 'left', cursor: 'pointer', fontFamily: 'inherit', fontSize: '13px' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(212,175,55,0.08)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <MapPin size={14} strokeWidth={1.8} color="#D4AF37" style={{ flexShrink: 0, marginTop: '2px' }} />
              <span style={{ flex: 1, lineHeight: 1.4 }}>{mode === 'cities' ? cityLabel(s) : s.display_name}</span>
            </button>
          ))}
        </div>
      )}

      {open && !loading && suggestions.length === 0 && query.trim().length >= 3 && (
        <div style={{ position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0, zIndex: 60, background: 'var(--surface-1b)', border: '1px solid var(--border)', borderRadius: '12px', padding: '12px 14px', fontSize: '12px', color: 'var(--text-muted)' }}>
          No matches — keep typing or use your own text.
        </div>
      )}
    </div>
  )
}
