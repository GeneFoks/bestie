// ── Launch city config ────────────────────────────────────────────────────
// Single source of truth for the city Bestie is currently seeding.
// Change these values to re-point the whole landing page to a new city.
// The multi-city architecture (/cities, /cities/[city]) stays intact —
// this only controls front-page positioning / copy during the launch phase.

export const LAUNCH_CITY = {
  // Set to null once the product has real density across many cities
  // and you want to switch back to global positioning.
  name: 'Austin',
  region: 'TX',
  // Used in copy like "Austin's social passport"
  get possessive() {
    return `${this.name}'s`
  },
  // Used in copy like "in Austin, TX"
  get full() {
    return `${this.name}, ${this.region}`
  },
}

// When false, the landing falls back to global ("worldwide") positioning.
export const CITY_FOCUS = true as boolean
