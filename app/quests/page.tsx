// @ts-nocheck
'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { ActivityIcon } from '@/lib/activityIcons'

// Fire state → dot color + label (same contract as the quest page)
const STATE_META = {
  blazing: { color: '#FF9A3C', label: 'Blazing' },
  steady: { color: '#E8C766', label: 'Steady' },
  dim: { color: '#94856B', label: 'Dim' },
  ash: { color: '#5A5A55', label: 'Ash' },
}

// Local date as YYYY-MM-DD (matches Postgres `date` string format)
const dstr = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

export default function QuestsPage() {
  const router = useRouter()
  const [quests, setQuests] = useState([])
  const [states, setStates] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { router.push('/login'); return }
      const { data: rows, error } = await supabase.from('quest_members')
        .select('quest_id, joined_at, quest:quests!inner(id, title, activity_type, is_active, created_at, members:quest_members(count))')
        .eq('user_id', user.id)
        .eq('quest.is_active', true)
        .order('joined_at', { ascending: false })
      if (error) console.error('Load quests error:', error)
      const list = (rows || []).map((r) => r.quest).filter((q) => q && q.is_active)
      setQuests(list)

      // Fire state per quest from today's + yesterday's check-ins
      if (list.length > 0) {
        const todayStr = dstr(new Date())
        const yestStr = dstr(new Date(Date.now() - 86400000))
        const { data: cks } = await supabase.from('quest_checkins')
          .select('quest_id, user_id, day')
          .in('quest_id', list.map((q) => q.id))
          .gte('day', yestStr)
        const byQuest = {}
        for (const c of cks || []) {
          if (!byQuest[c.quest_id]) byQuest[c.quest_id] = { today: new Set(), yesterday: new Set() }
          if (c.day === todayStr) byQuest[c.quest_id].today.add(c.user_id)
          else if (c.day === yestStr) byQuest[c.quest_id].yesterday.add(c.user_id)
        }
        const map = {}
        for (const q of list) {
          const n = q.members?.[0]?.count || 0
          const b = byQuest[q.id] || { today: new Set(), yesterday: new Set() }
          if (n > 0 && b.today.size >= n) map[q.id] = 'blazing'
          else if (b.today.size > 0) map[q.id] = 'steady'
          else if (b.yesterday.size > 0) map[q.id] = 'dim'
          else map[q.id] = 'ash'
        }
        setStates(map)
      }
      setLoading(false)
    })
  }, [])

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
      <nav style={{ position: 'sticky', top: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', background: 'var(--nav-bg)', backdropFilter: 'blur(20px)', borderBottom: '1px solid var(--border)' }}>
        <Link href="/" style={{ fontFamily: 'DM Serif Display, serif', fontSize: '20px', fontWeight: 700, color: '#D4AF37', textDecoration: 'none' }}>BESTIE</Link>
        <Link href="/world" style={{ fontSize: '14px', color: 'var(--text-muted)', textDecoration: 'none', padding: '8px 16px', borderRadius: '10px', border: '1px solid var(--border)' }}>← World</Link>
      </nav>

      <div style={{ maxWidth: '560px', margin: '0 auto', padding: '40px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '12px', marginBottom: '28px' }}>
          <div>
            <p style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '2px', color: '#D4AF37', marginBottom: '8px' }}>QUESTS</p>
            <h1 style={{ fontFamily: 'DM Serif Display, serif', fontSize: '28px', color: 'var(--text-primary)', margin: 0 }}>My fires</h1>
          </div>
          {quests.length > 0 && (
            <Link href="/quests/new" style={{ fontSize: '13px', fontWeight: 700, color: '#141007', textDecoration: 'none', padding: '10px 16px', borderRadius: '12px', background: 'linear-gradient(135deg, #E5C558, #D4AF37)', whiteSpace: 'nowrap', flexShrink: 0 }}>
              + New fire
            </Link>
          )}
        </div>

        {loading ? (
          <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>Gathering embers...</p>
        ) : quests.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '56px 20px', borderRadius: '20px', background: 'var(--surface-1)', border: '1px dashed var(--border)' }}>
            <div style={{ fontSize: '40px', marginBottom: '12px', filter: 'grayscale(0.6)', opacity: 0.7 }}>🔥</div>
            <p style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px' }}>No fires yet</p>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.6, maxWidth: '340px', margin: '0 auto 22px' }}>
              A quest is a daily habit you keep alive with friends. Light one, share the link, and check in together to keep it burning.
            </p>
            <Link href="/quests/new" style={{ display: 'inline-block', fontSize: '14px', fontWeight: 700, color: '#141007', textDecoration: 'none', padding: '13px 22px', borderRadius: '14px', background: 'linear-gradient(135deg, #E5C558, #D4AF37)', boxShadow: '0 4px 18px rgba(212,175,55,0.25)' }}>
              🔥 Light your first fire
            </Link>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {quests.map((q) => {
              const st = states[q.id] || 'ash'
              const meta = STATE_META[st]
              const count = q.members?.[0]?.count || 0
              return (
                <Link key={q.id} href={`/quests/${q.id}`}
                  style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '16px 18px', borderRadius: '16px', background: 'var(--surface-1)', border: '1px solid var(--border)', textDecoration: 'none' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 40, height: 40, borderRadius: '12px', background: 'rgba(212,175,55,0.1)', border: '1px solid rgba(212,175,55,0.3)', color: '#D4AF37', flexShrink: 0 }}>
                    <ActivityIcon type={q.activity_type} size={20} />
                  </span>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: 'block', fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{q.title}</span>
                    <span style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                      {count} {count === 1 ? 'keeper' : 'keepers'} · {meta.label}
                    </span>
                  </span>
                  <span title={meta.label} style={{ width: 10, height: 10, borderRadius: '50%', background: meta.color, boxShadow: st === 'ash' ? 'none' : `0 0 8px ${meta.color}99`, flexShrink: 0 }} />
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
