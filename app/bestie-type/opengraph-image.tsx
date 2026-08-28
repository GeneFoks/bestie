// @ts-nocheck
import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'Eterotype — free 16-type personality test'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function OGImage() {
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
        <div style={{ position: 'absolute', top: '-140px', right: '-120px', width: '640px', height: '640px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(212,175,55,0.20) 0%, transparent 65%)', display: 'flex' }} />
        <div style={{ position: 'absolute', bottom: '-140px', left: '-100px', width: '540px', height: '540px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(155,127,255,0.16) 0%, transparent 65%)', display: 'flex' }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '48px' }}>
          <div style={{ fontSize: '15px', fontWeight: 700, color: '#D4AF37', letterSpacing: '3px', display: 'flex' }}>BESTIE</div>
          <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#A99ECC', display: 'flex' }} />
          <div style={{ fontSize: '14px', color: '#A99ECC', letterSpacing: '1.5px', display: 'flex' }}>PERSONALITY TEST</div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'center' }}>
          <div style={{ fontSize: '30px', display: 'flex', marginBottom: '18px' }}>🧭</div>
          <div style={{ fontFamily: fontData ? 'DM Serif Display' : 'sans-serif', fontSize: '72px', fontWeight: 700, color: '#F0EAFF', lineHeight: 1.05, marginBottom: '22px', display: 'flex', maxWidth: '980px' }}>
            What&apos;s your eterotype?
          </div>
          <div style={{ fontSize: '26px', color: '#A99ECC', lineHeight: 1.5, display: 'flex', maxWidth: '860px' }}>
            28 questions · 16 personality types · see who you naturally click with
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', gap: '10px' }}>
            {[
              ['Air', '#C7A34F'], ['Fire', '#D06A55'], ['Water', '#5C7E9C'], ['Earth', '#3F9985'],
            ].map(([name, color]) => (
              <div key={name as string} style={{ padding: '10px 22px', borderRadius: '999px', background: color as string, color: '#0a0a14', fontSize: '17px', fontWeight: 700, display: 'flex' }}>
                {name}
              </div>
            ))}
          </div>
          <div style={{ padding: '14px 28px', borderRadius: '14px', background: 'linear-gradient(135deg, #D4AF37 0%, #B8960C 100%)', fontSize: '18px', fontWeight: 700, color: '#09090F', display: 'flex' }}>
            Free · 5 min · no signup
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
