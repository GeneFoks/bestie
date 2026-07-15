// @ts-nocheck
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { PageLoader } from '@/components/Loading'
import { ShieldAlert, Ban, Check, RotateCcw } from 'lucide-react'

const GOLD = '#D4AF37'

type Filter = 'pending' | 'reviewed' | 'dismissed' | 'all'

export default function AdminModerationPage() {
  const router = useRouter()
  const [reports, setReports] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [denied, setDenied] = useState(false)
  const [filter, setFilter] = useState<Filter>('pending')
  const [busy, setBusy] = useState<string | null>(null)

  const load = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.push('/login'); return }
    const { data, error } = await supabase.rpc('admin_list_reports')
    if (error) { setDenied(true); setLoading(false); return }
    setReports(data || [])
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  const setStatus = async (id: string, status: string) => {
    setBusy(id)
    const { error } = await supabase.rpc('admin_set_report_status', { p_report_id: id, p_status: status })
    if (!error) setReports(prev => prev.map(r => r.id === id ? { ...r, status } : r))
    setBusy(null)
  }

  const setBan = async (report: any, banned: boolean) => {
    const name = report.reported?.full_name || 'this user'
    if (!confirm(banned ? `Ban ${name}? They will not be able to sign in.` : `Unban ${name}?`)) return
    setBusy(report.id)
    const { error } = await supabase.rpc('admin_set_ban', { p_user_id: report.reported.id, p_banned: banned })
    if (error) alert(error.message)
    else setReports(prev => prev.map(r =>
      r.reported?.id === report.reported.id
        ? { ...r, reported: { ...r.reported, is_banned: banned } }
        : r
    ))
    setBusy(null)
  }

  if (loading) return <PageLoader fullscreen={false} message="Loading reports…" />

  if (denied) return (
    <div style={{ minHeight: '100vh', background: '#09090F', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
      <div style={{ textAlign: 'center', maxWidth: '360px', padding: '0 24px' }}>
        <p style={{ fontSize: '48px', marginBottom: '16px' }}>🔒</p>
        <h2 style={{ fontFamily: 'DM Serif Display, serif', fontSize: '22px', color: '#F0EAFF', marginBottom: '8px' }}>Admins only</h2>
        <p style={{ fontSize: '14px', color: '#A99ECC', marginBottom: '24px' }}>Run the moderation migration and set <code style={{ color: GOLD }}>is_admin = true</code> on your user row.</p>
        <Link href="/" style={{ color: GOLD, fontSize: '14px', textDecoration: 'none' }}>← Back home</Link>
      </div>
    </div>
  )

  const filtered = filter === 'all' ? reports : reports.filter(r => (r.status || 'pending') === filter)
  const counts: Record<string, number> = { pending: 0, reviewed: 0, dismissed: 0 }
  reports.forEach(r => { counts[r.status || 'pending'] = (counts[r.status || 'pending'] || 0) + 1 })

  return (
    <div style={{ minHeight: '100vh', background: '#09090F', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
      <nav style={{ position: 'sticky', top: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', background: 'rgba(8,8,16,0.9)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.10)' }}>
        <Link href="/" style={{ fontFamily: 'DM Serif Display, serif', fontSize: '20px', fontWeight: 700, color: GOLD, textDecoration: 'none' }}>BESTIE</Link>
        <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
          <Link href="/admin/analytics" style={{ fontSize: '13px', color: '#A99ECC', textDecoration: 'none' }}>Analytics</Link>
          <span style={{ fontSize: '13px', color: GOLD }}>Moderation</span>
        </div>
      </nav>

      <div style={{ maxWidth: '820px', margin: '0 auto', padding: '36px 20px 100px' }}>
        <h1 style={{ fontFamily: 'DM Serif Display, serif', fontSize: '28px', color: '#F0EAFF', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <ShieldAlert size={24} color={GOLD} strokeWidth={1.8} /> Reports
        </h1>
        <p style={{ fontSize: '13px', color: '#A99ECC', marginBottom: '24px' }}>
          {counts.pending} pending · {counts.reviewed} reviewed · {counts.dismissed} dismissed
        </p>

        <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
          {(['pending', 'reviewed', 'dismissed', 'all'] as Filter[]).map(f => (
            <button key={f} onClick={() => setFilter(f)} style={{ padding: '7px 14px', borderRadius: '10px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', textTransform: 'capitalize', fontFamily: 'Plus Jakarta Sans, sans-serif',
              background: filter === f ? 'rgba(212,175,55,0.15)' : '#131323',
              border: filter === f ? '1px solid rgba(212,175,55,0.4)' : '1px solid rgba(255,255,255,0.12)',
              color: filter === f ? GOLD : '#A99ECC' }}>
              {f}{f !== 'all' && counts[f] > 0 ? ` (${counts[f]})` : ''}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', background: '#111120', border: '1px solid rgba(255,255,255,0.10)', borderRadius: '18px' }}>
            <p style={{ fontSize: '34px', marginBottom: '10px' }}>✅</p>
            <p style={{ fontSize: '14px', color: '#A99ECC' }}>No {filter === 'all' ? '' : filter + ' '}reports. All clear.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {filtered.map(r => {
              const status = r.status || 'pending'
              const statusColor = status === 'pending' ? '#FF6B35' : status === 'reviewed' ? '#34D399' : '#6B6490'
              return (
                <div key={r.id} style={{ background: '#111120', border: `1px solid ${status === 'pending' ? 'rgba(255,107,53,0.25)' : 'rgba(255,255,255,0.10)'}`, borderRadius: '16px', padding: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', marginBottom: '10px', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <PersonChip user={r.reporter} label="reporter" />
                      <span style={{ color: '#6B6490', fontSize: '12px' }}>reported</span>
                      <PersonChip user={r.reported} label="reported" highlight />
                    </div>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: statusColor, textTransform: 'uppercase', letterSpacing: '1px' }}>{status}</span>
                  </div>

                  <p style={{ fontSize: '14px', color: '#F0EAFF', marginBottom: '6px' }}>
                    <span style={{ color: '#A99ECC' }}>Reason:</span> {r.reason || '—'}
                  </p>
                  <p style={{ fontSize: '12px', color: '#6B6490', marginBottom: '14px' }}>
                    {new Date(r.created_at).toLocaleString('en-US')} · {r.reported?.report_count || 1} active report{(r.reported?.report_count || 1) > 1 ? 's' : ''} on this user
                    {r.reported?.is_banned && <b style={{ color: '#FF6B35' }}> · BANNED</b>}
                  </p>

                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {status !== 'reviewed' && (
                      <ActionBtn onClick={() => setStatus(r.id, 'reviewed')} disabled={busy === r.id} color="#34D399">
                        <Check size={13} strokeWidth={2.5} /> Mark reviewed
                      </ActionBtn>
                    )}
                    {status !== 'dismissed' && (
                      <ActionBtn onClick={() => setStatus(r.id, 'dismissed')} disabled={busy === r.id} color="#A99ECC">
                        Dismiss (no penalty)
                      </ActionBtn>
                    )}
                    {status !== 'pending' && (
                      <ActionBtn onClick={() => setStatus(r.id, 'pending')} disabled={busy === r.id} color="#A99ECC">
                        <RotateCcw size={13} strokeWidth={2.2} /> Reopen
                      </ActionBtn>
                    )}
                    {r.reported && !r.reported.is_banned && (
                      <ActionBtn onClick={() => setBan(r, true)} disabled={busy === r.id} color="#FF6B35">
                        <Ban size={13} strokeWidth={2.2} /> Ban user
                      </ActionBtn>
                    )}
                    {r.reported?.is_banned && (
                      <ActionBtn onClick={() => setBan(r, false)} disabled={busy === r.id} color="#34D399">
                        Unban
                      </ActionBtn>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        <p style={{ fontSize: '12px', color: '#6B6490', marginTop: '24px', lineHeight: 1.6 }}>
          Dismissed reports don't count against the user's Bestie Score. Banning blocks sign-in at the auth layer; data is kept. Score recalculates automatically when a report's status changes.
        </p>
      </div>
    </div>
  )
}

function PersonChip({ user, label, highlight }: any) {
  if (!user) return <span style={{ fontSize: '13px', color: '#6B6490' }}>deleted user</span>
  return (
    <Link href={`/${user.username}`} target="_blank" style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', padding: '4px 10px 4px 4px', borderRadius: '999px', background: highlight ? 'rgba(255,107,53,0.08)' : 'rgba(255,255,255,0.04)', border: highlight ? '1px solid rgba(255,107,53,0.25)' : '1px solid rgba(255,255,255,0.10)', textDecoration: 'none' }}>
      <span style={{ width: '24px', height: '24px', borderRadius: '50%', overflow: 'hidden', background: '#1A1A2E', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        {user.avatar_url
          ? <img src={user.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : <span style={{ fontSize: '10px', color: '#D4AF37', fontWeight: 700 }}>{user.full_name?.[0] || '?'}</span>}
      </span>
      <span style={{ fontSize: '13px', fontWeight: 600, color: '#F0EAFF' }}>{user.full_name}</span>
    </Link>
  )
}

function ActionBtn({ children, onClick, disabled, color }: any) {
  return (
    <button onClick={onClick} disabled={disabled} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '7px 14px', borderRadius: '10px', fontSize: '12px', fontWeight: 700, cursor: disabled ? 'wait' : 'pointer', background: `${color}14`, border: `1px solid ${color}40`, color, fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
      {children}
    </button>
  )
}
