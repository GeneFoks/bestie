// @ts-nocheck
'use client'

// «Команды»: my team (members, the leader's join requests, leave), my pending
// request, every team. Same rules as the bot (lib/tower-teams.ts on the server).
import { useCallback, useEffect, useRef, useState } from 'react'
import { Crown, Plus, Users, Star, ChevronRight } from 'lucide-react'
import { useApp } from './ctx'
import { confirmTg } from './tg'
import {
  Avatar, Btn, Card, Empty, ErrorBox, PersonRow, RatingMini, Section, SkeletonList, cx, fmtAvg, plural,
} from './ui'
import s from './miniapp.module.css'

export function TeamRatingLine({ rating, members }) {
  if (!rating) return <span className={s.mutedText}>Пока без рейтинга</span>
  return (
    <span className={s.teamRating}>
      <Star size={15} fill="currentColor" className={s.goldIcon} />
      <b>{fmtAvg(rating.avg)}</b>
      <span className={s.mutedText}>(оценены {rating.rated} из {members})</span>
    </span>
  )
}

export function MemberList({ members, onOpen, meId }) {
  return (
    <div className={s.list}>
      {members.map((m) => (
        <PersonRow
          key={m.id}
          p={m}
          me={m.id === meId}
          lead={m.role === 'leader' ? <Crown size={14} className={s.goldIcon} aria-label="Лидер" /> : null}
          sub={m.role === 'leader' ? 'лидер команды' : m.username ? '@' + m.username : null}
          onClick={() => onOpen(m.id)}
        />
      ))}
    </div>
  )
}

