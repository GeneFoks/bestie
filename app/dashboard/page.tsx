// @ts-nocheck
'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import NotificationBell from '@/components/NotificationBell'
import { usePushNotifications } from '@/lib/usePushNotifications'
import FindFriends from '@/components/FindFriends'
import { PageLoader } from '@/components/Loading'
import {
  Camera, Pencil, MapPin, Sparkles, Mail, Inbox, Users, Calendar,
  UsersRound, Globe, Network, Search, Zap, Settings, Share2,
  TrendingUp, Hand, Star, Crown, PartyPopper, Target,
} from 'lucide-react'

export default function DashboardPage() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  usePushNotifications()
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [refCopied, setRefCopied] = useState(false)
  const [unreadMessages, setUnreadMessages] = useState(0)
  const [pendingBookings, setPendingBookings] = useState(0)
  const [referredCount, setReferredCount] = useState(0)
  const [myCrews, setMyCrews] = useState<any[]>([])
  const [crewNewEvents, setCrewNewEvents] = useState<Record<string, number>>({})
  const [upcomingGroupSessions, setUpcomingGroupSessions] = useState<any[]>([])
  const [pendingKnocks, setPendingKnocks] = useState<any[]>([])
  const [pendingMemories, setPendingMemories] = useState<any[]>([])
  const [iAmFree, setIAmFree] = useState(false)
  const [togglingFree, setTogglingFree] = useState(false)

  useEffect(() => {
    const getUser = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }
      setUser(session.user)
      const { data } = await supabase.from('users').select('*, activity_packages(*)').eq('id', session.user.id).single()
      setProfile(data)

      // Apply referral if present in localStorage
      const refCode = typeof window !== 'undefined' ? localStorage.getItem('bestie_ref') : null
      if (refCode && !data?.referred_by) {
        const { data: ok } = await supabase.rpc('apply_referral', { p_code: refCode })
        if (ok) localStorage.removeItem('bestie_ref')
      }

      // Apply crew invite if present in localStorage
      const crewInviteRaw = typeof window !== 'undefined' ? localStorage.getItem('bestie_crew_invite') : null
      if (crewInviteRaw && !data?.crew_id) {
        try {
          const { crewId: invCrew, crewSlug, inviteCode } = JSON.parse(crewInviteRaw)
          const { data: result } = await supabase.rpc('join_crew_via_invite', {
            p_crew_id: invCrew,
            p_invite_code: inviteCode,
          })
          localStorage.removeItem('bestie_crew_invite')
          if (result === 'joined') {
            router.push(`/crews/${crewSlug}`)
            return
          }
        } catch {}
      }

      const isToday = (ts: string | null) => ts && new Date(ts).toDateString() === new Date().toDateString()
      if (isToday(data?.free_today_at)) setIAmFree(true)

      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

      const [{ count: msgCount }, { count: bookCount }, { count: refCount }, { data: crewMemberships }, { data: myGroupSessions }, { data: joinedGroupSessions }, { data: knocksData }, { data: confirmedBookings }] = await Promise.all([
        supabase.from('direct_messages').select('*', { count: 'exact', head: true }).eq('receiver_id', session.user.id).eq('read', false),
        supabase.from('bookings').select('*', { count: 'exact', head: true }).eq('provider_id', session.user.id).eq('status', 'pending'),
        supabase.from('users').select('*', { count: 'exact', head: true }).eq('referred_by', session.user.id),
        supabase.from('crew_members').select('crew:crews(id, name, slug, avatar_url, is_public)').eq('user_id', session.user.id),
        supabase.from('group_sessions').select('id, title, scheduled_at, status, max_participants').eq('host_id', session.user.id).in('status', ['open', 'full']).gte('scheduled_at', new Date().toISOString()).order('scheduled_at').limit(3),
        supabase.from('group_session_participants').select('session:group_sessions(id, title, scheduled_at, status)').eq('user_id', session.user.id),
        supabase.from('knocks').select('id, sender:users!sender_id(id, full_name, username, avatar_url), is_mutual, created_at').eq('receiver_id', session.user.id).eq('seen', false).order('created_at', { ascending: false }).limit(5),
        supabase.from('bookings').select('id, seeker_id, provider_id, created_at').or(`seeker_id.eq.${session.user.id},provider_id.eq.${session.user.id}`).eq('confirmed_by_seeker', true).eq('confirmed_by_provider', true).gte('created_at', thirtyDaysAgo).order('created_at', { ascending: false }).limit(10),
      ])
      setUnreadMessages(msgCount || 0)
      setPendingBookings(bookCount || 0)
      setReferredCount(refCount || 0)
      setPendingKnocks((knocksData || []).filter((k: any) => !k.is_mutual))

      // Find confirmed bookings without a memory yet
      if (confirmedBookings?.length) {
        const bookingIds = confirmedBookings.map((b: any) => b.id)
        const { data: existingMemories } = await supabase
          .from('session_memories').select('booking_id').eq('user_id', session.user.id).in('booking_id', bookingIds)
        const savedIds = new Set((existingMemories || []).map((m: any) => m.booking_id))
        const unsaved = confirmedBookings.filter((b: any) => !savedIds.has(b.id))
        // Get partner info for the 2 most recent
        if (unsaved.length) {
          const partnerIds = unsaved.slice(0, 2).map((b: any) => b.seeker_id === session.user.id ? b.provider_id : b.seeker_id)
          const { data: partners } = await supabase.from('users').select('id, full_name, username').in('id', partnerIds)
          const partnersById = Object.fromEntries((partners || []).map((p: any) => [p.id, p]))
          setPendingMemories(unsaved.slice(0, 2).map((b: any) => ({
            ...b,
            partner: partnersById[b.seeker_id === session.user.id ? b.provider_id : b.seeker_id]
          })))
        }
      }

      // Merge hosted + joined upcoming group sessions
      const hosted = (myGroupSessions || []).map(s => ({ ...s, role: 'host' }))
      const joined = (joinedGroupSessions || [])
        .map((p: any) => p.session)
        .filter((s: any) => s && new Date(s.scheduled_at) >= new Date() && ['open', 'full'].includes(s.status))
        .map((s: any) => ({ ...s, role: 'participant' }))
      const merged = [...hosted, ...joined]
        .filter((s, i, arr) => arr.findIndex(x => x.id === s.id) === i)
        .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime())
        .slice(0, 5)
      setUpcomingGroupSessions(merged)

      if (crewMemberships?.length) {
        const crews = crewMemberships.map((m: any) => m.crew).filter(Boolean)
        setMyCrews(crews)

        // Fetch upcoming events for each crew (created in last 7 days = "new")
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
        const crewIds = crews.map((c: any) => c.id)
        const { data: newEvents } = await supabase
          .from('crew_events')
          .select('crew_id')
          .in('crew_id', crewIds)
          .gte('created_at', sevenDaysAgo)
          .gte('datetime', new Date().toISOString())

        const counts: Record<string, number> = {}
        newEvents?.forEach((e: any) => { counts[e.crew_id] = (counts[e.crew_id] || 0) + 1 })
        setCrewNewEvents(counts)
      }

      setLoading(false)
    }
    getUser()
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) router.push('/login')
    })
    return () => subscription.unsubscribe()
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  const handleShare = () => {
    const url = `https://bestiehere.com/${profile?.username}`
    navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleCopyRef = () => {
    const url = `https://bestiehere.com/signup?ref=${profile?.referral_code}`
    navigator.clipboard.writeText(url)
    setRefCopied(true)
    setTimeout(() => setRefCopied(false), 2000)
  }

  const toggleFree = async () => {
    if (!user) return
    setTogglingFree(true)
    if (iAmFree) {
      await supabase.from('users').update({ free_today_at: null }).eq('id', user.id)
      setIAmFree(false)
    } else {
      await supabase.from('users').update({ free_today_at: new Date().toISOString() }).eq('id', user.id)
      setIAmFree(true)
    }
    setTogglingFree(false)
  }

  if (loading) return <PageLoader message="Loading your profile…" />

  const score = profile?.bestie_score || 0
  const scoreColor = score >= 800 ? '#34D399' : score >= 600 ? '#D4AF37' : '#A99ECC'
  const scoreLabel = score >= 800 ? 'Excellent' : score >= 600 ? 'Good' : score >= 400 ? 'Fair' : 'New'

  const boostItems = [
    { Icon: Camera, label: 'Add profile photo', points: '+50 BS', done: !!profile?.avatar_url, href: '/profile/edit' },
    { Icon: Pencil, label: 'Complete your bio', points: '+30 BS', done: !!profile?.bio, href: '/profile/edit' },
    { Icon: MapPin, label: 'Add your city',    points: '+20 BS', done: !!profile?.city, href: '/profile/edit' },
    { Icon: Target, label: 'Create an activity', points: '+50 BS', done: profile?.activity_packages?.length > 0, href: '/profile/edit' },
  ]
  const remainingBoost = boostItems.filter(i => !i.done)
  const totalNewCrewEvents = Object.values(crewNewEvents).reduce((s, n) => s + n, 0)

  const actions = [
    { Icon: Mail,        label: 'Messages',         sub: 'Check your conversations',            href: '/messages',           badge: unreadMessages },
    { Icon: Inbox,       label: 'Bookings',         sub: 'Incoming booking requests',           href: '/bookings',           badge: pendingBookings },
    { Icon: Users,       label: 'My Crews',         sub: myCrews.length ? `${myCrews.length} crew${myCrews.length > 1 ? 's' : ''}` : 'Find or create a crew', href: '/crews', badge: totalNewCrewEvents },
    { Icon: Calendar,    label: 'My Sessions',      sub: 'Upcoming accepted sessions',          href: '/sessions' },
    { Icon: UsersRound,  label: 'Group Sessions',   sub: 'Host or join group meetups',          href: '/group-sessions/new', badge: upcomingGroupSessions.length || 0 },
    { Icon: Globe,       label: 'City Pulse',       sub: "What's happening near you today",     href: '/pulse',              badge: pendingKnocks.length },
    { Icon: Network,     label: 'Connection Graph', sub: 'See how everyone is connected',       href: '/graph' },
    { Icon: Search,      label: 'Browse Besties',   sub: 'Find someone for your activity',      href: '/browse' },
    { Icon: Zap,         label: 'Going to',         sub: "Share what you're up to today",       href: '/going-to' },
    { Icon: Settings,    label: 'Edit profile',     sub: 'Bio, photo, city, activities',        href: '/profile/edit' },
  ]

  return (
    <div style={{ minHeight: '100vh', background: '#09090F', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
      <nav style={{ position: 'sticky', top: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', background: 'rgba(8,8,16,0.9)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.10)' }}>
        <Link href="/" style={{ fontFamily: 'DM Serif Display, serif', fontSize: '20px', fontWeight: 700, color: '#D4AF37', textDecoration: 'none' }}>BESTIE</Link>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <Link href="/browse" style={{ fontSize: '14px', color: '#A99ECC', textDecoration: 'none' }}>Browse</Link>
          {user && <NotificationBell userId={user.id} />}
          <button onClick={handleLogout} style={{ fontSize: '14px', color: '#A99ECC', background: 'none', border: '1px solid rgba(255,255,255,0.1)', padding: '6px 16px', borderRadius: '10px', cursor: 'pointer' }}>Log out</button>
        </div>
      </nav>

      <div style={{ maxWidth: '960px', margin: '0 auto', padding: '40px 24px' }}>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '32px', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h1 style={{ fontFamily: 'DM Serif Display, serif', fontSize: '32px', fontWeight: 700, color: '#F0EAFF', marginBottom: '4px' }}>
              Hey, {profile?.full_name?.split(' ')[0] || user?.email?.split('@')[0]} 👋
            </h1>
            <p style={{ fontSize: '14px', color: '#A99ECC' }}>@{profile?.username || user?.email?.split('@')[0]}</p>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={handleShare} style={{ padding: '10px 20px', borderRadius: '12px', fontSize: '14px', fontWeight: 600, background: copied ? 'rgba(57,255,20,0.15)' : 'linear-gradient(135deg, rgba(212,175,55,0.15) 0%, rgba(212,175,55,0.08) 100%)', border: copied ? '1px solid rgba(57,255,20,0.3)' : '1px solid rgba(212,175,55,0.3)', color: copied ? '#34D399' : '#D4AF37', cursor: 'pointer' }}>
              {copied ? '✓ Copied!' : (<><Share2 size={14} strokeWidth={2} style={{ verticalAlign: 'middle', marginRight: '6px' }} />Share my Passport</>)}
            </button>
            <Link href={`/${profile?.username}`} style={{ padding: '10px 20px', borderRadius: '12px', fontSize: '14px', fontWeight: 600, background: 'rgba(255,255,255,0.10)', border: '1px solid rgba(255,255,255,0.1)', color: '#F0EAFF', textDecoration: 'none' }}>
              View my profile →
            </Link>
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px', marginBottom: '24px' }}>
          <div style={{ background: '#111120', border: `1px solid ${scoreColor}25`, borderRadius: '20px', padding: '24px', textAlign: 'center' }}>
            <p style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '2px', color: '#A99ECC', marginBottom: '8px' }}>BESTIE SCORE</p>
            <div style={{ fontSize: '56px', fontWeight: 700, color: scoreColor, fontFamily: 'DM Serif Display, serif', lineHeight: 1 }}>{score}</div>
            <div style={{ height: '6px', borderRadius: '999px', background: 'rgba(255,255,255,0.10)', margin: '12px 0 8px', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${score / 10}%`, borderRadius: '999px', background: `linear-gradient(90deg, ${scoreColor} 0%, #D4AF37 100%)` }} />
            </div>
            <p style={{ fontSize: '12px', fontWeight: 600, color: scoreColor }}>{scoreLabel}</p>
          </div>
          <div style={{ background: '#111120', border: '1px solid rgba(255,255,255,0.10)', borderRadius: '20px', padding: '24px', textAlign: 'center' }}>
            <p style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '2px', color: '#A99ECC', marginBottom: '8px' }}>SESSIONS</p>
            <div style={{ fontSize: '56px', fontWeight: 700, color: '#F0EAFF', fontFamily: 'DM Serif Display, serif', lineHeight: 1 }}>{profile?.total_sessions || 0}</div>
            <p style={{ fontSize: '12px', color: '#A99ECC', marginTop: '12px' }}>completed</p>
          </div>
          <div style={{ background: '#111120', border: '1px solid rgba(255,255,255,0.10)', borderRadius: '20px', padding: '24px', textAlign: 'center' }}>
            <p style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '2px', color: '#A99ECC', marginBottom: '8px' }}>RATING</p>
            <div style={{ fontSize: '56px', fontWeight: 700, color: '#D4AF37', fontFamily: 'DM Serif Display, serif', lineHeight: 1 }}>{profile?.avg_rating ? profile.avg_rating.toFixed(1) : '—'}</div>
            <p style={{ fontSize: '12px', color: '#A99ECC', marginTop: '12px' }}>avg rating</p>
          </div>
          <div style={{ background: '#111120', border: '1px solid rgba(255,255,255,0.10)', borderRadius: '20px', padding: '24px', textAlign: 'center' }}>
            <p style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '2px', color: '#A99ECC', marginBottom: '8px' }}>LOCATION</p>
            <div style={{ marginBottom: '8px', display: 'flex', justifyContent: 'center' }}><MapPin size={26} color="#D4AF37" strokeWidth={1.8} /></div>
            <p style={{ fontSize: '16px', fontWeight: 600, color: '#F0EAFF' }}>{profile?.city || 'Not set'}</p>
            <p style={{ fontSize: '12px', color: '#A99ECC', marginTop: '4px' }}>{profile?.country || 'Add your city'}</p>
          </div>
        </div>

        {/* Bestie Type banner */}
        {!profile?.bestie_type_completed && (
          <div style={{ marginBottom: '24px', background: 'linear-gradient(135deg, rgba(212,175,55,0.1) 0%, rgba(155,143,255,0.08) 100%)', border: '1px solid rgba(212,175,55,0.25)', borderRadius: '20px', padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <span style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'rgba(212,175,55,0.10)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Sparkles size={22} color="#D4AF37" strokeWidth={1.8} /></span>
              <div>
                <p style={{ fontSize: '15px', fontWeight: 700, color: '#F0EAFF', marginBottom: '2px' }}>Discover your Bestie Type</p>
                <p style={{ fontSize: '13px', color: '#A99ECC' }}>12 questions · Energy · Mind · Vibe · shows on your passport</p>
              </div>
            </div>
            <Link href="/bestie-type" style={{ padding: '10px 24px', borderRadius: '12px', fontSize: '14px', fontWeight: 600, background: 'linear-gradient(135deg, #D4AF37 0%, #B8960C 100%)', color: '#09090F', textDecoration: 'none', whiteSpace: 'nowrap' }}>
              Take the test →
            </Link>
          </div>
        )}

        {/* Bestie Type result */}
        {profile?.bestie_type_completed && (
          <div style={{ marginBottom: '24px', background: '#111120', border: '1px solid rgba(155,143,255,0.25)', borderRadius: '20px', padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <span style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'rgba(212,175,55,0.10)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Sparkles size={22} color="#D4AF37" strokeWidth={1.8} /></span>
              <div>
                <p style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '1.5px', color: '#9B7FFF', marginBottom: '4px' }}>BESTIE TYPE</p>
                <p style={{ fontSize: '16px', fontWeight: 700, color: '#F0EAFF', fontFamily: 'DM Serif Display, serif' }}>
                  {profile.energy_type} · {profile.mind_type} · {profile.vibe_type}
                </p>
              </div>
            </div>
            <Link href="/bestie-type" style={{ padding: '8px 18px', borderRadius: '12px', fontSize: '13px', fontWeight: 600, background: 'rgba(255,255,255,0.10)', border: '1px solid rgba(255,255,255,0.1)', color: '#A99ECC', textDecoration: 'none' }}>
              Retake quiz
            </Link>
          </div>
        )}

        {/* Free Today toggle */}
        <div style={{ marginBottom: '20px', padding: '16px 20px', borderRadius: '16px', background: iAmFree ? 'rgba(57,255,20,0.06)' : '#111120', border: iAmFree ? '1px solid rgba(57,255,20,0.25)' : '1px solid rgba(255,255,255,0.11)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ display: 'inline-flex', width: '12px', height: '12px', borderRadius: '50%', background: iAmFree ? '#34D399' : 'transparent', border: iAmFree ? 'none' : '2px solid #A99ECC', boxShadow: iAmFree ? '0 0 12px rgba(52,211,153,0.7)' : 'none' }} />
            <div>
              <p style={{ fontSize: '14px', fontWeight: 700, color: iAmFree ? '#34D399' : '#F0EAFF' }}>{iAmFree ? 'You\'re free today' : 'Free today?'}</p>
              <p style={{ fontSize: '12px', color: '#A99ECC' }}>{iAmFree ? 'Visible on Pulse & Map' : 'Let others know you\'re up for a meetup'}</p>
            </div>
          </div>
          <button onClick={toggleFree} disabled={togglingFree} style={{ padding: '8px 18px', borderRadius: '10px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', background: iAmFree ? 'rgba(255,107,53,0.1)' : 'rgba(57,255,20,0.12)', border: iAmFree ? '1px solid rgba(255,107,53,0.3)' : '1px solid rgba(57,255,20,0.35)', color: iAmFree ? '#FF6B35' : '#34D399', whiteSpace: 'nowrap' }}>
            {togglingFree ? '…' : iAmFree ? 'Turn off' : "I'm free!"}
          </button>
        </div>

        {/* Knocks */}
        {pendingKnocks.length > 0 && (
          <div style={{ marginBottom: '20px', padding: '16px 20px', borderRadius: '16px', background: 'rgba(212,175,55,0.06)', border: '1px solid rgba(212,175,55,0.2)' }}>
            <p style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '2px', color: '#A99ECC', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}><Hand size={13} color="#D4AF37" strokeWidth={2} /> NEW KNOCKS</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
              {pendingKnocks.map((k: any) => (
                <Link key={k.id} href={`/${k.sender?.username}`} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', borderRadius: '12px', background: 'rgba(212,175,55,0.08)', border: '1px solid rgba(212,175,55,0.2)', textDecoration: 'none' }}>
                  <div style={{ width: '28px', height: '28px', borderRadius: '8px', overflow: 'hidden', background: '#1A1A2E', flexShrink: 0 }}>
                    {k.sender?.avatar_url
                      ? <img src={k.sender.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 700, color: '#D4AF37' }}>{k.sender?.full_name?.[0]}</div>
                    }
                  </div>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: '#D4AF37' }}>{k.sender?.full_name?.split(' ')[0]}</span>
                  <span style={{ fontSize: '11px', color: '#A99ECC' }}>knocked</span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Pending session memories */}
        {pendingMemories.length > 0 && (
          <div style={{ marginBottom: '20px', padding: '16px 20px', borderRadius: '16px', background: 'rgba(155,143,255,0.05)', border: '1px solid rgba(155,143,255,0.2)' }}>
            <p style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '2px', color: '#A99ECC', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}><Sparkles size={13} color="#9B7FFF" strokeWidth={2} /> HOW DID IT GO?</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {pendingMemories.map((b: any) => (
                <Link key={b.id} href={`/sessions/${b.id}/memory`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', borderRadius: '12px', background: 'rgba(155,143,255,0.07)', border: '1px solid rgba(155,143,255,0.15)', textDecoration: 'none' }}>
                  <p style={{ fontSize: '13px', color: '#F0EAFF' }}>
                    Session with <span style={{ fontWeight: 700, color: '#9B7FFF' }}>{b.partner?.full_name?.split(' ')[0] || 'someone'}</span>
                  </p>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: '#9B7FFF' }}>Record →</span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Find Friends */}
        <FindFriends />

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(300px, 100%), 1fr))', gap: '20px' }}>

          {/* My Crews */}
          <div style={{ background: '#111120', border: '1px solid rgba(255,255,255,0.10)', borderRadius: '20px', padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <h3 style={{ fontFamily: 'DM Serif Display, serif', fontSize: '18px', color: '#F0EAFF' }}>My Crews</h3>
              <Link href="/crews" style={{ fontSize: '13px', color: '#D4AF37', textDecoration: 'none' }}>Browse →</Link>
            </div>
            {myCrews.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '24px 0' }}>
                <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: 'rgba(155,127,255,0.10)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}><Users size={26} color="#9B7FFF" strokeWidth={1.6} /></div>
                <p style={{ fontSize: '14px', color: '#A99ECC', marginBottom: '16px' }}>You're not in any crew yet</p>
                <Link href="/crews" style={{ fontSize: '13px', fontWeight: 600, padding: '8px 20px', borderRadius: '10px', background: 'linear-gradient(135deg, #D4AF37 0%, #B8960C 100%)', color: '#09090F', textDecoration: 'none' }}>Find a Crew</Link>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {myCrews.map((crew: any) => {
                  const newEvents = crewNewEvents[crew.id] || 0
                  const isFeatured = profile?.crew_id === crew.id
                  return (
                    <Link key={crew.id} href={`/crews/${crew.slug}`} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 14px', borderRadius: '14px', background: isFeatured ? 'rgba(212,175,55,0.06)' : '#111120', border: isFeatured ? '1px solid rgba(212,175,55,0.2)' : '1px solid rgba(255,255,255,0.10)', textDecoration: 'none' }}>
                      <div style={{ width: '36px', height: '36px', borderRadius: '10px', overflow: 'hidden', background: '#1A1A2E', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {crew.avatar_url
                          ? <img src={crew.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          : <Users size={16} color="#A99ECC" strokeWidth={1.8} />}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: '14px', fontWeight: 600, color: '#F0EAFF', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{crew.name}</p>
                        {isFeatured && <p style={{ fontSize: '11px', color: '#D4AF37', display: 'flex', alignItems: 'center', gap: '4px' }}><Star size={11} fill="#D4AF37" strokeWidth={0} /> On your passport</p>}
                      </div>
                      {newEvents > 0 && (
                        <span style={{ background: '#D4AF37', color: '#09090F', fontSize: '11px', fontWeight: 700, borderRadius: '999px', padding: '2px 7px', flexShrink: 0 }}>
                          {newEvents} new
                        </span>
                      )}
                    </Link>
                  )
                })}
                <Link href="/crews/new" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '10px', borderRadius: '12px', fontSize: '13px', fontWeight: 600, color: '#A99ECC', background: 'transparent', border: '1px dashed rgba(255,255,255,0.1)', textDecoration: 'none', marginTop: '4px' }}>
                  + Create a crew
                </Link>
              </div>
            )}
          </div>

          {/* Group Sessions */}
          {upcomingGroupSessions.length > 0 && (
            <div style={{ background: '#111120', border: '1px solid rgba(255,255,255,0.10)', borderRadius: '20px', padding: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <h3 style={{ fontFamily: 'DM Serif Display, serif', fontSize: '18px', color: '#F0EAFF' }}>Group Sessions</h3>
                <Link href="/group-sessions/new" style={{ fontSize: '13px', color: '#D4AF37', textDecoration: 'none' }}>+ New →</Link>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {upcomingGroupSessions.map((gs: any) => {
                  const d = new Date(gs.scheduled_at)
                  return (
                    <Link key={gs.id} href={`/group-sessions/${gs.id}`} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 14px', borderRadius: '14px', background: '#111120', border: '1px solid rgba(255,255,255,0.10)', textDecoration: 'none' }}>
                      <span style={{ width: '38px', height: '38px', borderRadius: '11px', background: 'rgba(212,175,55,0.10)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><UsersRound size={20} color="#D4AF37" strokeWidth={1.7} /></span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: '14px', fontWeight: 600, color: '#F0EAFF', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{gs.title}</p>
                        <p style={{ fontSize: '12px', color: '#A99ECC', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          {d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} · {d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })} ·
                          {gs.role === 'host' ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}><Crown size={11} color="#D4AF37" strokeWidth={2} /> Host</span> : <span>✓ Joined</span>}
                        </p>
                      </div>
                    </Link>
                  )
                })}
              </div>
            </div>
          )}

          {/* Quick actions */}
          <div style={{ background: '#111120', border: '1px solid rgba(255,255,255,0.10)', borderRadius: '20px', padding: '24px' }}>
            <h3 style={{ fontFamily: 'DM Serif Display, serif', fontSize: '18px', color: '#F0EAFF', marginBottom: '16px' }}>Quick actions</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {actions.map((action) => (
                <Link key={action.label} href={action.href} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 14px', borderRadius: '14px', background: action.badge > 0 ? 'rgba(212,175,55,0.06)' : '#111120', border: action.badge > 0 ? '1px solid rgba(212,175,55,0.2)' : '1px solid rgba(255,255,255,0.10)', textDecoration: 'none' }}>
                  <span style={{ width: '36px', height: '36px', borderRadius: '10px', background: action.badge > 0 ? 'rgba(212,175,55,0.10)' : '#131323', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <action.Icon size={18} color={action.badge > 0 ? '#D4AF37' : '#A99ECC'} strokeWidth={1.8} />
                  </span>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: '14px', fontWeight: 600, color: '#F0EAFF', marginBottom: '1px' }}>{action.label}</p>
                    <p style={{ fontSize: '12px', color: '#A99ECC' }}>{action.sub}</p>
                  </div>
                  {action.badge > 0 && (
                    <span style={{ background: '#D4AF37', color: '#09090F', fontSize: '12px', fontWeight: 700, borderRadius: '999px', padding: '2px 8px', flexShrink: 0 }}>{action.badge}</span>
                  )}
                  <span style={{ color: '#A99ECC', fontSize: '12px' }}>→</span>
                </Link>
              ))}
            </div>
          </div>
        </div>

        {remainingBoost.length > 0 && (
          <div style={{ marginTop: '20px', background: 'linear-gradient(135deg, rgba(212,175,55,0.08) 0%, rgba(57,255,20,0.04) 100%)', border: '1px solid rgba(212,175,55,0.15)', borderRadius: '20px', padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <h3 style={{ fontFamily: 'DM Serif Display, serif', fontSize: '18px', color: '#F0EAFF', display: 'flex', alignItems: 'center', gap: '10px' }}><TrendingUp size={20} color="#D4AF37" strokeWidth={1.8} /> Boost your Bestie Score</h3>
              <Link href="/score-guide" style={{ fontSize: '13px', color: '#D4AF37', textDecoration: 'none' }}>How it works →</Link>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px' }}>
              {remainingBoost.map(tip => (
                <Link key={tip.label} href={tip.href} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px', borderRadius: '12px', background: '#131323', textDecoration: 'none' }}>
                  <span style={{ width: '32px', height: '32px', borderRadius: '9px', background: 'rgba(212,175,55,0.10)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <tip.Icon size={16} color="#D4AF37" strokeWidth={1.8} />
                  </span>
                  <div>
                    <p style={{ fontSize: '13px', fontWeight: 500, color: '#F0EAFF' }}>{tip.label}</p>
                    <p style={{ fontSize: '12px', color: '#34D399', fontWeight: 600 }}>{tip.points}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Referral block */}
        {profile?.referral_code && (
          <div style={{ marginTop: '20px', background: '#111120', border: '1px solid rgba(212,175,55,0.2)', borderRadius: '20px', padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h3 style={{ fontFamily: 'DM Serif Display, serif', fontSize: '18px', color: '#F0EAFF', marginBottom: '4px' }}>Invite friends</h3>
                <p style={{ fontSize: '13px', color: '#A99ECC' }}>+1 Bestie Score for every person who joins with your link</p>
              </div>
              {referredCount > 0 && (
                <div style={{ padding: '6px 14px', borderRadius: '999px', background: 'rgba(212,175,55,0.1)', border: '1px solid rgba(212,175,55,0.25)', fontSize: '13px', fontWeight: 700, color: '#D4AF37' }}>
                  {referredCount} invited · +{referredCount} BS earned
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: '200px', padding: '10px 16px', borderRadius: '12px', background: '#131323', border: '1px solid rgba(255,255,255,0.12)', fontSize: '13px', color: '#A99ECC', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                bestiehere.com/signup?ref={profile.referral_code}
              </div>
              <button onClick={handleCopyRef} style={{ padding: '10px 20px', borderRadius: '12px', fontSize: '14px', fontWeight: 600, background: refCopied ? 'rgba(57,255,20,0.15)' : 'linear-gradient(135deg, #D4AF37 0%, #B8960C 100%)', border: refCopied ? '1px solid rgba(57,255,20,0.3)' : 'none', color: refCopied ? '#34D399' : '#09090F', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}>
                {refCopied ? '✓ Copied!' : 'Copy link'}
              </button>
            </div>
          </div>
        )}

        {remainingBoost.length === 0 && (
          <div style={{ marginTop: '20px', background: 'rgba(57,255,20,0.05)', border: '1px solid rgba(57,255,20,0.15)', borderRadius: '20px', padding: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(52,211,153,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><PartyPopper size={22} color="#34D399" strokeWidth={1.8} /></span>
              <div>
                <p style={{ fontSize: '14px', fontWeight: 600, color: '#34D399' }}>Profile complete!</p>
                <p style={{ fontSize: '13px', color: '#A99ECC' }}>Keep earning sessions and Sparks to grow your Score</p>
              </div>
            </div>
            <Link href="/score-guide" style={{ fontSize: '13px', color: '#D4AF37', textDecoration: 'none', padding: '8px 16px', borderRadius: '10px', border: '1px solid rgba(212,175,55,0.3)', whiteSpace: 'nowrap' }}>
              How it works →
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
