// @ts-nocheck
import { ImageResponse } from 'next/og'
import { TYPES, ELEMENTS } from '@/lib/socionics'

export const runtime = 'edge'

// 9:16 story-format share card for a Bestie Type result.
// GET /api/type-card/INLR → 1080×1920 PNG, ready for Instagram/TikTok stories.

const W = 1080
const H = 1920
const BG = '#0B0A18'
const GOLD = '#D4AF37'
const TXT = '#F0EAFF'
const MUT = '#A99ECC'

// Try to load DM Serif Display (TTF) from Google Fonts. Any failure — network,
// format, parsing — returns null and the card falls back to default fonts.
// A font hiccup must NEVER break the share card.
async function loadSerif(): Promise<ArrayBuffer | null> {
  try {
    // An old-browser UA makes Google Fonts serve TTF (satori can't read woff2).
    const css = await fetch(
      'https://fonts.googleapis.com/css2?family=DM+Serif+Display&display=swap',
      { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64; rv:27.0) Gecko/20100101 Firefox/27.0' } }
    ).then(r => (r.ok ? r.text() : ''))
    const m = css.match(/src:\s*url\((https:\/\/[^)]+\.ttf)\)/)
    if (!m) return null
    const res = await fetch(m[1])
    if (!res.ok) return null
    const buf = await res.arrayBuffer()
    // Sanity-check the signature: TrueType (0x00010000), OTTO, or 'true'.
    const b = new Uint8Array(buf.slice(0, 4))
    const sig = ((b[0] << 24) | (b[1] << 16) | (b[2] << 8) | b[3]) >>> 0
    if (sig !== 0x00010000 && sig !== 0x4f54544f && sig !== 0x74727565) return null
    return buf
  } catch {
    return null
  }
}

function Card({ typeKey, serifFamily }: { typeKey: string; serifFamily: string }) {
  const t = TYPES[typeKey]
  const famColor = ELEMENTS[t.fam].color
  const colColor = ELEMENTS[t.col].color
  const monogram = t.name[0]
  // One-line archetype: the first sentence of the type intro.
  const tagline = t.intro.split('. ')[0].replace(/\.$/, '') + '.'

  return (
    <div style={{ width: `${W}px`, height: `${H}px`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between', background: BG, position: 'relative', overflow: 'hidden', padding: '110px 80px 120px', fontFamily: serifFamily }}>

      {/* Family-color glow behind the crest */}
      <div style={{ position: 'absolute', top: '120px', left: '50%', transform: 'translateX(-50%)', width: '1400px', height: '1400px', borderRadius: '50%', background: `radial-gradient(circle, ${famColor}40 0%, ${famColor}14 38%, transparent 65%)`, display: 'flex' }} />
      {/* Soft counter-glow at the bottom in the collective color */}
      <div style={{ position: 'absolute', bottom: '-320px', left: '50%', transform: 'translateX(-50%)', width: '1000px', height: '800px', borderRadius: '50%', background: `radial-gradient(circle, ${colColor}1e 0%, transparent 65%)`, display: 'flex' }} />

      {/* Wordmark */}
      <div style={{ fontSize: '44px', fontWeight: 700, color: GOLD, letterSpacing: '14px', display: 'flex', fontFamily: 'sans-serif' }}>
        BESTIE
      </div>

      {/* Crest + name + archetype */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        {/* Gold ring */}
        <div style={{ width: '460px', height: '460px', borderRadius: '50%', padding: '20px', border: '3px solid rgba(212,175,55,0.75)', boxShadow: `0 0 160px ${famColor}55`, display: 'flex' }}>
          {/* Gradient disc */}
          <div style={{ width: '420px', height: '420px', borderRadius: '50%', background: `radial-gradient(circle at 32% 28%, ${colColor} 0%, ${famColor} 62%, ${BG} 135%)`, boxShadow: 'inset 0 -44px 110px rgba(0,0,0,0.4), inset 0 14px 55px rgba(255,255,255,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ fontSize: '190px', color: 'rgba(255,255,255,0.95)', display: 'flex', lineHeight: 1 }}>{monogram}</div>
          </div>
        </div>

        <div style={{ fontSize: '16px', fontWeight: 700, color: GOLD, letterSpacing: '8px', marginTop: '70px', display: 'flex', fontFamily: 'sans-serif' }}>
          MY BESTIE TYPE
        </div>

        <div style={{ fontSize: '108px', color: TXT, marginTop: '18px', lineHeight: 1.05, display: 'flex', textAlign: 'center' }}>
          {t.name}
        </div>

        <div style={{ fontSize: '38px', color: MUT, marginTop: '34px', lineHeight: 1.45, maxWidth: '840px', textAlign: 'center', display: 'flex', fontFamily: 'sans-serif' }}>
          {tagline}
        </div>

        {/* Family / collective pills */}
        <div style={{ display: 'flex', gap: '16px', marginTop: '44px' }}>
          <div style={{ padding: '12px 30px', borderRadius: '999px', background: famColor, color: '#0a0a14', fontSize: '26px', fontWeight: 700, display: 'flex', fontFamily: 'sans-serif' }}>
            {ELEMENTS[t.fam].name} family
          </div>
          <div style={{ padding: '12px 30px', borderRadius: '999px', background: colColor, color: '#0a0a14', fontSize: '26px', fontWeight: 700, display: 'flex', fontFamily: 'sans-serif' }}>
            {ELEMENTS[t.col].name} collective
          </div>
        </div>
      </div>

      {/* Footer CTA */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{ fontSize: '54px', color: TXT, display: 'flex', textAlign: 'center' }}>
          What&#8217;s your friendship type?
        </div>
        <div style={{ fontSize: '34px', fontWeight: 700, color: GOLD, marginTop: '20px', display: 'flex', fontFamily: 'sans-serif' }}>
          bestiehere.com/bestie-type
        </div>
      </div>
    </div>
  )
}

export async function GET(_req: Request, { params }: { params: { type: string } }) {
  const key = (params?.type || '').toUpperCase()
  if (!TYPES[key]) {
    return new Response('Unknown Bestie Type', { status: 404 })
  }

  const serif = await loadSerif()
  const options = {
    width: W,
    height: H,
    headers: {
      'Cache-Control': 'public, max-age=86400, s-maxage=604800, stale-while-revalidate=604800',
    },
  }

  if (serif) {
    try {
      return new ImageResponse(
        <Card typeKey={key} serifFamily="DM Serif Display" />,
        { ...options, fonts: [{ name: 'DM Serif Display', data: serif, style: 'normal', weight: 400 }] }
      )
    } catch {
      // fall through to the no-custom-font card
    }
  }
  return new ImageResponse(<Card typeKey={key} serifFamily="serif" />, options)
}
