// @ts-nocheck
export const revalidate = 3600
import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
import ProfileNav from '@/components/ProfileNav'
import { MapPin } from 'lucide-react'
import { EmptyState } from '@/components/EmptyState'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export const metadata = {
  title: 'Cities · Bestie',
  description: 'Find Besties and Crews in your city',
}

export default async function CitiesPage() {
  const { data: users } = await supabase
    .from('users')
    .select('city, country')
    .not('city', 'is', null)
    .neq('city', '')

  // Count users per city
  const cityMap: Record<string, { count: number; country: string }> = {}
  users?.forEach(u => {
    const key = u.city.trim()
    if (!cityMap[key]) cityMap[key] = { count: 0, country: u.country || '' }
    cityMap[key].count++
  })

  const cities = Object.entries(cityMap)
    .map(([city, { count, country }]) => ({ city, count, country }))
    .sort((a, b) => b.count - a.count)

  return (
    <div style={{ minHeight: '100vh', background: '#09090F', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
      <nav style={{ position: 'sticky', top: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', background: 'rgba(8,8,16,0.9)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.10)' }}>
        <Link href="/" style={{ fontFamily: 'DM Serif Display, serif', fontSize: '20px', fontWeight: 700, color: '#D4AF37', textDecoration: 'none' }}>BESTIE</Link>
        <ProfileNav />
      </nav>

      <div style={{ maxWidth: '760px', margin: '0 auto', padding: '40px 24px' }}>
        <p style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '2px', color: '#D4AF37', marginBottom: '8px' }}>CITY HUBS</p>
        <h1 style={{ fontFamily: 'DM Serif Display, serif', fontSize: '32px', color: '#F0EAFF', marginBottom: '8px' }}>Find your city</h1>
        <p style={{ fontSize: '15px', color: '#A99ECC', marginBottom: '32px' }}>Top Besties, popular activities, and upcoming events near you.</p>

        {cities.length === 0 ? (
          <EmptyState
            Icon={MapPin}
            title="No cities lit up yet"
            description="Add your city to your profile — and others will see you on the map."
            primaryCTA={{ label: 'Add my city', href: '/profile/edit' }}
            accent="gold"
          />
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px' }}>
            {cities.map(({ city, count, country }) => (
              <Link
                key={city}
                href={`/cities/${encodeURIComponent(city)}`}
                style={{ display: 'flex', flexDirection: 'column', gap: '6px', padding: '20px', borderRadius: '18px', background: '#111120', border: '1px solid rgba(255,255,255,0.10)', textDecoration: 'none', transition: 'border-color 0.15s' }}
              >
                <MapPin size={28} color="#D4AF37" strokeWidth={2} />
                <span style={{ fontSize: '16px', fontWeight: 700, color: '#F0EAFF', fontFamily: 'DM Serif Display, serif' }}>{city}</span>
                {country && <span style={{ fontSize: '12px', color: '#A99ECC' }}>{country}</span>}
                <span style={{ fontSize: '13px', fontWeight: 600, color: '#D4AF37', marginTop: '4px' }}>{count} {count === 1 ? 'Bestie' : 'Besties'}</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
