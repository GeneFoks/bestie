// @ts-nocheck
'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { showToast } from '@/components/Toast'
import { confirmSheet } from '@/components/ConfirmSheet'
import { ActivityIcon } from '@/lib/activityIcons'
import { celebrate, buzz } from '@/lib/celebrate'

// ---------------------------------------------------------------------------
// Activity labels (mirror of the create-form list — for toasts & headers)
// ---------------------------------------------------------------------------
const ACTIVITY_LABELS = {
  hiking: 'Hiking', running: 'Running', gym_partner: 'Gym Partner', cycling: 'Cycling',
  yoga: 'Yoga', climbing: 'Climbing', pickleball: 'Pickleball',
  game_night: 'Game Night', movie_night: 'Movie Night', night_out: 'Night Out', karaoke: 'Karaoke',
  festival_crew: 'Festival Crew', travel_buddy: 'Travel Buddy', burning_man: 'Burning Man',
  deep_chat: 'Deep Chat', book_club: 'Book Club', debate_club: 'Debate Club',
  language_exchange: 'Language Exchange', life_coaching: 'Life Coaching',
  cooking_together: 'Cooking Together', dance: 'Dance', art_together: 'Art Together', music_lesson: 'Music Lesson',
  meditation_circle: 'Meditation Circle', breathwork: 'Breathwork', cacao_ceremony: 'Cacao Ceremony',
  sound_healing: 'Sound Healing', girls_circle: 'Girls Circle', mens_circle: "Men's Circle",
  coffee_chat: 'Coffee Chat', coworking: 'Coworking', digital_detox_walk: 'Digital Detox Walk',
}
const activityLabel = (t) =>
  ACTIVITY_LABELS[t] || (t ? t.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) : 'Quest')

// ---------------------------------------------------------------------------
// Fire visual config — same light-not-flames language as /world:
// ground light pool + halo + breathing white-amber cores + rising sparks.
// ---------------------------------------------------------------------------
const FLAME_CFG = {
  blazing: {
    glow: 175, glowCore: 0.4,
    pool: { w: 120, h: 34, o: 0.34 },
    cores: [{ s: 16, dur: 2.3, o: 0.9 }, { s: 9, dur: 1.5, o: 1 }],
    sparks: 3,
  },
  steady: {
    glow: 120, glowCore: 0.3,
    pool: { w: 88, h: 26, o: 0.26 },
    cores: [{ s: 12, dur: 2.9, o: 0.85 }, { s: 7, dur: 1.9, o: 1 }],
    sparks: 2,
  },
  dim: {
    glow: 58, glowCore: 0.14,
    pool: { w: 46, h: 15, o: 0.12 },
    cores: [{ s: 7, dur: 4.6, o: 0.7, dim: true }],
    sparks: 0,
  },
  ash: { glow: 0, glowCore: 0, pool: null, cores: [], sparks: 0 },
  unlit: { glow: 0, glowCore: 0, pool: null, cores: [], sparks: 0 },
}

const STATE_LABEL = {
  blazing: 'Blazing — full crew today',
  steady: 'Steady — some checked in today',
  dim: 'Dim — no one yet today',
  ash: 'Ash — the fire went cold',
  unlit: 'Unlit — waiting for the first spark',
}

// Local date as YYYY-MM-DD (matches Postgres `date` string format)
const dstr = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

const initialsOf = (name) =>
  (name || '?').trim().split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase()

