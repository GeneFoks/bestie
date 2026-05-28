import { Sparkles, Trophy } from 'lucide-react'

type Props = {
  createdAt: string // ISO
  crewName: string
}

/**
 * Crew anniversary banner — shown for ±14 days around each yearly milestone
 * (1 year, 2 years, 3+ years). Pure server-side, no data fetching.
 */
export default function CrewAnniversary({ createdAt, crewName }: Props) {
  const created = new Date(createdAt)
  const now = new Date()
  const ageMs = now.getTime() - created.getTime()
  const ageYears = Math.floor(ageMs / (365.25 * 24 * 60 * 60 * 1000))

  if (ageYears < 1) return null

  // Days until next anniversary
  const nextAnniversary = new Date(created)
  nextAnniversary.setFullYear(created.getFullYear() + ageYears + 1)
  const daysToNext = Math.round((nextAnniversary.getTime() - now.getTime()) / (24 * 60 * 60 * 1000))

  // Days since most recent anniversary
  const lastAnniversary = new Date(created)
  lastAnniversary.setFullYear(created.getFullYear() + ageYears)
  const daysSinceLast = Math.round((now.getTime() - lastAnniversary.getTime()) / (24 * 60 * 60 * 1000))

  // Show within ±14 days of an anniversary
  const isInWindow = daysSinceLast <= 14 || daysToNext <= 14
  if (!isInWindow) return null

  const isUpcoming = daysToNext <= 14 && daysSinceLast > 14
  const yearLabel = isUpcoming ? ageYears + 1 : ageYears
  const ordinal = yearLabel === 1 ? '1st' : yearLabel === 2 ? '2nd' : yearLabel === 3 ? '3rd' : `${yearLabel}th`

  return (
    <div style={{ marginBottom: '20px', padding: '18px 22px', borderRadius: '20px', background: 'linear-gradient(135deg, rgba(212,175,55,0.15) 0%, rgba(155,127,255,0.10) 100%)', border: '1px solid rgba(212,175,55,0.35)', display: 'flex', alignItems: 'center', gap: '16px', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: '-40px', right: '-40px', width: '160px', height: '160px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(212,175,55,0.18) 0%, transparent 70%)', pointerEvents: 'none' }} />
      <span style={{ width: '54px', height: '54px', borderRadius: '16px', background: 'rgba(212,175,55,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, position: 'relative' }}>
        <Trophy size={26} color="#D4AF37" strokeWidth={1.6} />
      </span>
      <div style={{ flex: 1, minWidth: 0, position: 'relative' }}>
        <p style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '2px', color: '#D4AF37', marginBottom: '4px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
          <Sparkles size={11} strokeWidth={2.2} />
          {isUpcoming ? 'ANNIVERSARY COMING' : 'ANNIVERSARY'}
        </p>
        <h3 style={{ fontFamily: 'DM Serif Display, serif', fontSize: '18px', color: '#F0EAFF', margin: 0, lineHeight: 1.2 }}>
          {isUpcoming
            ? <>{crewName} turns {ordinal} in {daysToNext === 0 ? 'today!' : `${daysToNext} day${daysToNext === 1 ? '' : 's'}`}</>
            : <>{crewName} is {ordinal} year{yearLabel === 1 ? '' : 's'} strong</>}
        </h3>
      </div>
    </div>
  )
}
