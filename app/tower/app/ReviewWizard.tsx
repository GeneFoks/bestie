// @ts-nocheck
'use client'

// Review wizard (R8): one question per screen.
//   1 где и когда работали · 2–6 пять пунктов (звёзды или «Не применимо»)
//   7 работал(а) бы снова · 8 комментарий · 9 проверка и отправка
// Every check uses validateWizard from lib/tower-app-shared — the same function
// the server runs, so «Далее» and the server never disagree. The server also
// runs the review gate and the edit / daily limits on submit.
import { useEffect, useMemo, useRef, useState } from 'react'
import { Check, X, Pencil, Star } from 'lucide-react'
import {
  CRITERIA, CRITERIA_KEYS, SCORE_WORDS, MONTHS_RU, WORK_PLACE_MAX, REVIEW_TEXT_MAX, WIZARD_ERRORS,
  validateWizard, ratingFromScores, wizardDateBounds, fmtWorkDate, cleanPlace,
} from '@/lib/tower-app-shared'
import { useApp } from './ctx'
import { closingConfirm, closeApp } from './tg'
import { ActionBar, Btn, Card, Chip, StarInput, Stars, TopBar, cx, cpLen, fmtDate } from './ui'
import s from './miniapp.module.css'

const STEPS = 9
const FIELD_STEP = { targetId: 1, workPlace: 1, workDate: 1, scores: 2, wouldWorkAgain: 7, text: 8 }
const MONTHS_SHORT = ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек']
const STAR_ADVANCE_MS = 450
const ANSWER_ADVANCE_MS = 350

// undefined = not answered yet; null = «Не применимо»; 1..5 = stars.
function initScores(pre) {
  const o = {}
  CRITERIA_KEYS.forEach((k) => {
    if (!pre || !pre.scores) o[k] = undefined
    else o[k] = Number.isInteger(pre.scores[k]) ? pre.scores[k] : null
  })
  return o
}
function normScores(sc) {
  const o = {}
  CRITERIA_KEYS.forEach((k) => { o[k] = sc[k] == null ? null : sc[k] })
  return o
}

function SumRow({ label, children, onEdit }) {
  return (
    <button type="button" className={s.sumRow} onClick={onEdit} data-track="tower_wizard_edit">
      <span className={s.sumLabel}>{label}</span>
      <span className={s.sumValue}>{children}</span>
      <Pencil size={15} className={s.sumEdit} />
    </button>
  )
}

