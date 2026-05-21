import { ImageResponse } from 'next/og'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'edge'
export const alt = 'Bestie Event'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function OGImage({ params }: { params: { id: string } }) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const { data: event } = await supabase
    .from('crew_events')
    .select('title, description, datetime, location, crew_id')
    .eq('id', params.id)
    .single()

  const { data: crew } = event?.crew_id
    ? await supabase.from('crews').select('name, avatar_url').eq('id', event.crew_id).single()
    : { data: null as any }

  const title = event?.title || 'Event'
  const d = event?.datetime ? new Date(event.datetime) : null
  const when = d ? d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) : ''
  const atTime = d ? d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : ''

  return new ImageResponse(
    (
      <div style={{ width: '1200px', height: '630px', display: 'flex', flexDirection: 'column', background: '#09090F', position: 'relative', overflow: 'hidden', fontFamily: 'sans-serif', padding: '64px 72px' }}>
        <div style={{ position: 'absolute', top: '-100px', left: '40%', width: '700px', height: '600px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(212,175,55,0.16) 0%, transparent 65%)', display: 'flex' }} />
        <div style={{ position: 'absolute', bottom: '-150px', right: '-100px', width: '500px', height: '500px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(52,211,153,0.10) 0%, transparent 70%)', display: 'flex' }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '36px' }}>
          <div style={{ fontSize: '15px', fontWeight: 700, color: '#D4AF37', letterSpacing: '3px', display: 'flex' }}>BESTIE</div>
          <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#A99ECC', display: 'flex' }} />
          <div style={{ fontSize: '14px', color: '#A99ECC', letterSpacing: '1.5px', display: 'flex' }}>CREW EVENT</div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
          {crew && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 16px', borderRadius: '999px', background: 'rgba(155,127,255,0.12)', border: '1px solid rgba(155,127,255,0.35)', alignSelf: 'flex-start', marginBottom: '22px' }}>
              {crew.avatar_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={crew.avatar_url} alt="" width={28} height={28} style={{ width: '28px', height: '28px', borderRadius: '50%', objectFit: 'cover' }} />
              )}
              <div style={{ fontSize: '16px', fontWeight: 600, color: '#9B7FFF', display: 'flex' }}>{crew.name}</div>
            </div>
          )}

          <div style={{ fontSize: '62px', fontWeight: 700, color: '#F0EAFF', lineHeight: 1.05, marginBottom: '32px', display: 'flex', flexDirection: 'column', maxWidth: '1000px' }}>
            {title}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {when && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '24px', color: '#F0EAFF' }}>
                <div style={{ fontSize: '24px', display: 'flex' }}>📅</div>
                <div style={{ display: 'flex' }}>{when}{atTime ? ` · ${atTime}` : ''}</div>
              </div>
            )}
            {event?.location && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '24px', color: '#F0EAFF' }}>
                <div style={{ fontSize: '24px', display: 'flex' }}>📍</div>
                <div style={{ display: 'flex' }}>{event.location}</div>
              </div>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
          <div style={{ padding: '14px 28px', borderRadius: '14px', background: 'linear-gradient(135deg, #D4AF37 0%, #B8960C 100%)', fontSize: '18px', fontWeight: 700, color: '#09090F', display: 'flex' }}>
            RSVP on bestiehere.com →
          </div>
        </div>
      </div>
    ),
    { ...size }
  )
}
