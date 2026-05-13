'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

type Props = {
  crewId: string
  avgRating: number
  ratingCount: number
}

export default function CrewRating({ crewId, avgRating, ratingCount }: Props) {
  const [userId, setUserId] = useState<string | null>(null)
  const [isMember, setIsMember] = useState(false)
  const [myRating, setMyRating] = useState<number | null>(null)
  const [hovered, setHovered] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)
  const [currentAvg, setCurrentAvg] = useState(avgRating)
  const [currentCount, setCurrentCount] = useState(ratingCount)

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) return
      const uid = session.user.id
      setUserId(uid)
      const [{ data: mem }, { data: existing }] = await Promise.all([
        supabase.from('crew_members').select('crew_id').eq('crew_id', crewId).eq('user_id', uid).maybeSingle(),
        supabase.from('crew_ratings').select('rating').eq('crew_id', crewId).eq('user_id', uid).maybeSingle(),
      ])
      setIsMember(!!mem)
      if (existing) setMyRating(existing.rating)
    })
  }, [crewId])

  const rate = async (stars: number) => {
    if (!userId || !isMember || saving) return
    setSaving(true)
    await supabase.from('crew_ratings').upsert(
      { crew_id: crewId, user_id: userId, rating: stars },
      { onConflict: 'crew_id,user_id' }
    )
    setMyRating(stars)
    // Refresh avg
    const { data } = await supabase
      .from('crew_ratings')
      .select('rating')
      .eq('crew_id', crewId)
    if (data) {
      const avg = data.reduce((s, r) => s + r.rating, 0) / data.length
      setCurrentAvg(Math.round(avg * 10) / 10)
      setCurrentCount(data.length)
    }
    setSaving(false)
  }

  const display = hovered ?? myRating ?? 0

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
        {[1, 2, 3, 4, 5].map(i => (
          <span
            key={i}
            onClick={() => isMember && rate(i)}
            onMouseEnter={() => isMember && setHovered(i)}
            onMouseLeave={() => setHovered(null)}
            style={{
              fontSize: '20px',
              cursor: isMember ? 'pointer' : 'default',
              color: i <= (isMember ? display : Math.round(currentAvg)) ? '#D4AF37' : 'rgba(212,175,55,0.2)',
              transition: 'color 0.1s',
              lineHeight: 1,
            }}
          >★</span>
        ))}
      </div>
      {currentAvg > 0 && (
        <span style={{ fontSize: '13px', color: '#9B93C0' }}>
          {currentAvg.toFixed(1)} · {currentCount} {currentCount === 1 ? 'rating' : 'ratings'}
        </span>
      )}
      {isMember && !myRating && (
        <span style={{ fontSize: '12px', color: '#9B93C0', fontStyle: 'italic' }}>Rate your crew</span>
      )}
    </div>
  )
}