export default function ReviewWizard({ target, existing = null, screenKey }) {
  const { api, pop, back, push, registerBack, haptic, toast } = useApp()
  // A wizard review prefills everything; an old (stars-only) review only its text.
  const pre = existing && existing.wizard ? existing : null
  const bounds = useMemo(() => wizardDateBounds(), [])
  const years = useMemo(() => {
    const out = []
    for (let y = bounds.maxYear; y >= bounds.minYear; y--) out.push(y)
    return out
  }, [bounds])

  const [step, setStep] = useState(1)
  const [dir, setDir] = useState('fwd')
  const [place, setPlace] = useState(pre?.workPlace || '')
  const [month, setMonth] = useState(pre?.workMonth || null)
  const [year, setYear] = useState(pre?.workYear || null)
  const [scores, setScores] = useState(() => initScores(pre))
  const [again, setAgain] = useState(typeof pre?.wouldWorkAgain === 'boolean' ? pre.wouldWorkAgain : null)
  const [text, setText] = useState(existing?.text || '')
  const [placeTouched, setPlaceTouched] = useState(!!pre)
  const [err, setErr] = useState(null) // { step, text }
  const [sending, setSending] = useState(false)
  const [done, setDone] = useState(false)
  const stepRef = useRef(1)
  const doneRef = useRef(false)
  const sendingRef = useRef(false)
  const timer = useRef(null)
  stepRef.current = step

  // Uses only setters and refs → safe to call from timers and the back handler.
  const goto = (n, d = 'fwd') => {
    clearTimeout(timer.current)
    setDir(d)
    setStep(Math.max(1, Math.min(STEPS, n)))
    setErr(null)
    try { window.scrollTo(0, 0) } catch {}
  }

  // Telegram «Назад» / in-app back: previous step; on step 1 — leave the form.
  useEffect(() => {
    registerBack(screenKey, () => {
      if (doneRef.current) return false
      if (stepRef.current > 1) {
        goto(stepRef.current - 1, 'back')
        return true
      }
      return false
    })
    return () => registerBack(screenKey, null)
  }, [screenKey])

  // «Закрыть? Изменения не сохранятся» while the form is open.
  useEffect(() => {
    closingConfirm(true)
    return () => {
      clearTimeout(timer.current)
      closingConfirm(false)
    }
  }, [])

  const payload = () => ({
    targetId: target?.id,
    workPlace: place,
    workMonth: month,
    workYear: year,
    scores: normScores(scores),
    wouldWorkAgain: again,
    text,
  })
  const v = validateWizard(payload())
  const bad = v.ok ? null : v.field
  const step1Bad = bad === 'targetId' || bad === 'workPlace' || bad === 'workDate'

  const ymOf = (y, m) => y * 12 + m - 1
  const offMonth = (y, m) => {
    const ym = ymOf(y, m)
    return ym > bounds.maxYm || ym < bounds.minYm
  }
  let dateErr = ''
  if (month && year) {
    const ym = ymOf(year, month)
    if (ym > bounds.maxYm) dateErr = WIZARD_ERRORS.workDateFuture
    else if (ym < bounds.minYm) dateErr = WIZARD_ERRORS.workDateOld
  }
  const placeLen = cpLen(cleanPlace(place))
  const placeErr = placeTouched && (placeLen < 2 || placeLen > WORK_PLACE_MAX) ? WIZARD_ERRORS.workPlace : ''

  const canNext = () => {
    if (step === 1) return !step1Bad
    if (step >= 2 && step <= 6) return scores[CRITERIA_KEYS[step - 2]] !== undefined
    if (step === 7) return typeof again === 'boolean'
    if (step === 8) return cpLen(text.trim()) <= REVIEW_TEXT_MAX
    return true
  }

  const noneRated = (sc) => ratingFromScores(normScores(sc)) == null

  const next = () => {
    if (!canNext()) return
    if (step === 6 && noneRated(scores)) {
      haptic.err()
      setErr({ step: 6, text: WIZARD_ERRORS.scoresNone })
      return
    }
    goto(step + 1, 'fwd')
  }

  const pickYear = (y) => {
    haptic.select()
    setYear(y)
    setErr(null)
    if (month && offMonth(y, month)) setMonth(null)
  }
  const pickMonth = (m) => {
    haptic.select()
    setMonth(m)
    setErr(null)
  }

  // A star tap moves on by itself after a short pause (a second tap restarts it).
  const rate = (k, n) => {
    haptic.select()
    setScores((sc) => ({ ...sc, [k]: n }))
    setErr(null)
    clearTimeout(timer.current)
    const at = step
    timer.current = setTimeout(() => {
      if (stepRef.current === at && !doneRef.current) goto(at + 1, 'fwd')
    }, STAR_ADVANCE_MS)
  }

  const skip = (k) => {
    haptic.select()
    clearTimeout(timer.current)
    const nextSc = { ...scores, [k]: null }
    setScores(nextSc)
    if (step === 6 && noneRated(nextSc)) {
      haptic.err()
      setErr({ step: 6, text: WIZARD_ERRORS.scoresNone })
      return
    }
    goto(step + 1, 'fwd')
  }

  const chooseAgain = (val) => {
    haptic.select()
    setAgain(val)
    setErr(null)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => {
      if (stepRef.current === 7 && !doneRef.current) goto(8, 'fwd')
    }, ANSWER_ADVANCE_MS)
  }

  const showErrAt = (field, text) => {
    const st = FIELD_STEP[field] || 1
    goto(st, 'back')
    setErr({ step: st, text })
    haptic.err()
  }

  const submit = async () => {
    if (sendingRef.current) return
    const val = validateWizard(payload())
    if (!val.ok) {
      showErrAt(val.field, val.error)
      return
    }
    sendingRef.current = true
    setSending(true)
    const { rating, ...body } = val.value
    const r = await api.post('review', body)
    sendingRef.current = false
    setSending(false)
    if (r.ok) {
      doneRef.current = true
      clearTimeout(timer.current)
      closingConfirm(false)
      haptic.ok()
      // Only a new review sends the «работали вместе?» message.
      setDone(r.created ? 'created' : 'edited')
      try { window.scrollTo(0, 0) } catch {}
      return
    }
    if (r.code === 'gate' && r.gate) {
      haptic.err()
      push('gate', { gate: r.gate, targetId: target?.id, fromWizard: true })
      return
    }
    if (r.code === 'invalid' && r.field && FIELD_STEP[r.field]) {
      showErrAt(r.field, r.error)
      return
    }
    toast(r.error, 'error')
  }

  const name = target?.name || 'коллеге'

  // ── Sent ──
  if (done) {
    return (
      <>
        <TopBar title="Отзыв отправлен" onBack={back} />
        <div className={s.pageScreen}>
          <div className={s.success}>
            <div className={s.successIcon}><Check size={46} strokeWidth={3} /></div>
            <div className={s.successTitle}>Отзыв отправлен</div>
            <div className={s.successText}>Спасибо — так рейтинг остаётся честным</div>
            {done === 'created' ? (
              <div className={s.successNote}>
                Если {name} запускал(а) бота, придёт уведомление — можно будет подтвердить, что вы работали вместе.
              </div>
            ) : null}
          </div>
        </div>
        <ActionBar>
          <Btn block onClick={() => { if (!closeApp()) pop() }} track="tower_wizard_done">Готово</Btn>
          <button type="button" className={s.linkBtn} onClick={pop}>Посмотреть профиль</button>
        </ActionBar>
      </>
    )
  }

  const crit = step >= 2 && step <= 6 ? CRITERIA[step - 2] : null
  const sc = normScores(scores)
  const total = ratingFromScores(sc)

  return (
    <>
      <TopBar title={`Отзыв: ${name}`} sub={`Шаг ${step} из ${STEPS}`} onBack={back} progress={step / STEPS} />

      <div className={s.pageScreen}>
        <div key={step} className={dir === 'back' ? s.stepBack : s.stepIn}>
          {step === 1 && (
            <>
              <div className={s.stepKicker}>О работе</div>
              <h2 className={s.stepTitle}>Где работали вместе?</h2>
              <p className={s.stepHint}>Объект или компания и когда это было — так всем понятно, о какой работе отзыв.</p>
              {existing && (
                <div className={s.banner}>
                  Твой отзыв{existing.updatedAt ? ` от ${fmtDate(existing.updatedAt)}` : ''} уже есть — новый заменит его.
                </div>
              )}
              <label className={s.label} htmlFor="tw-place">Объект или компания</label>
              <input
                id="tw-place"
                className={cx(s.input, placeErr && s.inputBad)}
                value={place}
                maxLength={WORK_PLACE_MAX}
                onChange={(e) => { setPlace(e.target.value); setErr(null) }}
                onBlur={() => setPlaceTouched(true)}
                onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur() }}
                placeholder="Например: Verizon, сайт в Далласе"
                autoComplete="off"
                enterKeyHint="done"
              />
              <div className={s.fieldFoot}>
                <span className={s.fieldErrInline}>{placeErr}</span>
                <span className={s.counter}>{cpLen(place)}/{WORK_PLACE_MAX}</span>
              </div>

              <div className={s.label}>Год</div>
              <div className={s.chipRow}>
                {years.map((y) => (
                  <Chip key={y} active={year === y} onClick={() => pickYear(y)}>{String(y)}</Chip>
                ))}
              </div>

              <div className={s.label}>Месяц</div>
              <div className={s.monthGrid}>
                {MONTHS_SHORT.map((m, i) => {
                  const mm = i + 1
                  const off = year ? offMonth(year, mm) : false
                  return (
                    <button
                      key={mm}
                      type="button"
                      className={cx(s.monthBtn, month === mm && s.monthOn)}
                      disabled={off}
                      aria-pressed={month === mm}
                      aria-label={MONTHS_RU[i]}
                      onClick={() => pickMonth(mm)}
                    >
                      {m}
                    </button>
                  )
                })}
              </div>
              {month && year && !dateErr && <div className={s.dateChosen}>Когда: {fmtWorkDate(month, year)}</div>}
              {dateErr && <div className={s.fieldErr}>{dateErr}</div>}
              {err?.step === 1 && !dateErr && <div className={s.fieldErr}>{err.text}</div>}
            </>
          )}

          {crit && (
            <>
              <div className={s.stepKicker}>Пункт {step - 1} из 5</div>
              <h2 className={s.stepTitle}>{crit.title}</h2>
              <p className={s.stepHint}>{crit.hint}</p>
              <div className={s.rateBox}>
                <StarInput value={scores[crit.key] || 0} onChange={(n) => rate(crit.key, n)} />
                <div className={cx(s.scoreWord, scores[crit.key] && s.scoreWordOn)}>
                  {scores[crit.key]
                    ? SCORE_WORDS[scores[crit.key]]
                    : scores[crit.key] === null ? 'Не применимо' : 'Нажми на звезду'}
                </div>
                <button
                  type="button"
                  className={cx(s.naBtn, scores[crit.key] === null && s.naOn)}
                  aria-pressed={scores[crit.key] === null}
                  onClick={() => skip(crit.key)}
                >
                  Не применимо
                </button>
              </div>
              {err?.step === step && (
                <div className={s.fieldErr}>
                  {err.text}
                  {step === 6 && (
                    <>
                      {' '}
                      <button type="button" className={s.inlineLink} onClick={() => goto(2, 'back')}>К первому пункту</button>
                    </>
                  )}
                </div>
              )}
            </>
          )}

          {step === 7 && (
            <>
              <div className={s.stepKicker}>Главный вопрос</div>
              <h2 className={s.stepTitle}>Работал(а) бы с ним снова?</h2>
              <p className={s.stepHint}>Честный ответ помогает коллегам выбрать напарника на объект.</p>
              <div className={s.yesNo}>
                <button
                  type="button"
                  className={cx(s.ynBtn, again === true && s.ynYes)}
                  aria-pressed={again === true}
                  onClick={() => chooseAgain(true)}
                >
                  <Check size={22} strokeWidth={2.6} />Да
                </button>
                <button
                  type="button"
                  className={cx(s.ynBtn, again === false && s.ynNo)}
                  aria-pressed={again === false}
                  onClick={() => chooseAgain(false)}
                >
                  <X size={22} strokeWidth={2.6} />Нет
                </button>
              </div>
              {err?.step === 7 && <div className={s.fieldErr}>{err.text}</div>}
            </>
          )}

          {step === 8 && (
            <>
              <div className={s.stepKicker}>Необязательно</div>
              <h2 className={s.stepTitle}>Комментарий</h2>
              <p className={s.stepHint}>Пара фраз о работе — по делу. Можно пропустить.</p>
              <textarea
                className={s.textarea}
                rows={6}
                maxLength={REVIEW_TEXT_MAX}
                value={text}
                onChange={(e) => { setText(e.target.value); setErr(null) }}
                placeholder="Пиши факты: что получилось, что нет. Без оскорблений."
                aria-label="Комментарий"
              />
              <div className={s.fieldFoot}>
                <span />
                <span className={s.counter}>{cpLen(text)}/{REVIEW_TEXT_MAX}</span>
              </div>
              {err?.step === 8 && <div className={s.fieldErr}>{err.text}</div>}
            </>
          )}

          {step === 9 && (
            <>
              <div className={s.stepKicker}>Последний шаг</div>
              <h2 className={s.stepTitle}>Проверь и отправь</h2>
              <p className={s.stepHint}>Нажми на строку, чтобы исправить.</p>
              <Card className={s.summary}>
                <SumRow label="Где и когда" onEdit={() => goto(1, 'back')}>
                  {cleanPlace(place)}{month && year ? ' · ' + fmtWorkDate(month, year) : ''}
                </SumRow>
                {CRITERIA.map((c, i) => (
                  <SumRow key={c.key} label={c.title} onEdit={() => goto(i + 2, 'back')}>
                    {sc[c.key] ? (
                      <span className={s.sumStars}><Stars value={sc[c.key]} size={14} />{SCORE_WORDS[sc[c.key]]}</span>
                    ) : (
                      <span className={s.mutedText}>Не применимо</span>
                    )}
                  </SumRow>
                ))}
                <SumRow label="Работал(а) бы снова" onEdit={() => goto(7, 'back')}>
                  {again === true ? 'Да' : again === false ? 'Нет' : '—'}
                </SumRow>
                <SumRow label="Комментарий" onEdit={() => goto(8, 'back')}>
                  {text.trim() ? <span className={s.sumText}>{text.trim()}</span> : <span className={s.mutedText}>без комментария</span>}
                </SumRow>
                <div className={s.sumTotal}>
                  <span>Итог</span>
                  <span className={s.sumTotalVal}><Star size={18} fill="currentColor" className={s.goldIcon} />{total || '—'}</span>
                </div>
              </Card>
              <p className={s.smallNote}>
                Отзыв увидят все участники. {name} сможет подтвердить, что вы работали вместе.
              </p>
            </>
          )}
        </div>
      </div>

      <ActionBar>
        {step < STEPS ? (
          <Btn block onClick={next} disabled={!canNext()} track={'tower_wizard_next_' + step}>Далее</Btn>
        ) : (
          <Btn block loading={sending} onClick={submit} icon={<Check size={18} />} track="tower_wizard_send">Отправить</Btn>
        )}
      </ActionBar>
    </>
  )
}
