// @ts-nocheck
'use client'

import Link from 'next/link'

export default function ScoreGuidePage() {
  return (
    <div style={{ minHeight: '100vh', background: '#080810', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
      <nav style={{ position: 'sticky', top: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', background: 'rgba(8,8,16,0.9)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <Link href="/" style={{ fontFamily: 'DM Serif Display, serif', fontSize: '20px', fontWeight: 700, color: '#D4AF37', textDecoration: 'none' }}>BESTIE</Link>
        <Link href="/dashboard" style={{ fontSize: '14px', color: '#9B93C0', textDecoration: 'none', padding: '8px 16px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.1)' }}>← Dashboard</Link>
      </nav>

      <div style={{ maxWidth: '720px', margin: '0 auto', padding: '40px 24px' }}>

        <div style={{ textAlign: 'center', marginBottom: '48px' }}>
          <div style={{ fontSize: '64px', marginBottom: '16px' }}>⭐</div>
          <p style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '2px', color: '#D4AF37', marginBottom: '12px' }}>BESTIE SCORE</p>
          <h1 style={{ fontFamily: 'DM Serif Display, serif', fontSize: '36px', fontWeight: 700, color: '#E8E0FF', marginBottom: '12px' }}>Как работает система</h1>
          <p style={{ fontSize: '16px', color: '#9B93C0', lineHeight: 1.7 }}>
            Очки начисляются автоматически — за реальные действия. Диапазон 0–1000.
          </p>
        </div>

        {/* Score ranges */}
        <div style={{ background: '#0F0F1E', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '20px', padding: '24px', marginBottom: '20px' }}>
          <h2 style={{ fontFamily: 'DM Serif Display, serif', fontSize: '20px', color: '#E8E0FF', marginBottom: '20px' }}>Уровни Score</h2>
          {[
            { range: '800–1000', label: 'Excellent', color: '#39FF14', desc: 'Топ Bestie. Высокое доверие, активность, верификация.' },
            { range: '600–799', label: 'Good', color: '#D4AF37', desc: 'Надёжный и социальный. Сильная история.' },
            { range: '400–599', label: 'Fair', color: '#9B93C0', desc: 'В процессе. Продолжай проводить сессии.' },
            { range: '50–399', label: 'New', color: '#9B93C0', desc: 'Только начал. Заполни профиль — Score вырастет быстро.' },
          ].map(s => (
            <div key={s.range} style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
              <div style={{ width: '80px', padding: '4px 10px', borderRadius: '999px', background: `rgba(${s.color === '#39FF14' ? '57,255,20' : s.color === '#D4AF37' ? '212,175,55' : '155,147,192'},0.1)`, border: `1px solid ${s.color}30`, textAlign: 'center', flexShrink: 0 }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: s.color }}>{s.label}</span>
              </div>
              <div style={{ flex: 1 }}>
                <span style={{ fontSize: '14px', fontWeight: 600, color: '#E8E0FF' }}>{s.range} </span>
                <span style={{ fontSize: '13px', color: '#9B93C0' }}>— {s.desc}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Profile points */}
        <div style={{ background: '#0F0F1E', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '20px', padding: '24px', marginBottom: '20px' }}>
          <h2 style={{ fontFamily: 'DM Serif Display, serif', fontSize: '20px', color: '#E8E0FF', marginBottom: '8px' }}>Профиль</h2>
          <p style={{ fontSize: '13px', color: '#9B93C0', marginBottom: '20px' }}>Начисляется единовременно при заполнении</p>
          {[
            { emoji: '📸', action: 'Фото профиля', sub: 'Загрузить аватар', points: '+50' },
            { emoji: '✍️', action: 'Bio', sub: 'Написать о себе', points: '+30' },
            { emoji: '📍', action: 'Город', sub: 'Добавить локацию', points: '+20' },
            { emoji: '🎯', action: 'Активность', sub: 'Создать хотя бы одну', points: '+50' },
            { emoji: '✨', action: 'Bestie Type', sub: 'Пройти тест', points: '+50' },
            { emoji: '✓', action: 'Верификация', sub: 'Подтвердить личность', points: '+100' },
          ].map(item => (
            <div key={item.action} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '20px' }}>{item.emoji}</span>
                <div>
                  <p style={{ fontSize: '14px', color: '#E8E0FF', margin: 0 }}>{item.action}</p>
                  <p style={{ fontSize: '12px', color: '#9B93C0', margin: '2px 0 0' }}>{item.sub}</p>
                </div>
              </div>
              <span style={{ fontSize: '15px', fontWeight: 700, color: '#39FF14' }}>{item.points}</span>
            </div>
          ))}
        </div>

        {/* Activity points */}
        <div style={{ background: '#0F0F1E', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '20px', padding: '24px', marginBottom: '20px' }}>
          <h2 style={{ fontFamily: 'DM Serif Display, serif', fontSize: '20px', color: '#E8E0FF', marginBottom: '8px' }}>Активность</h2>
          <p style={{ fontSize: '13px', color: '#9B93C0', marginBottom: '20px' }}>За каждое событие</p>
          {[
            { emoji: '🤝', action: 'Завершённая сессия', sub: 'Оба участника подтвердили', points: '+100' },
            { emoji: '⭐', action: 'Рейтинг 5 звёзд', sub: 'Получен после сессии', points: '+40' },
            { emoji: '⭐', action: 'Рейтинг 4 звезды', sub: 'Получен после сессии', points: '+20' },
            { emoji: '💛', action: 'Получил Spark', sub: 'За каждый', points: '+15' },
          ].map((item, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '20px' }}>{item.emoji}</span>
                <div>
                  <p style={{ fontSize: '14px', color: '#E8E0FF', margin: 0 }}>{item.action}</p>
                  <p style={{ fontSize: '12px', color: '#9B93C0', margin: '2px 0 0' }}>{item.sub}</p>
                </div>
              </div>
              <span style={{ fontSize: '15px', fontWeight: 700, color: '#D4AF37' }}>{item.points}</span>
            </div>
          ))}
        </div>

        {/* Degradation */}
        <div style={{ background: '#0F0F1E', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '20px', padding: '24px', marginBottom: '20px' }}>
          <h2 style={{ fontFamily: 'DM Serif Display, serif', fontSize: '20px', color: '#E8E0FF', marginBottom: '8px' }}>Штрафы и деградация</h2>
          <p style={{ fontSize: '13px', color: '#9B93C0', marginBottom: '20px' }}>Score снижается если нет активности или получены плохие отзывы</p>
          {[
            { emoji: '😐', action: 'Рейтинг 3 звезды', sub: '', points: '−25' },
            { emoji: '😕', action: 'Рейтинг 2 звезды', sub: '', points: '−60' },
            { emoji: '😞', action: 'Рейтинг 1 звезда', sub: '', points: '−100' },
            { emoji: '💤', action: 'Нет активности 7–29 дней', sub: '', points: '−1/день' },
            { emoji: '😴', action: 'Нет активности 30–59 дней', sub: '', points: '−3/день' },
            { emoji: '🪦', action: 'Нет активности 60+ дней', sub: '', points: '−5/день' },
            { emoji: '🚩', action: '3 жалобы на аккаунт', sub: 'Ревью + штраф', points: '−50' },
          ].map((item, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '20px' }}>{item.emoji}</span>
                <div>
                  <p style={{ fontSize: '14px', color: '#E8E0FF', margin: 0 }}>{item.action}</p>
                  {item.sub && <p style={{ fontSize: '12px', color: '#9B93C0', margin: '2px 0 0' }}>{item.sub}</p>}
                </div>
              </div>
              <span style={{ fontSize: '15px', fontWeight: 700, color: '#FF6B6B' }}>{item.points}</span>
            </div>
          ))}
          <p style={{ fontSize: '12px', color: '#9B93C0', marginTop: '12px' }}>Минимальный Score всегда 50 — восстановиться можно всегда.</p>
        </div>

        {/* Sparks */}
        <div style={{ background: '#0F0F1E', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '20px', padding: '24px', marginBottom: '20px' }}>
          <h2 style={{ fontFamily: 'DM Serif Display, serif', fontSize: '20px', color: '#E8E0FF', marginBottom: '12px' }}>✨ Что такое Sparks?</h2>
          <p style={{ fontSize: '14px', color: '#9B93C0', lineHeight: 1.7, marginBottom: '16px' }}>
            Sparks — редкие токены доверия. При регистрации каждый получает <span style={{ color: '#D4AF37', fontWeight: 600 }}>30 Sparks</span>. Одному человеку можно дать максимум <span style={{ color: '#D4AF37', fontWeight: 600 }}>3 Sparks</span>, каждый за разное качество.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '8px' }}>
            {[
              { emoji: '💛', label: 'Kind' },
              { emoji: '🎉', label: 'Fun' },
              { emoji: '🔒', label: 'Reliable' },
              { emoji: '💎', label: 'Genuine' },
              { emoji: '🛡️', label: 'Safe' },
              { emoji: '⚡', label: 'Energetic' },
              { emoji: '👂', label: 'Good listener' },
              { emoji: '🌟', label: 'Social' },
              { emoji: '⏰', label: 'Punctual' },
              { emoji: '🌊', label: 'Open' },
            ].map(s => (
              <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', borderRadius: '10px', background: 'rgba(212,175,55,0.06)', border: '1px solid rgba(212,175,55,0.15)' }}>
                <span style={{ fontSize: '16px' }}>{s.emoji}</span>
                <span style={{ fontSize: '13px', color: '#E8E0FF' }}>{s.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bans */}
        <div style={{ background: 'rgba(255,80,80,0.05)', border: '1px solid rgba(255,80,80,0.15)', borderRadius: '20px', padding: '24px', marginBottom: '32px' }}>
          <h2 style={{ fontFamily: 'DM Serif Display, serif', fontSize: '20px', color: '#FF6B6B', marginBottom: '12px' }}>🚫 Баны и флаги</h2>
          {[
            { label: '3 жалобы', desc: '−50 BS + аккаунт на ревью' },
            { label: '5+ жалоб', desc: 'Временная блокировка' },
            { label: 'Подтверждённое нарушение', desc: 'Постоянный бан, Score → 0' },
            { label: 'No-show без предупреждения', desc: '−30 BS за каждый случай' },
          ].map(item => (
            <div key={item.label} style={{ display: 'flex', gap: '12px', padding: '10px 0', borderBottom: '1px solid rgba(255,80,80,0.1)' }}>
              <span style={{ fontSize: '13px', fontWeight: 600, color: '#FF6B6B', minWidth: '160px', flexShrink: 0 }}>{item.label}</span>
              <span style={{ fontSize: '13px', color: '#9B93C0' }}>{item.desc}</span>
            </div>
          ))}
        </div>

        <Link href="/dashboard" style={{ display: 'block', textAlign: 'center', padding: '14px', borderRadius: '14px', fontSize: '15px', fontWeight: 600, background: 'linear-gradient(135deg, #D4AF37 0%, #B8960C 100%)', color: '#080810', textDecoration: 'none' }}>
          Back to Dashboard →
        </Link>
      </div>
    </div>
  )
}
