// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendPushToUser } from '@/lib/push'

// Protected by internal secret — called by Netlify scheduled function
export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-internal-secret')
  if (secret !== process.env.INTERNAL_API_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Find users who have a companion but haven't chatted in 24+ hours
  // and have at least one active quest
  const { data: candidates, error } = await supabase
    .from('companions')
    .select(`
      user_id,
      name,
      companion_type,
      users:user_id (
        full_name,
        username
      )
    `)
    .lt('updated_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())

  if (error) {
    console.error('[nudge] fetch companions error:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!candidates || candidates.length === 0) {
    return NextResponse.json({ ok: true, nudged: 0 })
  }

  // Check which of these users have active quests
  const userIds = candidates.map((c) => c.user_id)
  const { data: activeQuests } = await supabase
    .from('user_quests')
    .select('user_id, quests:quest_id(title)')
    .in('user_id', userIds)
    .eq('status', 'active')

  // Build map: user_id → first active quest title
  const questMap: Record<string, string> = {}
  for (const uq of activeQuests || []) {
    if (!questMap[uq.user_id] && uq.quests) {
      questMap[uq.user_id] = (uq.quests as any).title
    }
  }

  let nudged = 0

  for (const companion of candidates) {
    const questTitle = questMap[companion.user_id]
    const companionName = companion.name || 'Bestie'
    const firstName = (companion.users as any)?.full_name?.split(' ')[0] || 'there'

    // Build a personality-appropriate nudge message
    let body: string
    if (questTitle) {
      const nudges: Record<string, string[]> = {
        spark: [
          `Hey ${firstName}! ⚡ Your quest "${questTitle}" is waiting — let's crush it!`,
          `Miss me? 😄 Come back and finish "${questTitle}" for XP!`,
          `${firstName}! ✨ We've got a quest to complete. Let's go!`,
        ],
        sage: [
          `${firstName}, your journey continues. "${questTitle}" awaits your wisdom.`,
          `A gentle reminder: "${questTitle}" is still open for you. 🌿`,
          `Progress calls, ${firstName}. "${questTitle}" is ready when you are.`,
        ],
        nova: [
          `${firstName}! 🚀 Mission active: "${questTitle}". Time to launch!`,
          `Systems ready. Quest "${questTitle}" is locked and loaded, ${firstName}!`,
          `⭐ New energy detected! Come complete "${questTitle}" with me.`,
        ],
      }
      const type = companion.companion_type || 'spark'
      const msgs = nudges[type] || nudges.spark
      body = msgs[Math.floor(Math.random() * msgs.length)]
    } else {
      body = `${companionName} misses you! Come say hi 👋`
    }

    try {
      await sendPushToUser(companion.user_id, {
        title: `${companionName} is thinking of you`,
        body,
        link: '/dashboard',
      })
      nudged++
    } catch (e) {
      console.error('[nudge] push error for', companion.user_id, e)
    }
  }

  return NextResponse.json({ ok: true, nudged, total: candidates.length })
}
