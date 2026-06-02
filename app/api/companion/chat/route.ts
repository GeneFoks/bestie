// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const admin = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '') || ''
  const { data: { user } } = await admin().auth.getUser(token)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { message } = await req.json()
  if (!message?.trim()) return NextResponse.json({ error: 'Empty message' }, { status: 400 })

  const db = admin()

  // Load companion config
  const { data: companion } = await db
    .from('companions')
    .select('*')
    .eq('user_id', user.id)
    .single()

  // Load user profile for context (+ Plus status)
  const { data: profile } = await db
    .from('users')
    .select('full_name, bio, city, bestie_score, activities, subscription_tier, plus_expires_at')
    .eq('id', user.id)
    .single()

  // Plus members can run the companion on their own connected AI key.
  const isPlus = profile?.subscription_tier === 'plus' &&
    (!profile?.plus_expires_at || new Date(profile.plus_expires_at) > new Date())
  const personalKey = isPlus ? (companion?.api_key || '').trim() : ''
  const provider = personalKey ? (companion?.provider || 'claude') : 'claude'

  // Load last 10 messages for context
  const { data: history } = await db
    .from('companion_messages')
    .select('role, content')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(10)

  const recentHistory = (history || []).reverse()

  // Build the message list the model will see, then sanitize it so it
  // satisfies Anthropic's rules: first message must be 'user' and roles
  // must strictly alternate. Without this, two consecutive 'user' rows
  // (e.g. after a failed reply) make every future request 400 and the
  // companion goes silent forever.
  const buildMessages = (rows: { role: string; content: string }[]) => {
    const collapsed: { role: string; content: string }[] = []
    for (const m of rows) {
      if (!m?.content) continue
      const last = collapsed[collapsed.length - 1]
      if (last && last.role === m.role) {
        // merge consecutive same-role turns into one
        last.content += `\n\n${m.content}`
      } else {
        collapsed.push({ role: m.role, content: m.content })
      }
    }
    // first message must be 'user'
    while (collapsed.length && collapsed[0].role !== 'user') collapsed.shift()
    return collapsed
  }

  const apiMessages = buildMessages([
    ...recentHistory.map((m: any) => ({ role: m.role, content: m.content })),
    { role: 'user', content: message },
  ])

  // Companion personality based on type
  const companionName = companion?.name || 'Bestie'
  const companionType = companion?.type || 'spark'

  const personalities = {
    spark: `You are ${companionName}, an energetic and witty AI companion on the Bestie platform. You're bold, fun, slightly sarcastic but always supportive. You use casual language, occasional emojis, and you push people out of their comfort zone in a playful way. You LOVE when people make new connections.`,
    sage: `You are ${companionName}, a wise and mystical AI companion on the Bestie platform. You speak thoughtfully, with depth and warmth. You help people reflect on what kind of connections they really want. You're encouraging without being pushy. Occasionally poetic.`,
    nova: `You are ${companionName}, a futuristic and curious AI companion on the Bestie platform. You're analytical but warm, like a brilliant friend who's genuinely excited about human connection. You use light tech metaphors and are fascinated by people's unique "signals".`,
  }

  const systemPrompt = `${personalities[companionType]}

Context about the user you're helping:
- Name: ${profile?.full_name || 'Unknown'}
- City: ${profile?.city || 'Unknown'}
- Bestie Score: ${profile?.bestie_score || 0}
- Bio: ${profile?.bio || 'Not set yet'}
- Interests: ${profile?.activities?.length ? profile.activities.slice(0, 5).join(', ') : 'Not selected yet'}

Your goals:
1. Help them navigate the Bestie platform and make real connections
2. Give them fun quests and missions to engage with others
3. Celebrate their wins (new connections, sparks sent, sessions booked)
4. Gently nudge introverts to reach out — make it feel like a game
5. Keep responses SHORT (2-4 sentences max) unless they ask a specific question

Bestie platform features you can reference:
- Sparks: virtual appreciation tokens you send to people you like
- Bestie Score (BS): your reputation score that grows with real connections
- Sessions: IRL meetups or video calls you book with people
- Crews: friend groups (like clubs) you can join or create
- Bestie Type: a personality quiz that reveals your connection style

Never break character. Never say you're Claude or an AI made by Anthropic.`

  // Save user message
  await db.from('companion_messages').insert({
    user_id: user.id,
    role: 'user',
    content: message,
  })

  // Provider-agnostic call. Plus members with a personal key run on their
  // own model; everyone else uses the built-in Bestie (Claude) key.
  const claudeKey = personalKey || process.env.ANTHROPIC_API_KEY || ''
  if (provider === 'claude' && !claudeKey) {
    console.error('[companion] ANTHROPIC_API_KEY is not set')
    return NextResponse.json({ error: 'AI key not configured on the server' }, { status: 503 })
  }
  let reply = '...'
  try {
    if (provider === 'claude') {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': claudeKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5',
          max_tokens: 300,
          system: systemPrompt,
          messages: apiMessages,
        }),
      })
      if (!res.ok) throw new Error(await res.text())
      const aiData = await res.json()
      reply = aiData.content?.[0]?.text || '...'
    } else {
      // OpenAI-compatible (OpenAI / Grok)
      const endpoint = provider === 'grok'
        ? 'https://api.x.ai/v1/chat/completions'
        : 'https://api.openai.com/v1/chat/completions'
      const model = provider === 'grok' ? 'grok-2-latest' : 'gpt-4o-mini'
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${personalKey}`,
        },
        body: JSON.stringify({
          model,
          max_tokens: 300,
          messages: [{ role: 'system', content: systemPrompt }, ...apiMessages],
        }),
      })
      if (!res.ok) throw new Error(await res.text())
      const aiData = await res.json()
      reply = aiData.choices?.[0]?.message?.content || '...'
    }
  } catch (e: any) {
    const detail = (e?.message || String(e)).slice(0, 300)
    console.error(`[companion] ${provider} error:`, detail)
    return NextResponse.json({ error: 'AI unavailable', detail }, { status: 503 })
  }

  // Save assistant reply
  await db.from('companion_messages').insert({
    user_id: user.id,
    role: 'assistant',
    content: reply,
  })

  // Award XP to companion for interaction
  if (companion) {
    const newXp = (companion.xp || 0) + 5
    const newLevel = Math.floor(newXp / 100) + 1
    await db.from('companions').update({
      xp: newXp,
      level: Math.min(newLevel, 10),
      updated_at: new Date().toISOString(),
    }).eq('user_id', user.id)
  }

  return NextResponse.json({ reply, engine: { provider, personal: !!personalKey } })
}
