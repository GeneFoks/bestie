'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Sparkles, Share2 } from 'lucide-react'

type Props = {
  crewId: string
  captainId: string
  crewSlug: string
  inviteCode: string
}

/**
 * Crew invite link — visible to every crew member, not just the captain.
 * The link includes ?ref={user_id} so when someone joins, the inviter
 * gets attribution + a +1 to their sparks_balance.
 */
export default function CrewInviteButton({ crewId, captainId, crewSlug, inviteCode }: Props) {
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [isMember, setIsMember] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) return
      const uid = session.user.id
      setCurrentUserId(uid)
      // Captain auto-counts as member; otherwise check membership table
      if (uid === captainId) { setIsMember(true); return }
      const { data } = await supabase
        .from('crew_members')
        .select('crew_id')
        .eq('crew_id', crewId).eq('user_id', uid).maybeSingle()
      if (data) setIsMember(true)
    })
  }, [crewId, captainId])

  if (!currentUserId || !isMember) return null

  const link = `https://bestiehere.com/crews/${crewSlug}?invite=${inviteCode}&ref=${currentUserId}`
  const isCaptain = currentUserId === captainId

  const share = async () => {
    if (typeof navigator !== 'undefined' && (navigator as any).share) {
      try { await (navigator as any).share({ url: link, title: 'Join my crew on Bestie' }); return } catch {}
    }
    navigator.clipboard.writeText(link)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div style={{ marginTop: '12px', padding: '14px 16px', borderRadius: '14px', background: 'rgba(212,175,55,0.05)', border: '1px solid rgba(212,175,55,0.15)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px', flexWrap: 'wrap', gap: '6px' }}>
        <span style={{ fontSize: '12px', fontWeight: 700, color: '#D4AF37', letterSpacing: '1px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
          <Share2 size={12} strokeWidth={2.2} /> {isCaptain ? 'INVITE LINK' : 'YOUR INVITE LINK'}
        </span>
        {!isCaptain && (
          <span style={{ fontSize: '11px', color: '#A99ECC', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <Sparkles size={11} color="#D4AF37" strokeWidth={2} /> +1 Spark when they join
          </span>
        )}
      </div>
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        <div style={{ flex: 1, padding: '8px 12px', borderRadius: '10px', background: 'rgba(0,0,0,0.3)', fontSize: '12px', color: '#A99ECC', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          bestiehere.com/crews/{crewSlug}?invite=…
        </div>
        <button onClick={share} aria-label="Share invite link" style={{ padding: '8px 16px', borderRadius: '10px', fontSize: '13px', fontWeight: 700, background: copied ? 'rgba(52,211,153,0.15)' : 'linear-gradient(135deg, #D4AF37 0%, #B8960C 100%)', border: copied ? '1px solid rgba(52,211,153,0.3)' : 'none', color: copied ? '#34D399' : '#09090F', cursor: 'pointer', flexShrink: 0, fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
          {copied ? '✓ Copied' : 'Share'}
        </button>
      </div>
    </div>
  )
}
