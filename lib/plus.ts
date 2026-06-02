// Helpers for the personal "Bestie Plus" ($8/mo) subscription.
// A user is an active Plus member when their tier is 'plus' AND the
// subscription hasn't expired.

export type PlusUser = {
  subscription_tier?: string | null
  plus_expires_at?: string | null
}

export function isPlusActive(u: PlusUser | null | undefined): boolean {
  if (!u) return false
  if (u.subscription_tier !== 'plus') return false
  if (!u.plus_expires_at) return true
  return new Date(u.plus_expires_at) > new Date()
}

// What Bestie Plus unlocks — single source of truth for marketing copy.
export const PLUS_PRICE = '$8'
export const PLUS_FEATURES = [
  {
    icon: '🤖',
    title: 'Premium AI companion',
    body: 'Connect your own AI key (Claude, OpenAI or Grok) and chat with no limits.',
  },
  {
    icon: '🕸️',
    title: 'Join the graph',
    body: "Don't just watch the connection web — appear on it and let people find you.",
  },
  {
    icon: '💰',
    title: 'Paid sessions',
    body: 'Offer your time and skills for money. Create paid sessions and get booked.',
  },
]
