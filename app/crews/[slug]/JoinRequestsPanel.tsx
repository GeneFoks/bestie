// @ts-nocheck
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import JoinRequestActions from './JoinRequestActions'
import { SparkIcon } from '@/lib/sparkIcons'

// 'good_listener' → 'Good listener'
const sparkLabel = (t: string) => t ? t.charAt(0).toUpperCase() + t.slice(1).replace(/_/g, ' ') : ''

type Props = {
  crewId: string
  captainId: string
}

export default function JoinRequestsPanel({ crewId, captainId }: Props) {
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [requests, setRequests] = useState<any[]>([])
  // requester id → their most-given spark type (positive signal; the score stays private)
  const [topSparks, setTopSparks] = useState<Record<string, string>>({})
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session || session.user.id !== captainId) { setLoaded(true); return }
      setCurrentUserId(session.user.id)

      const { data } = await supabase
        .from('crew_join_requests')
        .select('id, status, created_at, answers, share_profile, user:users(id, username, full_name, avatar_url, bestie_score, total_sessions, age, birth_date, city, eterotype_name)')
        .eq('crew_id', crewId)
        .eq('status', 'pending')
        .order('created_at', { ascending: true })

      setRequests(data || [])
      setLoaded(true)

      // Top spark per requester — "Known for" instead of a score
      const ids = (data || []).map((r: any) => r.user?.id).filter(Boolean)
      if (ids.length > 0) {
        const { data: sparkRows } = await supabase
          .from('sparks')
          .select('receiver_id, spark_type')
          .in('receiver_id', ids)
        const counts: Record<string, Record<string, number>> = {}
        ;(sparkRows || []).forEach((s: any) => {
          if (!s?.receiver_id || !s?.spark_type) return
          const c = counts[s.receiver_id] || (counts[s.receiver_id] = {})
          c[s.spark_type] = (c[s.spark_type] || 0) + 1
        })
        const top: Record<string, string> = {}
        Object.entries(counts).forEach(([uid, c]) => {
          const best = Object.entries(c).sort((a, b) => b[1] - a[1])[0]
          if (best) top[uid] = best[0]
        })
        setTopSparks(top)
      }
    }
    load()
  }, [crewId, captainId])

  if (!loaded || !currentUserId || requests.length === 0) return null

  // Age from birth_date when the explicit age field is empty
  const ageOf = (u: any) => {
    if (u?.age != null) return u.age
    if (!u?.birth_date) return null
    const d = new Date(u.birth_date)
    if (isNaN(d.getTime())) return null
    const now = new Date()
    let a = now.getFullYear() - d.getFullYear()
    if (now.getMonth() < d.getMonth() || (now.getMonth() === d.getMonth() && now.getDate() < d.getDate())) a--
    return a
  }

  return (
    <>
      <h2 style={{ fontFamily: 'DM Serif Display, serif', fontSize: '22px', color: 'var(--text-primary)', marginBottom: '16px' }}>
        Join Requests <span style={{ fontSize: '16px', color: '#D4AF37' }}>· {requests.length}</span>
      </h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '24px' }}>
        {requests.map((req: any) => {
          const age = ageOf(req.user)
          const facts = [age != null ? `${age}` : null, req.user?.city, req.user?.eterotype_name].filter(Boolean).join(' · ')
          const met = req.user?.total_sessions || 0
          const topSpark = req.user?.id ? topSparks[req.user.id] : null
          return (
            <div key={req.id} style={{ padding: '14px 16px', background: 'rgba(212,175,55,0.04)', border: '1px solid rgba(212,175,55,0.15)', borderRadius: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '12px', overflow: 'hidden', background: 'var(--surface-3)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {req.user?.avatar_url
                    ? <img src={req.user.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <span style={{ fontSize: '16px', fontWeight: 700, color: '#D4AF37' }}>{req.user?.full_name?.[0]}</span>
                  }
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <Link href={`/${req.user?.username}`} style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', textDecoration: 'none' }}>{req.user?.full_name}</Link>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>@{req.user?.username}{facts ? ` · ${facts}` : ''}</div>
                  {/* Vetting signals that only grow — never the requester's score */}
                  <div style={{ marginTop: '3px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', fontSize: '12px', color: 'var(--text-muted)' }}>
                    {met > 0 && <span style={{ whiteSpace: 'nowrap' }}>Met {met} {met === 1 ? 'person' : 'people'}</span>}
                    {topSpark && (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap', color: 'var(--text-primary)', fontWeight: 600 }}>
                        <SparkIcon type={topSpark} size={12} /> {sparkLabel(topSpark)}
                      </span>
                    )}
                    {met === 0 && !topSpark && (
                      <span style={{ fontSize: '10.5px', fontWeight: 600, padding: '2px 8px', borderRadius: '999px', background: 'var(--surface-3)', border: '1px solid var(--border)', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>New to Bestie</span>
                    )}
                  </div>
                </div>
                <JoinRequestActions
                  requestId={req.id}
                  userId={req.user?.id}
                  crewId={crewId}
                  captainId={captainId}
                  shareProfile={!!req.share_profile}
                  onDone={() => setRequests(prev => prev.filter(r => r.id !== req.id))}
                />
              </div>
              {req.answers?.motivation && (
                <p style={{ margin: '10px 0 0', fontSize: '13px', lineHeight: 1.55, color: 'var(--text-secondary, #C9C4D6)', fontStyle: 'italic' }}>
                  “{req.answers.motivation}”
                </p>
              )}
              {req.share_profile && (
                <div style={{ marginTop: '8px', display: 'inline-block', fontSize: '10.5px', fontWeight: 700, letterSpacing: '0.04em', padding: '3px 8px', borderRadius: '999px', color: '#34D399', border: '1px solid rgba(52,211,153,0.35)', background: 'rgba(52,211,153,0.07)' }}>
                  Shares profile with members
                </div>
              )}
            </div>
          )
        })}
      </div>
    </>
  )
}
