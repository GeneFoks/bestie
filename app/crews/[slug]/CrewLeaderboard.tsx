// @ts-nocheck
// Server component — "Most active" in this crew.
// Product rule (2026-10-18): no score leaderboards on surfaces others see.
// This used to be a ranked "Top contributors" board (#1/#2/#3 + POINTS).
// It now celebrates activity that only grows (events hosted, RSVPs going,
// friends invited, messages) — no rank numbers, no tier colors, no points.
// Under the hood the query still orders by contribution_score (unchanged).
import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
import { Crown, Shield, Hand, MessageCircle, CalendarPlus, Users, Flame } from 'lucide-react'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

type Contribution = {
  user_id: string
  role: 'captain' | 'moderator' | 'member'
  events_created: number
  rsvps_going: number
  messages_sent: number
  referrals_made: number
  contribution_score: number
  user?: { username: string; full_name: string; avatar_url: string | null }
}

const chip = { display: 'inline-flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap' }

export default async function CrewLeaderboard({ crewId }: { crewId: string }) {
  // Get the most active members + their user data
  const { data: rows } = await supabase
    .from('crew_member_contributions')
    .select('user_id, role, events_created, rsvps_going, messages_sent, referrals_made, contribution_score')
    .eq('crew_id', crewId)
    .order('contribution_score', { ascending: false })
    .limit(5)

  if (!rows || rows.length === 0) return null

  const userIds = rows.map(r => r.user_id)
  const { data: users } = await supabase
    .from('users')
    .select('id, username, full_name, avatar_url')
    .in('id', userIds)

  const userMap = Object.fromEntries((users || []).map(u => [u.id, u]))
  // Only people with real activity — never list anyone next to a zero.
  const active: Contribution[] = rows
    .map(r => ({ ...r, user: userMap[r.user_id] }))
    .filter(t => t.user && (t.contribution_score || 0) > 0)

  // Hide section entirely if nobody has any activity yet
  if (active.length === 0) return null

  return (
    <div style={{ marginBottom: '20px', padding: '18px 20px', borderRadius: '20px', background: 'var(--surface-1)', border: '1px solid var(--border)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
        <Flame size={16} color="#34D399" strokeWidth={1.8} />
        <h3 style={{ fontFamily: 'DM Serif Display, serif', fontSize: '18px', color: 'var(--text-primary)', margin: 0 }}>Most active</h3>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {active.map((t) => (
          <Link
            key={t.user_id}
            href={`/${t.user.username}`}
            style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 14px', borderRadius: '14px', background: 'var(--surface-1)', border: '1px solid var(--border)', textDecoration: 'none' }}
          >
            <div style={{ width: '36px', height: '36px', borderRadius: '11px', overflow: 'hidden', background: 'var(--surface-3)', flexShrink: 0, border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {t.user.avatar_url
                ? <img src={t.user.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <span style={{ fontSize: '13px', fontWeight: 700, color: '#D4AF37' }}>{t.user.full_name?.[0]}</span>
              }
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px', minWidth: 0 }}>
                <p style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', margin: 0 }}>{t.user.full_name}</p>
                {t.role === 'captain' && <Crown size={11} color="#D4AF37" strokeWidth={2} />}
                {t.role === 'moderator' && <Shield size={11} color="#9B7FFF" strokeWidth={2} />}
              </div>
              <div style={{ display: 'flex', gap: '10px', rowGap: '4px', fontSize: '11px', color: 'var(--text-muted)', flexWrap: 'wrap' }}>
                {t.events_created > 0 && <span style={chip}><CalendarPlus size={11} strokeWidth={2} /> Hosted {t.events_created}</span>}
                {t.rsvps_going > 0 && <span style={chip}><Hand size={11} strokeWidth={2} /> Going {t.rsvps_going}</span>}
                {t.referrals_made > 0 && <span style={chip}><Users size={11} strokeWidth={2} /> Invited {t.referrals_made}</span>}
                {t.messages_sent > 0 && <span style={chip}><MessageCircle size={11} strokeWidth={2} /> {t.messages_sent}</span>}
              </div>
            </div>
          </Link>
        ))}
      </div>

      <p style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '10px', lineHeight: 1.4 }}>
        The people hosting, showing up and bringing friends.
      </p>
    </div>
  )
}
