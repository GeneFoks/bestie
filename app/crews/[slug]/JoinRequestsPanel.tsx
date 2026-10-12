// @ts-nocheck
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import JoinRequestActions from './JoinRequestActions'

type Props = {
  crewId: string
  captainId: string
}

export default function JoinRequestsPanel({ crewId, captainId }: Props) {
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [requests, setRequests] = useState<any[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session || session.user.id !== captainId) { setLoaded(true); return }
      setCurrentUserId(session.user.id)

      const { data } = await supabase
        .from('crew_join_requests')
        .select('id, status, created_at, answers, share_profile, user:users(id, username, full_name, avatar_url, bestie_score, age, birth_date, city, eterotype_name)')
        .eq('crew_id', crewId)
        .eq('status', 'pending')
        .order('created_at', { ascending: true })

      setRequests(data || [])
      setLoaded(true)
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
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>@{req.user?.username} · ★ {req.user?.bestie_score}{facts ? ` · ${facts}` : ''}</div>
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
