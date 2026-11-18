// @ts-nocheck
'use client'

// One team: members, rating, «Подать заявку» (the leader decides in the bot
// or in the app; the same rules as /crew join).
import { useCallback, useEffect, useRef, useState } from 'react'
import { UserPlus } from 'lucide-react'
import { useApp } from './ctx'
import { ActionBar, Avatar, Btn, Card, ErrorBox, Section, SkeletonList, TopBar, plural } from './ui'
import { MemberList, TeamRatingLine, hashId } from './TeamsTab'
import s from './miniapp.module.css'

const MONTHS_GEN = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря']
function since(iso) {
  const d = new Date(iso || '')
  if (Number.isNaN(d.getTime())) return ''
  return `с ${d.getDate()} ${MONTHS_GEN[d.getMonth()]} ${d.getFullYear()}`
}

export default function TeamScreen({ id, visible = true }) {
  const { api, me, push, back, toast, haptic } = useApp()
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const busyRef = useRef(false)
  const wasVisible = useRef(visible)
  const hasData = useRef(false)

  const load = useCallback(async (silent = false) => {
    if (!silent) setError('')
    const r = await api.get('teams', { id })
    if (r.ok) {
      hasData.current = true
      setData(r)
      setError('')
    } else if (!silent || !hasData.current) {
      setError(r.error)
    }
  }, [api, id])

  useEffect(() => { load(false) }, [load])
  useEffect(() => {
    if (visible && !wasVisible.current) load(true)
    wasVisible.current = visible
  }, [visible])

  const join = async () => {
    if (busyRef.current) return
    busyRef.current = true
    setBusy(true)
    const r = await api.post('teams', { action: 'join', teamId: id })
    busyRef.current = false
    setBusy(false)
    if (r.ok) {
      haptic.ok()
      toast(r.text, 'ok')
    } else {
      toast(r.error, 'error')
    }
    load(true)
  }

  const t = data?.team
  const viewer = data?.viewer || {}
  const members = data?.members || []
  const canJoin = !!data && !viewer.inThisTeam && !viewer.inOtherTeam && !viewer.pendingHere

  return (
    <>
      <TopBar title={t?.name || 'Команда'} onBack={back} />
      <div className={data ? s.pageScreen : s.pageNoBar}>
        {!data && !error && (
          <>
            <div className={s.skel} style={{ height: 150, marginBottom: 12 }} />
            <SkeletonList n={4} />
          </>
        )}
        {!data && error && <ErrorBox text={error} onRetry={() => load(false)} />}

        {data && (
          <>
            <Card className={s.hero}>
              <Avatar id={hashId(t.id)} name={t.name} size={72} square />
              <div className={s.heroName}>{t.name}</div>
              <div className={s.heroUser}>
                {members.length} {plural(members.length, ['участник', 'участника', 'участников'])}
                {t.created_at ? ` · ${since(t.created_at)}` : ''}
              </div>
              <div className={s.heroRating}>
                <TeamRatingLine rating={data.rating} members={members.length} />
              </div>
              {t.description && <div className={s.teamDesc} style={{ textAlign: 'center' }}>{t.description}</div>}
            </Card>

            {viewer.inThisTeam && <div className={s.notice}>Это твоя команда.</div>}
            {viewer.inOtherTeam && (
              <div className={s.notice}>Ты уже в другой команде. Чтобы перейти сюда, сначала выйди из своей.</div>
            )}

            <Section title="Участники">
              <MemberList members={members} meId={me?.id} onOpen={(pid) => push('person', { id: pid })} />
            </Section>
          </>
        )}
      </div>

      {data && !viewer.inThisTeam && !viewer.inOtherTeam && (
        <ActionBar>
          {viewer.pendingHere ? (
            <Btn block variant="soft" disabled>Заявка уже у лидера</Btn>
          ) : (
            <Btn block icon={<UserPlus size={18} />} loading={busy} disabled={!canJoin} onClick={join} track="tower_team_join">
              Подать заявку
            </Btn>
          )}
        </ActionBar>
      )}
    </>
  )
}