// ---------------------------------------------------------------------------
// The fire scene — a cinematic header, CSS keyframes only
// ---------------------------------------------------------------------------
function FireScene({ state }) {
  const cfg = FLAME_CFG[state] || FLAME_CFG.steady
  const isAsh = state === 'ash'
  const isUnlit = state === 'unlit'
  return (
    <div style={{ position: 'relative', height: 210, borderRadius: 20, overflow: 'hidden', border: '1px solid var(--border)', background: 'linear-gradient(to bottom, #061009 0%, #07120C 45%, #0A130D 100%)' }}>
      <style>{`
        @media (prefers-reduced-motion: no-preference) {
          .qf-core { animation-name: qfBreathe; animation-iteration-count: infinite; animation-timing-function: ease-in-out; }
          .qf-core-dim { animation-name: qfBreatheDim; animation-iteration-count: infinite; animation-timing-function: ease-in-out; }
          .qf-spark { animation-name: qfSpark; animation-iteration-count: infinite; animation-timing-function: ease-out; }
          .qf-ember { animation: qfEmber 4s ease-in-out infinite; }
        }
        @keyframes qfBreathe {
          0%, 100% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
          23% { transform: translate(-50%, -50%) scale(1.14); opacity: 0.82; }
          47% { transform: translate(-50%, -50%) scale(0.93); opacity: 1; }
          71% { transform: translate(-50%, -50%) scale(1.08); opacity: 0.88; }
        }
        @keyframes qfBreatheDim {
          0%, 100% { transform: translate(-50%, -50%) scale(1); opacity: 0.55; }
          50% { transform: translate(-50%, -50%) scale(1.1); opacity: 0.8; }
        }
        @keyframes qfSpark {
          0% { transform: translate(0, 0); opacity: 0; }
          12% { opacity: 0.9; }
          70% { opacity: 0.5; }
          100% { transform: translate(var(--sx, 4px), -34px); opacity: 0; }
        }
        @keyframes qfEmber { 0%, 100% { opacity: 0.12; } 50% { opacity: 0.9; } }
      `}</style>

      {/* dawn glow on the horizon */}
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 80% 46% at 50% 18%, rgba(232,199,102,0.12), rgba(43,92,84,0.1) 45%, transparent 70%)', pointerEvents: 'none' }} />

      {/* the fire, scaled up as a hero */}
      <div style={{ position: 'absolute', left: '50%', bottom: 4, width: 130, height: 108, transform: 'translateX(-50%) scale(1.55)', transformOrigin: '50% 88%' }}>
        {/* warm ground glow */}
        {!isAsh && !isUnlit && (
          <div style={{ position: 'absolute', left: 65, top: 46, width: cfg.glow, height: cfg.glow, transform: 'translate(-50%, -50%)', borderRadius: '50%', background: `radial-gradient(circle, rgba(255,150,60,${cfg.glowCore}) 0%, rgba(255,110,40,${(cfg.glowCore * 0.35).toFixed(3)}) 45%, rgba(255,110,40,0) 72%)`, pointerEvents: 'none' }} />
        )}

        {/* crossed logs (cold + desaturated when unlit) */}
        {!isAsh && (
          <>
            <div style={{ position: 'absolute', left: 65, top: 52, width: 27, height: 5, borderRadius: 3, background: isUnlit ? '#2A2620' : '#4A2F1D', transform: 'translate(-50%, -50%) rotate(21deg)' }} />
            <div style={{ position: 'absolute', left: 65, top: 52, width: 27, height: 5, borderRadius: 3, background: isUnlit ? '#241F1A' : '#3D2716', transform: 'translate(-50%, -50%) rotate(-23deg)' }} />
          </>
        )}

        {/* unlit pit: a quiet stone ring waiting for the first check-in */}
        {isUnlit && [0, 1, 2, 3, 4, 5].map((k) => {
          const a = (k / 6) * Math.PI * 2
          return (
            <div key={k} style={{ position: 'absolute', left: 65 + Math.cos(a) * 17, top: 53 + Math.sin(a) * 8, width: 6, height: 4.5, transform: 'translate(-50%, -50%)', borderRadius: '50%', background: '#3A3F3A', boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.06)' }} />
          )
        })}

        {isAsh ? (
          <>
            <div style={{ position: 'absolute', left: 65, top: 54, width: 27, height: 11, transform: 'translate(-50%, -100%)', borderRadius: '50% 50% 8% 8%', background: '#33332F', boxShadow: 'inset 0 3px 4px rgba(255,255,255,0.04)' }} />
            <div className="qf-ember" style={{ position: 'absolute', left: 63, top: 45, width: 3, height: 3, borderRadius: '50%', background: '#FF9A3C', boxShadow: '0 0 6px rgba(255,154,60,0.8)', opacity: 0.12 }} />
          </>
        ) : (
          <>
            {/* warm light pooling on the ground */}
            {cfg.pool && (
              <div style={{ position: 'absolute', left: 65, top: 57, width: cfg.pool.w, height: cfg.pool.h, transform: 'translate(-50%, -50%)', borderRadius: '50%', background: `radial-gradient(ellipse at center, rgba(255,166,88,${cfg.pool.o}) 0%, rgba(214,120,50,${(cfg.pool.o * 0.4).toFixed(3)}) 48%, transparent 74%)`, pointerEvents: 'none' }} />
            )}
            {/* breathing white-amber cores */}
            {cfg.cores.map((c, j) => (
              <div key={j} className={c.dim ? 'qf-core-dim' : 'qf-core'}
                style={{
                  position: 'absolute', left: 65, top: 47 - j * 2, width: c.s, height: c.s,
                  transform: 'translate(-50%, -50%)', borderRadius: '50%',
                  background: c.dim
                    ? 'radial-gradient(circle, #E8B87E 0%, rgba(169,127,85,0.7) 55%, transparent 100%)'
                    : 'radial-gradient(circle, #FFF6E3 0%, #FFC46B 45%, rgba(255,122,47,0.55) 75%, transparent 100%)',
                  boxShadow: c.dim
                    ? '0 0 8px 2px rgba(200,150,90,0.3)'
                    : `0 0 ${10 + c.s}px ${3 + c.s * 0.3}px rgba(255,170,80,0.45)`,
                  opacity: c.o, animationDuration: `${c.dur}s`, animationDelay: `${(j * 0.29).toFixed(2)}s`, pointerEvents: 'none',
                }}
              />
            ))}
            {/* spark motes drifting up */}
            {Array.from({ length: cfg.sparks }, (_, j) => (
              <div key={`s${j}`} className="qf-spark"
                style={{
                  position: 'absolute', left: 63 + j * 3, top: 44, width: 2, height: 2, borderRadius: '50%',
                  background: '#FFC46B', boxShadow: '0 0 4px rgba(255,196,107,0.8)',
                  '--sx': `${(j - 1) * 7}px`,
                  animationDuration: `${(1.9 + j * 0.45).toFixed(2)}s`, animationDelay: `${(j * 0.7).toFixed(2)}s`,
                  opacity: 0, pointerEvents: 'none',
                }}
              />
            ))}
          </>
        )}
      </div>

      {/* state chip */}
      <div style={{ position: 'absolute', top: 12, left: 12, fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', color: isAsh || isUnlit ? '#A99ECC' : '#E8C766', border: `1px ${isUnlit ? 'dashed' : 'solid'} ${isAsh || isUnlit ? 'rgba(255,255,255,0.15)' : 'rgba(212,175,55,0.4)'}`, borderRadius: 999, padding: '4px 10px', background: 'rgba(5,11,8,0.5)', backdropFilter: 'blur(4px)' }}>
        {STATE_LABEL[state] || ''}
      </div>

      {/* vignette */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: 'radial-gradient(ellipse 110% 95% at 50% 45%, transparent 55%, rgba(0,0,0,0.35) 100%)' }} />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default function QuestPage() {
  const router = useRouter()
  const params = useParams()
  const questId = params?.id

  const [me, setMe] = useState(null)
  const [quest, setQuest] = useState(null)
  const [members, setMembers] = useState([])
  const [checkins, setCheckins] = useState([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [busy, setBusy] = useState(false)

  const load = async () => {
    const { data: q, error } = await supabase.from('quests').select('*').eq('id', questId).single()
    if (error || !q) { setNotFound(true); setLoading(false); return }
    setQuest(q)
    const since = dstr(new Date(Date.now() - 13 * 86400000))
    const [{ data: mems }, { data: cks }] = await Promise.all([
      supabase.from('quest_members')
        .select('user_id, joined_at, user:users!user_id(id, full_name, avatar_url, username)')
        .eq('quest_id', questId).order('joined_at', { ascending: true }),
      supabase.from('quest_checkins')
        .select('user_id, day, reps')
        .eq('quest_id', questId).gte('day', since),
    ])
    setMembers(mems || [])
    setCheckins(cks || [])
    setLoading(false)
  }

  useEffect(() => {
    if (!questId) return
    supabase.auth.getUser().then(({ data: { user } }) => setMe(user?.id || null))
    load()
  }, [questId])

  // ── Fire state + streak, computed per the quests contract ────────────────
  const { state, visualState, streak, todaySet } = useMemo(() => {
    const todayStr = dstr(new Date())
    const yestStr = dstr(new Date(Date.now() - 86400000))
    const byDay = {}
    for (const c of checkins) {
      if (!byDay[c.day]) byDay[c.day] = new Set()
      byDay[c.day].add(c.user_id)
    }
    const n = members.length
    const today = byDay[todayStr] || new Set()
    let st
    if (n > 0 && today.size >= n) st = 'blazing'
    else if (today.size > 0) st = 'steady'
    else if ((byDay[yestStr]?.size || 0) > 0) st = 'dim'
    else st = 'ash'
    // streak = consecutive days (ending today or yesterday) where EVERY member checked in
    const isFull = (ds) => n > 0 && (byDay[ds]?.size || 0) >= n
    let count = 0
    let d = new Date()
    if (!isFull(dstr(d))) d = new Date(d.getTime() - 86400000)
    while (isFull(dstr(d))) { count++; d = new Date(d.getTime() - 86400000) }
    // a fresh fire with zero check-ins ever renders as an unlit pit, not ash
    const vis = checkins.length === 0 ? 'unlit' : st
    return { state: st, visualState: vis, streak: count, todaySet: today }
  }, [members, checkins])

  const iAmMember = !!me && members.some((m) => m.user_id === me)
  const iCheckedToday = !!me && todaySet.has(me)
  const isHost = !!me && quest?.creator_id === me
  const label = activityLabel(quest?.activity_type)

  // ── Actions ──────────────────────────────────────────────────────────────
  const handleCheckin = async () => {
    if (busy) return
    setBusy(true)
    const { data: res, error } = await supabase.rpc('quest_checkin', { p_quest_id: questId })
    setBusy(false)
    if (error || !res) {
      console.error('Checkin error:', error)
      showToast("Couldn't check in — try again", { type: 'error' })
      return
    }
    if (res.status === 'already') { showToast('Already checked in today', { type: 'info' }); return }
    if (res.status === 'not_member') { showToast('Join this fire first to check in', { type: 'info' }); return }
    if (res.status === 'checked') {
      celebrate({ count: res.new_level ? 90 : 44, spread: 85 })
      buzz('success')
      if (res.day_complete) showToast(`Full team today — everyone counts ×${res.team_size}! 🔥`, { type: 'success' })
      if (res.new_level) {
        const roman = ['I', 'II', 'III'][res.new_level - 1] || String(res.new_level)
        const sparks = [5, 15, 50][res.new_level - 1] || 0
        showToast(`${activityLabel(res.activity_type)} badge → level ${roman}! +${sparks} ✨`, { type: 'success' })
      }
      if (!res.day_complete && !res.new_level) showToast('Checked in — keep it burning 🔥', { type: 'success' })
      await load()
    }
  }

  const handleJoin = async () => {
    if (!me) { router.push('/login'); return }
    if (busy) return
    setBusy(true)
    const { data: res, error } = await supabase.rpc('quest_join', { p_quest_id: questId })
    setBusy(false)
    if (error) {
      console.error('Join quest error:', error)
      showToast("Couldn't join — try again", { type: 'error' })
      return
    }
    if (res === 'not_found') { showToast('This fire is gone', { type: 'error' }); return }
    if (res === 'joined') {
      celebrate()
      buzz('success')
      showToast('You joined this fire · +2 ✨', { type: 'success' })
    }
    await load()
  }

  const handleShare = async () => {
    const url = window.location.href
    try {
      await navigator.clipboard.writeText(url)
      showToast('Link copied — send it to your crew', { type: 'success' })
    } catch {
      showToast(url, { type: 'info' })
    }
  }

  const handleDeactivate = async () => {
    const ok = await confirmSheet({
      title: 'Let this fire go out?',
      body: 'The quest closes for everyone. Badges and sparks already earned stay earned.',
      confirmLabel: 'Let it fade',
      danger: true,
    })
    if (!ok) return
    const { error } = await supabase.from('quests').update({ is_active: false }).eq('id', questId)
    if (error) {
      console.error('Deactivate quest error:', error)
      showToast("Couldn't close the quest — try again", { type: 'error' })
      return
    }
    showToast('The fire has gone out', { type: 'info' })
    router.push('/quests')
  }

  // ── Render ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
        <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>Gathering embers...</p>
      </div>
    )
  }

  if (notFound || !quest) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px', fontFamily: 'Plus Jakarta Sans, sans-serif', padding: '24px' }}>
        <p style={{ fontSize: '15px', color: 'var(--text-primary)', textAlign: 'center' }}>This fire doesn't exist — or it has gone out.</p>
        <Link href="/quests" style={{ fontSize: '14px', color: '#D4AF37', textDecoration: 'none', padding: '10px 18px', borderRadius: '12px', border: '1px solid rgba(212,175,55,0.4)' }}>← Back to quests</Link>
      </div>
    )
  }

  const closed = !quest.is_active

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
      <nav style={{ position: 'sticky', top: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', background: 'var(--nav-bg)', backdropFilter: 'blur(20px)', borderBottom: '1px solid var(--border)' }}>
        <Link href="/" style={{ fontFamily: 'DM Serif Display, serif', fontSize: '20px', fontWeight: 700, color: '#D4AF37', textDecoration: 'none' }}>BESTIE</Link>
        <Link href="/quests" style={{ fontSize: '14px', color: 'var(--text-muted)', textDecoration: 'none', padding: '8px 16px', borderRadius: '10px', border: '1px solid var(--border)' }}>← Quests</Link>
      </nav>

      <div style={{ maxWidth: '560px', margin: '0 auto', padding: '24px 24px 56px' }}>
        {/* 1 — Fire visual header */}
        <FireScene state={closed ? 'ash' : visualState} />

        {/* 2 — Title + activity */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '22px', marginBottom: '6px' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 40, height: 40, borderRadius: '12px', background: 'rgba(212,175,55,0.1)', border: '1px solid rgba(212,175,55,0.3)', color: '#D4AF37', flexShrink: 0 }}>
            <ActivityIcon type={quest.activity_type} size={20} />
          </span>
          <div style={{ minWidth: 0 }}>
            <h1 style={{ fontFamily: 'DM Serif Display, serif', fontSize: '24px', color: 'var(--text-primary)', margin: 0, lineHeight: 1.2 }}>{quest.title}</h1>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '2px 0 0' }}>{label} quest</p>
          </div>
        </div>

        {/* 3 — Streak line */}
        <p style={{ fontSize: '14px', color: streak > 0 ? '#D4AF37' : 'var(--text-muted)', fontWeight: streak > 0 ? 700 : 400, margin: '10px 0 22px' }}>
          {closed
            ? 'This quest is closed — the fire has gone out.'
            : streak > 0
            ? `🔥 Burning ${streak} ${streak === 1 ? 'day' : 'days'} straight`
            : 'Not lit yet — first full day lights it'}
        </p>

        {/* 4 — Members row */}
        <p style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '1.5px', color: 'var(--text-muted)', marginBottom: '10px' }}>
          KEEPERS OF THIS FLAME · {members.length}
        </p>
        <div style={{ display: 'flex', gap: '14px', overflowX: 'auto', paddingBottom: '6px', marginBottom: '24px' }}>
          {members.map((m) => {
            const u = m.user || {}
            const checked = todaySet.has(m.user_id)
            return (
              <div key={m.user_id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', flexShrink: 0, width: 56 }}>
                <div style={{ position: 'relative' }}>
                  {u.avatar_url ? (
                    <img src={u.avatar_url} alt="" style={{ width: 46, height: 46, borderRadius: '50%', objectFit: 'cover', border: checked ? '2px solid #34D399' : '2px solid var(--border)', display: 'block' }} />
                  ) : (
                    <span style={{ width: 46, height: 46, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: '#FFD9A0', background: 'rgba(255,217,160,0.1)', border: checked ? '2px solid #34D399' : '2px solid rgba(255,217,160,0.35)', boxSizing: 'border-box' }}>
                      {initialsOf(u.full_name || u.username)}
                    </span>
                  )}
                  {checked && (
                    <span title="Checked in today" style={{ position: 'absolute', bottom: 0, right: 0, width: 13, height: 13, borderRadius: '50%', background: '#34D399', border: '2px solid var(--bg)', boxShadow: '0 0 6px rgba(52,211,153,0.6)' }} />
                  )}
                </div>
                <span style={{ fontSize: '10px', color: 'var(--text-muted)', maxWidth: 56, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'center' }}>
                  {(u.full_name || u.username || '').split(' ')[0]}{m.user_id === quest.creator_id ? ' ⭐' : ''}
                </span>
              </div>
            )
          })}
        </div>

        {/* 5 — THE BUTTON */}
        {!closed && (
          iAmMember ? (
            <button onClick={handleCheckin} disabled={busy}
              style={iCheckedToday
                ? { width: '100%', padding: '15px', borderRadius: '14px', fontSize: '15px', fontWeight: 700, background: 'rgba(52,211,153,0.08)', color: '#34D399', border: '1px solid rgba(52,211,153,0.4)', cursor: 'pointer' }
                : { width: '100%', padding: '15px', borderRadius: '14px', fontSize: '15px', fontWeight: 700, background: 'linear-gradient(135deg, #E5C558, #D4AF37)', color: '#141007', border: 'none', cursor: busy ? 'wait' : 'pointer', boxShadow: '0 4px 18px rgba(212,175,55,0.25)' }}>
              {busy ? 'One moment...' : iCheckedToday ? "Done today ✓ · you're in" : 'Done today ✓'}
            </button>
          ) : (
            <button onClick={handleJoin} disabled={busy}
              style={{ width: '100%', padding: '15px', borderRadius: '14px', fontSize: '15px', fontWeight: 700, background: 'linear-gradient(135deg, #E5C558, #D4AF37)', color: '#141007', border: 'none', cursor: busy ? 'wait' : 'pointer', boxShadow: '0 4px 18px rgba(212,175,55,0.25)' }}>
              {busy ? 'One moment...' : 'Join this fire · +2 ✨'}
            </button>
          )
        )}
        {!closed && iAmMember && (
          <p style={{ fontSize: '11px', color: 'var(--text-muted)', textAlign: 'center', margin: '10px 0 0', lineHeight: 1.5 }}>
            A day when the whole crew checks in keeps the streak — and counts ×{Math.max(members.length, 1)} for everyone.
          </p>
        )}

        {/* 6 — Share + host controls */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '22px' }}>
          <button onClick={handleShare}
            style={{ width: '100%', padding: '12px', borderRadius: '12px', fontSize: '13px', fontWeight: 600, background: 'var(--surface-1)', color: 'var(--text-primary)', border: '1px solid var(--border)', cursor: 'pointer' }}>
            🔗 Share this fire
          </button>
          {isHost && !closed && (
            <button onClick={handleDeactivate}
              style={{ width: '100%', padding: '12px', borderRadius: '12px', fontSize: '13px', fontWeight: 600, background: 'transparent', color: 'var(--text-muted)', border: '1px dashed var(--border)', cursor: 'pointer' }}>
              Let the fire go out
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
