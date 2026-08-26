// @ts-nocheck
// Demo data for the Bestie World concept — fires in the clearing, live feed, factions.
// Pure data module: no imports, safe to use from server or client components.

export type WorldFire = {
  id: string
  name: string
  activityType: string
  faction: 'light' | 'flow' | 'flame'
  state: 'blazing' | 'steady' | 'dim' | 'ash' | 'unlit'
  epic?: boolean            // landmark fire — rendered larger, with a light column
  href?: string             // real destination (e.g. an actual session) — join goes here
  enter?: string            // a world inside the world — the card button enters it
  members: { name: string; initials: string }[]
  streakDays: number
  x: number // percent, 8-92
  y: number // percent, 30-88 (keep y<30 free for the horizon)
}

export const FIRES: WorldFire[] = [
  // ── BURNING MAN — a permanent station, timeless (not tied to any year).
  // Entering it opens a world inside the world: Black Rock City, where every
  // camp is its own fire. Deep link: bestiehere.com/world?fire=burning-man
  {
    id: 'burning-man',
    name: 'Burning Man',
    activityType: 'burning_man',
    faction: 'flame',
    state: 'blazing',
    epic: true,
    enter: '/world/burning-man',
    members: [
      { name: 'Gennadii', initials: 'GE' },
      { name: 'Artem', initials: 'AR' },
      { name: 'Mila', initials: 'MI' },
      { name: 'Dan', initials: 'DA' },
    ],
    streakDays: 365,
    x: 55,
    y: 46,
  },
  {
    id: 'fire-morning-runners',
    name: 'Morning Runners',
    activityType: 'running',
    faction: 'flame',
    state: 'blazing',
    members: [
      { name: 'Maria', initials: 'MA' },
      { name: 'Jake', initials: 'JA' },
      { name: 'Priya', initials: 'PR' },
      { name: 'Tom', initials: 'TO' },
      { name: 'Elena', initials: 'EL' },
    ],
    streakDays: 34,
    x: 18,
    y: 38,
  },
  {
    id: 'fire-deep-talk-circle',
    name: 'Deep Talk Circle',
    activityType: 'deep_chat',
    faction: 'flow',
    state: 'blazing',
    members: [
      { name: 'Sofia', initials: 'SO' },
      { name: 'Daniel', initials: 'DA' },
      { name: 'Amara', initials: 'AM' },
      { name: 'Leo', initials: 'LE' },
    ],
    streakDays: 20,
    x: 46,
    y: 32,
  },
  {
    id: 'fire-pickleball-dawn-squad',
    name: 'Pickleball Dawn Squad',
    activityType: 'pickleball',
    faction: 'flame',
    state: 'steady',
    members: [
      { name: 'Chris', initials: 'CH' },
      { name: 'Nina', initials: 'NI' },
      { name: 'Omar', initials: 'OM' },
    ],
    streakDays: 12,
    x: 76,
    y: 36,
  },
  {
    id: 'fire-book-and-coffee',
    name: 'Book & Coffee',
    activityType: 'book_club',
    faction: 'light',
    state: 'steady',
    members: [
      { name: 'Hannah', initials: 'HA' },
      { name: 'Miguel', initials: 'MI' },
      { name: 'Ava', initials: 'AV' },
      { name: 'Ken', initials: 'KE' },
    ],
    streakDays: 16,
    x: 88,
    y: 56,
  },
  {
    id: 'fire-sunrise-yoga',
    name: 'Sunrise Yoga',
    activityType: 'yoga',
    faction: 'flame',
    state: 'dim',
    members: [
      { name: 'Lena', initials: 'LE' },
      { name: 'Ravi', initials: 'RA' },
    ],
    streakDays: 3,
    x: 63,
    y: 59,
  },
  {
    id: 'fire-makers-table',
    name: 'Makers Table',
    activityType: 'art_together',
    faction: 'flame',
    state: 'steady',
    members: [
      { name: 'Grace', initials: 'GR' },
      { name: 'Felix', initials: 'FE' },
      { name: 'Yuki', initials: 'YU' },
    ],
    streakDays: 9,
    x: 31,
    y: 54,
  },
  {
    id: 'fire-still-minds',
    name: 'Still Minds',
    activityType: 'meditation_circle',
    faction: 'light',
    state: 'dim',
    members: [
      { name: 'Noah', initials: 'NO' },
      { name: 'Ines', initials: 'IN' },
    ],
    streakDays: 2,
    x: 12,
    y: 70,
  },
  {
    id: 'fire-ridge-walkers',
    name: 'Ridge Walkers',
    activityType: 'hiking',
    faction: 'flow',
    state: 'ash',
    members: [
      { name: 'Sam', initials: 'SA' },
      { name: 'Clara', initials: 'CL' },
      { name: 'Diego', initials: 'DI' },
    ],
    streakDays: 0,
    x: 49,
    y: 81,
  },
  // ── Unlit fire pits — waiting for a founder to light them ──────────────
  {
    id: 'pit-north',
    name: 'An unlit fire',
    activityType: 'coffee_chat',
    faction: 'flow',
    state: 'unlit',
    members: [],
    streakDays: 0,
    x: 28,
    y: 72,
  },
  {
    id: 'pit-east',
    name: 'An unlit fire',
    activityType: 'gym_partner',
    faction: 'flame',
    state: 'unlit',
    members: [],
    streakDays: 0,
    x: 84,
    y: 76,
  },
  {
    id: 'pit-west',
    name: 'An unlit fire',
    activityType: 'journaling',
    faction: 'light',
    state: 'unlit',
    members: [],
    streakDays: 0,
    x: 8,
    y: 52,
  },
]

export const EVENTS: string[] = [
  'Maria joined Morning Runners',
  'Deep Talk Circle hit day 20 🔥',
  'A new fire was lit in the East',
  'Sunrise Yoga rekindled from the ashes',
  'Pickleball Dawn Squad checks in at first light',
  'Grace brings a friend to Makers Table',
  'Book & Coffee reaches day 16',
  'Still Minds is fading — two keepers remain',
  'Ridge Walkers went cold. Anyone carrying an ember?',
  'Omar keeps the Pickleball flame alive',
  'The Material path leads the week in sparks',
  'Elena passes the torch to Tom for tomorrow',
]

export const FACTIONS: { id: 'light' | 'flow' | 'flame'; label: string; color: string; blurb: string }[] = [
  {
    id: 'light',
    label: 'Mental',
    color: '#E8C766',
    blurb: 'Keepers of the mind — readers, thinkers, and quiet minds who feed the fire with focus.',
  },
  {
    id: 'flow',
    label: 'Social',
    color: '#5B8DEF',
    blurb: 'The social current — talkers, wanderers, and connectors who keep sparks moving between fires.',
  },
  {
    id: 'flame',
    label: 'Material',
    color: '#E86A5B',
    blurb: 'Body and craft — runners, makers, and movers who stoke the fire with sweat and hands.',
  },
]
