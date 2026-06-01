// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendPushToUser } from '@/lib/push'

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// ── Provider-agnostic LLM call ──────────────────────────────────────
// claude → Anthropic | openai → OpenAI | grok → x.ai (OpenAI-compatible)
// Returns the raw text the model produced. Throws on HTTP / API errors.
async function callLLM({
  provider,
  apiKey,
  systemPrompt,
  userPrompt,
}: {
  provider: string
  apiKey: string
  systemPrompt: string
  userPrompt: string
}): Promise<string> {
  if (provider === 'claude') {
    const key = apiKey || process.env.ANTHROPIC_API_KEY || ''
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': key,
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
    const data = await res.json()
    if (!res.ok) throw new Error(data?.error?.message || `Anthropic HTTP ${res.status}`)
    return data.content?.[0]?.text || '{}'
  }

  // OpenAI + Grok share the chat-completions shape
  const base = provider === 'grok' ? 'https://api.x.ai/v1' : 'https://api.openai.com/v1'
  const model = provider === 'grok' ? 'grok-2-latest' : 'gpt-4o-mini'
  const res = await fetch(`${base}/chat/completions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      max_tokens: 600,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data?.error?.message || `${provider} HTTP ${res.status}`)
  return data.choices?.[0]?.message?.content || '{}'
}

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
    .select('id, name, slug, plan, plan_expires_at, captain_id')
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

  // ── Load the requester's OWN agent (for personal API key + provider) ─
  const { data: ownAgent } = await admin
    .from('crew_ai_agents')
    .select('provider, api_key, is_active')
    .eq('crew_id', crew_id)
    .eq('user_id', user.id)
    .maybeSingle()

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

  // Decide which engine powers this request.
  // If the requester connected their OWN API key, use it (and their provider).
  // Otherwise fall back to Bestie's central Claude key.
  const personalKey = ownAgent?.is_active ? (ownAgent?.api_key || '').trim() : ''
  const provider = personalKey ? (ownAgent?.provider || 'claude') : 'claude'
  const usingPersonalKey = !!personalKey

  try {
    const raw = await callLLM({ provider, apiKey: personalKey, systemPrompt, userPrompt })
    // Strip ```json fences some models add
    const cleaned = raw.replace(/^```(?:json)?/i, '').replace(/```$/, '').trim()
    const parsed = JSON.parse(cleaned)
    matches = parsed.matches || []
    summary = parsed.summary || ''
  } catch (e: any) {
    console.error('[swarm] LLM error:', e?.message || e)
    return NextResponse.json(
      { error: usingPersonalKey ? `Your ${provider} API key failed: ${e?.message || 'invalid key or quota'}` : 'AI error, try again' },
      { status: 502 }
    )
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

  // ── Notify matched members (makes the match two-sided) ────────────
  // Each person the swarm surfaced gets an in-app notification + push so
  // they know they were picked, instead of waiting for the requester to
  // reach out first.
  try {
    const { data: requester } = await admin
      .from('users')
      .select('full_name, username')
      .eq('id', user.id)
      .single()
    const requesterName = requester?.full_name || requester?.username || 'Someone'
    const link = `/crews/${crew.slug}/swarm`
    const queryShort = query.trim().length > 80 ? query.trim().slice(0, 80) + '…' : query.trim()

    const targets = enriched.filter((m: any) => m.user_id)
    await Promise.all(targets.map(async (m: any) => {
      const title = `🐝 You're a Swarm match in ${crew.name}`
      const body = `${requesterName} is looking for: "${queryShort}" — your agent came up as a ${m.match_score}% match.`
      await admin.from('notifications').insert({
        user_id: m.user_id,
        type: 'swarm_match',
        title,
        body,
        link,
      })
      sendPushToUser(m.user_id, { title, body, link }).catch(() => {})
    }))
  } catch (e: any) {
    console.error('[swarm] notify error:', e?.message || e)
  }

  return NextResponse.json({
    matches: enriched,
    summary,
    engine: { provider, personal: usingPersonalKey },
  })
}
