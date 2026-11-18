// @ts-nocheck
'use client'

// The three review conditions (R1) with buttons for the missing ones:
// Bestie link, filled Bestie profile, paid plan. The server decides — this
// only shows its answer (gate) and the prefetched personal links.
import { useEffect, useRef, useState } from 'react'
import { CheckCircle2, AlertCircle, RefreshCw, Lock } from 'lucide-react'
import { useApp } from './ctx'
import { Btn, Card, TopBar, cx } from './ui'
import s from './miniapp.module.css'

const SCHEMA_TEXT = 'Отзывы временно недоступны — идёт обновление. Попробуй через пару минут.'
const UNKNOWN_TEXT = '⚠️ Не удалось проверить доступ — попробуй чуть позже.'

export function GateChecklist({ gate, onRecheck = null, checking = false }) {
  const { openLink, openTg } = useApp()
  if (!gate) return null
  if (!gate.schema) return <div className={s.notice}>{SCHEMA_TEXT}</div>
  const links = gate.links || {}

  // Each button opens its link right inside the tap (Telegram needs a gesture).
  const actionOf = (it) => {
    if (it.done) return null
    if (it.key === 'link') {
      return { label: 'Привязать', run: () => (links.link ? openLink(links.link) : openTg(links.bot)) }
    }
    if (it.key === 'profile') {
      if (!gate.linked) return { label: 'Заполнить', disabled: true }
      if (!(gate.missing || []).length) return null // blocked or not checked — nothing to fill
      return { label: 'Заполнить', run: () => openLink(links.profile) }
    }
    if (it.key === 'member') {
      if (it.unknown || gate.memberUnknown) return null
      return { label: 'Оформить', run: () => (links.pay ? openLink(links.pay) : openTg(links.bot)) }
    }
    return null
  }

  return (
    <div className={s.gate}>
      {gate.ok ? (
        <div className={s.gateOk}>Можно оставлять отзывы ✅</div>
      ) : (
        <div className={s.gateTitle}>Чтобы оставлять отзывы, нужно:</div>
      )}
      {gate.unknown && !gate.ok && <div className={s.notice}>{UNKNOWN_TEXT}</div>}
      <div className={s.gateList}>
        {(gate.items || []).map((it, i) => {
          const a = actionOf(it)
          const hint = it.key === 'profile' && !it.done && !gate.linked
            ? 'Имя, фото и город — сначала привяжи профиль'
            : it.hint
          return (
            <div key={it.key} className={s.gateItem}>
              <span className={cx(s.gateIcon, it.done ? s.gateIconOk : it.unknown ? s.gateIconWarn : s.gateIconNo)}>
                {it.done ? <CheckCircle2 size={22} /> : <AlertCircle size={22} />}
              </span>
              <span className={s.gateText}>
                <span className={s.gateItemTitle}>{i + 1}. {it.title}</span>
                {hint && <span className={s.gateHint}>{hint}</span>}
                {a && (
                  <span className={s.gateAction}>
                    <Btn size="sm" variant={a.disabled ? 'soft' : 'primary'} disabled={!!a.disabled} onClick={a.run} track={'tower_gate_' + it.key}>
                      {a.label}
                    </Btn>
                  </span>
                )}
              </span>
            </div>
          )
        })}
      </div>
      {!gate.ok && onRecheck && (
        <Btn variant="ghost" size="md" block loading={checking} icon={<RefreshCw size={16} />} onClick={onRecheck}>
          Проверить снова
        </Btn>
      )}
    </div>
  )
}

export default GateChecklist

// Full screen when a review was refused by the gate. targetId → «Проверить
// снова» re-runs the review check and opens the form once everything is done.
// fromWizard → the form is already under this screen: just go back to it.
export function GateScreen({ gate: initial, targetId = null, fromWizard = false, visible = true }) {
  const { api, back, pop, replaceTop, refreshMe, toast, haptic, resumeTick } = useApp()
  const [gate, setGate] = useState(initial)
  const [checking, setChecking] = useState(false)
  const busy = useRef(false)
  const lastTick = useRef(resumeTick)

  const recheck = async () => {
    if (busy.current) return
    busy.current = true
    setChecking(true)
    try {
      if (targetId) {
        const r = await api.get('review', { target: targetId })
        if (r.ok) {
          haptic.ok()
          if (r.gate) setGate(r.gate)
          if (fromWizard) {
            toast('Готово — теперь можно отправить отзыв', 'ok')
            pop()
          } else {
            replaceTop('wizard', { target: r.target, existing: r.existing })
          }
          return
        }
        if (r.code === 'gate' && r.gate) setGate(r.gate)
        else toast(r.error, 'error')
        return
      }
      const r = await refreshMe()
      if (r.ok) setGate(r.gate)
      else toast(r.error, 'error')
    } finally {
      busy.current = false
      setChecking(false)
    }
  }

  // Back from the browser (linked / paid / filled the profile) → check by itself.
  useEffect(() => {
    if (resumeTick === lastTick.current) return
    lastTick.current = resumeTick
    if (visible) recheck()
  }, [resumeTick, visible])

  return (
    <>
      <TopBar title="Доступ к отзывам" onBack={back} />
      <div className={s.pageNoBar}>
        <div className={s.gateHero}><Lock size={26} /></div>
        <h2 className={s.screenH2}>Отзывы — только от проверенных коллег</h2>
        <p className={s.lead}>
          Оставлять отзывы могут участники группы с профилем Бести и подпиской. Так рейтинг остаётся честным:
          без фейков и анонимов.
        </p>
        <Card>
          <GateChecklist gate={gate} onRecheck={recheck} checking={checking} />
        </Card>
        <p className={s.smallNote}>Уже привязал профиль или оплатил подписку? Вернись сюда — проверим сами.</p>
      </div>
    </>
  )
}
