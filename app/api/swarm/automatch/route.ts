// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendPushToUser } from '@/lib/push'

// Protected by internal secret — called by the Netlify scheduled function.
// For every crew on a paid plan, asks Claude to suggest 1-2 pairings of
// members ("these two should connect"), then notifies both people. Pairs
// already suggested before are skipped so nobody gets nudged twice.
export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-internal-secret')
  if (secret !== process.env.INTERNAL_API_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Active paid crews only
  const { data: crews } = await admin
    .from('crews')
    .select('id, name, slug, plan, plan_expires_at')
    .neq('plan', 'free')

  const now = new Date()
  const activeCrews = (crews || []).filter(c =>
    !c.plan_expires_at || new Date(c.plan_expires_at) > now
  )

  let totalPairs = 0
  const summary: any[] = []

  for (const crew of activeCrews) {
    try {
      // Members of this crew
      const { data: cm } = await admin
        .from('crew_members')
        .select('user_id')
        .eq('crew_id', crew.id)
      const ids = (cm || []).map(m => m.user_id)
      if (ids.length < 2) continue

      // Only members who activated an agent can be paired
      const { data: agents } = await admin
        .from('crew_ai_agents')
        .select('user_id, skills')
        .eq('crew_id', crew.id)
        .eq('is_active', true)
        .in('user_id', ids)
      if (!agents || agents.length < 2) continue

      const agentIds = agents.map(a => a.user_id)
      const { data: profiles } = await admin
        .from('users')
        .select('id, full_name, username, bio, city')
        .in('id', agentIds)

      const skillsMap: Record<string, string> = {}
      for (const a of agents) skillsMap[a.user_id] = a.skills
      const profMap: Record<string, any> = {}
      for (const p of profiles || []) profMap[p.id] = p

      const roster = (profiles || []).map(p => [
        `@${p.username} (${p.full_name || p.username})`,
        p.city ? `City: ${p.city}` : null,
        p.bio ? `Bio: ${p.bio}` : null,
        skillsMap[p.id] ? `Skills/Offers: ${skillsMap[p.id]}` : null,
      ].filter(Boolean).join(' | ')).join('\n')

      const systemPrompt = `You are the matchmaking brain of an AI Swarm for the "${crew.name}" community.
Look at the members and suggest up to 2 pairs of people who would genuinely benefit from connecting (complementary skills, shared goals, one needs what the other offers).
Return ONLY valid JSON:
{ "pairs": [ { "a": "username_without_at", "b": "username_without_at", "reason": "1 sentence why they should meet", "score": 80 } ] }
Rules: never pair someone with themselves; only use usernames from the list; if no strong pair exists, return { "pairs": [] }. score is 0-100.`

      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': process.env.ANTHROPIC_API_KEY || '',
          'anthropic-version': '2023-06-01',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5',
          max_tokens: 500,
          system: systemPrompt,
          messages: [{ role: 'user', content: `MEMBERS:\n${roster}` }],
        }),
      })
      if (!res.ok) { console.error('[automatch] AI error', crew.slug, await res.text()); continue }
      const data = await res.json()
      const raw = (data.content?.[0]?.text || '{}').replace(/^```(?:json)?/i, '').replace(/```$/, '').trim()
      let pairs: any[] = []
      try { pairs = JSON.parse(raw).pairs || [] } catch { pairs = [] }

      const byUsername: Record<string, any> = {}
      for (const p of profiles || []) byUsername[p.username] = p

      for (const pair of pairs) {
        const pa = byUsername[pair.a]
        const pb = byUsername[pair.b]
        if (!pa || !pb || pa.id === pb.id) continue

        // Sort so the unordered pair is unique
        const [ua, ub] = pa.id < pb.id ? [pa, pb] : [pb, pa]

        // Skip if already suggested before
        const { data: existing } = await admin
          .from('swarm_auto_matches')
          .select('id')
          .eq('crew_id', crew.id)
          .eq('user_a', ua.id)
          .eq('user_b', ub.id)
          .maybeSingle()
        if (existing) continue

        const { error: insErr } = await admin.from('swarm_auto_matches').insert({
          crew_id: crew.id, user_a: ua.id, user_b: ub.id,
          reason: pair.reason || null, score: pair.score || null,
        })
        if (insErr) { console.error('[automatch] insert', insErr.message); continue }

        const link = `/crews/${crew.slug}/swarm`
        const reason = pair.reason || 'You two could be a great match.'

        // Notify each person about the other
        const notify = async (me: any, other: any) => {
          const title = `🐝 Swarm suggestion in ${crew.name}`
          const body = `Meet ${other.full_name || '@' + other.username}: ${reason}`
          await admin.from('notifications').insert({
            user_id: me.id, type: 'swarm_suggestion', title, body, link,
          })
          sendPushToUser(me.id, { title, body, link }).catch(() => {})
        }
        await Promise.all([notify(ua, ub), notify(ub, ua)])
        totalPairs++
      }

      summary.push({ crew: crew.slug, suggested: pairs.length })
    } catch (e: any) {
      console.error('[automatch] crew error', crew.slug, e?.message || e)
    }
  }

  return NextResponse.json({ ok: true, crews: activeCrews.length, pairs: totalPairs, summary })
}
