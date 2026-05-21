// Server component — renders the event photo album.
import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
import { Camera, ImageIcon } from 'lucide-react'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default async function EventPhotoGallery({ eventId }: { eventId: string }) {
  const { data: photos } = await supabase
    .from('event_photos')
    .select('id, photo_url, caption, created_at, user:users(id, username, full_name, avatar_url)')
    .eq('event_id', eventId)
    .order('created_at', { ascending: false })
    .limit(50)

  // Also pull check-in selfies from event_checkins (when no event_photo was added separately)
  const { data: checkins } = await supabase
    .from('event_checkins')
    .select('id, photo_url, checked_in_at, user:users(id, username, full_name, avatar_url)')
    .eq('event_id', eventId)
    .not('photo_url', 'is', null)

  // Merge & dedupe by URL
  const seen = new Set<string>()
  const merged: { id: string; photo_url: string; caption?: string | null; created_at: string; user: any }[] = []
  ;(photos || []).forEach(p => {
    if (!p.photo_url || seen.has(p.photo_url)) return
    seen.add(p.photo_url)
    merged.push(p as any)
  })
  ;(checkins || []).forEach(c => {
    if (!c.photo_url || seen.has(c.photo_url)) return
    seen.add(c.photo_url)
    merged.push({ id: c.id, photo_url: c.photo_url, caption: null, created_at: c.checked_in_at, user: c.user })
  })

  if (merged.length === 0) return null

  return (
    <div style={{ marginTop: '28px' }}>
      <h3 style={{ fontFamily: 'DM Serif Display, serif', fontSize: '20px', color: '#F0EAFF', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <Camera size={17} color="#D4AF37" strokeWidth={1.8} />
        Photo album · {merged.length}
      </h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '8px' }}>
        {merged.map(p => (
          <a
            key={p.id}
            href={p.photo_url}
            target="_blank"
            rel="noopener noreferrer"
            style={{ position: 'relative', display: 'block', aspectRatio: '1 / 1', borderRadius: '14px', overflow: 'hidden', background: '#111120', border: '1px solid rgba(255,255,255,0.10)', textDecoration: 'none' }}
          >
            <img
              src={p.photo_url}
              alt={p.caption || `Photo by ${p.user?.full_name || 'attendee'}`}
              loading="lazy"
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
            {p.user && (
              <div style={{ position: 'absolute', bottom: '6px', left: '6px', right: '6px', display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 8px', background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(6px)', borderRadius: '999px' }}>
                <div style={{ width: '16px', height: '16px', borderRadius: '50%', overflow: 'hidden', background: '#1A1A2E', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {p.user.avatar_url
                    ? <img src={p.user.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <span style={{ fontSize: '8px', fontWeight: 700, color: '#D4AF37' }}>{p.user.full_name?.[0]}</span>
                  }
                </div>
                <span style={{ fontSize: '10px', fontWeight: 600, color: '#F0EAFF', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{p.user.full_name?.split(' ')[0]}</span>
              </div>
            )}
          </a>
        ))}
      </div>
    </div>
  )
}
