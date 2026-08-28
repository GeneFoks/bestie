// @ts-nocheck
// ActionBadge — dignified enamel-pin medallions for activity_reps (Action Portrait).
// Server-safe (no hooks). Levels on reps: I at 10, II at 100, III at 1000.
// Below 10 reps = unranked → renders nothing.
import { ActivityIcon } from '@/lib/activityIcons'

function levelFor(reps: number) {
  if (reps >= 1000) return { level: 3, numeral: 'III', next: null }
  if (reps >= 100) return { level: 2, numeral: 'II', next: 1000, nextNumeral: 'III' }
  if (reps >= 10) return { level: 1, numeral: 'I', next: 100, nextNumeral: 'II' }
  return null
}

export default function ActionBadge({ activityType, reps, size = 64 }: { activityType: string; reps: number; size?: number }) {
  const lvl = levelFor(reps || 0)
  if (!lvl) return null

  const label = String(activityType || '').replace(/_/g, ' ').toUpperCase()
  const frac = lvl.next ? Math.min(1, reps / lvl.next) : 1
  const R = 32.5
  const C = 2 * Math.PI * R
  const uid = `ab${String(activityType || 'x').replace(/[^a-zA-Z0-9]/g, '')}`
  const chipW = lvl.numeral === 'III' ? 22 : lvl.numeral === 'II' ? 18 : 14
  const isMax = lvl.level === 3
  const tooltip = isMax
    ? `${label} — Level III · ${reps} reps`
    : `${label} — Level ${lvl.numeral} · ${reps} reps, ${lvl.next - reps} to Level ${lvl.nextNumeral}`

  return (
    <div title={tooltip} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', width: 'max-content' }}>
      <div style={{ position: 'relative', width: size, height: size }}>
        <svg
          width={size}
          height={size}
          viewBox="0 0 72 72"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
          style={{ display: 'block', filter: isMax ? 'drop-shadow(0 0 10px rgba(240,217,124,0.40))' : 'drop-shadow(0 0 6px rgba(212,175,55,0.18))' }}
        >
          <defs>
            <linearGradient id={`${uid}Gold`} x1="0" y1="0" x2="72" y2="72" gradientUnits="userSpaceOnUse">
              <stop offset="0" stopColor="#F0D97C" />
              <stop offset="0.5" stopColor="#D4AF37" />
              <stop offset="1" stopColor="#B8960C" />
            </linearGradient>
            <linearGradient id={`${uid}Enamel`} x1="36" y1="6" x2="36" y2="66" gradientUnits="userSpaceOnUse">
              <stop offset="0" stopColor="#191932" />
              <stop offset="1" stopColor="#0B0B18" />
            </linearGradient>
          </defs>

          {/* Dark enamel disc */}
          <circle cx="36" cy="36" r="28" fill={`url(#${uid}Enamel)`} />
          {/* Inner hairline */}
          <circle cx="36" cy="36" r="25" stroke="rgba(212,175,55,0.28)" strokeWidth="1" />
          {/* Enamel gloss */}
          <ellipse cx="36" cy="22" rx="15" ry="6" fill="rgba(255,255,255,0.05)" />

          {/* Progress ring — track */}
          <circle cx="36" cy="36" r={R} stroke="rgba(212,175,55,0.16)" strokeWidth="2.6" />
          {/* Progress ring — fill (progress toward next level) */}
          <circle
            cx="36"
            cy="36"
            r={R}
            stroke={`url(#${uid}Gold)`}
            strokeWidth="2.6"
            strokeLinecap="round"
            strokeDasharray={`${C * frac} ${C}`}
            transform="rotate(-90 36 36)"
          />

          {/* Roman-numeral level chip at bottom edge */}
          <rect x={36 - chipW / 2} y="58" width={chipW} height="12" rx="6" fill="#0B0B18" stroke={`url(#${uid}Gold)`} strokeWidth="1.2" />
          <text
            x="36"
            y="66.8"
            textAnchor="middle"
            fontFamily="'Plus Jakarta Sans', sans-serif"
            fontSize="8"
            fontWeight="700"
            letterSpacing="0.5"
            fill={isMax ? '#F0D97C' : '#D4AF37'}
          >
            {lvl.numeral}
          </text>
        </svg>

        {/* Activity icon centered on the disc */}
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', paddingBottom: '4px' }}>
          <ActivityIcon type={activityType} size={Math.round(size * 0.34)} color="#D4AF37" strokeWidth={1.8} />
        </div>
      </div>

      <div style={{ textAlign: 'center', maxWidth: `${Math.max(size + 32, 96)}px` }}>
        <p style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.14em', color: 'var(--text-primary)', margin: 0, lineHeight: 1.3 }}>{label}</p>
        <p style={{ fontSize: '10px', color: 'var(--text-muted)', margin: '2px 0 0' }}>
          {isMax ? `${reps} reps · max level` : `${reps} reps · ${lvl.next - reps} to level ${lvl.nextNumeral}`}
        </p>
      </div>
    </div>
  )
}
