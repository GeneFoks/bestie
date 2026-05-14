// @ts-nocheck
'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import ProfileNav from '@/components/ProfileNav'

export default function MapPage() {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<any>(null)
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [myId, setMyId] = useState<string | null>(null)
  const [myCity, setMyCity] = useState<string | null>(null)
  const [total, setTotal] = useState(0)

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setMyId(user.id)
        const { data: me } = await supabase.from('users').select('city').eq('id', user.id).single()
        if (me?.city) setMyCity(me.city)
      }

      const { data } = await supabase
        .from('users')
        .select('id, full_name, username, avatar_url, bestie_score, city, lat, lng, energy_type, confirmed_sessions_count, free_today_at')
        .not('lat', 'is', null)
        .not('lng', 'is', null)
        .limit(200)

      setUsers(data || [])
      setTotal(data?.length || 0)
      setLoading(false)
    }
    init()
  }, [])

  useEffect(() => {
    if (loading || !mapRef.current || users.length === 0) return

    // Load Leaflet CSS
    if (!document.getElementById('leaflet-css')) {
      const link = document.createElement('link')
      link.id = 'leaflet-css'
      link.rel = 'stylesheet'
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
      document.head.appendChild(link)
    }

    // Load Leaflet JS then init map
    if ((window as any).L) {
      initMap((window as any).L)
      return
    }

    const script = document.createElement('script')
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
    script.onload = () => initMap((window as any).L)
    document.head.appendChild(script)

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
      }
    }
  }, [loading, users])

  const initMap = (L: any) => {
    if (mapInstanceRef.current) return

    // Center on first user or world
    const center = users[0] ? [users[0].lat, users[0].lng] : [20, 0]
    const map = L.map(mapRef.current, { zoomControl: true, scrollWheelZoom: true }).setView(center, 4)
    mapInstanceRef.current = map

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '© OpenStreetMap © CARTO',
      maxZoom: 18,
    }).addTo(map)

    const isToday = (ts: string | null) => ts && new Date(ts).toDateString() === new Date().toDateString()

    users.forEach(user => {
      const sessions = user.confirmed_sessions_count || 0
      const frameColor = sessions >= 25 ? '#FFFFFF' : sessions >= 10 ? '#D4AF37' : sessions >= 5 ? '#9B8FFF' : sessions >= 1 ? 'rgba(155,147,192,0.6)' : 'rgba(155,147,192,0.35)'
      const frameGlow = sessions >= 25 ? 'box-shadow:0 0 0 2px rgba(255,255,255,0.9),0 0 16px rgba(255,255,255,0.3);' : sessions >= 10 ? 'box-shadow:0 0 0 2px rgba(212,175,55,0.9);' : ''
      const initials = user.full_name?.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2) || '?'
      const freeNow = isToday(user.free_today_at)
      const dotColor = freeNow ? '#39FF14' : frameColor

      const iconHtml = `
        <div style="position:relative;width:44px;height:44px;">
          <div style="width:40px;height:40px;border-radius:12px;overflow:hidden;background:#1a1a35;border:2px solid ${frameColor};display:flex;align-items:center;justify-content:center;${frameGlow}">
            ${user.avatar_url
              ? `<img src="${user.avatar_url}" style="width:100%;height:100%;object-fit:cover;" />`
              : `<span style="font-size:14px;font-weight:700;color:${frameColor};font-family:sans-serif;">${initials}</span>`
            }
          </div>
          <div style="position:absolute;bottom:-4px;right:-4px;width:14px;height:14px;border-radius:50%;background:${dotColor};border:2px solid #080810;"></div>
        </div>
      `

      const icon = L.divIcon({ html: iconHtml, className: '', iconSize: [44, 44], iconAnchor: [22, 22], popupAnchor: [0, -26] })

      const scoreColor = (user.bestie_score || 0) >= 800 ? '#39FF14' : (user.bestie_score || 0) >= 600 ? '#D4AF37' : '#9B93C0'
      const popup = `
        <div style="background:#0F0F1E;border:1px solid rgba(255,255,255,0.1);border-radius:14px;padding:14px;min-width:170px;font-family:Plus Jakarta Sans,sans-serif;">
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;">
            <div style="width:36px;height:36px;border-radius:10px;overflow:hidden;background:#1a1a35;flex-shrink:0;border:1.5px solid ${frameColor};">
              ${user.avatar_url ? `<img src="${user.avatar_url}" style="width:100%;height:100%;object-fit:cover;" />` : `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-weight:700;color:${frameColor};">${initials}</div>`}
            </div>
            <div>
              <p style="font-size:13px;font-weight:700;color:#E8E0FF;margin:0 0 2px;">${user.full_name}${freeNow ? ' <span style="font-size:10px;color:#39FF14;">🟢 free today</span>' : ''}</p>
              <p style="font-size:11px;color:#9B93C0;margin:0;">@${user.username}</p>
            </div>
          </div>
          ${user.city ? `<p style="font-size:11px;color:#9B93C0;margin:0 0 8px;">📍 ${user.city}</p>` : ''}
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">
            <span style="font-size:11px;color:#9B93C0;">Bestie Score</span>
            <span style="font-size:14px;font-weight:700;color:${scoreColor};">${user.bestie_score || 0}</span>
          </div>
          <a href="/${user.username}" style="display:block;padding:8px;border-radius:8px;background:rgba(212,175,55,0.12);border:1px solid rgba(212,175,55,0.3);color:#D4AF37;font-size:12px;font-weight:600;text-align:center;text-decoration:none;">View profile →</a>
        </div>
      `

      L.marker([user.lat, user.lng], { icon })
        .addTo(map)
        .bindPopup(popup, { className: 'bestie-popup', maxWidth: 220 })
    })

    // Dark popup styles
    const style = document.createElement('style')
    style.textContent = `.bestie-popup .leaflet-popup-content-wrapper { background: transparent; border: none; box-shadow: none; padding: 0; } .bestie-popup .leaflet-popup-tip-container { display: none; } .leaflet-popup-content { margin: 0; }`
    document.head.appendChild(style)
  }

  return (
    <div style={{ minHeight: '100vh', background: '#080810', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
      <nav style={{ position: 'sticky', top: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', background: 'rgba(8,8,16,0.9)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <Link href="/" style={{ fontFamily: 'DM Serif Display, serif', fontSize: '20px', fontWeight: 700, color: '#D4AF37', textDecoration: 'none' }}>BESTIE</Link>
        <ProfileNav />
      </nav>

      {/* Header */}
      <div style={{ padding: '24px 24px 16px', maxWidth: '960px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontFamily: 'DM Serif Display, serif', fontSize: '26px', color: '#E8E0FF', marginBottom: '4px' }}>🗺️ Besties nearby</h1>
          <p style={{ fontSize: '13px', color: '#9B93C0' }}>{total} Bestie{total !== 1 ? 's' : ''} on the map</p>
        </div>
        <Link href="/profile/edit" style={{ fontSize: '13px', fontWeight: 600, padding: '8px 16px', borderRadius: '10px', background: 'rgba(212,175,55,0.1)', border: '1px solid rgba(212,175,55,0.3)', color: '#D4AF37', textDecoration: 'none' }}>
          📍 Add my location
        </Link>
      </div>

      {/* Map */}
      <div style={{ padding: '0 24px 40px', maxWidth: '960px', margin: '0 auto' }}>
        {loading ? (
          <div style={{ height: 'clamp(300px, 60vh, 540px)', borderRadius: '20px', background: '#0F0F1E', border: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ width: '36px', height: '36px', border: '3px solid rgba(212,175,55,0.2)', borderTop: '3px solid #D4AF37', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 12px' }} />
              <p style={{ fontSize: '14px', color: '#9B93C0' }}>Loading map...</p>
            </div>
            <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
          </div>
        ) : users.length === 0 ? (
          <div style={{ height: '400px', borderRadius: '20px', background: '#0F0F1E', border: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '12px' }}>
            <p style={{ fontSize: '48px' }}>🌍</p>
            <p style={{ fontSize: '16px', color: '#E8E0FF' }}>No one on the map yet</p>
            <p style={{ fontSize: '14px', color: '#9B93C0', marginBottom: '8px' }}>Be the first to add your location</p>
            <Link href="/profile/edit" style={{ padding: '10px 24px', borderRadius: '12px', fontSize: '14px', fontWeight: 600, background: 'linear-gradient(135deg, #D4AF37 0%, #B8960C 100%)', color: '#080810', textDecoration: 'none' }}>
              Add my location →
            </Link>
          </div>
        ) : (
          <div ref={mapRef} style={{ height: 'clamp(300px, 60vh, 540px)', borderRadius: '20px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.08)' }} />
        )}
      </div>
    </div>
  )
}
