// @ts-nocheck
import { ImageResponse } from 'next/og'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'edge'
export const alt = 'Birthday invitation on Bestie'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function OGImage({ params }: { params: { slug: string } }) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const { data: ev } = await supabase
    .from('birthday_events')
    .select('celebrant, title, event_date, location, cover_image')
    .eq('share_slug', params.slug)
    .single()

  const title = ev?.title || (ev?.celebrant ? `${ev.celebrant}'s Birthday` : 'Birthday party')
  const d = ev?.event_date ? new Date(ev.event_date) : null
  const when = d ? d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }) : ''
  const atTime = d ? d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : ''

  // Serif display font for the title line; a failed fetch falls back to sans-serif.
  let fontData: ArrayBuffer | null = null
  try {
    fontData = await fetch('https://fonts.gstatic.com/s/dmserifdisplay/v15/-nFnOHM81r4j6k0gjAW3mujVU2B2K_d709jy92k.ttf')
      .then((res) => (res.ok ? res.arrayBuffer() : null))
  } catch (err) {
    console.error('OG font fetch failed:', err)
    fontData = null
  }

  return new ImageResponse(
    (
      <div style={{ width: '1200px', height: '630px', display: 'flex', flexDirection: 'column', background: '#09090F', position: 'relative', overflow: 'hidden', fontFamily: 'sans-serif', padding: '64px 72px' }}>
        {ev?.cover_image ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={ev.cover_image} alt="" width={1200} height={630} style={{ position: 'absolute', inset: 0, width: '1200px', height: '630px', objectFit: 'cover', display: 'flex' }} />
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, rgba(8,8,16,0.50) 0%, rgba(8,8,16,0.88) 100%)', display: 'flex' }} />
          </>
        ) : (
          <>
            <div style={{ position: 'absolute', top: '-140px', right: '-120px', width: '640px', height: '640px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,107,53,0.22) 0%, transparent 65%)', display: 'flex' }} />
            <div style={{ position: 'absolute', bottom: '-140px', left: '-100px', width: '540px', height: '540px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(155,127,255,0.16) 0%, transparent 65%)', display: 'flex' }} />
          </>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '40px' }}>
          <div style={{ fontSize: '15px', fontWeight: 700, color: '#D4AF37', letterSpacing: '3px', display: 'flex' }}>BESTIE</div>
          <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#A99ECC', display: 'flex' }} />
          <div style={{ fontSize: '14px', color: '#FF6B35', letterSpacing: '1.5px', display: 'flex' }}>🎂 BIRTHDAY INVITATION</div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'center' }}>
          <div style={{ fontFamily: fontData ? 'DM Serif Display' : 'sans-serif', fontSize: '66px', fontWeight: 700, color: '#F0EAFF', lineHeight: 1.08, marginBottom: '28px', display: 'flex', maxWidth: '1000px' }}>
            {title} 🎉
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {when && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '24px', color: '#F0EAFF' }}>
                <div style={{ fontSize: '24px', display: 'flex' }}>📅</div>
                <div style={{ display: 'flex' }}>{when}{atTime ? ` · ${atTime}` : ''}</div>
              </div>
            )}
            {ev?.location && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '24px', color: '#F0EAFF' }}>
                <div style={{ fontSize: '24px', display: 'flex' }}>📍</div>
                <div style={{ display: 'flex' }}>{ev.location}</div>
              </div>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontSize: '19px', color: '#A99ECC', display: 'flex' }}>
            RSVP · photos · wishlist · chat
          </div>
          <div style={{ padding: '14px 28px', borderRadius: '14px', background: 'linear-gradient(135deg, #FF6B35 0%, #E0561F 100%)', fontSize: '18px', fontWeight: 700, color: '#fff', display: 'flex' }}>
            You&apos;re invited →
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      ...(fontData ? { fonts: [{ name: 'DM Serif Display', data: fontData, style: 'normal' as const }] } : {}),
    }
  )
}
