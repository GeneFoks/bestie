// @ts-nocheck
'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { PageLoader } from '@/components/Loading'

const GOLD = '#D4AF37'
const RANGES = [
  { days: 7, label: '7d' },
  { days: 30, label: '30d' },
  { days: 90, label: '90d' },
]

function fmtDuration(seconds) {
  const s = Math.max(0, Math.round(seconds || 0))
  if (s < 60) return `${s}s`
  const m = Math.floor(s / 60)
  const r = s % 60
  if (m < 60) return `${m}m ${r}s`
  const h = Math.floor(m / 60)
  return `${h}h ${m % 60}m`
}

// Horizontal bar list — a tiny dependency-free chart.
function BarList({ title, rows, valueKey, fmt }) {
  const max = Math.max(1, ...rows.map(r => Number(r[valueKey]) || 0))
  return (
    <div style={{ background: '#131323', border: '1px solid rgba(255,255,255,0.10)', borderRadius: '16px', padding: '20px' }}>
      <h3 style={{ fontFamily: 'DM Serif Display, serif', fontSize: '16px', color: '#F0EAFF', marginBottom: '16px' }}>{title}</h3>
      {rows.length === 0 ? (
        <p style={{ fontSize: '13px', color: '#6B6490' }}>No data yet</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {rows.map((r, i) => {
            const v = Number(r[valueKey]) || 0
            return (
              <div key={i}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', marginBottom: '4px' }}>
                  <span style={{ fontSize: '12px', color: '#C9BFE8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '78%' }}>{r.label || '—'}</span>
                  <span style={{ fontSize: '12px', color: GOLD, fontWeight: 700, flexShrink: 0 }}>{fmt ? fmt(v) : v}</span>
                </div>
                <div style={{ height: '6px', borderRadius: '999px', background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${(v / max) * 100}%`, borderRadius: '999px', background: 'linear-gradient(90deg, #D4AF37, #B8960C)' }} />
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function StatCard({ label, value }) {
  return (
    <div style={{ flex: 1, minWidth: '120px', background: '#111120', border: '1px solid rgba(255,255,255,0.10)', borderRadius: '16px', padding: '18px' }}>
      <div style={{ fontSize: '26px', fontWeight: 700, color: GOLD, fontFamily: 'DM Serif Display, serif' }}>{value}</div>
      <div style={{ fontSize: '12px', color: '#A99ECC', marginTop: '4px' }}>{label}</div>
    </div>
  )
}

export default function AdminAnalyticsPage() {
  const router = useRouter()
  const [days, setDays] = useState(30)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [denied, setDenied] = useState(false)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }
      const { data: res, error } = await supabase.rpc('admin_analytics', { p_days: days })
      if (error) {
        // not_authorized (or anything else) → show the locked screen
        setDenied(true)
        setLoading(false)
        return
      }
      setData(res)
      setDenied(false)
      setLoading(false)
    }
    load()
  }, [days])

  if (loading) return <PageLoader fullscreen={false} message="Loading analytics…" />

  if (denied) return (
    <div style={{ minHeight: '100vh', background: '#09090F', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
      <div style={{ textAlign: 'center', maxWidth: '360px', padding: '0 24px' }}>
        <p style={{ fontSize: '48px', marginBottom: '16px' }}>🔒</p>
        <h2 style={{ fontFamily: 'DM Serif Display, serif', fontSize: '22px', color: '#F0EAFF', marginBottom: '8px' }}>Admins only</h2>
        <p style={{ fontSize: '14px', color: '#A99ECC', marginBottom: '24px' }}>This page is restricted. If it should be you, set <code style={{ color: GOLD }}>is_admin = true</code> on your user row.</p>
        <Link href="/" style={{ color: GOLD, fontSize: '14px', textDecoration: 'none' }}>← Back home</Link>
      </div>
    </div>
  )

  const t = data?.totals || {}

  return (
    <div style={{ minHeight: '100vh', background: '#09090F', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
      <nav style={{ position: 'sticky', top: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', background: 'rgba(8,8,16,0.9)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.10)' }}>
        <Link href="/" style={{ fontFamily: 'DM Serif Display, serif', fontSize: '20px', fontWeight: 700, color: GOLD, textDecoration: 'none' }}>BESTIE</Link>
        <span style={{ fontSize: '13px', color: '#A99ECC' }}>Analytics</span>
      </nav>

      <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '40px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', marginBottom: '28px' }}>
          <h1 style={{ fontFamily: 'DM Serif Display, serif', fontSize: '32px', color: '#F0EAFF' }}>Analytics</h1>
          <div style={{ display: 'flex', gap: '6px' }}>
            {RANGES.map(r => (
              <button key={r.days} onClick={() => setDays(r.days)} style={{
                padding: '8px 16px', borderRadius: '10px', fontSize: '13px', fontWeight: 600, cursor: 'pointer',
                background: days === r.days ? 'rgba(212,175,55,0.15)' : '#131323',
                border: days === r.days ? `1px solid ${GOLD}66` : '1px solid rgba(255,255,255,0.12)',
                color: days === r.days ? GOLD : '#A99ECC',
              }}>{r.label}</button>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '20px' }}>
          <StatCard label="Sessions" value={t.sessions ?? 0} />
          <StatCard label="Page views" value={t.pageviews ?? 0} />
          <StatCard label="Clicks" value={t.clicks ?? 0} />
          <StatCard label="Avg time on site" value={fmtDuration(t.avg_seconds)} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px', marginBottom: '16px' }}>
          <BarList title="Devices" rows={data?.devices || []} valueKey="sessions" />
          <BarList title="Browsers" rows={data?.browsers || []} valueKey="sessions" />
        </div>

        {/* Avg time by device */}
        <div style={{ background: '#131323', border: '1px solid rgba(255,255,255,0.10)', borderRadius: '16px', padding: '20px', marginBottom: '16px' }}>
          <h3 style={{ fontFamily: 'DM Serif Display, serif', fontSize: '16px', color: '#F0EAFF', marginBottom: '16px' }}>Time on site by device</h3>
          {(data?.by_device_time || []).length === 0 ? (
            <p style={{ fontSize: '13px', color: '#6B6490' }}>No data yet</p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ color: '#A99ECC', textAlign: 'left' }}>
                  <th style={{ padding: '6px 0', fontWeight: 500 }}>Device</th>
                  <th style={{ padding: '6px 0', fontWeight: 500 }}>Sessions</th>
                  <th style={{ padding: '6px 0', fontWeight: 500 }}>Avg time</th>
                  <th style={{ padding: '6px 0', fontWeight: 500 }}>Avg pages</th>
                </tr>
              </thead>
              <tbody>
                {(data?.by_device_time || []).map((r, i) => (
                  <tr key={i} style={{ borderTop: '1px solid rgba(255,255,255,0.06)', color: '#C9BFE8' }}>
                    <td style={{ padding: '8px 0' }}>{r.label}</td>
                    <td style={{ padding: '8px 0' }}>{r.sessions}</td>
                    <td style={{ padding: '8px 0', color: GOLD }}>{fmtDuration(r.avg_seconds)}</td>
                    <td style={{ padding: '8px 0' }}>{r.avg_pageviews}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
          <BarList title="Most visited pages" rows={data?.top_pages || []} valueKey="views" />
          <BarList title="Exit pages (where people leave)" rows={data?.exit_pages || []} valueKey="sessions" />
          <BarList title="Most clicked" rows={data?.top_clicks || []} valueKey="clicks" />
        </div>
      </div>
    </div>
  )
}
