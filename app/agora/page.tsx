// @ts-nocheck
'use client'

// Living map of Agora. Anyone can view; admins (users.is_admin) get an edit
// toolbar to place, move, label and delete objects right on the map.
// Chickens (animated kind) wander inside their zone. Coordinates live in the
// SVG space below (viewBox 0 0 1000 620); x,y are object centers.

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import ProfileNav from '@/components/ProfileNav'
import { colors } from '@/lib/tokens'

const VIEW_W = 1000
const VIEW_H = 620

const TOOLS = [
  { id: 'select',   label: 'Select / move' },
  { id: 'tree',     label: 'Tree' },
  { id: 'chicken',  label: 'Chicken' },
  { id: 'building', label: 'Building' },
  { id: 'plot',     label: 'Garden bed' },
  { id: 'pond',     label: 'Pond' },
  { id: 'zone',     label: 'Zone' },
]

// Default size for area kinds when freshly placed.
const AREA_DEFAULTS = {
  zone:     { w: 320, h: 200, label: 'New zone' },
  pond:     { w: 200, h: 120, label: 'Pond' },
  building: { w: 170, h: 110, label: 'Building' },
  plot:     { w: 260, h: 110, label: 'Garden bed' },
}

export default function AgoraPage() {
  const [objects, setObjects] = useState([])
  const [isAdmin, setIsAdmin] = useState(false)
  const [tool, setTool] = useState('select')
  const [selectedId, setSelectedId] = useState(null)
  const [loading, setLoading] = useState(true)

  const svgRef = useRef(null)
  const objectsRef = useRef([])
  const posRef = useRef({})          // live chicken positions: id -> {x,y,a,t}
  const dragRef = useRef(null)       // { id, kind } while dragging

  objectsRef.current = objects
  const selected = objects.find(o => o.id === selectedId) || null

  // ── Load + realtime ────────────────────────────────────────────────
  useEffect(() => {
    let channel
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: me } = await supabase.from('users').select('is_admin').eq('id', user.id).single()
        setIsAdmin(!!me?.is_admin)
      }
      const { data } = await supabase.from('agora_objects').select('*')
      setObjects(data || [])
      setLoading(false)

      channel = supabase
        .channel('agora_objects_live')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'agora_objects' }, async () => {
          const { data: fresh } = await supabase.from('agora_objects').select('*')
          setObjects(fresh || [])
        })
        .subscribe()
    }
    load()
    return () => { if (channel) supabase.removeChannel(channel) }
  }, [])

  // ── Chicken wander loop ────────────────────────────────────────────
  useEffect(() => {
    let raf
    const loop = () => {
      const objs = objectsRef.current
      const zones = objs.filter(o => o.kind === 'zone')
      objs.filter(o => o.kind === 'chicken').forEach(c => {
        if (dragRef.current && dragRef.current.id === c.id) return
        let p = posRef.current[c.id]
        if (!p) { p = { x: c.x, y: c.y, a: Math.random() * 6.28, t: 0 }; posRef.current[c.id] = p }
        p.t -= 1
        if (p.t <= 0) { p.a += (Math.random() - 0.5) * 1.2; p.t = 30 + Math.random() * 50 }
        p.x += Math.cos(p.a) * 0.6
        p.y += Math.sin(p.a) * 0.6
        const z = zones.find(z => z.zone && z.zone === c.zone)
        let bx0, by0, bx1, by1
        if (z) { bx0 = z.x - z.w / 2 + 20; bx1 = z.x + z.w / 2 - 20; by0 = z.y - z.h / 2 + 28; by1 = z.y + z.h / 2 - 20 }
        else { bx0 = c.x - 70; bx1 = c.x + 70; by0 = c.y - 70; by1 = c.y + 70 }
        if (p.x < bx0) { p.x = bx0; p.a = Math.PI - p.a }
        if (p.x > bx1) { p.x = bx1; p.a = Math.PI - p.a }
        if (p.y < by0) { p.y = by0; p.a = -p.a }
        if (p.y > by1) { p.y = by1; p.a = -p.a }
        const el = document.getElementById('agora-' + c.id)
        if (el) {
          const flip = Math.cos(p.a) < 0 ? -1 : 1
          el.setAttribute('transform', `translate(${p.x.toFixed(1)} ${p.y.toFixed(1)}) scale(${flip},1)`)
        }
      })
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [])

  // ── Helpers ────────────────────────────────────────────────────────
  const toSvg = (clientX, clientY) => {
    const svg = svgRef.current
    const pt = svg.createSVGPoint()
    pt.x = clientX; pt.y = clientY
    const p = pt.matrixTransform(svg.getScreenCTM().inverse())
    return { x: Math.round(p.x), y: Math.round(p.y) }
  }

  const addObject = async (kind, x, y) => {
    const area = AREA_DEFAULTS[kind]
    const row = {
      kind, x, y,
      w: area ? area.w : null,
      h: area ? area.h : null,
      label: area ? area.label : (kind === 'tree' ? 'New tree' : kind === 'chicken' ? 'New hen' : null),
      animated: kind === 'chicken',
      zone: kind === 'chicken' ? (objectsRef.current.find(o => o.kind === 'zone')?.zone || null) : null,
    }
    const { data, error } = await supabase.from('agora_objects').insert(row).select().single()
    if (error) { alert('Could not add: ' + error.message); return }
    setObjects(prev => [...prev, data])
    setSelectedId(data.id)
    setTool('select')
  }

  const patchObject = async (id, patch) => {
    setObjects(prev => prev.map(o => o.id === id ? { ...o, ...patch } : o))
    await supabase.from('agora_objects').update(patch).eq('id', id)
  }

  const removeObject = async (id) => {
    if (!window.confirm('Delete this object?')) return
    setObjects(prev => prev.filter(o => o.id !== id))
    setSelectedId(null)
    await supabase.from('agora_objects').delete().eq('id', id)
  }

  // ── Pointer interaction ────────────────────────────────────────────
  const onSvgClick = (e) => {
    if (!isAdmin || tool === 'select') return
    const { x, y } = toSvg(e.clientX, e.clientY)
    addObject(tool, x, y)
  }

  const onObjPointerDown = (e, o) => {
    e.stopPropagation()
    setSelectedId(o.id)
    if (isAdmin && tool === 'select') {
      dragRef.current = { id: o.id, kind: o.kind }
      svgRef.current.setPointerCapture?.(e.pointerId)
    }
  }

  const onSvgPointerMove = (e) => {
    if (!dragRef.current) return
    const { x, y } = toSvg(e.clientX, e.clientY)
    const id = dragRef.current.id
    if (dragRef.current.kind === 'chicken') {
      const p = posRef.current[id] || { a: 0, t: 0 }
      p.x = x; p.y = y; posRef.current[id] = p
      const el = document.getElementById('agora-' + id)
      if (el) el.setAttribute('transform', `translate(${x} ${y})`)
    } else {
      setObjects(prev => prev.map(o => o.id === id ? { ...o, x, y } : o))
    }
  }

  const onSvgPointerUp = async () => {
    const d = dragRef.current
    if (!d) return
    dragRef.current = null
    let nx, ny
    if (d.kind === 'chicken') { const p = posRef.current[d.id]; nx = Math.round(p.x); ny = Math.round(p.y) }
    else { const o = objectsRef.current.find(o => o.id === d.id); nx = Math.round(o.x); ny = Math.round(o.y) }
    await supabase.from('agora_objects').update({ x: nx, y: ny }).eq('id', d.id)
  }

  // ── Render one object ──────────────────────────────────────────────
  const renderObject = (o) => {
    const isSel = o.id === selectedId
    const sel = isSel ? { filter: 'drop-shadow(0 0 0 #D4AF37)' } : undefined
    const common = {
      key: o.id,
      id: 'agora-' + o.id,
      onPointerDown: (e) => onObjPointerDown(e, o),
      style: { cursor: isAdmin ? 'grab' : 'pointer' },
    }

    if (o.kind === 'zone') {
      return (
        <g {...common}>
          <rect x={o.x - o.w / 2} y={o.y - o.h / 2} width={o.w} height={o.h} rx="14"
            fill="rgba(212,175,55,0.05)" stroke={isSel ? colors.gold : 'rgba(212,175,55,0.5)'} strokeWidth="2" strokeDasharray="10 8" />
          <text x={o.x} y={o.y - o.h / 2 + 22} textAnchor="middle" fontSize="16" fill={colors.gold} fontFamily="Plus Jakarta Sans">{o.label}</text>
        </g>
      )
    }
    if (o.kind === 'pond') {
      return (
        <g {...common}>
          <ellipse cx={o.x} cy={o.y} rx={o.w / 2} ry={o.h / 2} fill="#1E3A4F" stroke={isSel ? colors.gold : '#2E5A78'} strokeWidth="2" />
          <text x={o.x} y={o.y + 5} textAnchor="middle" fontSize="14" fill="#7FB7D8">{o.label}</text>
        </g>
      )
    }
    if (o.kind === 'building') {
      return (
        <g {...common}>
          <rect x={o.x - o.w / 2} y={o.y - o.h / 2 + 14} width={o.w} height={o.h - 14} rx="6" fill="#2A2535" stroke={isSel ? colors.gold : '#3A3346'} strokeWidth="2" />
          <polygon points={`${o.x - o.w / 2 - 8},${o.y - o.h / 2 + 16} ${o.x},${o.y - o.h / 2 - 14} ${o.x + o.w / 2 + 8},${o.y - o.h / 2 + 16}`} fill="#4A4356" />
          <text x={o.x} y={o.y + o.h / 2 - 10} textAnchor="middle" fontSize="14" fill={colors.textMuted}>{o.label}</text>
        </g>
      )
    }
    if (o.kind === 'plot') {
      const rows = []
      const n = Math.max(2, Math.floor(o.h / 26))
      for (let i = 0; i < n; i++) {
        const yy = o.y - o.h / 2 + 14 + i * ((o.h - 20) / n)
        rows.push(<line key={i} x1={o.x - o.w / 2 + 12} y1={yy} x2={o.x + o.w / 2 - 12} y2={yy} stroke="#4E7A35" strokeWidth="4" strokeLinecap="round" />)
      }
      return (
        <g {...common}>
          <rect x={o.x - o.w / 2} y={o.y - o.h / 2} width={o.w} height={o.h} rx="8" fill="#241B12" stroke={isSel ? colors.gold : '#3A2C1C'} strokeWidth="2" />
          {rows}
          <text x={o.x} y={o.y - o.h / 2 - 6} textAnchor="middle" fontSize="13" fill={colors.textMuted}>{o.label}</text>
        </g>
      )
    }
    if (o.kind === 'tree') {
      return (
        <g {...common} transform={`translate(${o.x} ${o.y})`}>
          {isSel && <circle cx="0" cy="-8" r="32" fill="none" stroke={colors.gold} strokeWidth="2" strokeDasharray="4 4" />}
          <rect x="-5" y="6" width="10" height="22" rx="3" fill="#5A3D2B" />
          <circle cx="0" cy="-10" r="22" fill="#2E8B57" />
          <circle cx="-13" cy="0" r="15" fill="#3FAE6B" />
          <circle cx="13" cy="0" r="15" fill="#3FAE6B" />
        </g>
      )
    }
    if (o.kind === 'chicken') {
      return (
        <g {...common} transform={`translate(${o.x} ${o.y})`}>
          <ellipse rx="16" ry="13" fill="#EDE6D0" stroke="#B4B2A9" strokeWidth="1.5" />
          <circle cx="12" cy="-9" r="7" fill="#EDE6D0" stroke="#B4B2A9" strokeWidth="1.5" />
          <circle cx="12" cy="-16" r="3.5" fill="#E24B4A" />
          <polygon points="19,-9 26,-7 19,-5" fill="#E0A53A" />
          <circle cx="14" cy="-10" r="1.4" fill="#2C2C2A" />
        </g>
      )
    }
    return null
  }

  // Draw order: areas first, then trees, then chickens on top.
  const order = { zone: 0, pond: 0, building: 0, plot: 0, tree: 1, chicken: 2 }
  const sorted = [...objects].sort((a, b) => (order[a.kind] ?? 1) - (order[b.kind] ?? 1))

  const T = colors

  return (
    <div style={{ minHeight: '100vh', background: T.bg, fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
      <nav style={{ position: 'sticky', top: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', background: 'rgba(8,8,16,0.9)', backdropFilter: 'blur(20px)', borderBottom: `1px solid ${T.border}` }}>
        <Link href="/" style={{ fontFamily: 'DM Serif Display, serif', fontSize: '20px', fontWeight: 700, color: T.gold, textDecoration: 'none' }}>BESTIE</Link>
        <ProfileNav />
      </nav>

      <div style={{ maxWidth: '1040px', margin: '0 auto', padding: '32px 20px 80px' }}>
        <div style={{ marginBottom: '18px' }}>
          <h1 style={{ fontFamily: 'DM Serif Display, serif', fontSize: '32px', color: T.textPrimary, margin: 0 }}>Agora — living map</h1>
          <p style={{ fontSize: '14px', color: T.textMuted, marginTop: '4px' }}>
            Tap a tree to see whose it is, or watch the hens roam. The map grows as Agora is built.
          </p>
        </div>

        {isAdmin && (
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '14px', padding: '10px', background: T.surface1, border: `1px solid ${T.border}`, borderRadius: '14px' }}>
            {TOOLS.map(t => (
              <button key={t.id} onClick={() => setTool(t.id)} style={{
                padding: '7px 14px', borderRadius: '10px', fontSize: '13px', fontWeight: 600, cursor: 'pointer',
                background: tool === t.id ? 'rgba(212,175,55,0.15)' : '#1A1A2E',
                border: tool === t.id ? `1px solid ${T.gold}66` : `1px solid ${T.border}`,
                color: tool === t.id ? T.gold : T.textMuted,
              }}>{t.id === 'select' ? t.label : `+ ${t.label}`}</button>
            ))}
            <span style={{ alignSelf: 'center', fontSize: '12px', color: T.textDim, marginLeft: '4px' }}>
              {tool === 'select' ? 'Drag to move · tap to edit' : 'Tap the map to place'}
            </span>
          </div>
        )}

        <svg
          ref={svgRef}
          viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
          width="100%"
          onClick={onSvgClick}
          onPointerMove={onSvgPointerMove}
          onPointerUp={onSvgPointerUp}
          style={{ display: 'block', borderRadius: '18px', border: `1px solid ${T.border}`, touchAction: 'none', background: '#0E1712' }}
        >
          <rect x="0" y="0" width={VIEW_W} height={VIEW_H} fill="#0E1712" />
          <path d={`M${VIEW_W * 0.45} 0 Q${VIEW_W * 0.55} ${VIEW_H * 0.5} ${VIEW_W * 0.35} ${VIEW_H}`} stroke="#1C2A20" strokeWidth="36" fill="none" />
          {sorted.map(renderObject)}
        </svg>

        {/* Info / edit panel */}
        <div style={{ marginTop: '14px', minHeight: '48px' }}>
          {!selected && (
            <p style={{ fontSize: '13px', color: T.textMuted }}>
              {loading ? 'Loading the map…' : 'Tap any object on the map.'}
            </p>
          )}

          {selected && !isAdmin && (
            <div style={{ padding: '14px 16px', background: T.surface1, border: `1px solid ${T.border}`, borderRadius: '14px' }}>
              <p style={{ fontSize: '15px', color: T.textPrimary, fontWeight: 600, margin: 0 }}>
                {selected.kind === 'tree' ? '🌳 ' : selected.kind === 'chicken' ? '🐔 ' : ''}{selected.label || selected.kind}
              </p>
              {selected.owner_name && <p style={{ fontSize: '13px', color: T.gold, margin: '4px 0 0' }}>Planted by {selected.owner_name}</p>}
              {selected.note && <p style={{ fontSize: '13px', color: T.textMuted, margin: '4px 0 0' }}>{selected.note}</p>}
            </div>
          )}

          {selected && isAdmin && (
            <div style={{ padding: '14px 16px', background: T.surface1, border: `1px solid ${T.border}`, borderRadius: '14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', color: T.textDim, textTransform: 'uppercase', letterSpacing: '1px' }}>{selected.kind}</span>
                <button onClick={() => removeObject(selected.id)} style={{ fontSize: '12px', color: T.danger, background: 'none', border: 'none', cursor: 'pointer' }}>Delete</button>
              </div>
              <input value={selected.label || ''} onChange={e => patchObject(selected.id, { label: e.target.value })} placeholder="Label (e.g. Oak)"
                style={inp(T)} />
              {(selected.kind === 'tree' || selected.kind === 'chicken') && (
                <input value={selected.owner_name || ''} onChange={e => patchObject(selected.id, { owner_name: e.target.value })} placeholder="Owner / donor (e.g. Maria)"
                  style={inp(T)} />
              )}
              <input value={selected.note || ''} onChange={e => patchObject(selected.id, { note: e.target.value })} placeholder="Note (optional)"
                style={inp(T)} />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function inp(T) {
  return {
    width: '100%', padding: '10px 12px', borderRadius: '10px', fontSize: '14px', outline: 'none',
    background: '#161628', border: `1px solid ${T.border}`, color: T.textPrimary, boxSizing: 'border-box',
  }
}