export default function TeamsTab({ visible }) {
  const { api, push, toast, haptic, me } = useApp()
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState('')
  const wasVisible = useRef(visible)
  const hasData = useRef(false)
  const busyRef = useRef(false)

  const load = useCallback(async (silent = false) => {
    if (!silent) setError('')
    const r = await api.get('teams')
    if (r.ok) {
      hasData.current = true
      setData(r)
      setError('')
    } else if (!silent || !hasData.current) {
      setError(r.error)
    }
  }, [api])

  useEffect(() => { load(false) }, [load])

  // Back from a team / «Создать команду» → fresh list.
  useEffect(() => {
    if (visible && !wasVisible.current) load(true)
    wasVisible.current = visible
  }, [visible])

  const act = async (key, body, confirmMsg = '') => {
    if (busyRef.current) return
    if (confirmMsg && !(await confirmTg(confirmMsg))) return
    busyRef.current = true
    setBusy(key)
    const r = await api.post('teams', body)
    busyRef.current = false
    setBusy('')
    if (r.ok) {
      haptic.ok()
      toast(r.text, 'ok')
      load(true)
    } else {
      toast(r.error, 'error')
      if (r.code !== 'network') load(true)
    }
  }

  const mine = data?.mine
  const pending = data?.pending
  const teams = data?.teams || []
  const isLeader = mine?.role === 'leader'

  const leaveText = () => {
    if (!mine) return ''
    let t = `Выйти из команды «${mine.team.name}»?`
    if (isLeader) {
      t += mine.members.length > 1
        ? ' Лидером станет другой участник.'
        : ' Ты в ней один — команда удалится.'
    }
    return t
  }

  return (
    <div className={s.page}>
      <div className={s.tabTitle}>Команды</div>
      <div className={s.tabSub}>Команды группы «Вышки в США» и их рейтинг</div>

      {!data && !error && <SkeletonList n={5} h={72} />}
      {!data && error && <ErrorBox text={error} onRetry={() => load(false)} />}

      {data && (
        <>
          {mine && (
            <Section title="Моя команда">
              <Card>
                <div className={s.teamHead}>
                  <Avatar id={hashId(mine.team.id)} name={mine.team.name} size={48} square />
                  <span className={s.teamHeadText}>
                    <span className={s.teamName}>{mine.team.name}</span>
                    <TeamRatingLine rating={mine.rating} members={mine.members.length} />
                  </span>
                  {isLeader && <span className={cx(s.pill, s.pillGold)}><Crown size={13} />лидер</span>}
                </div>
                {mine.team.description && <div className={s.teamDesc}>{mine.team.description}</div>}
                <div className={s.subLabel}>
                  {mine.members.length} {plural(mine.members.length, ['участник', 'участника', 'участников'])}
                </div>
                <MemberList members={mine.members} meId={me?.id} onOpen={(id) => push('person', { id })} />

                {isLeader && mine.requests?.length > 0 && (
                  <>
                    <div className={s.subLabel}>Заявки · {mine.requests.length}</div>
                    <div className={s.list}>
                      {mine.requests.map((r) => (
                        <div key={r.id} className={s.reqRow}>
                          <PersonRow p={r} onClick={() => push('person', { id: r.id })} right={<RatingMini avg={r.avg} count={r.count} />} />
                          <div className={s.twoBtns}>
                            <Btn
                              size="md"
                              loading={busy === 'acc:' + r.id}
                              disabled={!!busy}
                              onClick={() => act('acc:' + r.id, { action: 'decide', userId: r.id, accept: true })}
                            >
                              Принять
                            </Btn>
                            <Btn
                              size="md"
                              variant="ghost"
                              loading={busy === 'dec:' + r.id}
                              disabled={!!busy}
                              onClick={() => act('dec:' + r.id, { action: 'decide', userId: r.id, accept: false })}
                            >
                              Отклонить
                            </Btn>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}

                <Btn
                  variant="danger"
                  size="md"
                  block
                  loading={busy === 'leave'}
                  disabled={!!busy && busy !== 'leave'}
                  onClick={() => act('leave', { action: 'leave' }, leaveText())}
                  style={{ marginTop: 14 }}
                >
                  Выйти из команды
                </Btn>
              </Card>
            </Section>
          )}

          {!mine && pending && (
            <div className={s.banner}>
              <span>Заявка в «{pending.teamName}» ждёт ответа лидера.</span>
              <Btn
                size="sm"
                variant="soft"
                loading={busy === 'cancel'}
                onClick={() => act('cancel', { action: 'cancel' }, `Отменить заявку в «${pending.teamName}»?`)}
              >
                Отменить
              </Btn>
            </div>
          )}

          {!mine && (
            <div className={s.section}>
              <Btn block icon={<Plus size={18} />} onClick={() => push('createTeam')} track="tower_team_create_open">
                Создать команду
              </Btn>
              <div className={s.smallNote} style={{ textAlign: 'center' }}>
                Или подай заявку в команду из списка — лидер получит её в боте.
              </div>
            </div>
          )}

          <Section title={teams.length ? `Все команды · ${teams.length}` : 'Все команды'}>
            {teams.length === 0 ? (
              <Empty icon={<Users size={30} />} title="Команд пока нет" text="Создай первую — кнопка выше." />
            ) : (
              <div className={s.list}>
                {teams.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    className={s.personRow}
                    onClick={() => push('team', { id: t.id })}
                    data-track="tower_team_row"
                  >
                    <Avatar id={hashId(t.id)} name={t.name} size={44} square />
                    <span className={s.personMid}>
                      <span className={s.personName}>
                        <span className={s.personNameText}>{t.name}</span>
                        {mine?.team?.id === t.id && <span className={s.youTag}>твоя</span>}
                      </span>
                      <span className={s.personSub}>
                        {t.members} чел.{t.leader?.name ? ` · лидер ${t.leader.name}` : ''}
                      </span>
                    </span>
                    <span className={s.rateMini}>
                      {t.rating != null ? (
                        <span className={s.rateVal}><Star size={15} fill="currentColor" className={s.goldIcon} />{fmtAvg(t.rating)}</span>
                      ) : (
                        <span className={s.rateNone}>—</span>
                      )}
                    </span>
                    <ChevronRight size={18} className={s.rowChevron} />
                  </button>
                ))}
              </div>
            )}
          </Section>
        </>
      )}
    </div>
  )
}

// Stable small number from a team uuid (avatar color).
export function hashId(id) {
  const str = String(id || '')
  let h = 0
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) % 1000003
  return h
}
