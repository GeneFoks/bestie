// @ts-nocheck
'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { showToast } from '@/components/Toast'
import { Pencil } from 'lucide-react'

// Crew description, editable in place by the captain.
// - has text → shown to everyone; captain gets a pencil
// - empty + captain → dashed "Add a description" prompt
// - empty + visitor → renders nothing
export default function CrewDescriptionEditor({ crewId, captainId, initial }: { crewId: string; captainId: string; initial: string | null }) {
  const [me, setMe] = useState<string | null>(null)
  const [text, setText] = useState(initial || '')
  const [draft, setDraft] = useState(initial || '')
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setMe(user?.id || null))
  }, [])

  const isCaptain = me && me === captainId

  const save = async () => {
    setSaving(true)
    const clean = draft.trim().slice(0, 600)
    const { error } = await supabase.from('crews').update({ description: clean || null }).eq('id', crewId)
    setSaving(false)
    if (error) {
      console.error('Saving description failed:', error)
      showToast("Couldn't save the description — try again", { type: 'error' })
      return
    }
    setText(clean)
    setEditing(false)
    showToast('Description saved ✓', { type: 'success' })
  }

  if (editing) {
    return (
      <div style={{ marginBottom: '16px' }}>
        <textarea
          value={draft}
          onChange={e => setDraft(e.target.value)}
          rows={4}
          maxLength={600}
          autoFocus
          placeholder="What is this crew about? Who is it for, what do you do together?"
          style={{ width: '100%', padding: '12px 14px', borderRadius: '13px', fontSize: '14px', lineHeight: 1.6, background: 'var(--surface-2)', border: '1px solid var(--border-strong)', color: 'var(--text-primary)', outline: 'none', resize: 'vertical', boxSizing: 'border-box', fontFamily: 'Plus Jakarta Sans, sans-serif' }}
        />
        <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
          <button onClick={save} disabled={saving} style={{ padding: '9px 18px', borderRadius: '11px', fontSize: '13px', fontWeight: 700, background: 'linear-gradient(135deg, #D4AF37, #B8960C)', color: '#09090F', border: 'none', cursor: 'pointer' }}>
            {saving ? 'Saving…' : 'Save'}
          </button>
          <button onClick={() => { setEditing(false); setDraft(text) }} style={{ padding: '9px 16px', borderRadius: '11px', fontSize: '13px', fontWeight: 600, background: 'var(--overlay-2)', border: '1px solid var(--border)', color: 'var(--text-muted)', cursor: 'pointer' }}>
            Cancel
          </button>
        </div>
      </div>
    )
  }

  if (text) {
    return (
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', marginBottom: '16px' }}>
        <p style={{ flex: 1, fontSize: '14.5px', color: 'var(--text-primary)', lineHeight: 1.7, margin: 0, whiteSpace: 'pre-wrap' }}>{text}</p>
        {isCaptain && (
          <button onClick={() => setEditing(true)} title="Edit description" aria-label="Edit description" style={{ flexShrink: 0, width: '30px', height: '30px', borderRadius: '9px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--overlay)', border: '1px solid var(--border)', color: 'var(--text-muted)', cursor: 'pointer' }}>
            <Pencil size={13} strokeWidth={2} />
          </button>
        )}
      </div>
    )
  }

  if (isCaptain) {
    return (
      <button
        onClick={() => setEditing(true)}
        style={{ display: 'block', width: '100%', textAlign: 'left', padding: '13px 16px', borderRadius: '13px', fontSize: '13px', background: 'rgba(212,175,55,0.04)', border: '1px dashed rgba(212,175,55,0.3)', color: 'var(--text-muted)', cursor: 'pointer', marginBottom: '16px', fontFamily: 'Plus Jakarta Sans, sans-serif' }}
      >
        ✏️ Add a description — tell people what this crew is about
      </button>
    )
  }

  return null
}
