// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  // ── Auth ──────────────────────────────────────────────────────────
  const bearer = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!bearer) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data: { user }, error: authErr } = await admin.auth.getUser(bearer)
  if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { crew_id, query } = await req.json()
  if (!crew_id || !query?.trim()) {
    return NextResponse.json({ error: 'crew_id and query required' }, { status: 400 })
  }

  // ── Check crew plan ───────────────────────────────────────────────
  const { data: crew } = await admin
    .from('crews')
    .select('id, name, plan, plan_expires_at, captain_id')
    .eq('id', crew_id)
    .single()

  if (!crew) return NextResponse.json({ error: 'Crew not found' }, { status: 404 })

  const planActive =
    crew.plan !== 'free' &&
    (!crew.plan_expires_at || new Date(crew.plan_expires_at) > new Date())

  if (!planActive) {
    return NextResponse.json(
      { error: 'swarm_not_available', plan: crew.plan },
      { status: 403 }
    )
  }

  // ── Check requester is a member ───────────────────────────────────
  const { data: membership } = await admin
    .from('crew_members')
    .select('user_id')
    .eq('crew_id', crew_id)
    .eq('user_id', user.id)
    .single()

  if (!membership) return NextResponse.json({ error: 'Not a crew member' }, { status: 403 })

  // ── Load all members with profiles + agent skills ─────────────────
  const { data: members } = await admin
    .from('crew_members')
    .select('user_id')
    .eq('crew_id', crew_id)
    .neq('user_id', user.id)   // exclude the requester

  if (!members?.length) {
    return NextResponse.json({ matches: [], message: 'No other members in this crew yet.' })
  }

  const memberIds = members.map(m => m.user_id)

  const [{ data: profiles }, { data: agents }] = await Promise.all([
    admin
      .from('users')
      .select('id, full_name, username, avatar_url, bio, energy_type, mind_type, vibe_type, city, bestie_score')
      .in('id', memberIds),
    admin
      .from('crew_ai_agents')
      .select('user_id, skills, provider, is_active')
      .eq('crew_id', crew_id)
      .eq('is_active', true)
      .in('user_id', memberIds),
  ])

  // Build agent skills map
  const skillsMap: Record<string, string> = {}
  for (const a of agents || []) skillsMap[a.user_id] = a.skills

  // Build member context for Claude
  const memberContext = (profiles || []).map(p => {
    const skills = skillsMap[p.id]
    return [
      `### ${p.full_name || p.username} (@${p.username})`,
      p.city ? `Location: ${p.city}` : null,
      p.bio ? `Bio: ${p.bio}` : null,
      p.energy_type ? `Type: ${p.energy_type}` : null,
      p.mind_type ? `Mind: ${p.mind_type}` : null,
      p.vibe_type ? `Vibe: ${p.vibe_type}` : null,
      `Bestie Score: ${p.bestie_score || 0}`,
      skills ? `Skills & Availability: ${skills}` : null,
    ].filter(Boolean).join('\n')
  }).join('\n\n')

  // ── Call Claude ───────────────────────────────────────────────────
  const systemPrompt = `You are an AI Swarm coordinator for "${crew.name}", a Bestie community.
Your job: analyze crew members and find the best matches for a given request.

Rules:
- Return ONLY valid JSON (no markdown, no explanation outside JSON)
- Return exactly this structure:
{
  "matches": [
    {
      "username": "their_username",
      "name": "Their Name",
      "reason": "1-2 sentence explanation of why they're a great match",
      "match_score": 85
    }
  ],
  "summary": "1 sentence about the overall result"
}
- Return 2-3 best matches max (fewer if not enough relevant members)
- match_score is 0-100
- Be specific and human — reference their actual bio/skills
- If nobody is a good match, return matches: [] with a helpful summary`

  const userPrompt = `REQUEST: "${query.trim()}"

CREW MEMBERS:
${memberContext}`

  let matches = []
  let summary = ''

  try {
    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': process.env.ANTHROPIC_API_KEY || '',
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5',
        max_tokens: 600,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
      }),
    })

    const anthropicData = await anthropicRes.json()
    const raw = anthropicData.content?.[0]?.text || '{}'
    const parsed = JSON.parse(raw)
    matches = parsed.matches || []
    summary = parsed.summary || ''
  } catch (e) {
    console.error('[swarm] Claude error:', e)
    return NextResponse.json({ error: 'AI error, try again' }, { status: 500 })
  }

  // Enrich matches with avatar_url
  const profileMap: Record<string, any> = {}
  for (const p of profiles || []) profileMap[p.username] = p

  const enriched = matches.map(m => ({
    ...m,
    avatar_url: profileMap[m.username]?.avatar_url || null,
    user_id: profileMap[m.username]?.id || null,
    bestie_score: profileMap[m.username]?.bestie_score || 0,
  }))

  // ── Save to history ───────────────────────────────────────────────
  await admin.from('swarm_requests').insert({
    crew_id,
    requester_id: user.id,
    query: query.trim(),
    result: { matches: enriched, summary },
  })

  return NextResponse.json({ matches: enriched, summary })
}
