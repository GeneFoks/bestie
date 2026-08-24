// @ts-nocheck
'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { PageLoader } from '@/components/Loading'

const GOLD = '#D4AF37'
const GREEN = '#34D399'
const RANGES = [
  { days: 7, label: '7d' },
  { days: 30, label: '30d' },
  { days: 90, label: '90d' },
]

function fmtDuration(seconds) {
  const s = Math.max(0, Math.round(seconds || 0))
  if (s < 60) return `${s}s`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ${s % 60}s`
  return `${Math.floor(m / 60)}h ${m % 60}m`
}

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: '32px' }}>
      <h2 style={{ fontFamily: 'DM Serif Display, serif', fontSize: '20px', color: 'var(--text-primary)', marginBottom: '14px' }}>{title}</h2>
      {children}
    </div>
  )
}

function StatCard({ label, value, accent }) {
  return (
    <div style={{ flex: 1, minWidth: '130px', background: 'var(--surface-1)', border: '1px solid var(--border)', borderRadius: '16px', padding: '16px 18px' }}>
      <div style={{ fontSize: '24px', fontWeight: 700, color: accent || GOLD, fontFamily: 'DM Serif Display, serif' }}>{value}</div>
      <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>{label}</div>
    </div>
  )
}

function Cards({ items }) {
  return (
    <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '16px' }}>
      {items.map((it, i) => <StatCard key={i} {...it} />)}
    </div>
  )
}

function BarList({ title, rows, valueKey, fmt }) {
  const max = Math.max(1, ...(rows || []).map(r => Number(r[valueKey]) || 0))
  return (
    <div style={{ background: 'var(--surface-1b)', border: '1px solid var(--border)', borderRadius: '16px', padding: '20px' }}>
      <h3 style={{ fontFamily: 'DM Serif Display, serif', fontSize: '15px', color: 'var(--text-primary)', marginBottom: '14px' }}>{title}</h3>
      {(!rows || rows.length === 0) ? (
        <p style={{ fontSize: '13px', color: 'var(--text-dim)' }}>No data yet</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '9px' }}>
          {rows.map((r, i) => {
            const v = Number(r[valueKey]) || 0
            return (
              <div key={i}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', marginBottom: '3px' }}>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '76%' }}>{r.label || '—'}</span>
                  <span style={{ fontSize: '12px', color: GOLD, fontWeight: 700, flexShrink: 0 }}>{fmt ? fmt(v) : v}</span>
                </div>
                <div style={{ height: '6px', borderRadius: '999px', background: 'var(--overlay-2)', overflow: 'hidden' }}>
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

// Vertical mini bar chart for daily trends.
function TrendChart({ title, rows, valueKey }) {
  const max = Math.max(1, ...(rows || []).map(r => Number(r[valueKey]) || 0))
  return (
    <div style={{ background: 'var(--surface-1b)', border: '1px solid var(--border)', borderRadius: '16px', padding: '20px' }}>
      <h3 style={{ fontFamily: 'DM Serif Display, serif', fontSize: '15px', color: 'var(--text-primary)', marginBottom: '14px' }}>{title}</h3>
      {(!rows || rows.length === 0) ? (
        <p style={{ fontSize: '13px', color: 'var(--text-dim)' }}>No data yet</p>
      ) : (
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '3px', height: '120px' }}>
          {rows.map((r, i) => {
            const v = Number(r[valueKey]) || 0
            return (
              <div key={i} title={`${r.label}: ${v}`} style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', height: '100%' }}>
                <div style={{ height: `${(v / max) * 100}%`, minHeight: v > 0 ? '3px' : '0', borderRadius: '3px 3px 0 0', background: 'linear-gradient(180deg, #D4AF37, #B8960C)' }} />
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// Funnel: stacked steps with conversion % vs the first step.
function Funnel({ steps }) {
  const base = Math.max(1, steps[0]?.value || 0)
  return (
    <div style={{ background: 'var(--surface-1b)', border: '1px solid var(--border)', borderRadius: '16px', padding: '20px' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {steps.map((s, i) => {
          const pct = Math.round((100 * (s.value || 0)) / base)
          return (
            <div key={i}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{s.label}</span>
                <span style={{ fontSize: '13px', color: GOLD, fontWeight: 700 }}>{s.value} <span style={{ color: 'var(--text-dim)', fontWeight: 400 }}>· {pct}%</span></span>
              </div>
              <div style={{ height: '10px', borderRadius: '999px', background: 'var(--overlay-2)', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${pct}%`, borderRadius: '999px', background: i === 0 ? GREEN : 'linear-gradient(90deg, #D4AF37, #B8960C)' }} />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

