// Server component — renders the crew's aggregate Bestie Type (energy / mind / vibe)
// and the viewer's compatibility % with that aggregate (if viewer has a Bestie Type).
import { cookies } from 'next/headers'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { compatPercent, compatTone } from '@/lib/crewCompat'
import { Sparkles } from 'lucide-react'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default async function CrewVibeChip({ crewId }: { crewId: string }) {
  const { data: agg } = await supabase
    .from('crew_aggregate_type')
    .select('energy_type, mind_type, vibe_type, typed_members')
    .eq('crew_id', crewId)
    .maybeSingle()

  // No aggregate (no members have completed quiz yet)
  if (!agg?.energy_type) return null

  // Viewer compat
  const cookieStore = cookies()
  const auth = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (n: string) => cookieStore.get(n)?.value } }
  )
  const { data: { user } } = await auth.auth.getUser()
  let pct: number | null = null
  let tone: { color: string; label: string } | null = null
  if (user) {
    const { data: me } = await supabase
      .from('users')
      .select('energy_type, mind_type, vibe_type, bestie_type_completed')
      .eq('id', user.id)
      .single()
    if (me?.bestie_type_completed) {
      pct = compatPercent(me, agg)
      tone = compatTone(pct)
    }
  }

  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 12px', borderRadius: '999px', background: 'rgba(155,127,255,0.08)', border: '1px solid rgba(155,127,255,0.22)', fontSize: '11px', fontWeight: 700, color: '#9B7FFF', letterSpacing: '0.5px', flexShrink: 0 }}>
      <Sparkles size={11} strokeWidth={2.2} />
      <span style={{ textTransform: 'uppercase' }}>
        {agg.energy_type} · {agg.mind_type} · {agg.vibe_type}
      </span>
      {tone && pct !== null && (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '2px 8px', borderRadius: '999px', background: `${tone.color}1A`, border: `1px solid ${tone.color}50`, color: tone.color, fontSize: '10px', fontWeight: 700, marginLeft: '4px' }}>
          {pct}% · {tone.label}
        </span>
      )}
    </div>
  )
}
