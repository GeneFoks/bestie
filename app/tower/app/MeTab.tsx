// @ts-nocheck
'use client'

// «Я»: my card, the review checklist (R1), «работали вместе?» answers,
// rating visibility, skills, state, the Bestie link.
import { useEffect, useRef, useState } from 'react'
import { MapPin, ChevronDown, ChevronRight, Check, UserPlus, Crown, Star, Link2 } from 'lucide-react'
import { SKILLS, MAX_SKILLS, fmtWorkDate } from '@/lib/tower-app-shared'
import { useApp } from './ctx'
import { confirmTg } from './tg'
import { GateChecklist } from './GateChecklist'
import {
  Avatar, Btn, Card, Chip, Section, Sheet, StatePicker, Stars, Toggle, cx, fmtAvg, reviewsText, shareUrl, stateName,
} from './ui'
import s from './miniapp.module.css'

export default function MeTab({ visible }) {
  const {
    api, meData, setMeData, refreshMe, push, setTab, openLink, openTg, toast, haptic, showWelcome,
  } = useApp()
  const me = meData?.me
  const gate = meData?.gate
  const pending = meData?.pending || []

  const [hidden, setHidden] = useState(!!me?.hidden)
  const [skills, setSkills] = useState(me?.skills || [])
  const [st, setSt] = useState(me?.state || '')
  const [savedAt, setSavedAt] = useState(0)
  const [checking, setChecking] = useState(false)
  const [sheet, setSheet] = useState(false)
  const [busyId, setBusyId] = useState(null)
  const [answered, setAnswered] = useState({}) // reviewId → true (worked) | false
  const [unlinking, setUnlinking] = useState(false)
  const dirty = useRef(0) // settings saves scheduled or in flight
  const skillTimer = useRef(null)
  const meRef = useRef(me)
  meRef.current = me

  // The server copy changed (refresh) and nothing of ours is pending → take it.
  const skillsKey = (me?.skills || []).join(',')
  useEffect(() => {
    if (!me || dirty.current) return
    setHidden(!!me.hidden)
    setSkills(me.skills || [])
    setSt(me.state || '')
  }, [me?.hidden, me?.state, skillsKey])

  useEffect(() => () => clearTimeout(skillTimer.current), [])

  // «Сохранено ✓» for a moment.
  useEffect(() => {
    if (!savedAt) return
    const t = setTimeout(() => setSavedAt(0), 1800)
    return () => clearTimeout(t)
  }, [savedAt])

  const fromServer = () => {
    const m = meRef.current
    if (!m) return
    setHidden(!!m.hidden)
    setSkills(m.skills || [])
    setSt(m.state || '')
  }

  const save = async (patch) => {
    dirty.current += 1
    const r = await api.post('me', { action: 'settings', ...patch })
    dirty.current -= 1
    if (r.ok && r.me) {
      setMeData((d) => (d ? { ...d, me: { ...d.me, ...r.me } } : d))
      if (!dirty.current) {
        setHidden(!!r.me.hidden)
        setSkills(r.me.skills || [])
        setSt(r.me.state || '')
      }
      setSavedAt(Date.now())
    } else {
      if (!dirty.current) fromServer()
      toast(r.error, 'error')
    }
  }

  const toggleHidden = (show) => {
    haptic.select()
    setHidden(!show)
    save({ hidden: !show })
  }

  const toggleSkill = (code) => {
    haptic.select()
    const has = skills.includes(code)
    if (!has && skills.length >= MAX_SKILLS) {
      toast(`Можно выбрать до ${MAX_SKILLS} навыков.`)
      return
    }
    const next = has ? skills.filter((x) => x !== code) : [...skills, code]
    setSkills(next)
    if (skillTimer.current) clearTimeout(skillTimer.current)
    else dirty.current += 1
    skillTimer.current = setTimeout(() => {
      skillTimer.current = null
      save({ skills: next })
      dirty.current -= 1
    }, 600)
  }

  const pickState = (code) => {
    haptic.select()
    setSheet(false)
    if ((code || '') === (st || '')) return
    setSt(code || '')
    save({ state: code || null })
  }

  const recheck = async () => {
    if (checking) return
    setChecking(true)
    const r = await refreshMe()
    setChecking(false)
    if (!r.ok) toast(r.error, 'error')
    else if (r.gate?.ok) haptic.ok()
  }

  const answer = async (rev, worked) => {
    if (busyId) return
    setBusyId(rev.id + (worked ? ':y' : ':n'))
    const r = await api.post('confirm', { reviewId: rev.id, worked })
    setBusyId(null)
    if (r.ok) {
      haptic.ok()
      toast(worked ? 'Подтверждено ✅' : 'Отмечено', 'ok')
      setAnswered((a) => ({ ...a, [rev.id]: worked }))
    } else {
      toast(r.error, 'error')
    }
  }

  const unlink = async () => {
    if (unlinking) return
    const ok = await confirmTg('Отвязать профиль Бести? Оставлять новые отзывы будет нельзя, пока не привяжешь снова. Отзывы сохранятся.')
    if (!ok) return
    setUnlinking(true)
    const r = await api.post('me', { action: 'unlink' })
    setUnlinking(false)
    if (r.ok) {
      toast('Профиль Бести отвязан', 'ok')
      refreshMe()
    } else {
      toast(r.error, 'error')
    }
  }

  const share = () => {
    if (me?.shareLink) openTg(shareUrl(me.shareLink))
  }

  if (!me) return null

  return (
    <div className={s.page}>
      <div className={s.tabTitle}>Мой профиль</div>
      <div className={s.tabSub}>Твоя карточка в рейтинге «Вышки в США»</div>

      <Card className={s.meCard}>
        <button type="button" className={s.meHead} onClick={() => push('person', { id: me.id })} data-track="tower_me_card">
          <Avatar id={me.id} name={me.name} size={56} />
          <span className={s.meHeadText}>
            <span className={s.meName}>{me.name}</span>
            {me.username && <span className={s.personSub}>@{me.username}</span>}
            <span className={s.meRating}>
              {me.rating ? (
                <>
                  <Stars value={me.rating.avg} size={14} />
                  <b>{fmtAvg(me.rating.avg)}</b>
                  <span className={s.mutedText}>· {reviewsText(me.rating.count)}</span>
                </>
              ) : (
                <span className={s.mutedText}>Пока нет отзывов</span>
              )}
            </span>
          </span>
          <ChevronRight size={20} className={s.rowChevron} />
        </button>
        <div className={s.meChips}>
          {me.team ? (
            <button type="button" className={cx(s.pill, s.pillBtn)} onClick={() => setTab('teams')} data-track="tower_me_team">
              {me.team.role === 'leader' && <Crown size={13} className={s.goldIcon} />}
              Команда «{me.team.name}»
            </button>
          ) : (
            <button type="button" className={cx(s.pill, s.pillBtn)} onClick={() => setTab('teams')}>Без команды</button>
          )}
          {hidden && <span className={cx(s.pill, s.pillWarn)}>Скрыт из рейтинга</span>}
        </div>
      </Card>

      <Section title="Отзывы коллегам">
        <Card>
          <GateChecklist gate={gate} onRecheck={recheck} checking={checking} />
        </Card>
      </Section>

      {pending.length > 0 && (
        <Section
          title="Ждут подтверждения"
          hint="Коллеги оставили тебе отзывы. Подтверди, что вы работали вместе, — у отзыва появится отметка «✓ работали вместе»."
        >
          <div className={s.list}>
            {pending.map((r) => {
              const a = answered[r.id]
              const when = fmtWorkDate(r.workMonth, r.workYear)
              return (
                <Card key={r.id} className={s.pendingCard}>
                  <div className={s.pendingHead}>
                    <Avatar id={r.author?.id} name={r.author?.name} size={36} />
                    <span className={s.pendingText}>
                      <span className={s.reviewName}><span className={s.personNameText}>{r.author?.name}</span></span>
                      <span className={s.reviewDate}>📍 {r.workPlace}{when ? ' · ' + when : ''}</span>
                    </span>
                    <Stars value={r.rating} size={13} />
                  </div>
                  {r.text && <div className={cx(s.reviewText, s.clamp3)}>{r.text}</div>}
                  {a === undefined ? (
                    <>
                      <div className={s.pendingQ}>Вы работали вместе?</div>
                      <div className={s.twoBtns}>
                        <Btn
                          size="md"
                          variant="outline"
                          loading={busyId === r.id + ':y'}
                          disabled={!!busyId}
                          onClick={() => answer(r, true)}
                        >
                          Да, работали
                        </Btn>
                        <Btn
                          size="md"
                          variant="ghost"
                          loading={busyId === r.id + ':n'}
                          disabled={!!busyId}
                          onClick={() => answer(r, false)}
                        >
                          Не работали
                        </Btn>
                      </div>
                    </>
                  ) : a ? (
                    <div className={s.pendingDone}>
                      <span className={s.okTag}><Check size={12} strokeWidth={3} />Подтверждено</span>
                      <Btn
                        size="md"
                        variant="soft"
                        onClick={() => push('person', { id: r.author.id, autoReview: true })}
                      >
                        Оставить встречный отзыв
                      </Btn>
                    </div>
                  ) : (
                    <div className={s.pendingDone}>
                      <span className={s.mutedText}>Отмечено: не работали. Модератор посмотрит этот отзыв.</span>
                    </div>
                  )}
                </Card>
              )
            })}
          </div>
        </Section>
      )}

      <Section
        title="Обо мне"
        right={savedAt ? <span className={s.savedNote}><Check size={14} strokeWidth={3} />Сохранено</span> : null}
      >
        <Card>
          <Toggle
            on={!hidden}
            onChange={toggleHidden}
            label="Показывать меня в рейтинге"
            hint="Если выключить — тебя не будет в списке и в профиле Бести. Отзывы сохранятся."
          />
          <div className={s.divider} />
          <div className={s.labelRow}>
            <span className={s.label}>Что умеешь</span>
            <span className={s.counter}>{skills.length}/{MAX_SKILLS}</span>
          </div>
          <div className={s.chipWrap}>
            {SKILLS.map((k) => (
              <Chip key={k.code} active={skills.includes(k.code)} onClick={() => toggleSkill(k.code)}>
                {k.label}
              </Chip>
            ))}
          </div>
          <div className={s.divider} />
          <div className={s.label}>Штат, где работаешь сейчас</div>
          <button type="button" className={s.selectBtn} onClick={() => setSheet(true)} data-track="tower_me_state">
            <MapPin size={18} className={s.mutedIcon} />
            <span className={s.selectText}>{st ? `${stateName(st)} (${st})` : 'Не выбран'}</span>
            <ChevronDown size={18} className={s.mutedIcon} />
          </button>
        </Card>
      </Section>

      {me.bestie && (
        <Section title="Профиль Бести">
          <Card>
            <div className={s.bestieRow}>
              <span className={s.bestieIcon}><Link2 size={18} /></span>
              <span className={s.bestieText}>
                <span className={s.meName} style={{ fontSize: 16 }}>@{me.bestie.username}</span>
                <span className={s.mutedText}>Привязан к этому Telegram</span>
              </span>
              <Btn size="sm" variant="soft" onClick={() => openLink(me.bestie.url)} track="tower_me_open_bestie">Открыть</Btn>
            </div>
            <Btn variant="danger" size="md" block loading={unlinking} onClick={unlink} style={{ marginTop: 12 }}>
              Отвязать
            </Btn>
          </Card>
        </Section>
      )}

      <div className={s.section}>
        <Btn variant="outline" block icon={<UserPlus size={18} />} onClick={share} disabled={!me.shareLink} track="tower_me_ask_review">
          Попросить отзыв у коллег
        </Btn>
        <div className={s.smallNote} style={{ textAlign: 'center' }}>
          Отправь ссылку коллегам по объектам — она откроет форму отзыва о тебе.
        </div>
      </div>

      <button type="button" className={s.footerLink} onClick={() => openTg(me.botLinks?.manage)} data-track="tower_me_manage">
        Подписка: управлять в боте
      </button>
      <button type="button" className={s.footerLink} style={{ marginTop: 4 }} onClick={() => showWelcome?.()} data-track="tower_me_welcome">
        Как это работает
      </button>

      <Sheet open={sheet} onClose={() => setSheet(false)} title="Штат, где работаешь">
        <StatePicker value={st} onPick={pickState} allLabel="Не указывать" />
      </Sheet>
    </div>
  )
}
