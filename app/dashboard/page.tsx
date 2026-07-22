// @ts-nocheck
'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Button, ButtonLink } from '@/components/ui/Button'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import NotificationBell from '@/components/NotificationBell'
import { usePushNotifications } from '@/lib/usePushNotifications'
import FindFriends from '@/components/FindFriends'
import { PageLoader } from '@/components/Loading'
import StreakStrip from '@/components/StreakStrip'
import OnboardingProgress from '@/components/OnboardingProgress'
import SuggestedCrews from '@/components/SuggestedCrews'
import CreateEventButton from '@/components/CreateEventButton'
import {
  Camera, Pencil, MapPin, Sparkles, Mail, Inbox, Users, Calendar,
  UsersRound, Globe, Network, Search, Zap, Settings, Share2,
  TrendingUp, Hand, Star, Crown, PartyPopper, Target,
} from 'lucide-react'
import { buzz, celebrate } from '@/lib/celebrate'

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
  const [freeInCityCount, setFreeInCityCount] = useState(0)

  useEffect(() => {
    const getUser = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }
      setUser(session.user)
      const { data } = await supabase.from('users').select('*, activity_packages(*)').eq('id', session.user.id).single()
      // Guide un-onboarded users through the wizard — but never bounce anyone
      // who already took the test (has an eterotype), so there's no redirect loop.
      if (data && !data.onboarding_completed && !data.eterotype) { router.push('/onboarding'); return }
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
          const { crewId: invCrew, crewSlug, inviteCode, referrerId } = JSON.parse(crewInviteRaw)
          const { data: result } = await supabase.rpc('join_crew_via_invite', {
            p_crew_id: invCrew,
            p_invite_code: inviteCode,
            p_referrer_id: referrerId || null,
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

      // Count other Besties free today in the user's city (social proof for Free Today)
      if (data?.city) {
        const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0)
        const { count: freeCount } = await supabase
          .from('users')
          .select('id', { count: 'exact', head: true })
          .ilike('city', `%${data.city}%`)
          .gte('free_today_at', todayStart.toISOString())
          .neq('id', session.user.id)
        setFreeInCityCount(freeCount || 0)
      }

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

  // Native share sheet (Telegram / WhatsApp / Stories in one tap on mobile).
  // Falls back to copying the link on desktop browsers without navigator.share.
  const handleShareRef = async () => {
    const url = `https://bestiehere.com/signup?ref=${profile?.referral_code}`
    const text = `Join me on Bestie — real people, real moments. Sign up with my link and we both get +10 Sparks ⚡`
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ title: 'Join me on Bestie', text, url })
        return
      } catch {
        // user dismissed the sheet — do nothing
        return
      }
    }
    // Fallback: copy a message + link
    navigator.clipboard.writeText(`${text}\n${url}`)
    setRefCopied(true)
    setTimeout(() => setRefCopied(false), 2000)
  }

  const toggleFree = async () => {
    if (!user) return
    setTogglingFree(true)
    if (iAmFree) {
      await supabase.from('users').update({ free_today_at: null }).eq('id', user.id)
      setIAmFree(false)
      buzz('tap')
    } else {
      await supabase.from('users').update({ free_today_at: new Date().toISOString() }).eq('id', user.id)
      setIAmFree(true)
      buzz('success')
      // Tiny celebratory burst — first time today
      celebrate({ count: 18, spread: 50, origin: { x: 0.5, y: 0.25 } })
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
    { Icon: Calendar,    label: 'My Events',        sub: 'Birthdays, group sessions & meetups',  href: '/events',             badge: upcomingGroupSessions.length || 0 },
    { Icon: Globe,       label: 'City Pulse',       sub: "What's happening near you today",     href: '/pulse',              badge: pendingKnocks.length },
    { Icon: Network,     label: 'My Circle', sub: 'See how everyone is connected',       href: '/graph' },
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

        <OnboardingProgress />

        {/* Bestie Plus upsell — hidden for active Plus members and for brand-new
            users (no confirmed meetup yet): don't sell before they've felt value */}
        {profile && (profile.total_sessions || 0) > 0 && !(profile.subscription_tier === 'plus' && (!profile.plus_expires_at || new Date(profile.plus_expires_at) > new Date())) && (
          <Link href="/plus" style={{ textDecoration: 'none', display: 'block', marginBottom: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '18px 20px', borderRadius: '18px', background: 'linear-gradient(135deg, rgba(155,127,255,0.16), rgba(124,92,255,0.08))', border: '1px solid rgba(155,127,255,0.35)' }}>
              <div style={{ fontSize: '30px', lineHeight: 1 }}>✦</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: '15px', fontWeight: 700, color: '#F0EAFF', margin: '0 0 3px' }}>Upgrade to Bestie Plus — $8/mo</p>
                <p style={{ fontSize: '13px', color: '#C9BEEA', margin: 0, lineHeight: 1.4 }}>Premium AI companion · join the graph · charge for sessions</p>
              </div>
              <span style={{ flexShrink: 0, padding: '9px 16px', borderRadius: '999px', background: 'linear-gradient(135deg, #9B7FFF, #7C5CFF)', color: '#fff', fontSize: '13px', fontWeight: 700, whiteSpace: 'nowrap' }}>Get Plus →</span>
            </div>
          </Link>
        )}

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '32px', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h1 style={{ fontFamily: 'DM Serif Display, serif', fontSize: '32px', fontWeight: 700, color: '#F0EAFF', marginBottom: '4px' }}>
              Hey, {profile?.full_name?.split(' ')[0] || user?.email?.split('@')[0]} 👋
            </h1>
            <p style={{ fontSize: '14px', color: '#A99ECC' }}>@{profile?.username || user?.email?.split('@')[0]}</p>
          </div>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <CreateEventButton variant="compact" />
            <button onClick={handleShare} style={{ padding: '10px 20px', borderRadius: '12px', fontSize: '14px', fontWeight: 600, background: copied ? 'rgba(57,255,20,0.15)' : 'linear-gradient(135deg, rgba(212,175,55,0.15) 0%, rgba(212,175,55,0.08) 100%)', border: copied ? '1px solid rgba(57,255,20,0.3)' : '1px solid rgba(212,175,55,0.3)', color: copied ? '#34D399' : '#D4AF37', cursor: 'pointer' }}>
              {copied ? '✓ Copied!' : (<><Share2 size={14} strokeWidth={2} style={{ verticalAlign: 'middle', marginRight: '6px' }} />Share my Passport</>)}
            </button>
            <Link href={`/${profile?.username}`} style={{ padding: '10px 20px', borderRadius: '12px', fontSize: '14px', fontWeight: 600, background: 'rgba(255,255,255,0.10)', border: '1px solid rgba(255,255,255,0.1)', color: '#F0EAFF', textDecoration: 'none' }}>
              View my profile →
            </Link>
          </div>
        </div>

        {/* ─────────── HERO ZONE (single primary action, context-aware) ─────────── */}
        {(() => {
          const isBrandNew = (profile?.total_sessions || 0) === 0 && pendingKnocks.length === 0 && pendingMemories.length === 0
          const showBestieType = !profile?.bestie_type_completed
          const showKnocks = !showBestieType && pendingKnocks.length > 0
          const showMemories = !showBestieType && !showKnocks && pendingMemories.length > 0
          const showWelcome = !showBestieType && !showKnocks && !showMemories && isBrandNew
          const showFreeToday = !showBestieType && !showKnocks && !showMemories && !showWelcome

          if (showBestieType) {
            return (
              <Link href="/bestie-type" style={{ display: 'block', marginBottom: '20px', padding: '28px 28px', borderRadius: '24px', background: 'linear-gradient(135deg, rgba(212,175,55,0.15) 0%, rgba(155,127,255,0.10) 100%)', border: '1px solid rgba(212,175,55,0.30)', textDecoration: 'none', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: '-40px', right: '-40px', width: '180px', height: '180px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(212,175,55,0.18) 0%, transparent 70%)', pointerEvents: 'none' }} />
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
                  <span style={{ width: '64px', height: '64px', borderRadius: '18px', background: 'rgba(212,175,55,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Sparkles size={30} color="#D4AF37" strokeWidth={1.6} /></span>
                  <div style={{ flex: 1, minWidth: '140px' }}>
                    <p style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '2px', color: '#D4AF37', marginBottom: '4px' }}>START HERE</p>
                    <h2 style={{ fontFamily: 'DM Serif Display, serif', fontSize: '22px', color: '#F0EAFF', marginBottom: '4px', lineHeight: 1.2 }}>Discover your Bestie Type</h2>
                    <p style={{ fontSize: '13px', color: '#A99ECC' }}>12 questions — unlocks compatibility matching, shows on your passport</p>
                  </div>
                  <span style={{ padding: '12px 22px', borderRadius: '12px', fontSize: '14px', fontWeight: 700, background: 'linear-gradient(135deg, #D4AF37 0%, #B8960C 100%)', color: '#09090F', whiteSpace: 'nowrap', flexShrink: 0 }}>Take the quiz →</span>
                </div>
              </Link>
            )
          }

          if (showKnocks) {
            const first = pendingKnocks.slice(0, 3)
            return (
              <Link href={`/${first[0].sender?.username}`} style={{ display: 'block', marginBottom: '20px', padding: '24px 28px', borderRadius: '24px', background: 'linear-gradient(135deg, rgba(212,175,55,0.14) 0%, rgba(212,175,55,0.06) 100%)', border: '1px solid rgba(212,175,55,0.30)', textDecoration: 'none', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: '-30px', right: '-30px', width: '160px', height: '160px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(212,175,55,0.16) 0%, transparent 70%)', pointerEvents: 'none' }} />
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '18px', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', flexShrink: 0 }}>
                    {first.map((k: any, i: number) => (
                      <div key={k.id} style={{ width: '50px', height: '50px', borderRadius: '14px', overflow: 'hidden', background: '#1A1A2E', border: '2px solid #131323', marginLeft: i === 0 ? 0 : '-12px', flexShrink: 0 }}>
                        {k.sender?.avatar_url
                          ? <img src={k.sender.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', fontWeight: 700, color: '#D4AF37' }}>{k.sender?.full_name?.[0]}</div>
                        }
                      </div>
                    ))}
                  </div>
                  <div style={{ flex: 1, minWidth: '160px' }}>
                    <p style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '2px', color: '#D4AF37', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}><Hand size={13} strokeWidth={2} /> NEW KNOCKS</p>
                    <h2 style={{ fontFamily: 'DM Serif Display, serif', fontSize: '20px', color: '#F0EAFF', marginBottom: '2px', lineHeight: 1.2 }}>{pendingKnocks.length === 1 ? `${pendingKnocks[0].sender?.full_name?.split(' ')[0]} knocked` : `${pendingKnocks.length} people knocked`}</h2>
                    <p style={{ fontSize: '13px', color: '#A99ECC' }}>Knock back to reveal who you matched with</p>
                  </div>
                  <span style={{ padding: '12px 22px', borderRadius: '12px', fontSize: '14px', fontWeight: 700, background: 'linear-gradient(135deg, #D4AF37 0%, #B8960C 100%)', color: '#09090F', whiteSpace: 'nowrap', flexShrink: 0 }}>View →</span>
                </div>
              </Link>
            )
          }

          if (showMemories) {
            const first = pendingMemories[0]
            return (
              <Link href={`/sessions/${first.id}/memory`} style={{ display: 'block', marginBottom: '20px', padding: '24px 28px', borderRadius: '24px', background: 'linear-gradient(135deg, rgba(155,127,255,0.14) 0%, rgba(155,127,255,0.06) 100%)', border: '1px solid rgba(155,127,255,0.30)', textDecoration: 'none', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: '-30px', right: '-30px', width: '160px', height: '160px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(155,127,255,0.16) 0%, transparent 70%)', pointerEvents: 'none' }} />
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '18px', flexWrap: 'wrap' }}>
                  <span style={{ width: '56px', height: '56px', borderRadius: '16px', background: 'rgba(155,127,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Sparkles size={26} color="#9B7FFF" strokeWidth={1.6} /></span>
                  <div style={{ flex: 1, minWidth: '140px' }}>
                    <p style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '2px', color: '#9B7FFF', marginBottom: '4px' }}>HOW DID IT GO?</p>
                    <h2 style={{ fontFamily: 'DM Serif Display, serif', fontSize: '20px', color: '#F0EAFF', marginBottom: '2px', lineHeight: 1.2 }}>Record your session with {first.partner?.full_name?.split(' ')[0] || 'someone'}</h2>
                    <p style={{ fontSize: '13px', color: '#A99ECC' }}>Mood, note, photo — it lives on your passport</p>
                  </div>
                  <span style={{ padding: '12px 22px', borderRadius: '12px', fontSize: '14px', fontWeight: 700, background: 'rgba(155,127,255,0.2)', border: '1px solid rgba(155,127,255,0.4)', color: '#9B7FFF', whiteSpace: 'nowrap', flexShrink: 0 }}>Record →</span>
                </div>
              </Link>
            )
          }

          if (showWelcome) {
            const firstName = profile?.full_name?.split(' ')[0] || 'Bestie'
            return (
              <Link href="/browse" style={{ display: 'block', marginBottom: '20px', padding: '28px', borderRadius: '24px', background: 'linear-gradient(135deg, rgba(52,211,153,0.10) 0%, rgba(212,175,55,0.08) 100%)', border: '1px solid rgba(52,211,153,0.25)', textDecoration: 'none', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: '-40px', right: '-40px', width: '200px', height: '200px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(52,211,153,0.15) 0%, transparent 70%)', pointerEvents: 'none' }} />
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
                  <span style={{ width: '64px', height: '64px', borderRadius: '18px', background: 'rgba(52,211,153,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Users size={30} color="#34D399" strokeWidth={1.6} /></span>
                  <div style={{ flex: 1, minWidth: '140px' }}>
                    <p style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '2px', color: '#34D399', marginBottom: '4px' }}>WELCOME, {firstName.toUpperCase()}</p>
                    <h2 style={{ fontFamily: 'DM Serif Display, serif', fontSize: '22px', color: '#F0EAFF', marginBottom: '4px', lineHeight: 1.2 }}>Find your first Bestie</h2>
                    <p style={{ fontSize: '13px', color: '#A99ECC' }}>
                      {profile?.city
                        ? <>Browse people in {profile.city} — knock anonymously, match privately, meet IRL</>
                        : <>Browse real people nearby — knock anonymously, match privately, meet IRL</>}
                    </p>
                  </div>
                  <span style={{ padding: '12px 22px', borderRadius: '12px', fontSize: '14px', fontWeight: 700, background: 'linear-gradient(135deg, #34D399 0%, #2AAA75 100%)', color: '#09090F', whiteSpace: 'nowrap', flexShrink: 0, boxShadow: '0 4px 16px rgba(52,211,153,0.25)' }}>Browse Besties →</span>
                </div>
              </Link>
            )
          }

          // Free Today as hero (default)
          if (showFreeToday) {
            return (
              <div style={{ marginBottom: '20px', padding: '28px', borderRadius: '24px', background: iAmFree ? 'linear-gradient(135deg, rgba(52,211,153,0.12) 0%, rgba(52,211,153,0.04) 100%)' : 'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(212,175,55,0.04) 100%)', border: iAmFree ? '1px solid rgba(52,211,153,0.30)' : '1px solid rgba(212,175,55,0.20)', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: '-40px', right: '-40px', width: '180px', height: '180px', borderRadius: '50%', background: iAmFree ? 'radial-gradient(circle, rgba(52,211,153,0.16) 0%, transparent 70%)' : 'radial-gradient(circle, rgba(212,175,55,0.10) 0%, transparent 70%)', pointerEvents: 'none' }} />
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
                  <span style={{ width: '64px', height: '64px', borderRadius: '50%', background: iAmFree ? 'rgba(52,211,153,0.18)' : 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, position: 'relative' }}>
                    <span style={{ display: 'inline-block', width: '20px', height: '20px', borderRadius: '50%', background: iAmFree ? '#34D399' : 'transparent', border: iAmFree ? 'none' : '3px solid #A99ECC', boxShadow: iAmFree ? '0 0 20px rgba(52,211,153,0.7)' : 'none' }} />
                    {iAmFree && <span style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '2px solid rgba(52,211,153,0.4)', animation: 'pulse-free 2s ease-out infinite' }} />}
                  </span>
                  <div style={{ flex: 1, minWidth: '140px' }}>
                    <p style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '2px', color: iAmFree ? '#34D399' : '#D4AF37', marginBottom: '4px' }}>{iAmFree ? "YOU'RE LIVE TODAY" : 'SPONTANEOUS MEETUPS'}</p>
                    <h2 style={{ fontFamily: 'DM Serif Display, serif', fontSize: '22px', color: '#F0EAFF', marginBottom: '4px', lineHeight: 1.2 }}>{iAmFree ? 'Visible to Besties nearby' : 'Free for a meetup today?'}</h2>
                    <p style={{ fontSize: '13px', color: '#A99ECC' }}>
                      {freeInCityCount > 0
                        ? <><span style={{ color: '#34D399', fontWeight: 700 }}>{freeInCityCount}</span> {freeInCityCount === 1 ? 'Bestie is' : 'Besties are'} free{profile?.city ? ` in ${profile.city}` : ''} right now</>
                        : (profile?.city ? `Be the first in ${profile.city} today — others will see you on Pulse` : 'Let others know you\'re up for a meetup')
                      }
                    </p>
                  </div>
                  <button onClick={toggleFree} disabled={togglingFree} style={{ padding: '14px 28px', borderRadius: '14px', fontSize: '15px', fontWeight: 700, cursor: 'pointer', background: iAmFree ? 'rgba(255,107,53,0.12)' : 'linear-gradient(135deg, #34D399 0%, #2AAA75 100%)', border: iAmFree ? '1px solid rgba(255,107,53,0.35)' : 'none', color: iAmFree ? '#FF6B35' : '#09090F', whiteSpace: 'nowrap', flexShrink: 0, fontFamily: 'Plus Jakarta Sans, sans-serif', boxShadow: iAmFree ? 'none' : '0 4px 16px rgba(52,211,153,0.25)' }}>
                    {togglingFree ? '…' : iAmFree ? 'Turn off' : "I'm free!"}
                  </button>
                </div>
                <style>{`@keyframes pulse-free { 0% { transform: scale(1); opacity: 1 } 100% { transform: scale(1.8); opacity: 0 } }`}</style>
              </div>
            )
          }
          return null
        })()}

        {/* Streak strip */}
        <StreakStrip weeks={profile?.streak_weeks || 0} totalSessions={profile?.total_sessions || 0} />

        {/* Suggested crews — hidden if user is already in a crew or no match */}
        <SuggestedCrews />

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px', marginBottom: '24px' }}>
          <div style={{ background: '#111120', border: `1px solid ${scoreColor}25`, borderRadius: '20px', padding: '24px', textAlign: 'center' }}>
            <p style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '2px', color: '#A99ECC', marginBottom: '8px' }}>BESTIE SCORE</p>
            <div className="stat-number-lg" style={{ fontSize: '56px', fontWeight: 700, color: scoreColor, fontFamily: 'DM Serif Display, serif', lineHeight: 1 }}>{score}</div>
            <div style={{ height: '6px', borderRadius: '999px', background: 'rgba(255,255,255,0.10)', margin: '12px 0 8px', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${score / 10}%`, borderRadius: '999px', background: `linear-gradient(90deg, ${scoreColor} 0%, #D4AF37 100%)` }} />
            </div>
            <p style={{ fontSize: '12px', fontWeight: 600, color: scoreColor }}>{scoreLabel}</p>
          </div>
          <div style={{ background: '#111120', border: '1px solid rgba(255,255,255,0.10)', borderRadius: '20px', padding: '24px', textAlign: 'center' }}>
            <p style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '2px', color: '#A99ECC', marginBottom: '8px' }}>SESSIONS</p>
            <div className="stat-number-lg" style={{ fontSize: '56px', fontWeight: 700, color: '#F0EAFF', fontFamily: 'DM Serif Display, serif', lineHeight: 1 }}>{profile?.total_sessions || 0}</div>
            <p style={{ fontSize: '12px', color: '#A99ECC', marginTop: '12px' }}>completed</p>
          </div>
          <div style={{ background: '#111120', border: '1px solid rgba(255,255,255,0.10)', borderRadius: '20px', padding: '24px', textAlign: 'center' }}>
            <p style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '2px', color: '#A99ECC', marginBottom: '8px' }}>RATING</p>
            <div className="stat-number-lg" style={{ fontSize: '56px', fontWeight: 700, color: '#D4AF37', fontFamily: 'DM Serif Display, serif', lineHeight: 1 }}>{profile?.avg_rating ? profile.avg_rating.toFixed(1) : '—'}</div>
            <p style={{ fontSize: '12px', color: '#A99ECC', marginTop: '12px' }}>avg rating</p>
          </div>
          <div style={{ background: '#111120', border: '1px solid rgba(255,255,255,0.10)', borderRadius: '20px', padding: '24px', textAlign: 'center' }}>
            <p style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '2px', color: '#A99ECC', marginBottom: '8px' }}>LOCATION</p>
            <div style={{ marginBottom: '8px', display: 'flex', justifyContent: 'center' }}><MapPin size={26} color="#D4AF37" strokeWidth={1.8} /></div>
            <p style={{ fontSize: '16px', fontWeight: 600, color: '#F0EAFF' }}>{profile?.city || 'Not set'}</p>
            <p style={{ fontSize: '12px', color: '#A99ECC', marginTop: '4px' }}>{profile?.country || 'Add your city'}</p>
          </div>
        </div>

        {/* Eterotype result */}
        {profile?.eterotype && (
          <div style={{ marginBottom: '24px', background: '#111120', border: '1px solid rgba(155,143,255,0.25)', borderRadius: '20px', padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <span style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'rgba(212,175,55,0.10)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '22px' }}>🧭</span>
              <div>
                <p style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '1.5px', color: '#9B7FFF', marginBottom: '4px' }}>ETEROTYPE</p>
                <p style={{ fontSize: '16px', fontWeight: 700, color: '#F0EAFF', fontFamily: 'DM Serif Display, serif', textTransform: 'capitalize' }}>
                  {profile.eterotype_name || profile.eterotype}{profile.eterotype_family ? ` · ${profile.eterotype_family}` : ''}{profile.eterotype_collective ? ` · ${profile.eterotype_collective}` : ''}
                </p>
              </div>
            </div>
            <Link href="/bestie-type" style={{ padding: '8px 18px', borderRadius: '12px', fontSize: '13px', fontWeight: 600, background: 'rgba(255,255,255,0.10)', border: '1px solid rgba(255,255,255,0.1)', color: '#A99ECC', textDecoration: 'none' }}>
              Retake test
            </Link>
          </div>
        )}

        {/* Compact Free Today — only shown when Free Today is NOT the hero (i.e. hero is currently knocks or memories) */}
        {profile?.bestie_type_completed && (pendingKnocks.length > 0 || pendingMemories.length > 0) && (
          <div style={{ marginBottom: '20px', padding: '14px 18px', borderRadius: '14px', background: iAmFree ? 'rgba(52,211,153,0.06)' : '#111120', border: iAmFree ? '1px solid rgba(52,211,153,0.25)' : '1px solid rgba(255,255,255,0.11)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ display: 'inline-flex', width: '12px', height: '12px', borderRadius: '50%', background: iAmFree ? '#34D399' : 'transparent', border: iAmFree ? 'none' : '2px solid #A99ECC', boxShadow: iAmFree ? '0 0 12px rgba(52,211,153,0.7)' : 'none' }} />
              <div>
                <p style={{ fontSize: '14px', fontWeight: 700, color: iAmFree ? '#34D399' : '#F0EAFF' }}>{iAmFree ? "You're free today" : 'Free today?'}</p>
                <p style={{ fontSize: '12px', color: '#A99ECC' }}>
                  {freeInCityCount > 0
                    ? <><span style={{ color: '#34D399', fontWeight: 600 }}>{freeInCityCount}</span> {freeInCityCount === 1 ? 'Bestie' : 'Besties'} free nearby</>
                    : (iAmFree ? 'Visible on Pulse & Map' : "Let others know you're up for a meetup")
                  }
                </p>
              </div>
            </div>
            <button onClick={toggleFree} disabled={togglingFree} style={{ padding: '8px 18px', borderRadius: '10px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', background: iAmFree ? 'rgba(255,107,53,0.1)' : 'rgba(52,211,153,0.12)', border: iAmFree ? '1px solid rgba(255,107,53,0.3)' : '1px solid rgba(52,211,153,0.35)', color: iAmFree ? '#FF6B35' : '#34D399', whiteSpace: 'nowrap' }}>
              {togglingFree ? '…' : iAmFree ? 'Turn off' : "I'm free!"}
            </button>
          </div>
        )}

        {/* Knocks panel — only when knocks is NOT the hero (i.e. bestie_type quiz is the hero instead) */}
        {pendingKnocks.length > 0 && !profile?.bestie_type_completed && (
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

        {/* Pending session memories — hidden when it's currently the hero (no knocks AND quiz complete) */}
        {pendingMemories.length > 0 && (!profile?.bestie_type_completed || pendingKnocks.length > 0) && (
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
                <p style={{ fontSize: '14px', color: '#A99ECC', marginBottom: '16px', maxWidth: '280px', margin: '0 auto 16px', lineHeight: 1.5 }}>You're not in any crew yet — crews are little communities for shared vibes, meetups, and events.</p>
                <ButtonLink href="/crews" variant="primary" size="sm">Find a Crew</ButtonLink>
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
                <p style={{ fontSize: '13px', color: '#A99ECC' }}>You <strong style={{ color: '#D4AF37' }}>both</strong> get +10 Sparks ⚡ when a friend joins with your link</p>
              </div>
              {referredCount > 0 && (
                <div style={{ padding: '6px 14px', borderRadius: '999px', background: 'rgba(212,175,55,0.1)', border: '1px solid rgba(212,175,55,0.25)', fontSize: '13px', fontWeight: 700, color: '#D4AF37' }}>
                  {referredCount} invited · +{referredCount * 10} Sparks earned
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: '200px', padding: '10px 16px', borderRadius: '12px', background: '#131323', border: '1px solid rgba(255,255,255,0.12)', fontSize: '13px', color: '#A99ECC', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                bestiehere.com/signup?ref={profile.referral_code}
              </div>
              <Button onClick={handleShareRef} variant="primary" size="sm" style={{ whiteSpace: 'nowrap', flexShrink: 0 }}>
                <Share2 size={15} strokeWidth={2.2} /> Share
              </Button>
              <button onClick={handleCopyRef} style={{ padding: '10px 18px', borderRadius: '12px', fontSize: '14px', fontWeight: 600, background: refCopied ? 'rgba(57,255,20,0.15)' : 'rgba(255,255,255,0.05)', border: refCopied ? '1px solid rgba(57,255,20,0.3)' : '1px solid rgba(255,255,255,0.12)', color: refCopied ? '#34D399' : '#A99ECC', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}>
                {refCopied ? '✓ Copied!' : 'Copy'}
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
