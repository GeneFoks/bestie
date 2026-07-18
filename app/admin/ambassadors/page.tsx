// @ts-nocheck
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { PageLoader } from '@/components/Loading'
import { Crown, Check, X } from 'lucide-react'

const GOLD = '#D4AF37'

export default function AdminAmbassadorsPage() {
  const router = useRouter()
  const [apps, setApps] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [denied, setDenied] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)

  const load = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.push('/login'); return }
    const { data, error } = await supabase.rpc('admin_list_ambassador_applications')
    if (error) { setDenied(true); setLoading(false); return }
    setApps(data || [])
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  const decide = async (app: any, approve: boolean) => {
    setBusy(app.id)
    const { error } = await supabase.rpc('admin_decide_ambassador', { p_application_id: app.id, p_approve: approve })
    if (error) alert(error.message)
    else setApps(prev => prev.map(a => a.id === app.id
      ? { ...a, status: approve ? 'approved' : 'rejected', applicant: { ...a.applicant, is_ambassador: approve } }
      : a))
    setBusy(null)
  }

  if (loading) return <PageLoader fullscreen={false} message="Loading applications…" />
  if (denied) return (
    <div style={{ minHeight: '100vh', background: '#09090F', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
      <div style={{ textAlign: 'center' }}>
        <p style={{ fontSize: '48px', marginBottom: '16px' }}>🔒</p>
        <p style={{ fontSize: '16px', color: '#F0EAFF' }}>Admins only</p>
        <Link href="/" style={{ color: GOLD, fontSize: '14px', textDecoration: 'none', display: 'block', marginTop: '12px' }}>← Back home</Link>
      </div>
    </div>
  )

  const pending = apps.filter(a => a.status === 'pending')

  return (
    <div style={{ minHeight: '100vh', background: '#09090F', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
      <nav style={{ position: 'sticky', top: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', background: 'rgba(8,8,16,0.9)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.10)' }}>
        <Link href="/" style={{ fontFamily: 'DM Serif Display, serif', fontSize: '20px', fontWeight: 700, color: GOLD, textDecoration: 'none' }}>BESTIE</Link>
        <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
          <Link href="/admin/analytics" style={{ fontSize: '13px', color: '#A99ECC', textDecoration: 'none' }}>Analytics</Link>
          <Link href="/admin/moderation" style={{ fontSize: '13px', color: '#A99ECC', textDecoration: 'none' }}>Moderation</Link>
          <span style={{ fontSize: '13px', color: GOLD }}>Ambassadors</span>
        </div>
      </nav>

      <div style={{ maxWidth: '720px', margin: '0 auto', padding: '36px 20px 100px' }}>
        <h1 style={{ fontFamily: 'DM Serif Display, serif', fontSize: '28px', color: '#F0EAFF', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Crown size={24} color={GOLD} strokeWidth={1.8} /> Ambassador applications
        </h1>
        <p style={{ fontSize: '13px', color: '#A99ECC', marginBottom: '24px' }}>{pending.length} pending · {apps.length} total</p>

        {apps.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', background: '#111120', border: '1px solid rgba(255,255,255,0.10)', borderRadius: '18px' }}>
            <p style={{ fontSize: '34px', marginBottom: '10px' }}>👑</p>
            <p style={{ fontSize: '14px', color: '#A99ECC' }}>No applications yet.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {apps.map(a => (
              <div key={a.id} style={{ background: '#111120', border: `1px solid ${a.status === 'pending' ? 'rgba(212,175,55,0.3)' : 'rgba(255,255,255,0.10)'}`, borderRadius: '16px', padding: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: a.message ? '10px' : '12px' }}>
                  <Link href={`/${a.applicant?.username}`} target="_blank" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none', flex: 1, minWidth: 0 }}>
                    <span style={{ width: '40px', height: '40px', borderRadius: '11px', overflow: 'hidden', background: '#1A1A2E', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      {a.applicant?.avatar_url
                        ? <img src={a.applicant.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        : <span style={{ color: GOLD, fontWeight: 700 }}>{a.applicant?.full_name?.[0]}</span>}
                    </span>
                    <span style={{ minWidth: 0 }}>
                      <span style={{ display: 'block', fontSize: '14px', fontWeight: 700, color: '#F0EAFF' }}>{a.applicant?.full_name}</span>
                      <span style={{ display: 'block', fontSize: '12px', color: '#A99ECC' }}>
                        @{a.applicant?.username}{a.applicant?.city ? ` · ${a.applicant.city}` : ''} · BS {a.applicant?.bestie_score}
                      </span>
                    </span>
                  </Link>
                  <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: a.status === 'pending' ? '#FF6B35' : a.status === 'approved' ? '#34D399' : '#6B6490' }}>
                    {a.status}
                  </span>
                </div>
                {a.message && <p style={{ fontSize: '13px', color: '#A99ECC', marginBottom: '12px', lineHeight: 1.5 }}>«{a.message}»</p>}
                <div style={{ display: 'flex', gap: '8px' }}>
                  {a.status !== 'approved' && (
                    <button onClick={() => decide(a, true)} disabled={busy === a.id} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 16px', borderRadius: '10px', fontSize: '12px', fontWeight: 700, background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.35)', color: '#34D399', cursor: 'pointer' }}>
                      <Check size={13} strokeWidth={2.5} /> Approve
                    </button>
                  )}
                  {a.status === 'pending' && (
                    <button onClick={() => decide(a, false)} disabled={busy === a.id} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 16px', borderRadius: '10px', fontSize: '12px', fontWeight: 700, background: 'rgba(255,107,107,0.08)', border: '1px solid rgba(255,107,107,0.3)', color: '#FF6B6B', cursor: 'pointer' }}>
                      <X size={13} strokeWidth={2.5} /> Reject
                    </button>
                  )}
                  {a.status === 'approved' && (
                    <button onClick={() => decide(a, false)} disabled={busy === a.id} style={{ padding: '8px 16px', borderRadius: '10px', fontSize: '12px', fontWeight: 700, background: 'rgba(255,107,107,0.08)', border: '1px solid rgba(255,107,107,0.3)', color: '#FF6B6B', cursor: 'pointer' }}>
                      Revoke
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
