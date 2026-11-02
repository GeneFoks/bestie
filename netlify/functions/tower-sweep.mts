import type { Config } from '@netlify/functions'

/**
 * Netlify Scheduled Function — fires once a day.
 * Calls /api/tower/sweep on the deployed site, which re-checks paid
 * «Вышки в США» Telegram subscriptions with Stripe (missed webhooks,
 * ended subscriptions, failed kicks).
 *
 * The logic lives in the Next.js API route; this is just the trigger.
 */
export default async (req: Request) => {
  const secret = Netlify.env.get('INTERNAL_API_SECRET')
  const site   = Netlify.env.get('URL') || 'https://bestiehere.com'
  if (!secret) {
    return new Response('INTERNAL_API_SECRET not configured', { status: 500 })
  }

  const res = await fetch(`${site}/api/tower/sweep`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-cron-secret': secret,
    },
  })
  const body = await res.text()
  return new Response(body, { status: res.status, headers: { 'content-type': 'application/json' } })
}

export const config: Config = {
  schedule: '0 15 * * *', // daily, 15:00 UTC
}
