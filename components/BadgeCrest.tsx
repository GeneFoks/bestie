// @ts-nocheck
// BadgeCrest — unique enamel-pin style crests for earned badges (user_badges table).
// Server-safe (no hooks). Currently supports: 'city_pioneer'.

export default function BadgeCrest({ badgeId, city, size = 64 }: { badgeId: string; city?: string | null; size?: number }) {
  if (badgeId !== 'city_pioneer') return null

  const compact = size <= 40
  const tooltip = city ? `City Pioneer — First in ${city}` : 'City Pioneer — First in their city'

  const crest = (
    <svg
      width={size}
      height={size}
      viewBox="0 0 72 72"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      style={{ display: 'block', filter: 'drop-shadow(0 0 8px rgba(212,175,55,0.30))' }}
    >
      <defs>
        <linearGradient id="bcGold" x1="0" y1="0" x2="72" y2="72" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#F0D97C" />
          <stop offset="0.5" stopColor="#D4AF37" />
          <stop offset="1" stopColor="#B8960C" />
        </linearGradient>
        <linearGradient id="bcEnamel" x1="36" y1="5" x2="36" y2="67" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#191932" />
          <stop offset="1" stopColor="#0B0B18" />
        </linearGradient>
      </defs>

      {/* Shield enamel */}
      <path d="M36 5 L61 13.5 V34 C61 49.5 50.5 59.5 36 66.5 C21.5 59.5 11 49.5 11 34 V13.5 Z" fill="url(#bcEnamel)" />
      {/* Gold gradient ring */}
      <path d="M36 5 L61 13.5 V34 C61 49.5 50.5 59.5 36 66.5 C21.5 59.5 11 49.5 11 34 V13.5 Z" stroke="url(#bcGold)" strokeWidth="2.4" strokeLinejoin="round" />
      {/* Inner hairline */}
      <path d="M36 10 L56.5 17 V33.5 C56.5 46.5 47.5 55 36 61 C24.5 55 15.5 46.5 15.5 33.5 V17 Z" stroke="rgba(212,175,55,0.32)" strokeWidth="1" strokeLinejoin="round" />
      {/* Enamel gloss */}
      <ellipse cx="36" cy="15.5" rx="16" ry="6.5" fill="rgba(255,255,255,0.05)" />

      {/* Laurel — left branch */}
      <path d="M24.5 48.5 C20.8 42.5 20 33.5 22.8 25.5" stroke="rgba(212,175,55,0.55)" strokeWidth="1.2" strokeLinecap="round" />
      <ellipse cx="22.8" cy="42.5" rx="2.6" ry="1.1" transform="rotate(-55 22.8 42.5)" fill="rgba(212,175,55,0.55)" />
      <ellipse cx="21.4" cy="35.5" rx="2.6" ry="1.1" transform="rotate(-75 21.4 35.5)" fill="rgba(212,175,55,0.55)" />
      <ellipse cx="22" cy="28.5" rx="2.6" ry="1.1" transform="rotate(-95 22 28.5)" fill="rgba(212,175,55,0.55)" />

      {/* Laurel — right branch */}
      <path d="M47.5 48.5 C51.2 42.5 52 33.5 49.2 25.5" stroke="rgba(212,175,55,0.55)" strokeWidth="1.2" strokeLinecap="round" />
      <ellipse cx="49.2" cy="42.5" rx="2.6" ry="1.1" transform="rotate(55 49.2 42.5)" fill="rgba(212,175,55,0.55)" />
      <ellipse cx="50.6" cy="35.5" rx="2.6" ry="1.1" transform="rotate(75 50.6 35.5)" fill="rgba(212,175,55,0.55)" />
      <ellipse cx="50" cy="28.5" rx="2.6" ry="1.1" transform="rotate(95 50 28.5)" fill="rgba(212,175,55,0.55)" />

      {/* Small star */}
      <path d="M36 15.6 L37.2 18.8 L40.4 20 L37.2 21.2 L36 24.4 L34.8 21.2 L31.6 20 L34.8 18.8 Z" fill="#F0D97C" />

      {/* Serif "1" monogram */}
      <text
        x="36"
        y="50"
        textAnchor="middle"
        fontFamily="'DM Serif Display', Georgia, serif"
        fontSize="27"
        fill="url(#bcGold)"
      >
        1
      </text>
    </svg>
  )

  if (compact) {
    return <span title={tooltip} style={{ display: 'inline-flex', lineHeight: 0 }}>{crest}</span>
  }

  return (
    <div title={tooltip} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', width: 'max-content' }}>
      {crest}
      <div style={{ textAlign: 'center' }}>
        <p style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.18em', color: '#D4AF37', margin: 0 }}>CITY PIONEER</p>
        {city && <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '2px 0 0' }}>First in {city}</p>}
      </div>
    </div>
  )
}
