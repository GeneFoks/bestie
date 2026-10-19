// @ts-nocheck
'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { showToast } from '@/components/Toast'
import { Pencil, ScrollText, ChevronDown, ChevronUp } from 'lucide-react'

// Crew charter — the crew's own rules & what its member levels (1–6) mean.
// Written and edited in place by the captain; shown collapsed to everyone.
export default function CrewCharter({ crewId, captainId, initial }: { crewId: string; captainId: string; initial: string | null }) {
  const [me, setMe] = useState<string | null>(null)
  const [text, setText] = useState(initial || '')
  const [draft, setDraft] = useState(initial || '')
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setMe(user?.id || null))
  }, [])

  const isCaptain = me && me === captainId

  const save = async () => {
    setSaving(true)
    const clean = draft.trim().slice(0, 6000)
    const { error } = await supabase.from('crews').update({ charter: clean || null }).eq('id', crewId)
    setSaving(false)
    if (error) {
      console.error('Saving charter failed:', error)
      showToast("Couldn't save the charter — try again", { type: 'error' })
      return
    }
    setText(clean)
    setEditing(false)
    setOpen(true)
    showToast('Charter saved ✓', { type: 'success' })
  }

  if (!text && !isCaptain) return null

  return (
    <div style={{ marginBottom: '20px', borderRadius: '14px', border: '1px solid var(--border)', background: 'var(--surface-1)', overflow: 'hidden' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%', padding: '13px 16px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}
      >
        <ScrollText size={16} color="#D4AF37" strokeWidth={1.8} />
        <span style={{ flex: 1, fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>Crew Charter</span>
        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{text ? 'rules & member levels' : 'not written yet'}</span>
        {open ? <ChevronUp size={15} color="var(--text-muted)" /> : <ChevronDown size={15} color="var(--text-muted)" />}
      </button>

      {open && (
        <div style={{ padding: '0 16px 14px' }}>
          {editing ? (
            <>
              <textarea
                value={draft}
                onChange={e => setDraft(e.target.value)}
                rows={10}
                maxLength={6000}
                autoFocus
                placeholder={'The crew\'s rules and what each level means, e.g.\n\nLevel 1 — newcomer…\nLevel 2 — …\n…\nLevel 6 — …'}
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
            </>
          ) : text ? (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
              <p style={{ flex: 1, fontSize: '13.5px', color: 'var(--text-secondary, #C9C4D6)', lineHeight: 1.7, margin: 0, whiteSpace: 'pre-wrap' }}>{text}</p>
              {isCaptain && (
                <button onClick={() => { setDraft(text); setEditing(true) }} title="Edit charter" aria-label="Edit charter" style={{ flexShrink: 0, width: '30px', height: '30px', borderRadius: '9px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--overlay)', border: '1px solid var(--border)', color: 'var(--text-muted)', cursor: 'pointer' }}>
                  <Pencil size={13} strokeWidth={2} />
                </button>
              )}
            </div>
          ) : (
            <button
              onClick={() => setEditing(true)}
              style={{ display: 'block', width: '100%', textAlign: 'left', padding: '13px 16px', borderRadius: '13px', fontSize: '13px', background: 'rgba(212,175,55,0.04)', border: '1px dashed rgba(212,175,55,0.3)', color: 'var(--text-muted)', cursor: 'pointer', fontFamily: 'Plus Jakarta Sans, sans-serif' }}
            >
              ✏️ Write the charter — the crew's rules and what levels 1–6 mean
            </button>
          )}
        </div>
      )}
    </div>
  )
}
