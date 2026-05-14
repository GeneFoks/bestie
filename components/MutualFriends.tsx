'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export default function MutualFriends({ profileId }: { profileId: string }) {
  const [mutuals, setMutuals] = useState<any[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session || session.user.id === profileId) { setLoaded(true); return }
      const myId = session.user.id

      const [{ data: profileBookings }, { data: myBookings }] = await Promise.all([
        supabase.from('bookings').select('seeker_id, provider_id')
          .or(`seeker_id.eq.${profileId},provider_id.eq.${profileId}`)
          .eq('confirmed_by_seeker', true).eq('confirmed_by_provider', true),
        supabase.from('bookings').select('seeker_id, provider_id')
          .or(`seeker_id.eq.${myId},provider_id.eq.${myId}`)
          .eq('confirmed_by_seeker', true).eq('confirmed_by_provider', true),
      ])

      const profilePartners = new Set(
        (profileBookings || []).map(b => b.seeker_id === profileId ? b.provider_id : b.seeker_id).filter(id => id !== myId)
      )
      const myPartners = new Set(
        (myBookings || []).map(b => b.seeker_id === myId ? b.provider_id : b.seeker_id)
      )

      const mutualIds = [...profilePartners].filter(id => myPartners.has(id))
      if (mutualIds.length === 0) { setLoaded(true); return }

      const { data: users } = await supabase
        .from('users').select('id, full_name, username, avatar_url')
        .in('id', mutualIds.slice(0, 5))

      setMutuals(users || [])
      setLoaded(true)
    }
    load()
  }, [profileId])

  if (!loaded || mutuals.length === 0) return null

  const first = mutuals[0]
  const rest = mutuals.length - 1

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', borderRadius: '12px', background: 'rgba(212,175,55,0.06)', border: '1px solid rgba(212,175,55,0.15)', marginBottom: '16px' }}>
      <div style={{ display: 'flex' }}>
        {mutuals.slice(0, 3).map((u, i) => (
          <div key={u.id} style={{ width: '26px', height: '26px', borderRadius: '50%', overflow: 'hidden', border: '1.5px solid #080810', marginLeft: i > 0 ? '-7px' : '0', background: '#1a1a35', flexShrink: 0 }}>
            {u.avatar_url
              ? <img src={u.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px', fontWeight: 700, color: '#D4AF37' }}>{u.full_name?.[0]}</div>
            }
          </div>
        ))}
      </div>
      <p style={{ fontSize: '12px', color: '#9B93C0', lineHeight: 1.4 }}>
        <span style={{ color: '#D4AF37', fontWeight: 600 }}>{first.full_name?.split(' ')[0]}</span>
        {rest > 0 && ` and ${rest} other${rest > 1 ? 's' : ''}`}
        {' know them'}
      </p>
    </div>
  )
}
