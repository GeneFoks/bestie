// Server component — renders the crew's weekly streak (if any) and the
// badges it has earned. Pulls from crew_event_streak + crew_badges views.
import { createClient } from '@supabase/supabase-js'
import {
  Flame, Trophy, Sparkles, CalendarCheck, Medal, Globe, Palette, TrendingUp,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const ICONS: Record<string, LucideIcon> = {
  'sparkles':       Sparkles,
  'trophy':         Trophy,
  'calendar-check': CalendarCheck,
  'medal':          Medal,
  'globe':          Globe,
  'palette':        Palette,
  'trending-up':    TrendingUp,
  'flame':          Flame,
}

const BADGE_COLOR: Record<string, string> = {
  og_crew:       '#9B7FFF',
  veteran_crew:  '#D4AF37',
  active_hosts:  '#34D399',
  century:       '#D4AF37',
  cross_city:    '#60A5FA',
  diverse_vibes: '#FF7857',
  growing:       '#34D399',
  on_fire:       '#FF6B35',
}

function streakTone(weeks: number) {
  if (weeks >= 12) return { color: '#34D399', glow: 'rgba(52,211,153,0.35)' }
  if (weeks >= 8)  return { color: '#D4AF37', glow: 'rgba(212,175,55,0.35)' }
  if (weeks >= 4)  return { color: '#FF7857', glow: 'rgba(255,120,87,0.30)' }
  return            { color: '#9B7FFF', glow: 'rgba(155,127,255,0.25)' }
}

export default async function CrewBadgesRow({ crewId }: { crewId: string }) {
  const [{ data: streak }, { data: badges }] = await Promise.all([
    supabase.from('crew_event_streak').select('streak_weeks').eq('crew_id', crewId).maybeSingle(),
    supabase.from('crew_badges').select('badge_id, label, description, icon').eq('crew_id', crewId),
  ])

  const weeks = streak?.streak_weeks ?? 0
  const list = badges || []
  if (weeks === 0 && list.length === 0) return null

  const tone = streakTone(weeks)

  return (
    <div style={{ marginBottom: '20px', display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
      {weeks > 0 && (
        <span
          title={`${weeks}-week event streak — keep it alive!`}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '6px',
            padding: '6px 12px', borderRadius: '999px',
            background: `${tone.color}1A`,
            border: `1px solid ${tone.color}55`,
            color: tone.color,
            fontSize: '12px', fontWeight: 700,
            boxShadow: `0 0 12px ${tone.glow}`,
          }}
        >
          <Flame size={12} strokeWidth={2.2} fill={`${tone.color}33`} />
          {weeks}-week streak
        </span>
      )}

      {list.map(b => {
        const Icon = ICONS[b.icon] || Sparkles
        const color = BADGE_COLOR[b.badge_id] || '#A99ECC'
        return (
          <span
            key={b.badge_id}
            title={b.description}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px',
              padding: '6px 12px', borderRadius: '999px',
              background: `${color}14`,
              border: `1px solid ${color}38`,
              color,
              fontSize: '12px', fontWeight: 700,
            }}
          >
            <Icon size={12} strokeWidth={2.2} />
            {b.label}
          </span>
        )
      })}
    </div>
  )
}
