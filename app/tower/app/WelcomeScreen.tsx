// @ts-nocheck
'use client'

// First-open welcome: four short cards about what the app is for, then
// «Начать». Shown once per device (localStorage); «Как это работает» on the
// «Я» tab opens it again. Deep links (a review / a person) skip it.
import { useEffect, useRef, useState } from 'react'
import { Trophy, Star, Users, ShieldCheck } from 'lucide-react'
import { haptic } from './tg'
import { Btn, cx } from './ui'
import s from './miniapp.module.css'

const SEEN_KEY = 'tower_welcome_v1'

export function welcomeSeen() {
  try { return localStorage.getItem(SEEN_KEY) === '1' } catch { return true }
}
function markSeen() {
  try { localStorage.setItem(SEEN_KEY, '1') } catch {}
}

const SLIDES = [
  {
    Icon: Trophy,
    tone: 'gold',
    title: 'Рейтинг монтажников «Вышки в США»',
    text: 'Здесь видно, кто реально толковый. Оценки ставят коллеги, с которыми работали на объектах.',
  },
  {
    Icon: Star,
    tone: 'gold',
    title: 'Работали вместе — оцени',
    text: 'Безопасность, качество, темп, документы и работа в команде. Тот, о ком отзыв, подтверждает, что вы правда работали вместе.',
  },
  {
    Icon: Users,
    tone: 'green',
    title: 'Команды',
    text: 'Собери свою команду или попросись в чужую — лидер подтвердит. У команды общий рейтинг.',
  },
  {
    Icon: ShieldCheck,
    tone: 'green',
    title: 'Только честные отзывы',
    text: 'Писать отзывы могут участники с профилем на Бести, заполненной анкетой и подпиской. Смотреть рейтинг — все.',
  },
]

export default function WelcomeScreen({ gateOk = false, onDone }) {
  const [i, setI] = useState(0)
  const [dir, setDir] = useState('next')
  const touch = useRef(null)
  const last = i === SLIDES.length - 1
  const slide = SLIDES[i]

  const finish = () => {
    markSeen()
    haptic.ok()
    onDone()
  }
  const go = (n) => {
    if (n < 0 || n >= SLIDES.length) return
    haptic.select()
    setDir(n > i ? 'next' : 'back')
    setI(n)
  }
  const next = () => (last ? finish() : go(i + 1))

  // Swipe left / right between cards.
  const onTouchStart = (e) => { touch.current = e.touches?.[0]?.clientX ?? null }
  const onTouchEnd = (e) => {
    const x0 = touch.current
    touch.current = null
    const x1 = e.changedTouches?.[0]?.clientX
    if (x0 == null || x1 == null || Math.abs(x1 - x0) < 50) return
    go(x1 < x0 ? i + 1 : i - 1)
  }

  useEffect(() => { try { window.scrollTo(0, 0) } catch {} }, [])

  return (
    <div className={s.welcome} onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      <div className={s.welcomeTop}>
        {!last ? (
          <button type="button" className={s.welcomeSkip} onClick={finish} data-track="tower_welcome_skip">
            Пропустить
          </button>
        ) : <span />}
      </div>

      <div key={i} className={cx(s.welcomeSlide, dir === 'back' ? s.welcomeBack : s.welcomeNext)}>
        <div className={cx(s.welcomeArt, slide.tone === 'green' ? s.welcomeArtGreen : s.welcomeArtGold)}>
          <slide.Icon size={54} strokeWidth={1.8} />
        </div>
        <h1 className={s.welcomeTitle}>{slide.title}</h1>
        <p className={s.welcomeText}>{slide.text}</p>
        {last && !gateOk ? (
          <p className={s.welcomeHint}>Что нужно для отзывов — во вкладке «Я», там же кнопки.</p>
        ) : null}
      </div>

      <div className={s.welcomeBottom}>
        <div className={s.welcomeDots} role="tablist" aria-label="Карточки">
          {SLIDES.map((_, n) => (
            <button
              key={n}
              type="button"
              role="tab"
              aria-selected={n === i}
              aria-label={`Карточка ${n + 1}`}
              className={cx(s.welcomeDot, n === i && s.welcomeDotOn)}
              onClick={() => go(n)}
            />
          ))}
        </div>
        <Btn block onClick={next} track={last ? 'tower_welcome_start' : 'tower_welcome_next'}>
          {last ? 'Начать' : 'Дальше'}
        </Btn>
      </div>
    </div>
  )
}
