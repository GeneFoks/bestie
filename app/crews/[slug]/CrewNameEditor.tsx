// @ts-nocheck
'use client'
// Crew name with inline rename for the captain. Slug (URL) stays unchanged.

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Pencil, Check, X } from 'lucide-react'
import { showToast } from '@/components/Toast'

export default function CrewNameEditor({ crewId, captainId, initialName }: { crewId: string; captainId: string; initialName: string }) {
  const router = useRouter()
  const [me, setMe] = useState<string | null>(null)
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(initialName)
  const [draft, setDraft] = useState(initialName)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setMe(user?.id ?? null))
  }, [])

  const isCaptain = me && me === captainId

  const save = async () => {
    const v = draft.trim()
    if (!v || v === name) { setEditing(false); setDraft(name); return }
    setSaving(true)
    const { error } = await supabase.from('crews').update({ name: v }).eq('id', crewId)
    setSaving(false)
    if (error) {
      console.error('Crew rename failed:', error)
      showToast("Couldn't rename the crew — try again", { type: 'error' })
      return
    }
    setName(v); setEditing(false)
    router.refresh()
  }

  if (editing) {
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
        <input
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') { setEditing(false); setDraft(name) } }}
          autoFocus maxLength={40}
          style={{ fontFamily: 'DM Serif Display, serif', fontSize: '24px', color: 'var(--text-primary)', background: 'var(--surface-1)', border: '1px solid rgba(212,175,55,0.5)', borderRadius: '10px', padding: '2px 10px', outline: 'none', maxWidth: '260px' }}
        />
        <button onClick={save} disabled={saving} aria-label="Save" style={{ background: 'rgba(52,211,153,0.15)', border: '1px solid rgba(52,211,153,0.4)', borderRadius: '8px', width: '30px', height: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#34D399' }}><Check size={15} strokeWidth={2.5} /></button>
        <button onClick={() => { setEditing(false); setDraft(name) }} aria-label="Cancel" style={{ background: 'var(--overlay-2)', border: '1px solid var(--border-strong)', borderRadius: '8px', width: '30px', height: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={15} strokeWidth={2.2} /></button>
      </span>
    )
  }

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
      <h1 style={{ fontFamily: 'DM Serif Display, serif', fontSize: '26px', color: 'var(--text-primary)', margin: 0 }}>{name}</h1>
      {isCaptain && (
        <button onClick={() => { setDraft(name); setEditing(true) }} aria-label="Rename crew" style={{ background: 'var(--overlay-2)', border: '1px solid var(--border-strong)', borderRadius: '8px', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-primary)', backdropFilter: 'blur(8px)', flexShrink: 0 }}>
          <Pencil size={13} strokeWidth={2} />
        </button>
      )}
    </span>
  )
}
