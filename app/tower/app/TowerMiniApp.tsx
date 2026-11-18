// @ts-nocheck
'use client'

// «Вышки в США» Mini App root (/tower/app, opened inside Telegram).
//
// Boot: telegram-web-app.js → WebApp.initData (or #tgWebAppData if the script
// is slow) → GET /api/tower/app/me. Every API call carries the raw initData in
// a header; the server verifies it with the bot token. No initData (a normal
// browser) → «Откройте через @TowerCrewBot».
//
// Navigation: three tabs (kept mounted, so filters and scroll survive) and a
// stack of inner screens on top. One Telegram BackButton handler: it closes an
// open sheet first, then asks the top screen (the wizard steps back), then pops.
// Start params (startapp / ?go=): home · teams · me · person_<id> · review_<id>
// · team_<uuid>.
import Script from 'next/script'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Trophy, Users, BadgeCheck, AlertCircle, RefreshCw, CheckCircle2 } from 'lucide-react'
import { parseStartParam } from '@/lib/tower-app-shared'
import { AppCtx } from './ctx'
import { createApi, TEXT } from './api'
import { getWA, applyTheme, haptic, openLink, openTg, useTgBack, closeApp, isMobileTg } from './tg'
import { Btn, Spinner, cx } from './ui'
import RatingTab from './RatingTab'
import TeamsTab from './TeamsTab'
import MeTab from './MeTab'
import PersonScreen from './PersonScreen'
import ReviewWizard from './ReviewWizard'
import TeamScreen from './TeamScreen'
import CreateTeamScreen from './CreateTeamScreen'
import { GateScreen } from './GateChecklist'
import s from './miniapp.module.css'

// Captured before anything can touch the URL (the hash carries tgWebAppData).
const BOOT_HASH = typeof window !== 'undefined' ? window.location.hash : ''
const BOOT_TIMEOUT_MS = 3500
const MAX_STACK = 15
const RESUME_MIN_MS = 4000
const ME_STALE_MS = 15000

const TABS = [
  { id: 'rating', label: 'Рейтинг', Icon: Trophy },
  { id: 'teams', label: 'Команды', Icon: Users },
  { id: 'me', label: 'Я', Icon: BadgeCheck },
]
const TAB_IDS = TABS.map((t) => t.id)

