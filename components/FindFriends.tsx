// @ts-nocheck
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Search, Share2, Pencil, Lock, AlertTriangle, Sprout, Check, Copy } from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface MatchedUser {
  id: string
  full_name: string
  username: string
  photo: string | null
  city: string | null
  bestie_score: number
}

async function sha256hex(text: string): Promise<string> {
  const enc = new TextEncoder()
  const buf = await crypto.subtle.digest('SHA-256', enc.encode(text))
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('')
}

export default function FindFriends() {
  const [phase, setPhase] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [matchedUsers, setMatchedUsers] = useState<MatchedUser[]>([])
  const [importedCount, setImportedCount] = useState(0)
  const [errorMsg, setErrorMsg] = useState('')
  const [manualText, setManualText] = useState('')
  const [showManual, setShowManual] = useState(false)
  const [username, setUsername] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      const { data } = await supabase.from('users').select('username').eq('id', session.user.id).single()
      if (data?.username) setUsername(data.username)
    })()
  }, [])

  const inviteUrl = username ? `https://bestiehere.com/invite/${username}` : ''

  async function handleShare() {
    if (!inviteUrl) return
    const text = `Join me on Bestie — find real people for real activities.`
    if (typeof navigator !== 'undefined' && (navigator as any).share) {
      try {
        await (navigator as any).share({ title: 'Join me on Bestie', text, url: inviteUrl })
        return
      } catch { /* user cancelled — fall through to copy */ }
    }
    try {
      await navigator.clipboard.writeText(inviteUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {}
  }

  async function handleCopy() {
    if (!inviteUrl) return
    try {
      await navigator.clipboard.writeText(inviteUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {}
  }

  async function runImport(contacts: Array<{ email?: string; phone?: string }>) {
    if (!contacts.length) { setErrorMsg('Add at least one email or phone number.'); setPhase('error'); return }
    setPhase('loading')
    setErrorMsg('')
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { setErrorMsg('Please log in first.'); setPhase('error'); return }
      const res = await fetch('/api/contacts/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
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

  async function handleManualSubmit() {
    const lines = manualText.split(/[\n,;]+/).map(l => l.trim()).filter(Boolean)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    const contacts = lines.map(line => emailRegex.test(line) ? { email: line.toLowerCase() } : { phone: line.replace(/[\s\-()]/g, '') })
    await runImport(contacts)
  }

  function tierColor(score: number) {
    if (score >= 800) return '#FFFFFF'
    if (score >= 600) return '#D4AF37'
    if (score >= 400) return '#9B8FFF'
    return '#9B93C0'
  }

  return (
    <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '18px', padding: '20px', marginBottom: '24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', color: '#D4AF37' }}><Search size={22} strokeWidth={2} /></span>
        <p style={{ fontSize: '15px', fontWeight: 700, color: '#E8E0FF', margin: 0 }}>Bring your friends to Bestie</p>
      </div>
      <p style={{ fontSize: '12px', color: '#9B93C0', margin: '0 0 16px 32px' }}>Share your invite link — or check who's already here.</p>

      {phase === 'idle' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* PRIMARY: Share invite link */}
          <div style={{ padding: '14px', borderRadius: '14px', background: 'rgba(212,175,55,0.06)', border: '1px solid rgba(212,175,55,0.2)' }}>
            <p style={{ fontSize: '12px', color: '#9B93C0', margin: '0 0 10px', letterSpacing: '0.5px', textTransform: 'uppercase' }}>Your invite link</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 12px', borderRadius: '10px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.06)', marginBottom: '12px' }}>
              <span style={{ flex: 1, fontSize: '13px', color: '#E8E0FF', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {inviteUrl || 'Loading…'}
              </span>
              <button
                onClick={handleCopy}
                disabled={!inviteUrl}
                aria-label="Copy invite link"
                style={{ flexShrink: 0, padding: '6px 10px', borderRadius: '8px', background: copied ? 'rgba(52,211,153,0.15)' : 'rgba(255,255,255,0.06)', border: copied ? '1px solid rgba(52,211,153,0.3)' : '1px solid rgba(255,255,255,0.1)', color: copied ? '#34D399' : '#E8E0FF', cursor: inviteUrl ? 'pointer' : 'default', display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: 600 }}
              >
                {copied ? <><Check size={12} strokeWidth={2.5} /> Copied</> : <><Copy size={12} strokeWidth={2} /> Copy</>}
              </button>
            </div>
            <button
              onClick={handleShare}
              disabled={!inviteUrl}
              style={{ width: '100%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px 20px', borderRadius: '12px', fontWeight: 700, fontSize: '14px', color: '#080810', background: 'linear-gradient(135deg, #D4AF37 0%, #B8960C 100%)', border: 'none', cursor: inviteUrl ? 'pointer' : 'default' }}
            >
              <Share2 size={16} strokeWidth={2} /> Share via Telegram, WhatsApp, iMessage…
            </button>
            <p style={{ fontSize: '11px', color: '#9B93C0', margin: '8px 0 0', textAlign: 'center' }}>
              Friends get a pretty card with your Bestie Score
            </p>
          </div>

          {/* SECONDARY: Manual lookup */}
          <button
            onClick={() => setShowManual(!showManual)}
            style={{ background: 'transparent', border: 'none', borderTop: '1px solid rgba(255,255,255,0.06)', padding: '12px 0 0', color: '#9B93C0', fontSize: '12px', cursor: 'pointer', fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
          >
            <Pencil size={12} strokeWidth={2} /> {showManual ? 'Hide' : 'Already know their email or phone? Check if they\'re on Bestie'}
          </button>

          {showManual && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <textarea
                value={manualText}
                onChange={e => setManualText(e.target.value)}
                placeholder={'friend@email.com\n+1234567890\n\nOne per line — emails or phone numbers'}
                rows={4}
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', padding: '10px 12px', color: '#E8E0FF', fontSize: '13px', resize: 'vertical', fontFamily: 'monospace', width: '100%', boxSizing: 'border-box' }}
              />
              <button
                onClick={handleManualSubmit}
                disabled={!manualText.trim()}
                style={{ background: manualText.trim() ? 'rgba(155,127,255,0.15)' : 'rgba(255,255,255,0.05)', borderRadius: '10px', padding: '10px 20px', color: manualText.trim() ? '#9B7FFF' : '#9B93C0', fontSize: '13px', fontWeight: 600, cursor: manualText.trim() ? 'pointer' : 'default', border: manualText.trim() ? '1px solid rgba(155,127,255,0.3)' : '1px solid rgba(255,255,255,0.08)' }}
              >
                Find matches →
              </button>
              <p style={{ fontSize: '11px', color: '#9B93C0', textAlign: 'center', marginTop: '2px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                <Lock size={11} strokeWidth={2} /> Hashed with SHA-256 before leaving your device
              </p>
            </div>
          )}

          <p style={{ fontSize: '11px', color: '#9B93C0', textAlign: 'center', marginTop: '4px' }}>
            🔒 We match contacts as hashed fingerprints — your raw emails & phone numbers are never saved or shared
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
          <button onClick={() => { setPhase('idle'); setErrorMsg('') }} style={{ background: 'rgba(255,255,255,0.08)', borderRadius: '10px', padding: '8px 18px', color: '#E8E0FF', fontSize: '13px', border: 'none', cursor: 'pointer' }}>
            Try again
          </button>
        </div>
      )}

      {phase === 'done' && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <p style={{ fontSize: '13px', color: '#9B93C0', margin: 0 }}>
              Checked <strong style={{ color: '#E8E0FF' }}>{importedCount}</strong>
              {matchedUsers.length > 0 ? ` · ` : ' · '}
              {matchedUsers.length > 0 && <strong style={{ color: '#D4AF37' }}>{matchedUsers.length}</strong>}
              {matchedUsers.length > 0 ? ' on Bestie' : 'no matches yet'}
            </p>
            <button onClick={() => { setPhase('idle'); setMatchedUsers([]); setManualText('') }} style={{ fontSize: '11px', color: '#9B93C0', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>
              Check more
            </button>
          </div>

          {matchedUsers.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <p style={{ marginBottom: '8px', display: 'flex', justifyContent: 'center', color: '#9B8FFF' }}><Sprout size={32} strokeWidth={2} /></p>
              <p style={{ fontSize: '14px', color: '#9B93C0' }}>None of them are on Bestie yet.</p>
              <p style={{ fontSize: '12px', color: '#9B93C0', marginTop: '4px' }}>Share your invite link above — we'll notify you when they join.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {matchedUsers.map(u => (
                <Link key={u.id} href={`/${u.username}`} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 12px', borderRadius: '12px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', textDecoration: 'none' }}>
                  <div style={{ width: '44px', height: '44px', borderRadius: '50%', flexShrink: 0, overflow: 'hidden', border: `2px solid ${tierColor(u.bestie_score)}`, background: '#0F0F1E', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {u.photo
                      ? <img src={u.photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : <span style={{ fontSize: '16px', fontWeight: 700, color: tierColor(u.bestie_score) }}>
                          {u.full_name?.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2) || '?'}
                        </span>
                    }
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: '14px', fontWeight: 600, color: '#E8E0FF', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {u.full_name || u.username}
                    </p>
                    <p style={{ fontSize: '12px', color: '#9B93C0', margin: 0 }}>
                      @{u.username}{u.city ? ` · ${u.city}` : ''}
                    </p>
                  </div>
                  <div style={{ flexShrink: 0, padding: '4px 10px', borderRadius: '8px', background: `${tierColor(u.bestie_score)}18`, border: `1px solid ${tierColor(u.bestie_score)}40` }}>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: tierColor(u.bestie_score) }}>★ {u.bestie_score}</span>
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
