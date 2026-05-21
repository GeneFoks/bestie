// Shared compatibility maps + scoring between a user's Bestie Type and a
// crew's aggregate type. Mirrors the per-user logic in app/browse/page.tsx.

export const VIBE_COMPAT: Record<string, string[]> = {
  fire:  ['air', 'fire'],
  earth: ['water', 'earth'],
  air:   ['fire', 'air'],
  water: ['earth', 'water'],
}

export const MIND_COMPAT: Record<string, string[]> = {
  visionary: ['connector', 'visionary'],
  connector: ['visionary', 'connector'],
  anchor:    ['explorer', 'anchor'],
  explorer:  ['anchor', 'explorer'],
}

export const ENERGY_COMPAT: Record<string, string[]> = {
  spark:   ['builder', 'guide'],
  builder: ['spark', 'dynamo'],
  dynamo:  ['builder', 'guide'],
  guide:   ['spark', 'dynamo'],
  mirror:  ['spark', 'builder', 'dynamo', 'guide', 'mirror'],
}

type TypeTriple = {
  energy_type?: string | null
  mind_type?:   string | null
  vibe_type?:   string | null
}

/**
 * Returns a 0-100% match score between a user's Bestie Type and a target
 * (another user, or a crew aggregate). Each axis worth: vibe 35, mind 35,
 * energy 30. We give partial credit when the type matches exactly (full)
 * vs. when it's just compatible (half).
 */
export function compatPercent(me: TypeTriple | null, other: TypeTriple | null): number | null {
  if (!me?.energy_type || !other?.energy_type) return null
  let score = 0
  // Vibe: 35 if compatible, +10 if exact match
  if (other.vibe_type && VIBE_COMPAT[me.vibe_type || '']?.includes(other.vibe_type)) {
    score += me.vibe_type === other.vibe_type ? 35 : 22
  }
  // Mind: 35 if compatible, +10 if exact match
  if (other.mind_type && MIND_COMPAT[me.mind_type || '']?.includes(other.mind_type)) {
    score += me.mind_type === other.mind_type ? 35 : 22
  }
  // Energy: 30 if compatible, +5 if exact
  if (other.energy_type && ENERGY_COMPAT[me.energy_type || '']?.includes(other.energy_type)) {
    score += me.energy_type === other.energy_type ? 30 : 18
  }
  return Math.min(100, score)
}

export function compatTone(pct: number | null): { color: string; label: string } | null {
  if (pct === null) return null
  if (pct >= 85) return { color: '#34D399', label: 'Great match' }
  if (pct >= 60) return { color: '#D4AF37', label: 'Good match' }
  if (pct >= 35) return { color: '#9B7FFF', label: 'Okay match' }
  return { color: '#A99ECC', label: 'Different vibe' }
}