function hashParam(name) {
  try { return new URLSearchParams(String(BOOT_HASH || '').replace(/^#/, '')).get(name) || '' } catch { return '' }
}
function qs(name) {
  try { return new URLSearchParams(window.location.search).get(name) || '' } catch { return '' }
}
function initParam(initData, name) {
  try { return new URLSearchParams(initData).get(name) || '' } catch { return '' }
}

function botFrom(url) {
  const m = /t\.me\/([A-Za-z0-9_]{5,32})/i.exec(String(url || ''))
  return m ? m[1] : 'TowerCrewBot'
}

// ── Full-screen states ──────────────────────────────────────────────────────
function Splash() {
  return (
    <div className={s.center}>
      <div className={s.brandEmoji} aria-hidden="true">🗼</div>
      <div className={s.brandTitle}>Вышки в США</div>
      <Spinner size={24} />
    </div>
  )
}

function OpenInTelegram({ openUrl }) {
  const bot = botFrom(openUrl)
  return (
    <div className={s.center}>
      <div className={s.brandCard}>
        <div className={s.brandEmoji} aria-hidden="true">🗼</div>
        <div className={s.brandTitle}>Вышки в США</div>
        <div className={s.brandText}>Рейтинг, отзывы и команды монтажников.</div>
        <div className={s.brandText}>Это приложение открывается внутри Telegram.</div>
        <a className={cx(s.btn, s.btn_primary, s.btn_lg, s.btnBlock)} href={openUrl} rel="noopener">
          <span>Открыть в Telegram</span>
        </a>
        <div className={s.smallNote}>Или напишите боту @{bot} команду /app</div>
      </div>
    </div>
  )
}

function ErrorScreen({ err, onRetry }) {
  const code = err?.code || 'error'
  const text = code === 'auth' ? TEXT.auth
    : code === 'schema' ? TEXT.schema
      : code === 'network' ? TEXT.network
        : code === 'rate' ? TEXT.rate
          : err?.text || TEXT.generic
  return (
    <div className={s.center}>
      <div className={s.brandCard}>
        <div className={s.errorIcon}><AlertCircle size={30} /></div>
        <div className={s.brandText} style={{ fontSize: 16, color: 'var(--text-primary)' }}>{text}</div>
        {code === 'auth' ? (
          <Btn block onClick={() => { if (!closeApp()) window.location.reload() }}>Закрыть</Btn>
        ) : (
          <Btn block icon={<RefreshCw size={18} />} onClick={onRetry}>{code === 'schema' ? 'Обновить' : 'Попробовать снова'}</Btn>
        )}
      </div>
    </div>
  )
}

// ── Root ────────────────────────────────────────────────────────────────────
export default function TowerMiniApp({ openUrl = 'https://t.me/TowerCrewBot?start=app' }) {
  const [phase, setPhaseState] = useState('boot') // boot | browser | error | ready
  const [err, setErr] = useState(null)
  const [meData, setMeData] = useState(null) // GET /me body: { me, gate, pending }
  const [tab, setTabState] = useState('rating')
  const [visited, setVisited] = useState({ rating: true })
  const [stack, setStack] = useState([])
  const [nav, setNav] = useState('push')
  const [overlays, setOverlays] = useState(0)
  const [toastState, setToast] = useState(null)
  const [resumeTick, setResumeTick] = useState(0)
  const [waReady, setWaReady] = useState(false)
  const [kb, setKb] = useState(false)

  const phaseRef = useRef('boot')
  const initRef = useRef('')
  const startRawRef = useRef('')
  const startedRef = useRef(false)
  const waDoneRef = useRef(false)
  const stackRef = useRef([])
  const tabRef = useRef('rating')
  const scrollMemo = useRef({})
  const backOverrides = useRef({})
  const overlayList = useRef([])
  const seq = useRef(0)
  const lastMeAt = useRef(0)
  const resumeRef = useRef(() => {})
  const toastTimer = useRef(null)

  const setPhase = useCallback((p) => {
    phaseRef.current = p
    setPhaseState(p)
  }, [])

  const fail = useCallback((r) => {
    setErr({ code: r?.code || 'error', text: r?.error || TEXT.generic })
    setPhase('error')
  }, [setPhase])

  const api = useMemo(() => createApi(() => initRef.current, () => {
    setErr({ code: 'auth', text: TEXT.auth })
    setPhase('error')
  }), [setPhase])

  const refreshMe = useCallback(async () => {
    const r = await api.get('me')
    if (r.ok) {
      lastMeAt.current = Date.now()
      setMeData(r)
    }
    return r
  }, [api])

  // ── Toast ──
  const toast = useCallback((msg, type = 'info') => {
    if (!msg) return
    const id = ++seq.current
    if (type === 'error') haptic.err()
    setToast({ id, msg: String(msg), type })
    clearTimeout(toastTimer.current)
    const ms = Math.min(6000, 2400 + String(msg).length * 35)
    toastTimer.current = setTimeout(() => setToast((t) => (t && t.id === id ? null : t)), ms)
  }, [])

  // ── Navigation ──
  const topKey = () => {
    const st = stackRef.current
    return st.length ? st[st.length - 1].key : 'tab:' + tabRef.current
  }
  const saveScroll = () => {
    try { scrollMemo.current[topKey()] = window.scrollY || 0 } catch {}
  }
  const restoreScroll = (y) => {
    requestAnimationFrame(() => {
      try { window.scrollTo(0, y || 0) } catch {}
    })
  }

  const push = useCallback((type, props = {}) => {
    saveScroll()
    const key = type + ':' + (++seq.current)
    let next = [...stackRef.current, { key, type, props }]
    if (next.length > MAX_STACK) next = next.slice(next.length - MAX_STACK)
    stackRef.current = next
    setNav('push')
    setStack(next)
    restoreScroll(0)
  }, [])

  const pop = useCallback(() => {
    const st = stackRef.current
    if (!st.length) return
    const gone = st[st.length - 1]
    delete backOverrides.current[gone.key]
    delete scrollMemo.current[gone.key]
    const next = st.slice(0, -1)
    stackRef.current = next
    setNav('pop')
    setStack(next)
    restoreScroll(scrollMemo.current[topKey()])
  }, [])

  const replaceTop = useCallback((type, props = {}) => {
    const st = stackRef.current
    if (st.length) {
      delete backOverrides.current[st[st.length - 1].key]
    }
    const key = type + ':' + (++seq.current)
    const next = [...st.slice(0, -1), { key, type, props }]
    stackRef.current = next
    setNav('push')
    setStack(next)
    restoreScroll(0)
  }, [])

  const back = useCallback(() => {
    const ov = overlayList.current
    if (ov.length) {
      try { ov[ov.length - 1].close() } catch {}
      return
    }
    const st = stackRef.current
    if (!st.length) return
    const fn = backOverrides.current[st[st.length - 1].key]
    if (fn) {
      let handled = false
      try { handled = fn() === true } catch {}
      if (handled) return
    }
    pop()
  }, [pop])

  const registerBack = useCallback((key, fn) => {
    if (fn) backOverrides.current[key] = fn
    else delete backOverrides.current[key]
  }, [])

  const addOverlay = useCallback((close) => {
    const id = ++seq.current
    overlayList.current = [...overlayList.current, { id, close }]
    setOverlays(overlayList.current.length)
    return id
  }, [])
  const removeOverlay = useCallback((id) => {
    overlayList.current = overlayList.current.filter((o) => o.id !== id)
    setOverlays(overlayList.current.length)
  }, [])

  const setTab = useCallback((t) => {
    if (!TAB_IDS.includes(t)) return
    // From an inner screen (e.g. «Команда» chip on «Я») → close the stack.
    if (stackRef.current.length) {
      stackRef.current = []
      backOverrides.current = {}
      setStack([])
    }
    if (t === tabRef.current) {
      try { window.scrollTo({ top: 0, behavior: 'smooth' }) } catch {}
      return
    }
    saveScroll()
    tabRef.current = t
    setVisited((v) => (v[t] ? v : { ...v, [t]: true }))
    setNav('push')
    setTabState(t)
    restoreScroll(scrollMemo.current['tab:' + t])
    if (t === 'me' && Date.now() - lastMeAt.current > ME_STALE_MS) refreshMe()
  }, [refreshMe])

  const onTabPress = (t) => {
    haptic.select()
    setTab(t)
  }

  // ── Boot ──
  const route = useCallback((raw, me) => {
    const sp = parseStartParam(raw)
    if (sp.screen === 'teams') setTab('teams')
    else if (sp.screen === 'me') setTab('me')
    else if (sp.screen === 'person' && sp.id) push('person', { id: sp.id })
    else if (sp.screen === 'review' && sp.id) push('person', { id: sp.id, autoReview: sp.id !== me?.id })
    else if (sp.screen === 'team' && sp.id) {
      setTab('teams')
      push('team', { id: sp.id })
    }
  }, [setTab, push])

  const startApp = useCallback(async () => {
    setPhase('boot')
    const r = await api.get('me')
    if (!r.ok) {
      if (r.code !== 'auth') fail(r)
      return
    }
    lastMeAt.current = Date.now()
    setMeData(r)
    setPhase('ready')
    const raw = startRawRef.current
    startRawRef.current = ''
    if (raw) route(raw, r.me)
  }, [api, fail, route, setPhase])

  const initWA = useCallback(() => {
    const wa = getWA()
    if (!wa) return null
    // The script also loads in a normal browser — touch nothing there.
    if (!waDoneRef.current && (wa.initData || hashParam('tgWebAppData'))) {
      waDoneRef.current = true
      try { wa.ready() } catch {}
      try { wa.expand() } catch {}
      try { if (wa.isVersionAtLeast?.('7.7')) wa.disableVerticalSwipes?.() } catch {}
      applyTheme(wa)
      try { wa.onEvent('themeChanged', () => applyTheme(wa)) } catch {}
      try { wa.onEvent('activated', () => resumeRef.current()) } catch {}
      setWaReady(true)
    }
    return wa
  }, [])

  // Called when the script is ready, if it was already there, and on timeout.
  const init = useCallback((fromTimeout = false) => {
    const wa = initWA()
    if (startedRef.current) return
    const initData = (wa && wa.initData) || hashParam('tgWebAppData') || ''
    if (!initData) {
      if (wa || fromTimeout) setPhase('browser')
      return
    }
    startedRef.current = true
    initRef.current = initData
    startRawRef.current = (wa && wa.initDataUnsafe && wa.initDataUnsafe.start_param) ||
      initParam(initData, 'start_param') || qs('tgWebAppStartParam') || qs('go') || ''
    startApp()
  }, [initWA, startApp, setPhase])

  useEffect(() => {
    if (getWA()) init()
    const t = setTimeout(() => {
      if (!startedRef.current && phaseRef.current === 'boot') init(true)
    }, BOOT_TIMEOUT_MS)
    return () => clearTimeout(t)
  }, [init])

  const retry = () => {
    if (!initRef.current) {
      setPhase('browser')
      return
    }
    startApp()
  }

  // Back in the app (from the browser after linking / paying) → fresh «Я».
  resumeRef.current = () => {
    if (phaseRef.current !== 'ready') return
    if (Date.now() - lastMeAt.current < RESUME_MIN_MS) return
    // «activated» and visibilitychange both fire on return → one refresh.
    lastMeAt.current = Date.now()
    refreshMe()
    setResumeTick((n) => n + 1)
  }
  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === 'visible') resumeRef.current()
    }
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [])

  // Telegram header «Назад»: shown on inner screens and over open sheets.
  useTgBack(back, waReady && phase === 'ready' && (stack.length > 0 || overlays > 0))

  // Phone keyboard open → hide the tab bar (it would sit on top of the keys).
  const onFocusIn = (e) => {
    const el = e.target
    if (!el || !isMobileTg()) return
    if (el.tagName === 'TEXTAREA' || (el.tagName === 'INPUT' && !/^(checkbox|radio|button)$/i.test(el.type || ''))) setKb(true)
  }
  const onFocusOut = () => setKb(false)

  const ctx = useMemo(() => ({
    api,
    meData,
    me: meData?.me || null,
    setMeData,
    refreshMe,
    push,
    pop,
    back,
    replaceTop,
    setTab,
    registerBack,
    addOverlay,
    removeOverlay,
    openLink,
    openTg,
    haptic,
    toast,
    resumeTick,
    inTelegram: waReady,
  }), [api, meData, refreshMe, push, pop, back, replaceTop, setTab, registerBack, addOverlay, removeOverlay, toast, resumeTick, waReady])

  const renderScreen = (e, top) => {
    const p = e.props || {}
    switch (e.type) {
      case 'person': return <PersonScreen id={p.id} autoReview={!!p.autoReview} visible={top} />
      case 'wizard': return <ReviewWizard target={p.target} existing={p.existing} screenKey={e.key} />
      case 'gate': return <GateScreen gate={p.gate} targetId={p.targetId} fromWizard={!!p.fromWizard} visible={top} />
      case 'team': return <TeamScreen id={p.id} visible={top} />
      case 'createTeam': return <CreateTeamScreen />
      default: return null
    }
  }

  const pendingCount = (meData?.pending || []).length
  const onTabs = stack.length === 0

  return (
    <AppCtx.Provider value={ctx}>
      <Script
        id="tg-web-app"
        src="https://telegram.org/js/telegram-web-app.js"
        strategy="afterInteractive"
        onReady={() => init()}
        onError={() => init(true)}
      />
      <div className={s.shell} onFocus={onFocusIn} onBlur={onFocusOut}>
        {phase === 'boot' && <Splash />}
        {phase === 'browser' && <OpenInTelegram openUrl={openUrl} />}
        {phase === 'error' && <ErrorScreen err={err} onRetry={retry} />}
        {phase === 'ready' && (
          <>
            <div className={nav === 'pop' && onTabs ? s.slideBack : undefined} style={{ display: onTabs ? 'block' : 'none' }}>
              {TABS.map((t) => (visited[t.id] ? (
                <div
                  key={t.id}
                  className={tab === t.id ? s.fadeIn : undefined}
                  style={{ display: tab === t.id ? 'block' : 'none' }}
                  role="tabpanel"
                >
                  {t.id === 'rating' && <RatingTab visible={onTabs && tab === 'rating'} />}
                  {t.id === 'teams' && <TeamsTab visible={onTabs && tab === 'teams'} />}
                  {t.id === 'me' && <MeTab visible={onTabs && tab === 'me'} />}
                </div>
              ) : null))}
            </div>

            {stack.map((e, i) => {
              const top = i === stack.length - 1
              return (
                <div
                  key={e.key}
                  className={top ? (nav === 'pop' ? s.slideBack : s.slideIn) : undefined}
                  style={{ display: top ? 'block' : 'none' }}
                >
                  {renderScreen(e, top)}
                </div>
              )
            })}

            {onTabs && !kb && (
              <div className={s.tabbar} role="tablist" aria-label="Разделы">
                <div className={s.tabbarInner}>
                  {TABS.map(({ id, label, Icon }) => (
                    <button
                      key={id}
                      type="button"
                      role="tab"
                      aria-selected={tab === id}
                      className={cx(s.tab, tab === id && s.tabOn)}
                      onClick={() => onTabPress(id)}
                    >
                      {tab === id && <span className={s.tabPill} aria-hidden="true" />}
                      <span className={s.tabIconWrap}>
                        <Icon size={23} strokeWidth={tab === id ? 2.3 : 1.9} />
                        {id === 'me' && pendingCount > 0 && (
                          <span className={s.tabDot} aria-hidden="true" />
                        )}
                      </span>
                      <span className={s.tabLabel}>{label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {toastState && (
          <div
            key={toastState.id}
            className={cx(s.toast, onTabs && phase === 'ready' ? s.toastAboveTabs : s.toastAboveBar)}
            role="status"
            aria-live="polite"
          >
            {toastState.type === 'error' ? <AlertCircle size={18} className={s.toastErrIcon} />
              : toastState.type === 'ok' ? <CheckCircle2 size={18} className={s.toastOkIcon} /> : null}
            <span>{toastState.msg}</span>
          </div>
        )}
      </div>
    </AppCtx.Provider>
  )
}
