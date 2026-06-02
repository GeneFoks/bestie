import type { Config } from '@netlify/functions'

/**
 * Netlify Scheduled Function — fires weekly (Mondays 17:00 UTC).
 * Calls /api/swarm/automatch which, for every paid crew, asks the swarm
 * to suggest 1-2 fresh pairings of members and notifies both people.
 */
export default async (req: Request) => {
  const secret = Netlify.env.get('INTERNAL_API_SECRET')
  const site   = Netlify.env.get('URL') || 'https://bestiehere.com'
  if (!secret) {
    return new Response('INTERNAL_API_SECRET not configured', { status: 500 })
  }

  const res = await fetch(`${site}/api/swarm/automatch`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-internal-secret': secret,
    },
  })
  const body = await res.text()
  console.log('[swarm-automatch] response:', res.status, body)
  return new Response(body, { status: res.status, headers: { 'content-type': 'application/json' } })
}

export const config: Config = {
  schedule: '0 17 * * 1', // every Monday at 17:00 UTC
}
