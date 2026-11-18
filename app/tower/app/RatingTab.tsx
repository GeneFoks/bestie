// @ts-nocheck
'use client'

// «Рейтинг»: everyone in the group directory (minus people who hid
// themselves) — search, one skill filter, US state, sort.
import { useCallback, useEffect, useRef, useState } from 'react'
import { Search, X, MapPin, ChevronDown, Users } from 'lucide-react'
import { SKILLS } from '@/lib/tower-app-shared'
import { useApp } from './ctx'
import {
  Btn, Chip, Empty, ErrorBox, PersonRow, Segmented, Sheet, SkeletonList, StatePicker, stateName,
} from './ui'
import s from './miniapp.module.css'

const PAGE = 30
const SORTS = [
  { value: 'best', label: 'Лучшие' },
  { value: 'count', label: 'Больше отзывов' },
  { value: 'new', label: 'Новые' },
]

export default function RatingTab({ visible }) {
  const { api, push, haptic, toast, me } = useApp()
  const [q, setQ] = useState('')
  const [qd, setQd] = useState('')
  const [skill, setSkill] = useState('')
  const [st, setSt] = useState('')
  const [sort, setSort] = useState('best')
  const [list, setList] = useState([])
  const [total, setTotal] = useState(null)
  const [more, setMore] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState('')
  const [sheet, setSheet] = useState(false)
  const seq = useRef(0)
  const wasVisible = useRef(visible)
  const sizeRef = useRef(0)
  sizeRef.current = list.length

  useEffect(() => {
    const t = setTimeout(() => setQd(q.trim()), 300)
    return () => clearTimeout(t)
  }, [q])

  // offset 0 = a new list; silent = refresh without the skeleton.
  const load = useCallback(async (offset = 0, silent = false) => {
    const my = ++seq.current
    if (offset === 0 && !silent) {
      setLoading(true)
      setError('')
    }
    if (offset > 0) setLoadingMore(true)
    const r = await api.get('people', { q: qd, skill, state: st, sort, offset: offset || undefined })
    if (my !== seq.current) return
    setLoading(false)
    setLoadingMore(false)
    if (!r.ok) {
      if (offset === 0 && !silent) setError(r.error)
      else toast(r.error, 'error')
      return
    }
    const people = Array.isArray(r.people) ? r.people : []
    setList((prev) => {
      if (offset === 0) return people
      const seen = new Set(prev.map((p) => p.id))
      return prev.concat(people.filter((p) => !seen.has(p.id)))
    })
    setTotal(typeof r.total === 'number' ? r.total : null)
    setMore(!!r.more)
  }, [api, qd, skill, st, sort])

  useEffect(() => { load(0) }, [load])

  // Back on this tab (after a review, a settings change) → quiet refresh, but
  // only while one page is shown (a longer list would lose its scroll place).
  useEffect(() => {
    if (visible && !wasVisible.current && sizeRef.current <= PAGE) load(0, true)
    wasVisible.current = visible
  }, [visible])

  const pickSkill = (code) => {
    haptic.select()
    setSkill((cur) => (cur === code ? '' : code))
  }
  const filtered = !!(qd || skill || st)
  const reset = () => {
    setQ('')
    setQd('')
    setSkill('')
    setSt('')
  }

  return (
    <div className={s.page}>
      <div className={s.tabTitle}>Рейтинг</div>
      <div className={s.tabSub}>
        Монтажники группы «Вышки в США»{total != null && !filtered ? ` · ${total}` : ''}
      </div>

      <div className={s.searchBox}>
        <Search size={18} className={s.searchIcon} />
        <input
          className={s.searchInput}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur() }}
          placeholder="Имя или @username"
          autoComplete="off"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          enterKeyHint="search"
          maxLength={64}
          aria-label="Поиск по имени"
        />
        {q && (
          <button type="button" className={s.clearBtn} onClick={() => setQ('')} aria-label="Очистить">
            <X size={18} />
          </button>
        )}
      </div>

      <div className={s.chipRow}>
        <Chip
          active={!!st}
          icon={<MapPin size={15} />}
          onClick={() => { haptic.select(); setSheet(true) }}
          track="tower_state_filter"
        >
          {st ? `${st} · ${stateName(st)}` : 'Все штаты'}
          <ChevronDown size={14} className={s.chipChevron} />
        </Chip>
        <span className={s.chipSep} aria-hidden="true" />
        <Chip active={!skill} onClick={() => { haptic.select(); setSkill('') }}>Все</Chip>
        {SKILLS.map((k) => (
          <Chip key={k.code} active={skill === k.code} onClick={() => pickSkill(k.code)}>{k.label}</Chip>
        ))}
      </div>

      <Segmented
        options={SORTS}
        value={sort}
        onChange={(v) => { haptic.select(); setSort(v) }}
      />

      {loading ? (
        <SkeletonList n={7} />
      ) : error ? (
        <ErrorBox text={error} onRetry={() => load(0)} />
      ) : list.length === 0 ? (
        <Empty
          icon={<Users size={30} />}
          title={filtered ? 'Никого не нашли' : 'Пока никого нет'}
          text={filtered ? 'Попробуй другое имя или убери фильтры.' : 'Как только коллеги откроют приложение, они появятся здесь.'}
          action={filtered ? <Btn variant="soft" size="md" onClick={reset}>Сбросить фильтры</Btn> : null}
        />
      ) : (
        <>
          {filtered && total != null && <div className={s.listMeta}>Найдено: {total}</div>}
          <div className={s.list}>
            {list.map((p) => (
              <PersonRow
                key={p.id}
                p={p}
                me={p.id === me?.id}
                sub={p.username ? '@' + p.username : p.team ? p.team.name : null}
                onClick={() => push('person', { id: p.id })}
              />
            ))}
          </div>
          {more && (
            <Btn variant="soft" block loading={loadingMore} onClick={() => load(list.length)} style={{ marginTop: 12 }}>
              Показать ещё
            </Btn>
          )}
        </>
      )}

      <Sheet open={sheet} onClose={() => setSheet(false)} title="Штат">
        <StatePicker
          value={st}
          onPick={(code) => { haptic.select(); setSt(code); setSheet(false) }}
        />
      </Sheet>
    </div>
  )
}
