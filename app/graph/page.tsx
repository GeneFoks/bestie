// @ts-nocheck
'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import ProfileNav from '@/components/ProfileNav'
import { PageLoader } from '@/components/Loading'
import { Network } from 'lucide-react'
import { EmptyState } from '@/components/EmptyState'

export default function GraphPage() {
  const svgRef = useRef<SVGSVGElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const graphDataRef = useRef<{ nodes: any[]; links: any[] } | null>(null)
  const [loading, setLoading] = useState(true)
  const [nodeCount, setNodeCount] = useState(0)
  const [edgeCount, setEdgeCount] = useState(0)
  const [empty, setEmpty] = useState(false)
  const [hovered, setHovered] = useState<any>(null)
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 })

  useEffect(() => {
    const init = async () => {
      const { data: { session: authSession } } = await supabase.auth.getSession()
      const currentUserId = authSession?.user?.id || null

      // Fetch confirmed IRL bookings
      const { data: bookings } = await supabase
        .from('bookings')
        .select('seeker_id, provider_id')
        .eq('confirmed_by_seeker', true)
        .eq('confirmed_by_provider', true)

      // Fetch contact edges (matched contacts for current user)
      let contactLinks: any[] = []
      if (currentUserId) {
        const { data: contacts } = await supabase
          .from('user_contacts')
          .select('matched_user_id')
          .eq('owner_id', currentUserId)
          .not('matched_user_id', 'is', null)
        if (contacts?.length) {
          contactLinks = contacts.map((c: any) => ({
            source: currentUserId,
            target: c.matched_user_id,
            weight: 0,
            type: 'contact',
          }))
        }
      }

      // Fetch mutual-knock edges (RLS only returns the current user's knocks).
      // These connect two people who "knocked" each other even with no session.
      let knockLinks: any[] = []
      if (currentUserId) {
        const { data: knocks } = await supabase
          .from('knocks')
          .select('sender_id, receiver_id')
          .eq('is_mutual', true)
          .or(`sender_id.eq.${currentUserId},receiver_id.eq.${currentUserId}`)
        const seen = new Set<string>()
        ;(knocks || []).forEach((k: any) => {
          const other = k.sender_id === currentUserId ? k.receiver_id : k.sender_id
          if (!other || other === currentUserId || seen.has(other)) return
          seen.add(other)
          knockLinks.push({ source: currentUserId, target: other, weight: 0, type: 'knock' })
        })
      }

      // Plus members who opted in to appear on the graph (even with 0 sessions)
      const { data: optIn } = await supabase
        .from('users')
        .select('id')
        .eq('show_on_graph', true)
        .limit(300)
      const optInIds = (optIn || []).map((u: any) => u.id)

      // Everyone who hasn't opted out of the graph — shown as free-floating
      // nodes drifting in space, with no edges. Makes the map feel alive even
      // for people you're not connected to yet.
      const { data: floatUsers } = await supabase
        .from('users')
        .select('id, full_name, username, avatar_url, bestie_score, city')
        .eq('hide_from_graph', false)
        .order('bestie_score', { ascending: false })
        .limit(140)

      if ((!bookings || bookings.length === 0) && contactLinks.length === 0 && knockLinks.length === 0 && optInIds.length === 0 && (!floatUsers || floatUsers.length === 0)) {
        setEmpty(true); setLoading(false); return
      }

      // Build edge map: normalised pair → weight
      const edgeMap = new Map<string, number>()
      const userIdSet = new Set<string>()

      // Seed standalone opt-in members so they render even with no edges
      optInIds.forEach(id => userIdSet.add(id))

      ;(bookings || []).forEach(b => {
        const [a, bb] = b.seeker_id < b.provider_id
          ? [b.seeker_id, b.provider_id]
          : [b.provider_id, b.seeker_id]
        const key = `${a}::${bb}`
        edgeMap.set(key, (edgeMap.get(key) || 0) + 1)
        userIdSet.add(b.seeker_id)
        userIdSet.add(b.provider_id)
      })

      // Add contact + knock node ids
      if (currentUserId) {
        userIdSet.add(currentUserId)
        contactLinks.forEach((c: any) => userIdSet.add(c.target))
        knockLinks.forEach((c: any) => userIdSet.add(c.target))
      }

      const ids = Array.from(userIdSet)
      const { data: users } = await supabase
        .from('users')
        .select('id, full_name, username, avatar_url, bestie_score, city, hide_from_graph')
        .in('id', ids)
        .or(`hide_from_graph.eq.false,id.eq.${currentUserId || '00000000-0000-0000-0000-000000000000'}`)
        .limit(300)

      if (!users || users.length === 0) { setEmpty(true); setLoading(false); return }

      const visibleIdSet = new Set(users.map(u => u.id))
      // Drop edges that touch a hidden user
      for (const key of Array.from(edgeMap.keys())) {
        const [a, b] = key.split('::')
        if (!visibleIdSet.has(a) || !visibleIdSet.has(b)) edgeMap.delete(key)
      }
      contactLinks = contactLinks.filter((c: any) => visibleIdSet.has(c.source) && visibleIdSet.has(c.target))
      knockLinks = knockLinks.filter((c: any) => visibleIdSet.has(c.source) && visibleIdSet.has(c.target))

      const usersById = Object.fromEntries(users.map(u => [u.id, u]))

      // Compute per-user session count from edges
      const sessionsByUser: Record<string, number> = {}
      edgeMap.forEach((w, key) => {
        const [a, b] = key.split('::')
        sessionsByUser[a] = (sessionsByUser[a] || 0) + w
        sessionsByUser[b] = (sessionsByUser[b] || 0) + w
      })

      const nodes = users.map(u => ({
        id: u.id,
        name: u.full_name || 'Bestie',
        username: u.username,
        avatar: u.avatar_url,
        score: u.bestie_score || 0,
        sessions: sessionsByUser[u.id] || 0,
        city: u.city,
        isMe: u.id === currentUserId,
      }))

      const links: any[] = []
      edgeMap.forEach((weight, key) => {
        const [source, target] = key.split('::')
        if (usersById[source] && usersById[target]) {
          links.push({ source, target, weight, type: 'session' })
        }
      })

      // Add contact links (only if target exists in fetched users)
      contactLinks.forEach((c: any) => {
        if (usersById[c.source] && usersById[c.target]) {
          // Avoid duplicating an existing session edge
          const key1 = `${c.source}::${c.target}`
          const key2 = `${c.target}::${c.source}`
          if (!edgeMap.has(key1) && !edgeMap.has(key2)) {
            links.push({ source: c.source, target: c.target, weight: 0, type: 'contact' })
          }
        }
      })

      // Add mutual-knock links (skip if a session or contact edge already exists)
      const existingPairs = new Set(links.map((l: any) => {
        const s = typeof l.source === 'object' ? l.source.id : l.source
        const t = typeof l.target === 'object' ? l.target.id : l.target
        return s < t ? `${s}::${t}` : `${t}::${s}`
      }))
      knockLinks.forEach((c: any) => {
        if (usersById[c.source] && usersById[c.target]) {
          const pair = c.source < c.target ? `${c.source}::${c.target}` : `${c.target}::${c.source}`
          if (!existingPairs.has(pair)) {
            existingPairs.add(pair)
            links.push({ source: c.source, target: c.target, weight: 0, type: 'knock' })
          }
        }
      })

      // Append the free-floating crowd — anyone not already a connected node.
      const connectedIds = new Set(nodes.map((n: any) => n.id))
      ;(floatUsers || []).forEach((u: any) => {
        if (connectedIds.has(u.id)) return
        nodes.push({
          id: u.id,
          name: u.full_name || 'Bestie',
          username: u.username,
          avatar: u.avatar_url,
          score: u.bestie_score || 0,
          sessions: 0,
          city: u.city,
          isMe: u.id === currentUserId,
          floating: true,
        })
      })

      setNodeCount(nodes.length)
      setEdgeCount(links.length)
      // Store data in ref so the post-render effect can access it
      graphDataRef.current = { nodes, links }
      setLoading(false)
    }
    init()
  }, [])

  // Render D3 only after React has painted the SVG element (loading → false)
  useEffect(() => {
    if (loading || !graphDataRef.current) return
    const { nodes, links } = graphDataRef.current
    loadD3(nodes, links)
  }, [loading])

  const loadD3 = (nodes: any[], links: any[]) => {
    if ((window as any).d3) { renderGraph((window as any).d3, nodes, links); return }
    const script = document.createElement('script')
    script.src = 'https://d3js.org/d3.v7.min.js'
    script.onload = () => renderGraph((window as any).d3, nodes, links)
    document.head.appendChild(script)
  }

  const nodeRadius = (d: any) => {
    if (d.score >= 800) return 30
    if (d.score >= 600) return 24
    if (d.score >= 400) return 19
    if (d.score >= 200) return 15
    return 12
  }

  const frameColor = (sessions: number) => {
    if (sessions >= 25) return '#FFFFFF'
    if (sessions >= 10) return '#D4AF37'
    if (sessions >= 5)  return '#9B7FFF'
    if (sessions >= 1)  return '#A99ECC'
    return 'rgba(255,255,255,0.2)'
  }

  const initials = (name: string) =>
    name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?'

  const renderGraph = (d3: any, nodes: any[], links: any[]) => {
    if (!svgRef.current || !containerRef.current) return

    const width = containerRef.current.clientWidth
    const height = containerRef.current.clientHeight

    d3.select(svgRef.current).selectAll('*').remove()

    const svg = d3.select(svgRef.current)
      .attr('width', width)
      .attr('height', height)
      .style('background', '#09090F')

    // Defs
    const defs = svg.append('defs')

    // Glow filter for top nodes
    const glow = defs.append('filter').attr('id', 'glow').attr('x', '-50%').attr('y', '-50%').attr('width', '200%').attr('height', '200%')
    glow.append('feGaussianBlur').attr('stdDeviation', '4').attr('result', 'blur')
    const merge = glow.append('feMerge')
    merge.append('feMergeNode').attr('in', 'blur')
    merge.append('feMergeNode').attr('in', 'SourceGraphic')

    // Clip paths per node
    nodes.forEach(n => {
      const safeId = n.id.replace(/-/g, '')
      defs.append('clipPath')
        .attr('id', `clip-${safeId}`)
        .append('circle')
        .attr('r', nodeRadius(n))
    })

    // Zoom + pan
    const g = svg.append('g')
    svg.call(
      d3.zoom().scaleExtent([0.08, 5]).on('zoom', (event: any) => {
        g.attr('transform', event.transform)
      })
    )

    // Background grid dots
    svg.append('pattern').attr('id', 'dot').attr('x', 0).attr('y', 0)
      .attr('width', 32).attr('height', 32).attr('patternUnits', 'userSpaceOnUse')
    // skip for performance

    // Force simulation. Floating nodes get a weaker charge (so 100+ of them
    // don't blow the connected core off-screen) and a soft pull toward centre
    // so they stay roughly on canvas while they wander.
    const simulation = d3.forceSimulation(nodes)
      .velocityDecay(0.55) // more friction → connected core settles, floaters still drift
      .force('link', d3.forceLink(links).id((d: any) => d.id)
        .distance((d: any) => (d.type === 'contact' || d.type === 'knock') ? 120 : 60 + 40 / Math.sqrt(Math.max(d.weight, 0.1)))
        .strength((d: any) => (d.type === 'contact' || d.type === 'knock') ? 0.08 : 0.25))
      .force('charge', d3.forceManyBody().strength((d: any) => d.floating ? -26 : -80 - d.score * 0.05))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('x', d3.forceX(width / 2).strength((d: any) => d.floating ? 0.008 : 0))
      .force('y', d3.forceY(height / 2).strength((d: any) => d.floating ? 0.008 : 0))
      .force('collision', d3.forceCollide().radius((d: any) => nodeRadius(d) + (d.floating ? 6 : 10)))

    // Perpetual gentle drift for the floating crowd — tiny random impulses each
    // tick keep them wandering forever without ever settling.
    const driftForce = () => {
      for (const n of nodes as any[]) {
        if (!n.floating) continue
        n.vx = (n.vx || 0) + (Math.random() - 0.5) * 0.5
        n.vy = (n.vy || 0) + (Math.random() - 0.5) * 0.5
      }
    }
    simulation.force('drift', driftForce)
    // Keep the sim warm so the drift never stops (low target = calm motion).
    simulation.alphaTarget(0.035).restart()

    // Dashed pattern for contact edges
    defs.append('marker')

    // Edges — use separate stroke + stroke-opacity for max browser compat
    const link = g.append('g').attr('class', 'links')
      .selectAll('line')
      .data(links)
      .join('line')
      .attr('stroke', (d: any) => {
        if (d.type === 'knock') return '#FF6B9D'
        if (d.type === 'contact') return '#A99ECC'
        const w = d.weight
        if (w >= 5) return '#D4AF37'
        if (w >= 3) return '#9B7FFF'
        return '#A99ECC'
      })
      .attr('stroke-opacity', (d: any) => {
        if (d.type === 'knock') return 0.5
        if (d.type === 'contact') return 0.35
        const w = d.weight
        if (w >= 5) return 0.8
        if (w >= 3) return 0.65
        return 0.55
      })
      .attr('stroke-width', (d: any) => {
        if (d.type === 'knock') return 1.2
        if (d.type === 'contact') return 1
        return Math.max(1.5, Math.min(1.5 + d.weight, 6))
      })
      .attr('stroke-dasharray', (d: any) => d.type === 'knock' ? '2,4' : d.type === 'contact' ? '4,4' : null)
      .attr('stroke-linecap', 'round')
      .attr('x1', 0).attr('y1', 0).attr('x2', 0).attr('y2', 0)

    // Node groups
    const node = g.append('g').attr('class', 'nodes')
      .selectAll('g')
      .data(nodes)
      .join('g')
      .attr('cursor', 'pointer')
      .attr('opacity', (d: any) => d.floating ? 0.5 : 1)
      .call(
        d3.drag()
          .on('start', (event: any, d: any) => {
            if (!event.active) simulation.alphaTarget(0.3).restart()
            d.fx = d.x; d.fy = d.y
          })
          .on('drag', (event: any, d: any) => { d.fx = event.x; d.fy = event.y })
          .on('end', (event: any, d: any) => {
            if (!event.active) simulation.alphaTarget(0.035) // keep drift alive
            d.fx = null; d.fy = null
          })
      )

    // Outer glow ring for 25+ session nodes
    node.filter((d: any) => d.sessions >= 25)
      .append('circle')
      .attr('r', (d: any) => nodeRadius(d) + 6)
      .attr('fill', 'none')
      .attr('stroke', 'rgba(255,255,255,0.15)')
      .attr('stroke-width', 1.5)

    // Extra ring for "me"
    node.filter((d: any) => d.isMe)
      .append('circle')
      .attr('r', (d: any) => nodeRadius(d) + 9)
      .attr('fill', 'none')
      .attr('stroke', '#D4AF37')
      .attr('stroke-width', 1.5)
      .attr('stroke-dasharray', '3,3')
      .attr('opacity', 0.7)

    // Border circle
    node.append('circle')
      .attr('r', (d: any) => nodeRadius(d) + 2)
      .attr('fill', (d: any) => frameColor(d.sessions) + '18')
      .attr('stroke', (d: any) => frameColor(d.sessions))
      .attr('stroke-width', (d: any) => d.sessions >= 25 ? 2.5 : 1.5)
      .attr('filter', (d: any) => d.sessions >= 25 ? 'url(#glow)' : null)

    // Avatar or initials
    node.each(function(d: any) {
      const el = d3.select(this)
      const r = nodeRadius(d)
      const safeId = d.id.replace(/-/g, '')
      el.append('circle').attr('r', r).attr('fill', '#111120')
      if (d.avatar) {
        el.append('image')
          .attr('href', d.avatar)
          .attr('x', -r).attr('y', -r)
          .attr('width', r * 2).attr('height', r * 2)
          .attr('clip-path', `url(#clip-${safeId})`)
          .attr('preserveAspectRatio', 'xMidYMid slice')
      } else {
        const fc = frameColor(d.sessions)
        el.append('text')
          .text(initials(d.name))
          .attr('text-anchor', 'middle').attr('dy', '0.35em')
          .attr('font-size', r * 0.65).attr('font-weight', 700)
          .attr('fill', fc).attr('font-family', 'DM Serif Display, serif')
          .attr('pointer-events', 'none')
      }
    })

    // Name label (visible for score >= 300)
    node.append('text')
      .text((d: any) => d.name.split(' ')[0])
      .attr('text-anchor', 'middle')
      .attr('dy', (d: any) => nodeRadius(d) + 13)
      .attr('font-size', 9)
      .attr('fill', '#A99ECC')
      .attr('font-family', 'Plus Jakarta Sans, sans-serif')
      .attr('pointer-events', 'none')
      .attr('opacity', (d: any) => d.score >= 300 ? 0.85 : 0)

    // Hover
    node.on('mouseenter', function(event: any, d: any) {
      d3.select(this).select('circle:nth-child(2)')
        .transition().duration(120).attr('r', nodeRadius(d) + 5)
      const rect = svgRef.current!.getBoundingClientRect()
      setHovered(d)
      setTooltipPos({ x: event.clientX - rect.left, y: event.clientY - rect.top })
    })
    .on('mousemove', function(event: any) {
      const rect = svgRef.current!.getBoundingClientRect()
      setTooltipPos({ x: event.clientX - rect.left, y: event.clientY - rect.top })
    })
    .on('mouseleave', function(event: any, d: any) {
      d3.select(this).select('circle:nth-child(2)')
        .transition().duration(120).attr('r', nodeRadius(d) + 2)
      setHovered(null)
    })

    // Click → profile
    node.on('click', (_: any, d: any) => {
      window.open(`/${d.username}`, '_blank')
    })

    simulation.on('tick', () => {
      link
        .attr('x1', (d: any) => d.source.x).attr('y1', (d: any) => d.source.y)
        .attr('x2', (d: any) => d.target.x).attr('y2', (d: any) => d.target.y)
      node.attr('transform', (d: any) => `translate(${d.x},${d.y})`)
    })
  }

  return (
    <div style={{ minHeight: '100vh', background: '#09090F', fontFamily: 'Plus Jakarta Sans, sans-serif', display: 'flex', flexDirection: 'column' }}>
      <style>{`
        @media (max-width: 600px) {
          .graph-stats { display: none !important; }
          .graph-legend { bottom: 12px !important; left: 12px !important; padding: 10px 12px !important; }
          .graph-legend-hint { display: none !important; }
        }
      `}</style>

      <nav style={{ position: 'relative', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', background: 'rgba(8,8,16,0.95)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.10)', flexShrink: 0, minHeight: '56px' }}>
        <Link href="/" style={{ fontFamily: 'DM Serif Display, serif', fontSize: '20px', fontWeight: 700, color: '#D4AF37', textDecoration: 'none', flexShrink: 0 }}>BESTIE</Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
          {!loading && !empty && (
            <div className="graph-stats" style={{ display: 'flex', gap: '12px', fontSize: '12px', color: '#A99ECC' }}>
              <span><span style={{ color: '#D4AF37', fontWeight: 700 }}>{nodeCount}</span> people</span>
              <span><span style={{ color: '#D4AF37', fontWeight: 700 }}>{edgeCount}</span> connections</span>
            </div>
          )}
          <ProfileNav />
        </div>
      </nav>

      {/* Legend */}
      {!loading && !empty && (
        <div className="graph-legend" style={{ position: 'absolute', bottom: '24px', left: '24px', zIndex: 10, padding: '14px 18px', borderRadius: '16px', background: 'rgba(8,8,16,0.88)', border: '1px solid rgba(255,255,255,0.12)', backdropFilter: 'blur(12px)' }}>
          <p style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '1.5px', color: '#A99ECC', marginBottom: '8px' }}>LEGEND</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: '#1A1A2E', border: '2px solid rgba(255,255,255,0.9)', boxShadow: '0 0 8px rgba(255,255,255,0.25)', flexShrink: 0 }} />
              <span style={{ fontSize: '11px', color: '#F0EAFF' }}>25+ sessions</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: '#1A1A2E', border: '2px solid #D4AF37', flexShrink: 0 }} />
              <span style={{ fontSize: '11px', color: '#F0EAFF' }}>10+ sessions</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: '#1A1A2E', border: '1.5px solid #9B7FFF', flexShrink: 0 }} />
              <span style={{ fontSize: '11px', color: '#F0EAFF' }}>5+ sessions</span>
            </div>
            <div style={{ height: '1px', background: 'rgba(255,255,255,0.10)', margin: '3px 0' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '22px', height: '3px', borderRadius: '999px', background: 'rgba(212,175,55,0.6)', flexShrink: 0 }} />
              <span style={{ fontSize: '11px', color: '#F0EAFF' }}>5+ meets</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '22px', height: '1px', borderRadius: '999px', background: 'rgba(155,147,192,0.3)', flexShrink: 0 }} />
              <span style={{ fontSize: '11px', color: '#F0EAFF' }}>1 session</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '22px', height: '0px', borderBottom: '1px dashed rgba(155,147,192,0.45)', flexShrink: 0 }} />
              <span style={{ fontSize: '11px', color: '#F0EAFF' }}>contact</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '22px', height: '0px', borderBottom: '1px dotted #FF6B9D', flexShrink: 0 }} />
              <span style={{ fontSize: '11px', color: '#F0EAFF' }}>mutual knock</span>
            </div>
            <div style={{ height: '1px', background: 'rgba(255,255,255,0.10)', margin: '3px 0' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '22px', display: 'flex', justifyContent: 'center', flexShrink: 0 }}>
                <div style={{ width: '14px', height: '14px', borderRadius: '50%', background: '#1A1A2E', border: '1.5px solid rgba(255,255,255,0.2)', opacity: 0.5 }} />
              </div>
              <span style={{ fontSize: '11px', color: '#F0EAFF' }}>others nearby</span>
            </div>
          </div>
          <p className="graph-legend-hint" style={{ fontSize: '10px', color: '#A99ECC', marginTop: '8px' }}>Size = Score · Drag · Pinch to zoom</p>
        </div>
      )}

      {/* Tooltip */}
      {hovered && (
        <div style={{
          position: 'absolute',
          left: tooltipPos.x + 14,
          top: tooltipPos.y - 14,
          zIndex: 100,
          padding: '10px 14px',
          borderRadius: '12px',
          background: '#111120',
          border: `1px solid ${frameColor(hovered.sessions)}40`,
          pointerEvents: 'none',
          minWidth: '140px',
        }}>
          <p style={{ fontSize: '13px', fontWeight: 700, color: '#F0EAFF', marginBottom: '2px' }}>{hovered.name}</p>
          <p style={{ fontSize: '11px', color: '#A99ECC', marginBottom: '4px' }}>@{hovered.username}{hovered.city ? ` · ${hovered.city}` : ''}</p>
          <div style={{ display: 'flex', gap: '10px' }}>
            <span style={{ fontSize: '11px', color: scoreColor(hovered.score), fontWeight: 700 }}>BS {hovered.score}</span>
            <span style={{ fontSize: '11px', color: '#A99ECC' }}>{hovered.sessions} meetups</span>
          </div>
        </div>
      )}

      {/* Graph area */}
      <div ref={containerRef} style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        {loading ? (
          <PageLoader fullscreen={false} message="Building the web of connections..." />
        ) : empty ? (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
            <EmptyState
              Icon={Network}
              title="Your circle is empty"
              description="Every confirmed session draws a line. Book your first to start building."
              primaryCTA={{ label: 'Browse Besties', href: '/browse' }}
              accent="purple"
            />
          </div>
        ) : (
          <svg ref={svgRef} style={{ width: '100%', height: '100%', display: 'block' }} />
        )}
      </div>
    </div>
  )
}

function frameColor(sessions: number): string {
  if (sessions >= 25) return '#FFFFFF'
  if (sessions >= 10) return '#D4AF37'
  if (sessions >= 5)  return '#9B7FFF'
  if (sessions >= 1)  return '#A99ECC'
  return 'rgba(255,255,255,0.2)'
}

function scoreColor(score: number): string {
  if (score >= 800) return '#34D399'
  if (score >= 600) return '#D4AF37'
  return '#A99ECC'
}
