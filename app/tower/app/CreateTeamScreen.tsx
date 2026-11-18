// @ts-nocheck
'use client'

// New team — the same limits as /crew create in the bot (name 2–40, not «/…»,
// description up to 500). The server checks them again.
import { useState, useRef } from 'react'
import { Plus } from 'lucide-react'
import { cleanPlace } from '@/lib/tower-app-shared'
import { useApp } from './ctx'
import { ActionBar, Btn, TopBar, cx, cpLen } from './ui'
import s from './miniapp.module.css'

const NAME_MIN = 2
const NAME_MAX = 40
const DESC_MAX = 500

export default function CreateTeamScreen() {
  const { api, back, pop, toast, haptic } = useApp()
  const [name, setName] = useState('')
  const [desc, setDesc] = useState('')
  const [touched, setTouched] = useState(false)
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const busyRef = useRef(false)

  const clean = cleanPlace(name) // same normalising steps as the bot's team names
  const n = cpLen(clean)
  const nameErr = n < NAME_MIN || n > NAME_MAX
    ? `Название — от ${NAME_MIN} до ${NAME_MAX} символов.`
    : clean.startsWith('/') ? 'Название не может начинаться с «/».' : ''
  const descErr = cpLen(desc.trim()) > DESC_MAX ? `Описание — до ${DESC_MAX} символов.` : ''
  const ok = !nameErr && !descErr

  const submit = async () => {
    setTouched(true)
    if (!ok || busyRef.current) return
    busyRef.current = true
    setBusy(true)
    setErr('')
    const r = await api.post('teams', { action: 'create', name: clean, description: desc.trim() })
    busyRef.current = false
    setBusy(false)
    if (r.ok) {
      haptic.ok()
      toast(r.text, 'ok')
      pop()
      return
    }
    haptic.err()
    setErr(r.error)
  }

  return (
    <>
      <TopBar title="Новая команда" onBack={back} />
      <div className={s.pageScreen}>
        <h2 className={s.stepTitle}>Создай свою команду</h2>
        <p className={s.stepHint}>Ты станешь лидером: заявки на вступление будут приходить тебе в бот и сюда.</p>

        <label className={s.label} htmlFor="tw-team-name">Название</label>
        <input
          id="tw-team-name"
          className={cx(s.input, touched && nameErr && s.inputBad)}
          value={name}
          maxLength={60}
          onChange={(e) => { setName(e.target.value); setErr('') }}
          onBlur={() => setTouched(true)}
          onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur() }}
          placeholder="Например: Texas Climbers"
          autoComplete="off"
          enterKeyHint="next"
        />
        <div className={s.fieldFoot}>
          <span className={s.fieldErrInline}>{touched ? nameErr : ''}</span>
          <span className={s.counter}>{n}/{NAME_MAX}</span>
        </div>

        <label className={s.label} htmlFor="tw-team-desc">Описание (необязательно)</label>
        <textarea
          id="tw-team-desc"
          className={s.textarea}
          rows={5}
          maxLength={DESC_MAX}
          value={desc}
          onChange={(e) => { setDesc(e.target.value); setErr('') }}
          placeholder="Чем занимаетесь, в каких штатах работаете, кого ищете"
        />
        <div className={s.fieldFoot}>
          <span className={s.fieldErrInline}>{descErr}</span>
          <span className={s.counter}>{cpLen(desc)}/{DESC_MAX}</span>
        </div>

        {err && <div className={s.fieldErr} role="alert">{err}</div>}
      </div>
      <ActionBar>
        <Btn block icon={<Plus size={18} />} loading={busy} disabled={touched && !ok} onClick={submit} track="tower_team_create">
          Создать
        </Btn>
      </ActionBar>
    </>
  )
}