const grid2 = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }

export default function AdminAnalyticsPage() {
  const router = useRouter()
  const [days, setDays] = useState(30)
  const [d, setD] = useState(null)
  const [loading, setLoading] = useState(true)
  const [denied, setDenied] = useState(false)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }
      const { data: res, error } = await supabase.rpc('admin_dashboard', { p_days: days })
      if (error) { setDenied(true); setLoading(false); return }
      setD(res); setDenied(false); setLoading(false)
    }
    load()
  }, [days])

  if (loading) return <PageLoader fullscreen={false} message="Loading analytics…" />

  if (denied) return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
      <div style={{ textAlign: 'center', maxWidth: '360px', padding: '0 24px' }}>
        <p style={{ fontSize: '48px', marginBottom: '16px' }}>🔒</p>
        <h2 style={{ fontFamily: 'DM Serif Display, serif', fontSize: '22px', color: 'var(--text-primary)', marginBottom: '8px' }}>Admins only</h2>
        <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '24px' }}>This page is restricted. If it should be you, set <code style={{ color: GOLD }}>is_admin = true</code> on your user row.</p>
        <Link href="/" style={{ color: GOLD, fontSize: '14px', textDecoration: 'none' }}>← Back home</Link>
      </div>
    </div>
  )

  const o = d?.overview || {}
  const f = d?.funnel || {}
  const c = d?.community || {}
  const m = d?.monetization || {}
  const t = d?.traffic || {}
  const s = d?.safety || {}
  const pb = d?.profile_breakdown || {}

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
      <nav style={{ position: 'sticky', top: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', background: 'var(--nav-bg)', backdropFilter: 'blur(20px)', borderBottom: '1px solid var(--border)' }}>
        <Link href="/" style={{ fontFamily: 'DM Serif Display, serif', fontSize: '20px', fontWeight: 700, color: GOLD, textDecoration: 'none' }}>BESTIE</Link>
        <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Analytics</span>
      </nav>

      <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '40px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', marginBottom: '28px' }}>
          <h1 style={{ fontFamily: 'DM Serif Display, serif', fontSize: '32px', color: 'var(--text-primary)' }}>Analytics</h1>
          <div style={{ display: 'flex', gap: '6px' }}>
            {RANGES.map(r => (
              <button key={r.days} onClick={() => setDays(r.days)} style={{
                padding: '8px 16px', borderRadius: '10px', fontSize: '13px', fontWeight: 600, cursor: 'pointer',
                background: days === r.days ? 'rgba(212,175,55,0.15)' : 'var(--surface-1b)',
                border: days === r.days ? `1px solid ${GOLD}66` : '1px solid var(--border)',
                color: days === r.days ? GOLD : 'var(--text-muted)',
              }}>{r.label}</button>
            ))}
          </div>
        </div>

        {/* 1. OVERVIEW */}
        <Section title="Overview">
          <Cards items={[
            { label: 'Total users', value: o.total_users ?? 0 },
            { label: 'New today', value: o.new_today ?? 0, accent: GREEN },
            { label: 'New · 7d', value: o.new_7d ?? 0 },
            { label: 'New · 30d', value: o.new_30d ?? 0 },
            { label: 'Plus members', value: o.plus_active ?? 0 },
            { label: 'Verified', value: o.verified ?? 0 },
          ]} />
          <Cards items={[
            { label: 'DAU (active today)', value: o.dau ?? 0, accent: GREEN },
            { label: 'WAU (7d)', value: o.wau ?? 0 },
            { label: 'MAU (30d)', value: o.mau ?? 0 },
            { label: 'Stickiness DAU/WAU', value: o.wau ? `${Math.round(100 * (o.dau || 0) / o.wau)}%` : '—' },
          ]} />
        </Section>

        {/* 2. GROWTH */}
        <Section title="Growth & activity (last 30 days)">
          <div style={grid2}>
            <TrendChart title="Sign-ups per day" rows={d?.signups_by_day || []} valueKey="count" />
            <TrendChart title="Active users per day" rows={d?.active_by_day || []} valueKey="count" />
          </div>
        </Section>

        {/* 3. FUNNEL */}
        <Section title="Activation funnel">
          <Funnel steps={[
            { label: '1 · Signed up', value: f.signed_up ?? 0 },
            { label: '2 · Completed profile', value: f.profile_complete ?? 0 },
            { label: '3 · Verified', value: f.verified ?? 0 },
            { label: '4 · Sent a knock', value: f.did_knock ?? 0 },
            { label: '5 · Got a match', value: f.matched ?? 0 },
            { label: '6 · Had a session', value: f.had_session ?? 0 },
          ]} />
          <div style={{ marginTop: '16px' }}>
            <BarList title="Profile completeness (users with…)" valueKey="count" rows={[
              { label: 'Avatar', count: pb.has_avatar ?? 0 },
              { label: 'Bio', count: pb.has_bio ?? 0 },
              { label: 'City', count: pb.has_city ?? 0 },
              { label: 'Bestie Type', count: pb.has_type ?? 0 },
              { label: 'Verified', count: pb.verified ?? 0 },
            ]} />
          </div>
        </Section>

        {/* 4. COMMUNITY */}
        <Section title="Community (all-time)">
          <Cards items={[
            { label: 'Knocks sent', value: c.knocks_sent ?? 0 },
            { label: 'Matches', value: c.matches ?? 0, accent: GREEN },
            { label: 'Sparks given', value: c.sparks_total ?? 0 },
            { label: 'Sessions done', value: c.sessions_done ?? 0 },
            { label: 'Bookings', value: c.bookings_total ?? 0 },
            { label: 'Pending bookings', value: c.bookings_pending ?? 0 },
          ]} />
          <Cards items={[
            { label: 'Messages', value: c.messages_total ?? 0 },
            { label: 'Conversations', value: c.conversations ?? 0 },
            { label: 'Crews', value: c.crews_total ?? 0 },
            { label: 'Crew members', value: c.crew_members ?? 0 },
            { label: 'Avg crew size', value: c.avg_crew_size ?? 0 },
          ]} />
          <div style={{ marginTop: '4px' }}>
            <BarList title="Bestie Score distribution" rows={d?.score_distribution || []} valueKey="count" />
          </div>
        </Section>

        {/* 5. MONETIZATION */}
        <Section title="Monetization">
          <Cards items={[
            { label: 'Plus (paid)', value: m.plus_paid ?? 0, accent: GREEN },
            { label: 'Plus (granted)', value: m.plus_granted ?? 0 },
            { label: 'Free', value: m.free ?? 0 },
            { label: 'Paid conversion', value: `${m.conversion_pct ?? 0}%` },
          ]} />
        </Section>

        {/* 6. GEOGRAPHY */}
        <Section title="Cities">
          <BarList title="Users by city" rows={d?.cities || []} valueKey="count" />
        </Section>

        {/* 7. TRUST & SAFETY */}
        <Section title="Trust & safety">
          <Cards items={[
            { label: 'Reports', value: s.reports ?? 0, accent: '#FF6B6B' },
            { label: 'Blocks', value: s.blocks ?? 0, accent: '#FF6B6B' },
            { label: 'Avg rating', value: s.avg_rating ?? 0 },
          ]} />
        </Section>

        {/* 8. TRAFFIC */}
        <Section title={`Behaviour on site (last ${days}d)`}>
          <Cards items={[
            { label: 'Sessions', value: t.sessions ?? 0 },
            { label: 'Page views', value: t.pageviews ?? 0 },
            { label: 'Clicks', value: t.clicks ?? 0 },
            { label: 'Avg time on site', value: fmtDuration(t.avg_seconds) },
          ]} />
          <div style={{ ...grid2, marginBottom: '16px' }}>
            <BarList title="Devices" rows={d?.devices || []} valueKey="sessions" />
            <BarList title="Browsers" rows={d?.browsers || []} valueKey="sessions" />
          </div>
          <div style={grid2}>
            <BarList title="Most visited pages" rows={d?.top_pages || []} valueKey="views" />
            <BarList title="Exit pages (where people leave)" rows={d?.exit_pages || []} valueKey="sessions" />
            <BarList title="Most clicked" rows={d?.top_clicks || []} valueKey="clicks" />
          </div>
        </Section>
      </div>
    </div>
  )
}
