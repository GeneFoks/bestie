// @ts-nocheck
// Demo data for the Burning Man nested world.
// Layout math: the Man stands at (50, 46). Camps are placed on two arcs below/around
// him (Black Rock City's C-shape, opening upward). Positions computed as
//   x = 50 + r * cos(phi), y = 46 + r * sin(phi)   (screen-y grows downward)
// with phi from 20deg to 160deg. Inner arc r = 20, outer arc r = 32-33.
// Minimum pairwise camp distance is ~12.9 (verified), all x in [19.9, 80.1], y in [56.5, 79.0].

export type PlayaCamp = {
  id: string;
  name: string;
  vibe: string;
  members: { name: string; initials: string }[];
  events: { title: string; time: string; openToAll: boolean }[];
  x: number;
  y: number;
  big?: boolean;
};

export const CAMPS: PlayaCamp[] = [
  // ---- Inner arc (r = 20) ----
  {
    id: 'dusty-hugs',
    name: 'Dusty Hugs',
    vibe: 'Free hugs and cold brew at sunrise',
    members: [
      { name: 'Maya', initials: 'M' },
      { name: 'Theo', initials: 'T' },
      { name: 'Priya', initials: 'P' },
    ],
    events: [
      { title: 'Sunrise hug line', time: 'Daily · sunrise', openToAll: true },
      { title: 'Cold brew hand-off', time: 'Mornings · 8am', openToAll: true },
    ],
    x: 67.0, // phi = 31.7deg
    y: 56.5,
  },
  {
    id: 'tea-and-silence',
    name: 'Tea & Silence',
    vibe: 'Quiet tent, loud kettle',
    members: [
      { name: 'Anya', initials: 'A' },
      { name: 'Ken', initials: 'K' },
    ],
    events: [
      { title: 'Tea ceremony at dusk', time: 'Daily · dusk', openToAll: true },
      { title: 'Silent hour', time: 'Daily · noon', openToAll: true },
    ],
    x: 54.0, // phi = 78.4deg
    y: 65.6,
  },
  {
    id: 'camp-reset',
    name: 'Camp Reset',
    vibe: 'Naps, water refills, and zero judgment',
    members: [
      { name: 'Sofia', initials: 'S' },
      { name: 'Liam', initials: 'L' },
      { name: 'Nadia', initials: 'N' },
      { name: 'Omar', initials: 'O' },
    ],
    events: [
      { title: 'Shade nap hour', time: 'Daily · 2pm', openToAll: true },
    ],
    x: 38.5, // phi = 125deg
    y: 62.4,
  },
  // ---- Outer arc (r = 32-33) ----
  {
    id: 'desert-post-office',
    name: 'Desert Post Office',
    vibe: 'Send a postcard from the middle of nowhere',
    members: [
      { name: 'Ruth', initials: 'R' },
      { name: 'Felix', initials: 'F' },
      { name: 'Ines', initials: 'I' },
    ],
    events: [
      { title: 'Postcard writing table', time: 'Daily · 10am', openToAll: true },
      { title: 'Mail run to center camp', time: 'Daily · 4pm', openToAll: false },
    ],
    x: 80.1, // phi = 20deg, r = 32 (the 2:00 end of the C)
    y: 56.9,
  },
  {
    id: 'sound-garden',
    name: 'Sound Garden',
    vibe: 'Wind chimes the size of doors',
    big: true,
    members: [
      { name: 'Jonas', initials: 'J' },
      { name: 'Aisha', initials: 'A' },
      { name: 'Marco', initials: 'M' },
      { name: 'Elena', initials: 'E' },
      { name: 'Sam', initials: 'S' },
    ],
    events: [
      { title: 'Chime walk at first light', time: 'Sat · sunrise', openToAll: true },
      { title: 'Ambient set in the grove', time: 'Nightly · 10pm', openToAll: true },
      { title: 'Build-your-own-chime bench', time: 'Wed · 3pm', openToAll: true },
    ],
    x: 74.0, // phi = 43.3deg, r = 33
    y: 68.6,
  },
  {
    id: 'camp-kindling',
    name: 'Camp Kindling',
    vibe: 'Storytelling circles around a slow fire',
    members: [
      { name: 'Noah', initials: 'N' },
      { name: 'Greta', initials: 'G' },
    ],
    events: [
      { title: 'Story circle by the fire', time: 'Nightly · 9pm', openToAll: true },
      { title: 'Ember tending shift', time: 'Nightly · late', openToAll: false },
    ],
    x: 62.7, // phi = 66.7deg, r = 32
    y: 75.4,
  },
  {
    id: 'neon-oasis',
    name: 'Neon Oasis',
    vibe: 'An open bar glowing a mile out',
    big: true,
    members: [
      { name: 'Dmitri', initials: 'D' },
      { name: 'Carla', initials: 'C' },
      { name: 'Yuki', initials: 'Y' },
      { name: 'Ben', initials: 'B' },
      { name: 'Tara', initials: 'T' },
    ],
    events: [
      { title: 'Glow hour at the bar', time: 'Nightly · 9pm', openToAll: true },
      { title: 'Open mic under the stars', time: 'Fri · 11pm', openToAll: true },
      { title: 'Neon repair clinic', time: 'Thu · noon', openToAll: true },
    ],
    x: 50.0, // phi = 90deg, r = 33 (bottom of the C, straight below the Man)
    y: 79.0,
  },
  {
    id: 'the-foam-dome',
    name: 'The Foam Dome',
    vibe: 'A bouncy dome you can hear before you see',
    members: [
      { name: 'Zoe', initials: 'Z' },
      { name: 'Pablo', initials: 'P' },
      { name: 'Rita', initials: 'R' },
    ],
    events: [
      { title: 'Foam drop', time: 'Sat · 5pm', openToAll: true },
    ],
    x: 37.3, // phi = 113.3deg, r = 32
    y: 75.4,
  },
  {
    id: 'fire-and-strings',
    name: 'Fire & Strings',
    vibe: 'Fire spinners and a string quartet, same stage',
    members: [
      { name: 'Ivan', initials: 'I' },
      { name: 'Lucia', initials: 'L' },
      { name: 'Hana', initials: 'H' },
      { name: 'Cole', initials: 'C' },
    ],
    events: [
      { title: 'Strings at sundown', time: 'Daily · sundown', openToAll: true },
      { title: 'Fire spin jam', time: 'Nightly · midnight', openToAll: true },
    ],
    x: 26.0, // phi = 136.7deg, r = 33
    y: 68.6,
  },
  {
    id: 'slow-sunrise',
    name: 'Slow Sunrise',
    vibe: 'Pancakes from first light until they run out',
    members: [
      { name: 'Emma', initials: 'E' },
      { name: 'Raj', initials: 'R' },
    ],
    events: [
      { title: 'Sunrise yoga on the dust', time: 'Daily · sunrise', openToAll: true },
      { title: 'Pancake line', time: 'Daily · 7am', openToAll: true },
    ],
    x: 19.9, // phi = 160deg, r = 32 (the 10:00 end of the C)
    y: 56.9,
  },
];

export const PLAYA_TICKER: string[] = [
  'Neon Oasis opened its bar to all camps',
  'Sound Garden hits day 4 on the playa',
  'A new camp pitched on the 9:00 arc',
  'Dust storm passed — the Man is visible again',
  'The Foam Dome refilled and bouncing since noon',
  'Desert Post Office cleared 200 postcards today',
  'Slow Sunrise ran out of pancakes by 9am',
  'Fire & Strings takes the deep playa at midnight',
  'Tea & Silence added a second quiet tent',
  "Camp Kindling's story circle went past 3am",
];
