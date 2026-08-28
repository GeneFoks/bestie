// @ts-nocheck
import { ImageResponse } from 'next/og'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'edge'
export const alt = 'Bestie Crew'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function OGImage({ params }: { params: { slug: string } }) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const { data: crew } = await supabase
    .from('crews')
    .select('id, name, description, city, avatar_url, cover_url')
    .eq('slug', params.slug)
    .single()

  const { count: memberCount } = crew
    ? await supabase.from('crew_members').select('*', { count: 'exact', head: true }).eq('crew_id', crew.id)
    : { count: 0 }

  const name = crew?.name || 'Crew'
  const description = crew?.description?.slice(0, 140) || 'A crew on Bestie'

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
      <div style={{ width: '1200px', height: '630px', display: 'flex', background: '#09090F', position: 'relative', overflow: 'hidden', fontFamily: 'sans-serif' }}>
        {crew?.cover_url && (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={crew.cover_url} alt="" width={1200} height={630} style={{ position: 'absolute', inset: 0, width: '1200px', height: '630px', objectFit: 'cover', display: 'flex' }} />
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, rgba(8,8,16,0.60) 0%, rgba(8,8,16,0.88) 100%)', display: 'flex' }} />
          </>
        )}
        <div style={{ position: 'absolute', top: '-150px', left: '-100px', width: '700px', height: '600px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(155,127,255,0.18) 0%, transparent 65%)', display: 'flex' }} />
        <div style={{ position: 'absolute', bottom: '-120px', right: '-80px', width: '500px', height: '500px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(212,175,55,0.14) 0%, transparent 70%)', display: 'flex' }} />

        <div style={{ flex: 1, padding: '64px 72px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '40px' }}>
            <div style={{ fontSize: '15px', fontWeight: 700, color: '#D4AF37', letterSpacing: '3px', display: 'flex' }}>BESTIE</div>
            <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#A99ECC', display: 'flex' }} />
            <div style={{ fontSize: '14px', color: '#A99ECC', letterSpacing: '1.5px', display: 'flex' }}>CREW</div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '28px', marginBottom: '32px' }}>
            {crew?.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={crew.avatar_url} alt="" width={140} height={140} style={{ width: '140px', height: '140px', borderRadius: '32px', objectFit: 'cover', border: '3px solid rgba(155,127,255,0.5)' }} />
            ) : (
              <div style={{ width: '140px', height: '140px', borderRadius: '32px', background: 'linear-gradient(135deg, #1A1A2E 0%, #2A1A4E 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9B7FFF', fontSize: '64px', fontWeight: 700, border: '3px solid rgba(155,127,255,0.5)' }}>
                {name[0]?.toUpperCase()}
              </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
              <div style={{ fontFamily: fontData ? 'DM Serif Display' : 'sans-serif', fontSize: '54px', fontWeight: 700, color: '#F0EAFF', lineHeight: 1.05, display: 'flex', flexDirection: 'column' }}>
                {name}
              </div>
              {crew?.city && (
                <div style={{ fontSize: '20px', color: '#A99ECC', marginTop: '10px', display: 'flex' }}>
                  📍 {crew.city}
                </div>
              )}
            </div>
          </div>

          {description && (
            <div style={{ fontSize: '22px', color: '#F0EAFF', lineHeight: 1.4, marginBottom: '36px', display: 'flex', flexDirection: 'column', maxWidth: '950px' }}>
              {description}
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto' }}>
            <div style={{ display: 'flex', gap: '14px' }}>
              <div style={{ padding: '12px 20px', borderRadius: '12px', background: 'rgba(155,127,255,0.10)', border: '1px solid rgba(155,127,255,0.30)', display: 'flex', flexDirection: 'column' }}>
                <div style={{ fontSize: '12px', color: '#A99ECC', letterSpacing: '1px', display: 'flex' }}>MEMBERS</div>
                <div style={{ fontSize: '26px', fontWeight: 700, color: '#9B7FFF', display: 'flex' }}>{memberCount || 0}</div>
              </div>
            </div>
            <div style={{ padding: '14px 28px', borderRadius: '14px', background: 'linear-gradient(135deg, #D4AF37 0%, #B8960C 100%)', fontSize: '18px', fontWeight: 700, color: '#09090F', display: 'flex' }}>
              Join on bestiehere.com →
            </div>
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
