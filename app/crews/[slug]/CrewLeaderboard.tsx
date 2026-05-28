// Server component — fetches contribution scores and renders top 5 + you.
import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
import { Trophy, Crown, Shield, Hand, MessageCircle, CalendarPlus, Users } from 'lucide-react'

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

const tierBg = (i: number) =>
  i === 0 ? 'linear-gradient(135deg, rgba(212,175,55,0.18) 0%, rgba(212,175,55,0.04) 100%)'
  : i === 1 ? 'linear-gradient(135deg, rgba(155,143,192,0.14) 0%, rgba(155,143,192,0.03) 100%)'
  : i === 2 ? 'linear-gradient(135deg, rgba(205,127,50,0.12) 0%, rgba(205,127,50,0.03) 100%)'
  : '#111120'

const tierBorder = (i: number) =>
  i === 0 ? 'rgba(212,175,55,0.35)'
  : i === 1 ? 'rgba(155,143,192,0.30)'
  : i === 2 ? 'rgba(205,127,50,0.30)'
  : 'rgba(255,255,255,0.10)'

export default async function CrewLeaderboard({ crewId }: { crewId: string }) {
  // Get top contributors + their user data
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
  const top: Contribution[] = rows.map(r => ({ ...r, user: userMap[r.user_id] }))

  // Hide section entirely if nobody has any contribution score yet
  if (top.every(t => t.contribution_score === 0)) return null

  return (
    <div style={{ marginBottom: '20px', padding: '18px 20px', borderRadius: '20px', background: '#111120', border: '1px solid rgba(255,255,255,0.10)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
        <Trophy size={16} color="#D4AF37" strokeWidth={1.8} />
        <h3 style={{ fontFamily: 'DM Serif Display, serif', fontSize: '18px', color: '#F0EAFF', margin: 0 }}>Top contributors</h3>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {top.map((t, i) => {
          if (!t.user) return null
          return (
            <Link
              key={t.user_id}
              href={`/${t.user.username}`}
              style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 14px', borderRadius: '14px', background: tierBg(i), border: `1px solid ${tierBorder(i)}`, textDecoration: 'none' }}
            >
              <div style={{ width: '24px', textAlign: 'center', fontSize: '13px', fontWeight: 700, color: i < 3 ? '#D4AF37' : '#A99ECC', flexShrink: 0 }}>
                #{i + 1}
              </div>
              <div style={{ width: '36px', height: '36px', borderRadius: '11px', overflow: 'hidden', background: '#1A1A2E', flexShrink: 0, border: '1px solid rgba(212,175,55,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {t.user.avatar_url
                  ? <img src={t.user.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <span style={{ fontSize: '13px', fontWeight: 700, color: '#D4AF37' }}>{t.user.full_name?.[0]}</span>
                }
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                  <p style={{ fontSize: '14px', fontWeight: 700, color: '#F0EAFF', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', margin: 0 }}>{t.user.full_name}</p>
                  {t.role === 'captain' && <Crown size={11} color="#D4AF37" strokeWidth={2} />}
                  {t.role === 'moderator' && <Shield size={11} color="#9B7FFF" strokeWidth={2} />}
                </div>
                <div style={{ display: 'flex', gap: '10px', fontSize: '11px', color: '#A99ECC', flexWrap: 'wrap' }}>
                  {t.events_created > 0 && <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}><CalendarPlus size={10} strokeWidth={2} /> {t.events_created}</span>}
                  {t.rsvps_going > 0 && <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}><Hand size={10} strokeWidth={2} /> {t.rsvps_going}</span>}
                  {t.messages_sent > 0 && <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}><MessageCircle size={10} strokeWidth={2} /> {t.messages_sent}</span>}
                  {t.referrals_made > 0 && <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', color: '#D4AF37' }}><Users size={10} strokeWidth={2} /> {t.referrals_made}</span>}
                </div>
              </div>
              <div style={{ flexShrink: 0, textAlign: 'right' }}>
                <p style={{ fontFamily: 'DM Serif Display, serif', fontSize: '20px', fontWeight: 700, color: i < 3 ? '#D4AF37' : '#F0EAFF', margin: 0, lineHeight: 1 }}>{t.contribution_score}</p>
                <p style={{ fontSize: '9px', color: '#A99ECC', letterSpacing: '0.5px', marginTop: '2px' }}>POINTS</p>
              </div>
            </Link>
          )
        })}
      </div>

      <p style={{ fontSize: '11px', color: '#6B6280', marginTop: '10px', lineHeight: 1.4 }}>
        Score = events created (×10) + Going RSVPs (×3) + invites (×5) + messages (×1, capped at 100)
      </p>
    </div>
  )
}
