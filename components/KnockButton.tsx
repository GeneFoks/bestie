'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Hand, Sparkles } from 'lucide-react'

const iconStyle: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: '6px' }

type KnockStatus = 'loading' | 'idle' | 'sent' | 'matched' | 'received'

export default function KnockButton({ profileId }: { profileId: string }) {
  const [myId, setMyId] = useState<string | null>(null)
  const [status, setStatus] = useState<KnockStatus>('loading')
  const [acting, setActing] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { setStatus('idle'); return }
      const uid = session.user.id
      setMyId(uid)

      const { data } = await supabase
        .from('knocks')
        .select('is_mutual, sender_id, seen')
        .or(`and(sender_id.eq.${uid},receiver_id.eq.${profileId}),and(sender_id.eq.${profileId},receiver_id.eq.${uid})`)

      if (!data || data.length === 0) { setStatus('idle'); return }

      const myKnock = data.find(k => k.sender_id === uid)
      const theirKnock = data.find(k => k.sender_id === profileId)

      if (myKnock?.is_mutual || theirKnock?.is_mutual) setStatus('matched')
      else if (myKnock) setStatus('sent')
      else if (theirKnock) setStatus('received')
      else setStatus('idle')
    })
  }, [profileId])

  if (!myId || myId === profileId || status === 'loading') return null

  const knock = async () => {
    setActing(true)
    const { data } = await supabase.rpc('send_knock', { p_receiver_id: profileId })
    if (data === 'matched') setStatus('matched')
    else if (data === 'sent') setStatus('sent')
    setActing(false)
  }

  if (status === 'matched') {
    return (
      <div style={{ padding: '8px 14px', borderRadius: '12px', fontSize: '13px', fontWeight: 600, background: 'rgba(57,255,20,0.1)', border: '1px solid rgba(57,255,20,0.3)', color: '#39FF14', ...iconStyle }}>
        <Sparkles size={13} strokeWidth={2} /> Match!
      </div>
    )
  }

  if (status === 'sent') {
    return (
      <div style={{ padding: '8px 14px', borderRadius: '12px', fontSize: '13px', color: '#9B93C0', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', ...iconStyle }}>
        <Hand size={13} strokeWidth={2} /> Knock sent
      </div>
    )
  }

  if (status === 'received') {
    return (
      <button onClick={knock} disabled={acting} style={{ padding: '8px 14px', borderRadius: '12px', fontSize: '13px', fontWeight: 700, background: 'rgba(212,175,55,0.15)', border: '1px solid rgba(212,175,55,0.4)', color: '#D4AF37', cursor: 'pointer', ...iconStyle }}>
        {acting ? '…' : (<><Hand size={13} strokeWidth={2} /> Knock back!</>)}
      </button>
    )
  }

  return (
    <button onClick={knock} disabled={acting} style={{ padding: '8px 14px', borderRadius: '12px', fontSize: '13px', fontWeight: 600, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: '#9B93C0', cursor: 'pointer', ...iconStyle }}>
      {acting ? '…' : (<><Hand size={13} strokeWidth={2} /> Knock</>)}
    </button>
  )
}
