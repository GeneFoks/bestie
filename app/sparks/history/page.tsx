// @ts-nocheck
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { PageLoader } from '@/components/Loading'
import { EmptyState } from '@/components/EmptyState'
import { Sparkles, ArrowUpRight, ArrowDownRight } from 'lucide-react'

export default function SparkHistoryPage() {
  const router = useRouter()
  const [rows, setRows] = useState<any[]>([])
  const [balance, setBalance] = useState<number | null>(null)
  const [received, setReceived] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const [{ data: me }, { data: ledger }] = await Promise.all([
        supabase.from('users').select('sparks_balance, sparks_received').eq('id', user.id).single(),
        supabase.from('spark_ledger').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(200),
      ])
      setBalance(me?.sparks_balance ?? 0)
      setReceived(me?.sparks_received ?? 0)
      setRows(ledger || [])
      setLoading(false)
    }
    init()
  }, [])

  if (loading) return <PageLoader message="Loading your Sparks…" />

  const fmt = (d) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
      <nav style={{ position: 'sticky', top: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', background: 'var(--nav-bg)', backdropFilter: 'blur(20px)', borderBottom: '1px solid var(--border)' }}>
        <Link href="/" style={{ fontFamily: 'DM Serif Display, serif', fontSize: '20px', fontWeight: 700, color: '#D4AF37', textDecoration: 'none' }}>BESTIE</Link>
        <Link href="/dashboard" style={{ fontSize: '14px', color: 'var(--text-muted)', textDecoration: 'none', padding: '8px 16px', borderRadius: '10px', border: '1px solid var(--border)' }}>← Dashboard</Link>
      </nav>

      <div style={{ maxWidth: '560px', margin: '0 auto', padding: '32px 20px 100px' }}>
        <h1 style={{ fontFamily: 'DM Serif Display, serif', fontSize: '28px', color: 'var(--text-primary)', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Sparkles size={24} color="#D4AF37" /> Sparks
        </h1>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '20px' }}>Every Spark you earn or spend, on the record.</p>

        {/* Balance cards */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '24px' }}>
          <div style={{ background: 'var(--surface-1)', border: '1px solid rgba(212,175,55,0.25)', borderRadius: '16px', padding: '16px' }}>
            <p style={{ fontSize: '24px', fontWeight: 800, color: '#D4AF37', margin: 0, fontVariantNumeric: 'tabular-nums' }}>{balance}</p>
            <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: 0 }}>in your wallet</p>
          </div>
          <div style={{ background: 'var(--surface-1)', border: '1px solid var(--border)', borderRadius: '16px', padding: '16px' }}>
            <p style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-primary)', margin: 0, fontVariantNumeric: 'tabular-nums' }}>{received}</p>
            <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: 0 }}>received all-time</p>
          </div>
        </div>

        {rows.length === 0 ? (
          <EmptyState
            Icon={Sparkles}
            title="No movements yet"
            description="Your ledger starts now — give a Spark after a meetup, or earn badges, and every move lands here."
            primaryCTA={{ label: 'Browse Besties', href: '/browse' }}
            accent="gold"
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {rows.map(r => {
              const plus = r.delta > 0
              return (
                <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '13px 16px', borderRadius: '14px', background: 'var(--surface-1)', border: '1px solid var(--border)' }}>
                  <span style={{ width: '32px', height: '32px', borderRadius: '10px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: plus ? 'rgba(52,211,153,0.10)' : 'rgba(255,120,87,0.10)', border: plus ? '1px solid rgba(52,211,153,0.25)' : '1px solid rgba(255,120,87,0.25)' }}>
                    {plus
                      ? <ArrowUpRight size={15} color="#34D399" strokeWidth={2} />
                      : <ArrowDownRight size={15} color="#FF7857" strokeWidth={2} />}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: '13px', color: 'var(--text-primary)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.reason}</p>
                    <p style={{ fontSize: '11px', color: 'var(--text-dim)', margin: 0 }}>{fmt(r.created_at)}</p>
                  </div>
                  <span style={{ fontSize: '15px', fontWeight: 800, flexShrink: 0, fontVariantNumeric: 'tabular-nums', color: plus ? '#34D399' : '#FF7857' }}>
                    {plus ? '+' : ''}{r.delta}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
