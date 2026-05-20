'use client'

import { useState, useEffect } from 'react'
import { Theater, Frown, Megaphone, Siren, DollarSign, HelpCircle, CheckCircle2, Ban, AlertTriangle } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { supabase } from '@/lib/supabase'

const REPORT_REASONS: Array<{ id: string; Icon: LucideIcon; label: string }> = [
  { id: 'fake_profile', Icon: Theater, label: 'Fake profile' },
  { id: 'harassment', Icon: Frown, label: 'Harassment' },
  { id: 'spam', Icon: Megaphone, label: 'Spam' },
  { id: 'inappropriate', Icon: Siren, label: 'Inappropriate behavior' },
  { id: 'scam', Icon: DollarSign, label: 'Scam / fraud' },
  { id: 'other', Icon: HelpCircle, label: 'Other' },
]

export default function BlockReportButton({ profileUserId }: { profileUserId: string }) {
  const [myId, setMyId] = useState<string | null>(null)
  const [hasSession, setHasSession] = useState(false)
  const [isBlocked, setIsBlocked] = useState(false)
  const [hasReported, setHasReported] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [reportOpen, setReportOpen] = useState(false)
  const [selectedReason, setSelectedReason] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState<string | null>(null)

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user || user.id === profileUserId) return
      setMyId(user.id)

      const [{ data: block }, { data: report }, { data: session }] = await Promise.all([
        supabase.from('user_blocks').select('id').eq('blocker_id', user.id).eq('blocked_id', profileUserId).maybeSingle(),
        supabase.from('user_reports').select('id').eq('reporter_id', user.id).eq('reported_id', profileUserId).maybeSingle(),
        supabase.from('bookings')
          .select('id')
          .or(`and(seeker_id.eq.${user.id},provider_id.eq.${profileUserId}),and(seeker_id.eq.${profileUserId},provider_id.eq.${user.id})`)
          .eq('confirmed_by_seeker', true)
          .eq('confirmed_by_provider', true)
          .limit(1)
          .maybeSingle(),
      ])
      if (block) setIsBlocked(true)
      if (report) setHasReported(true)
      if (session) setHasSession(true)
    }
    init()
  }, [profileUserId])

  if (!myId || !hasSession) return null

  const handleBlock = async () => {
    setLoading(true)
    setMenuOpen(false)
    if (isBlocked) {
      await supabase.rpc('unblock_user', { p_blocker_id: myId, p_blocked_id: profileUserId })
      setIsBlocked(false)
      setDone('Unblocked')
    } else {
      await supabase.rpc('block_user', { p_blocker_id: myId, p_blocked_id: profileUserId })
      setIsBlocked(true)
      setDone('Blocked')
    }
    setLoading(false)
    setTimeout(() => setDone(null), 2500)
  }

  const handleReport = async () => {
    if (!selectedReason) return
    setLoading(true)
    await supabase.rpc('report_user', { p_reporter_id: myId, p_reported_id: profileUserId, p_reason: selectedReason })
    setHasReported(true)
    setReportOpen(false)
    setDone('Reported — thank you')
    setLoading(false)
    setTimeout(() => setDone(null), 3000)
  }

  // Escape closes report modal or menu
  useEffect(() => {
    if (!reportOpen && !menuOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      if (reportOpen) setReportOpen(false)
      else if (menuOpen) setMenuOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [reportOpen, menuOpen])

  return (
    <>
      {/* Report modal */}
      {reportOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }} onClick={() => setReportOpen(false)}>
          <div role="dialog" aria-modal="true" aria-labelledby="report-modal-title" style={{ background: '#0F0F1E', border: '1px solid rgba(255,80,80,0.25)', borderRadius: '20px', padding: '28px', maxWidth: '360px', width: '100%' }} onClick={e => e.stopPropagation()}>
            <h3 id="report-modal-title" style={{ fontFamily: 'DM Serif Display, serif', fontSize: '20px', color: '#E8E0FF', marginBottom: '6px' }}>Report this user</h3>
            <p style={{ fontSize: '13px', color: '#9B93C0', marginBottom: '20px' }}>Choose a reason. Reports are anonymous and reviewed by our team.</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
              {REPORT_REASONS.map(r => (
                <button
                  key={r.id}
                  onClick={() => setSelectedReason(r.id)}
                  style={{ padding: '12px 16px', borderRadius: '12px', fontSize: '14px', textAlign: 'left', background: selectedReason === r.id ? 'rgba(255,80,80,0.12)' : 'rgba(255,255,255,0.03)', border: selectedReason === r.id ? '1px solid rgba(255,80,80,0.4)' : '1px solid rgba(255,255,255,0.08)', color: selectedReason === r.id ? '#FF6B6B' : '#E8E0FF', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                >
                  <r.Icon size={16} strokeWidth={2} /> {r.label}
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setReportOpen(false)} style={{ flex: 1, padding: '12px', borderRadius: '12px', fontSize: '14px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#9B93C0', cursor: 'pointer' }}>Cancel</button>
              <button
                onClick={handleReport}
                disabled={!selectedReason || loading}
                style={{ flex: 1, padding: '12px', borderRadius: '12px', fontSize: '14px', fontWeight: 700, background: selectedReason ? 'rgba(255,80,80,0.15)' : 'rgba(255,255,255,0.04)', border: selectedReason ? '1px solid rgba(255,80,80,0.35)' : '1px solid rgba(255,255,255,0.08)', color: selectedReason ? '#FF6B6B' : '#555', cursor: selectedReason ? 'pointer' : 'default' }}
              >
                {loading ? 'Sending...' : 'Submit report'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating done toast */}
      {done && (
        <div style={{ position: 'fixed', bottom: '32px', left: '50%', transform: 'translateX(-50%)', zIndex: 300, padding: '10px 20px', borderRadius: '999px', background: '#1a1a35', border: '1px solid rgba(255,255,255,0.12)', color: '#E8E0FF', fontSize: '14px', fontWeight: 600 }}>
          {done}
        </div>
      )}

      {/* Trigger button + dropdown */}
      <div style={{ position: 'relative' }}>
        <button
          onClick={() => setMenuOpen(o => !o)}
          aria-label="More actions"
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          style={{ padding: '8px 14px', borderRadius: '10px', fontSize: '13px', fontWeight: 600, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: '#9B93C0', cursor: 'pointer' }}
        >
          ···
        </button>

        {menuOpen && (
          <div role="menu" style={{ position: 'absolute', top: 'calc(100% + 8px)', right: 0, zIndex: 100, background: '#0F0F1E', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '14px', padding: '8px', minWidth: '180px', boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}>
            <button
              onClick={handleBlock}
              disabled={loading}
              style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%', padding: '10px 12px', borderRadius: '10px', fontSize: '14px', background: 'none', border: 'none', color: isBlocked ? '#39FF14' : '#9B93C0', cursor: 'pointer', textAlign: 'left' }}
            >
              {isBlocked ? (<><CheckCircle2 size={16} strokeWidth={2} /> Unblock user</>) : (<><Ban size={16} strokeWidth={2} /> Block user</>)}
            </button>
            {!hasReported ? (
              <button
                onClick={() => { setMenuOpen(false); setReportOpen(true) }}
                style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%', padding: '10px 12px', borderRadius: '10px', fontSize: '14px', background: 'none', border: 'none', color: '#FF6B6B', cursor: 'pointer', textAlign: 'left' }}
              >
                <AlertTriangle size={16} strokeWidth={2} /> Report user
              </button>
            ) : (
              <div style={{ padding: '10px 12px', fontSize: '14px', color: '#555', display: 'inline-flex', alignItems: 'center', gap: '6px' }}><AlertTriangle size={16} strokeWidth={2} /> Already reported</div>
            )}
          </div>
        )}
      </div>

      {/* Click-away overlay */}
      {menuOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 90 }} onClick={() => setMenuOpen(false)} />
      )}
    </>
  )
}
