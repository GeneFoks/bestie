// @ts-nocheck
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Crown, Shield, MoreVertical } from 'lucide-react'
import { showToast } from '@/components/Toast'

type Role = 'captain' | 'moderator' | 'member'

type Props = {
  crewId: string
  captainId: string
  memberUserId: string
  memberName: string
  currentRole: Role
  currentLevel?: number
  modIds?: string[]
}

/**
 * Inline dropdown shown next to each crew member in the members list.
 * Captain: promote/demote moderators AND set the member's level (1–6).
 * Moderators: set levels only (never roles, never the captain's row).
 * Level changes go through the set_crew_member_level RPC so the DB
 * enforces who may change what.
 */
export default function CrewRoleManager({ crewId, captainId, memberUserId, memberName, currentRole, currentLevel = 1, modIds = [] }: Props) {
  const router = useRouter()
  const [viewerId, setViewerId] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const [acting, setActing] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setViewerId(session?.user?.id ?? null)
    })
  }, [])

  // close on outside click
  useEffect(() => {
    if (!open) return
    const h = () => setOpen(false)
    document.addEventListener('click', h)
    return () => document.removeEventListener('click', h)
  }, [open])

  // Captain manages roles + levels; moderators manage levels only.
  // Nobody manages their own row or the captain's row.
  const isCaptain = viewerId === captainId
  const isMod = !!viewerId && modIds.includes(viewerId)
  if ((!isCaptain && !isMod) || memberUserId === viewerId || currentRole === 'captain') return null

  const setLevel = async (lvl: number) => {
    setActing(true)
    const { error } = await supabase.rpc('set_crew_member_level', {
      p_crew: crewId,
      p_user: memberUserId,
      p_level: lvl,
    })
    setActing(false)
    setOpen(false)
    if (error) {
      console.error('Level change failed:', error)
      showToast("Couldn't change the level — try again", { type: 'error' })
      return
    }
    showToast(`${memberName} → Level ${lvl} ✓`, { type: 'success' })
    router.refresh()
  }

  const setRole = async (nextRole: Role) => {
    setActing(true)
    const { error } = await supabase
      .from('crew_members')
      .update({ role: nextRole })
      .eq('crew_id', crewId)
      .eq('user_id', memberUserId)
    setActing(false)
    setOpen(false)
    if (error) {
      console.error('Role change failed:', error)
      showToast("Couldn't change the role — try again", { type: 'error' })
      return
    }
    router.refresh()
  }

  return (
    <div style={{ position: 'relative', flexShrink: 0 }} onClick={e => e.stopPropagation()}>
      <button
        onClick={(e) => { e.stopPropagation(); setOpen(o => !o) }}
        aria-label={`Manage ${memberName}'s role`}
        aria-haspopup="menu"
        aria-expanded={open}
        style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '6px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      >
        <MoreVertical size={16} strokeWidth={1.8} />
      </button>

      {open && (
        <div role="menu" style={{ position: 'absolute', top: 'calc(100% + 6px)', right: 0, zIndex: 100, background: 'var(--surface-1)', border: '1px solid var(--border)', borderRadius: '12px', padding: '6px', minWidth: '196px', boxShadow: '0 8px 24px rgba(0,0,0,0.5)' }}>
          {isCaptain && currentRole === 'member' && (
            <button
              onClick={() => setRole('moderator')}
              disabled={acting}
              role="menuitem"
              style={menuBtn}
            >
              <Shield size={14} color="#9B7FFF" strokeWidth={1.8} />
              <span>Promote to moderator</span>
            </button>
          )}
          {isCaptain && currentRole === 'moderator' && (
            <button
              onClick={() => setRole('member')}
              disabled={acting}
              role="menuitem"
              style={menuBtn}
            >
              <Shield size={14} color="var(--text-muted)" strokeWidth={1.8} />
              <span>Demote to member</span>
            </button>
          )}
          <div style={{ padding: '8px 12px 4px', fontSize: '10px', fontWeight: 700, letterSpacing: '0.6px', color: 'var(--text-muted)' }}>LEVEL · see the crew charter</div>
          <div style={{ display: 'flex', gap: '4px', padding: '0 8px 8px' }}>
            {[1, 2, 3, 4, 5, 6].map((lvl) => (
              <button
                key={lvl}
                onClick={() => setLevel(lvl)}
                disabled={acting || lvl === currentLevel}
                role="menuitem"
                aria-label={`Set level ${lvl}`}
                style={{
                  width: '28px', height: '28px', borderRadius: '8px', fontSize: '12px', fontWeight: 800,
                  border: lvl === currentLevel ? '1px solid rgba(212,175,55,0.6)' : '1px solid var(--border)',
                  background: lvl === currentLevel ? 'rgba(212,175,55,0.18)' : 'var(--surface-2)',
                  color: lvl === currentLevel ? '#D4AF37' : 'var(--text-primary)',
                  cursor: lvl === currentLevel ? 'default' : 'pointer',
                }}
              >
                {lvl}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

const menuBtn: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: '10px', width: '100%',
  padding: '10px 12px', borderRadius: '8px', fontSize: '13px',
  background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer',
  textAlign: 'left', fontFamily: 'Plus Jakarta Sans, sans-serif',
}

export function LevelBadge({ level }: { level?: number }) {
  const lvl = level || 1
  const high = lvl >= 5
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', padding: '2px 7px', borderRadius: '999px', background: high ? 'rgba(212,175,55,0.12)' : 'var(--overlay, rgba(255,255,255,0.05))', border: high ? '1px solid rgba(212,175,55,0.35)' : '1px solid var(--border)', color: high ? '#D4AF37' : 'var(--text-muted)', fontSize: '10px', fontWeight: 700, letterSpacing: '0.5px' }}>
      LVL {lvl}
    </span>
  )
}

export function RoleBadge({ role }: { role: Role }) {
  if (role === 'captain') {
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '2px 8px', borderRadius: '999px', background: 'rgba(212,175,55,0.12)', border: '1px solid rgba(212,175,55,0.35)', color: '#D4AF37', fontSize: '10px', fontWeight: 700, letterSpacing: '0.5px' }}>
        <Crown size={10} strokeWidth={2.2} /> CAPTAIN
      </span>
    )
  }
  if (role === 'moderator') {
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '2px 8px', borderRadius: '999px', background: 'rgba(155,127,255,0.12)', border: '1px solid rgba(155,127,255,0.35)', color: '#9B7FFF', fontSize: '10px', fontWeight: 700, letterSpacing: '0.5px' }}>
        <Shield size={10} strokeWidth={2.2} /> MOD
      </span>
    )
  }
  return null
}
