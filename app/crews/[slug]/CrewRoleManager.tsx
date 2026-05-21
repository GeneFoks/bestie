'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Crown, Shield, MoreVertical } from 'lucide-react'

type Role = 'captain' | 'moderator' | 'member'

type Props = {
  crewId: string
  captainId: string
  memberUserId: string
  memberName: string
  currentRole: Role
}

/**
 * Inline dropdown shown next to each crew member in the members list.
 * Only renders if the viewer is the captain AND the target isn't themselves.
 * Lets the captain promote a member to moderator or demote back.
 */
export default function CrewRoleManager({ crewId, captainId, memberUserId, memberName, currentRole }: Props) {
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

  // Only the captain can manage roles; can't manage own row
  const isCaptain = viewerId === captainId
  if (!isCaptain || memberUserId === viewerId || currentRole === 'captain') return null

  const setRole = async (nextRole: Role) => {
    setActing(true)
    await supabase
      .from('crew_members')
      .update({ role: nextRole })
      .eq('crew_id', crewId)
      .eq('user_id', memberUserId)
    setActing(false)
    setOpen(false)
    router.refresh()
  }

  return (
    <div style={{ position: 'relative', flexShrink: 0 }} onClick={e => e.stopPropagation()}>
      <button
        onClick={(e) => { e.stopPropagation(); setOpen(o => !o) }}
        aria-label={`Manage ${memberName}'s role`}
        aria-haspopup="menu"
        aria-expanded={open}
        style={{ background: 'transparent', border: 'none', color: '#A99ECC', cursor: 'pointer', padding: '6px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      >
        <MoreVertical size={16} strokeWidth={1.8} />
      </button>

      {open && (
        <div role="menu" style={{ position: 'absolute', top: 'calc(100% + 6px)', right: 0, zIndex: 100, background: '#111120', border: '1px solid rgba(255,255,255,0.10)', borderRadius: '12px', padding: '6px', minWidth: '180px', boxShadow: '0 8px 24px rgba(0,0,0,0.5)' }}>
          {currentRole === 'member' && (
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
          {currentRole === 'moderator' && (
            <button
              onClick={() => setRole('member')}
              disabled={acting}
              role="menuitem"
              style={menuBtn}
            >
              <Shield size={14} color="#A99ECC" strokeWidth={1.8} />
              <span>Demote to member</span>
            </button>
          )}
        </div>
      )}
    </div>
  )
}

const menuBtn: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: '10px', width: '100%',
  padding: '10px 12px', borderRadius: '8px', fontSize: '13px',
  background: 'none', border: 'none', color: '#F0EAFF', cursor: 'pointer',
  textAlign: 'left', fontFamily: 'Plus Jakarta Sans, sans-serif',
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
