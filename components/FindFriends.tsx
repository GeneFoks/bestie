// @ts-nocheck
'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Search, Smartphone, Pencil, Lock, AlertTriangle, Sprout } from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface MatchedUser {
  id: string
  full_name: string
  username: string
  photo: string | null
  city: string | null
  bestie_score: number
}

// ── SHA-256 in the browser ───────────────────────────────────────────────────
async function sha256hex(text: string): Promise<string> {
  const enc = new TextEncoder()
  const buf = await crypto.subtle.digest('SHA-256', enc.encode(text))
  return Array.from(new Uint8Array(buf))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

// ── Parse the raw vCard blob (iOS/Android exports contacts as vCard) ──────────
function parseVCards(raw: string): Array<{ email?: string; phone?: string; name?: string }> {
  const cards: Array<{ email?: string; phone?: string; name?: string }> = []
  const blocks = raw.split(/BEGIN:VCARD/i).filter(b => b.trim())
  for (const block of blocks) {
    const nameMatch  = block.match(/^FN[^:]*:(.+)$/m)
    const emailMatch = block.match(/^EMAIL[^:]*:(.+)$/m)
    const phoneMatch = block.match(/^TEL[^:]*:(.+)$/m)
    if (emailMatch || phoneMatch) {
      cards.push({
        name:  nameMatch?.[1]?.trim(),
        email: emailMatch?.[1]?.trim(),
        phone: phoneMatch?.[1]?.trim(),
      })
    }
  }
  return cards
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function FindFriends() {
  const [phase, setPhase] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [matchedUsers, setMatchedUsers] = useState<MatchedUser[]>([])
  const [importedCount, setImportedCount] = useState(0)
  const [errorMsg, setErrorMsg] = useState('')
  const [manualText, setManualText] = useState('')
  const [showManual, setShowManual] = useState(false)

  // ── Core import logic ─────────────────────────────────────────────────────
  async function runImport(contacts: Array<{ email?: string; phone?: string; name?: string }>) {
    if (!contacts.length) { setErrorMsg('No contacts found in file.'); setPhase('error'); return }

    setPhase('loading')
    setErrorMsg('')

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { setErrorMsg('Please log in first.'); setPhase('error'); return }

      const res = await fetch('/api/contacts/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ contacts }),
      })

      const json = await res.json()
      if (!res.ok) { setErrorMsg(json.error || 'Something went wrong'); setPhase('error'); return }

      setImportedCount(json.imported)
      setMatchedUsers(json.users || [])
      setPhase('done')
    } catch (e: any) {
      setErrorMsg(e.message || 'Network error')
      setPhase('error')
    }
  }

  // ── File picker (vCard .vcf) ───────────────────────────────────────────────
  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = async (ev) => {
      const text = ev.target?.result as string
      const contacts = parseVCards(text)
      await runImport(contacts)
    }
    reader.readAsText(file)
  }

  // ── Manual entry ──────────────────────────────────────────────────────────
  async function handleManualSubmit() {
    const lines = manualText.split('\n').map(l => l.trim()).filter(Boolean)
    const contacts = lines.map(line => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (emailRegex.test(line)) return { email: line }
      return { phone: line }
    })
    await runImport(contacts)
  }

  // ── Tier color ─────────────────────────────────────────────────────────────
  function tierColor(score: number) {
    if (score >= 800) return '#FFFFFF'
    if (score >= 600) return '#D4AF37'
    if (score >= 400) return '#9B8FFF'
    return '#9B93C0'
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '18px', padding: '20px 20px', marginBottom: '24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', color: '#D4AF37' }}><Search size={22} strokeWidth={2} /></span>
        <div>
          <p style={{ fontSize: '15px', fontWeight: 700, color: '#E8E0FF', margin: 0 }}>Find friends on Bestie</p>
          <p style={{ fontSize: '12px', color: '#9B93C0', margin: 0 }}>Import contacts · All data is hashed &amp; never stored in plain text</p>
        </div>
      </div>

      {phase === 'idle' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {/* vCard upload */}
          <label style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            padding: '12px 20px', borderRadius: '12px', cursor: 'pointer', fontWeight: 600,
            fontSize: '14px', color: '#080810', background: 'linear-gradient(135deg, #D4AF37 0%, #B8960C 100%)',
          }}>
            <Smartphone size={16} strokeWidth={2} /> Import from phone contacts (.vcf)
            <input type="file" accept=".vcf,text/vcard" onChange={handleFileChange} aria-label="Import contacts vCard file" style={{ display: 'none' }} />
          </label>

          {/* Manual entry toggle */}
          <button
            onClick={() => setShowManual(!showManual)}
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '10px 20px', color: '#9B93C0', fontSize: '13px', cursor: 'pointer', fontFamily: 'Plus Jakarta Sans, sans-serif', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
          >
            <Pencil size={14} strokeWidth={2} /> Enter emails / phones manually
          </button>

          {showManual && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <textarea
                value={manualText}
                onChange={e => setManualText(e.target.value)}
                placeholder={'one@email.com\n+1234567890\nanother@email.com'}
                rows={5}
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '10px', padding: '10px 12px', color: '#E8E0FF', fontSize: '13px', resize: 'vertical', fontFamily: 'monospace', width: '100%', boxSizing: 'border-box' }}
              />
              <button
                onClick={handleManualSubmit}
                disabled={!manualText.trim()}
                style={{ background: manualText.trim() ? 'linear-gradient(135deg, #D4AF37 0%, #B8960C 100%)' : 'rgba(255,255,255,0.1)', borderRadius: '10px', padding: '10px 20px', color: '#080810', fontSize: '14px', fontWeight: 700, cursor: manualText.trim() ? 'pointer' : 'default', border: 'none', fontFamily: 'Plus Jakarta Sans, sans-serif' }}
              >
                Find matches →
              </button>
            </div>
          )}

          <p style={{ fontSize: '11px', color: '#9B93C0', textAlign: 'center', marginTop: '4px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
            <Lock size={11} strokeWidth={2} /> Your contacts are hashed with SHA-256 before leaving your device
          </p>
        </div>
      )}

      {phase === 'loading' && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', padding: '24px 0' }}>
          <div style={{ width: '32px', height: '32px', border: '3px solid rgba(212,175,55,0.2)', borderTop: '3px solid #D4AF37', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
          <p style={{ fontSize: '13px', color: '#9B93C0' }}>Scanning the network...</p>
        </div>
      )}

      {phase === 'error' && (
        <div style={{ textAlign: 'center', padding: '16px 0' }}>
          <p style={{ fontSize: '14px', color: '#FF6B6B', marginBottom: '12px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}><AlertTriangle size={14} strokeWidth={2} /> {errorMsg}</p>
          <button onClick={() => { setPhase('idle'); setErrorMsg('') }} style={{ background: 'rgba(255,255,255,0.08)', borderRadius: '10px', padding: '8px 18px', color: '#E8E0FF', fontSize: '13px', border: 'none', cursor: 'pointer', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
            Try again
          </button>
        </div>
      )}

      {phase === 'done' && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <p style={{ fontSize: '13px', color: '#9B93C0', margin: 0 }}>
              Scanned <strong style={{ color: '#E8E0FF' }}>{importedCount}</strong> contacts
              {matchedUsers.length > 0 ? ` · Found ` : ' · '}
              {matchedUsers.length > 0 && <strong style={{ color: '#D4AF37' }}>{matchedUsers.length}</strong>}
              {matchedUsers.length > 0 ? ' on Bestie' : 'No matches yet'}
            </p>
            <button onClick={() => { setPhase('idle'); setMatchedUsers([]) }} style={{ fontSize: '11px', color: '#9B93C0', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
              Import more
            </button>
          </div>

          {matchedUsers.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <p style={{ marginBottom: '8px', display: 'flex', justifyContent: 'center', color: '#9B8FFF' }}><Sprout size={32} strokeWidth={2} /></p>
              <p style={{ fontSize: '14px', color: '#9B93C0' }}>None of your contacts are on Bestie yet.</p>
              <p style={{ fontSize: '12px', color: '#9B93C0', marginTop: '4px' }}>
                We'll notify you when they join!
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {matchedUsers.map(u => (
                <Link key={u.id} href={`/${u.username}`} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 12px', borderRadius: '12px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', textDecoration: 'none' }}>
                  {/* Avatar */}
                  <div style={{ width: '44px', height: '44px', borderRadius: '50%', flexShrink: 0, overflow: 'hidden', border: `2px solid ${tierColor(u.bestie_score)}`, background: '#0F0F1E', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {u.photo
                      ? <img src={u.photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : <span style={{ fontSize: '16px', fontWeight: 700, color: tierColor(u.bestie_score) }}>
                          {u.full_name?.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2) || '?'}
                        </span>
                    }
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: '14px', fontWeight: 600, color: '#E8E0FF', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {u.full_name || u.username}
                    </p>
                    <p style={{ fontSize: '12px', color: '#9B93C0', margin: 0 }}>
                      @{u.username}{u.city ? ` · ${u.city}` : ''}
                    </p>
                  </div>

                  {/* Score badge */}
                  <div style={{ flexShrink: 0, padding: '4px 10px', borderRadius: '8px', background: `${tierColor(u.bestie_score)}18`, border: `1px solid ${tierColor(u.bestie_score)}40` }}>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: tierColor(u.bestie_score) }}>BS {u.bestie_score}</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
