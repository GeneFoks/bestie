import type { Config } from '@netlify/functions'

/**
 * Netlify Scheduled Function — fires every 15 minutes.
 * Calls /api/reminders/events on the deployed site, which scans for
 * events starting in ~24 hours and pushes reminders to attendees who
 * haven't been notified yet.
 *
 * We keep the actual logic in the Next.js API route so it has access
 * to the project's Supabase + web-push helpers; this function is just
 * the scheduler trigger.
 */
export default async (req: Request) => {
  const secret = Netlify.env.get('INTERNAL_API_SECRET')
  const site   = Netlify.env.get('URL') || 'https://bestiehere.com'
  if (!secret) {
    return new Response('INTERNAL_API_SECRET not configured', { status: 500 })
  }

  const res = await fetch(`${site}/api/reminders/events`, {
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
  schedule: '*/15 * * * *', // every 15 minutes
}
