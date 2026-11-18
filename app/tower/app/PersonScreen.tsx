// @ts-nocheck
'use client'

// Person card: stars, «работали бы снова», per-criterion averages, reviews,
// and «Оставить отзыв» (the server checks the review gate first).
import { useCallback, useEffect, useRef, useState } from 'react'
import { Star, Crown, MapPin, Lock, UserPlus, Pencil } from 'lucide-react'
import { CRITERIA } from '@/lib/tower-app-shared'
import { useApp } from './ctx'
import {
  ActionBar, Avatar, Btn, Card, Empty, ErrorBox, ReviewCard, Section, SkeletonList, Stars, TopBar,
  cx, fmtAvg, reviewsText, shareUrl, skillLabel, stateName,
} from './ui'
import s from './miniapp.module.css'

export default function PersonScreen({ id, autoReview = false, visible = true }) {
  const { api, me, push, back, toast, haptic, openLink, openTg } = useApp()
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)
  const autoDone = useRef(false)
  const wasVisible = useRef(visible)
  const busyRef = useRef(false)
  const hasData = useRef(false)

  const load = useCallback(async (silent = false) => {
    if (!silent) setError(null)
    const r = await api.get('person', { id })
    if (r.ok) {
      hasData.current = true
      setData(r)
      setError(null)
    } else if (!silent || !hasData.current) {
      setError(r.error)
    }
    return r
  }, [api, id])

  useEffect(() => { load(false) }, [load])

  // Back from the review form → fresh numbers.
  useEffect(() => {
    if (visible && !wasVisible.current) load(true)
    wasVisible.current = visible
  }, [visible])

  const startReview = async () => {
    if (busyRef.current) return
    busyRef.current = true
    setBusy(true)
    const r = await api.get('review', { target: id })
    busyRef.current = false
    setBusy(false)
    if (r.ok) {
      push('wizard', { target: r.target, existing: r.existing })
      return
    }
    if (r.code === 'gate' && r.gate) {
      haptic.err()
      push('gate', { gate: r.gate, targetId: id })
      return
    }
    toast(r.error, 'error')
  }

  // Opened from «Оставить отзыв» in the group / bot → go straight to the form.
  useEffect(() => {
    if (!autoReview || autoDone.current || !data) return
    autoDone.current = true
    if (!data.person?.self) startReview()
  }, [autoReview, data])

  const p = data?.person
  const stats = data?.stats
  const reviews = data?.reviews || []
  const self = !!p?.self
  const hiddenOther = !!p?.hidden && !self

  const share = () => {
    if (me?.shareLink) openTg(shareUrl(me.shareLink))
  }

  return (
    <>
      <TopBar title={p?.name || 'Профиль'} onBack={back} />
      <div className={data ? s.pageScreen : s.pageNoBar}>
        {!data && !error && (
          <>
            <div className={s.skel} style={{ height: 210, marginBottom: 12 }} />
            <SkeletonList n={3} h={96} />
          </>
        )}
        {!data && error && <ErrorBox text={error} onRetry={() => load(false)} />}

        {data && (
          <>
            <Card className={s.hero}>
              <Avatar id={p.id} name={p.name} size={72} />
              <div className={s.heroName}>{p.name}</div>
              {p.username && <div className={s.heroUser}>@{p.username}</div>}
              {!hiddenOther && (p.team || p.state || p.bestie) && (
                <div className={s.heroChips}>
                  {p.team && (
                    <button
                      type="button"
                      className={cx(s.pill, s.pillBtn)}
                      onClick={() => push('team', { id: p.team.id })}
                      data-track="tower_person_team"
                    >
                      {p.team.role === 'leader' && <Crown size={13} className={s.goldIcon} />}
                      {p.team.name}
                    </button>
                  )}
                  {p.state && (
                    <span className={s.pill}><MapPin size={13} />{p.state} · {stateName(p.state)}</span>
                  )}
                  {p.bestie && (
                    <button
                      type="button"
                      className={cx(s.pill, s.pillGold, s.pillBtn)}
                      onClick={() => openLink(p.bestie.url)}
                      data-track="tower_person_bestie"
                    >
                      Бести ✓
                    </button>
                  )}
                </div>
              )}
              {!hiddenOther && p.skills?.length > 0 && (
                <div className={s.heroSkills}>
                  {p.skills.map((c) => <span key={c} className={s.miniTag}>{skillLabel(c)}</span>)}
                </div>
              )}
              {stats && (
                <div className={s.bigRating}>
                  {stats.count > 0 ? (
                    <>
                      <div className={s.bigNum}>{fmtAvg(stats.avg)}</div>
                      <div className={s.bigMeta}>
                        <Stars value={stats.avg} size={20} />
                        <span>{reviewsText(stats.count)}</span>
                      </div>
                    </>
                  ) : (
                    <div className={s.bigEmpty}>Пока нет отзывов</div>
                  )}
                </div>
              )}
            </Card>

            {hiddenOther && (
              <div className={s.notice}>
                <Lock size={16} /> Человек скрыл свой профиль в рейтинге.
              </div>
            )}
            {self && p.hidden && (
              <div className={s.notice}>
                <Lock size={16} /> Ты скрыт из рейтинга — включить можно во вкладке «Я».
              </div>
            )}

            {stats && stats.count > 0 && (
              <Card>
                {stats.wouldAgain && (
                  <div className={s.againBlock}>
                    <div className={s.statLine}>
                      <span>Работали бы снова</span>
                      <b>{stats.wouldAgain.pct}%</b>
                    </div>
                    <div className={s.barTrack}>
                      <div className={cx(s.barFill, s.barFillGreen)} style={{ width: `${stats.wouldAgain.pct}%` }} />
                    </div>
                    <div className={s.statNote}>
                      {stats.wouldAgain.yes} из {stats.wouldAgain.total} ответили «да»
                    </div>
                  </div>
                )}
                <div className={s.critTitle}>Оценки по пунктам</div>
                {CRITERIA.map((c) => {
                  const v = stats.criteria?.[c.key]
                  return (
                    <div key={c.key} className={s.critRow}>
                      <span className={s.critLabel}>{c.title}</span>
                      <span className={s.barTrack}>
                        {v && <span className={s.barFill} style={{ width: `${Math.round((v.avg / 5) * 100)}%` }} />}
                      </span>
                      <span className={s.critVal}>{v ? fmtAvg(v.avg) : '—'}</span>
                    </div>
                  )
                })}
              </Card>
            )}

            {!hiddenOther && (
              <Section title={reviews.length ? `Отзывы · ${stats?.count ?? reviews.length}` : 'Отзывы'}>
                {reviews.length === 0 ? (
                  <Empty
                    icon={<Star size={28} />}
                    text={self
                      ? 'Пока нет отзывов. Попроси коллег по объектам — кнопка внизу.'
                      : 'Пока нет отзывов. Работал с этим человеком — оставь первый.'}
                  />
                ) : (
                  <div className={s.list}>
                    {reviews.map((r) => (
                      <ReviewCard
                        key={r.id}
                        r={r}
                        onAuthor={() => { if (r.author?.id && r.author.id !== id) push('person', { id: r.author.id }) }}
                      />
                    ))}
                  </div>
                )}
              </Section>
            )}
          </>
        )}
      </div>

      {data && (
        <ActionBar>
          {self ? (
            <Btn block icon={<UserPlus size={18} />} onClick={share} disabled={!me?.shareLink} track="tower_ask_review">
              Попросить отзыв у коллег
            </Btn>
          ) : (
            <Btn
              block
              loading={busy}
              icon={data.myReview ? <Pencil size={18} /> : <Star size={18} />}
              onClick={startReview}
              track="tower_leave_review"
            >
              {data.myReview ? 'Изменить мой отзыв' : 'Оставить отзыв'}
            </Btn>
          )}
        </ActionBar>
      )}
    </>
  )
}
