import type { Config } from '@netlify/functions'

/**
 * Netlify Scheduled Function — fires once a day at 18:00 UTC.
 * Calls /api/companion/nudge which finds users whose companion
 * hasn't been interacted with for 24+ hours and sends them a
 * push notification with a quest reminder.
 */
export default async (req: Request) => {
  const secret = Netlify.env.get('INTERNAL_API_SECRET')
  const site   = Netlify.env.get('URL') || 'https://bestiehere.com'
  if (!secret) {
    return new Response('INTERNAL_API_SECRET not configured', { status: 500 })
  }

  const res = await fetch(`${site}/api/companion/nudge`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-internal-secret': secret,
    },
  })
  const body = await res.text()
  console.log('[companion-nudge] response:', res.status, body)
  return new Response(body, { status: res.status, headers: { 'content-type': 'application/json' } })
}

// Schedule removed while the AI companion is paused — otherwise users get
// daily pushes about a companion they can no longer see. Restore with:
//   schedule: '0 18 * * *'
export const config: Config = {}
