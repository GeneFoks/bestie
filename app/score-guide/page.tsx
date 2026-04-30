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

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '48px' }}>
          <div style={{ fontSize: '64px', marginBottom: '16px' }}>⭐</div>
          <h1 style={{ fontFamily: 'DM Serif Display, serif', fontSize: '36px', fontWeight: 700, color: '#E8E0FF', marginBottom: '12px' }}>
            How Bestie Score works
          </h1>
          <p style={{ fontSize: '16px', color: '#9B93C0', lineHeight: 1.7 }}>
            Your Bestie Score (0–1000) is your social passport. It reflects who you are, how you show up, and what others think of you.
          </p>
        </div>

        {/* Score ranges */}
        <div style={{ background: '#0F0F1E', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '20px', padding: '24px', marginBottom: '20px' }}>
          <h2 style={{ fontFamily: 'DM Serif Display, serif', fontSize: '20px', color: '#E8E0FF', marginBottom: '20px' }}>Score ranges</h2>
          {[
            { range: '800–1000', label: 'Excellent', color: '#39FF14', desc: 'Top Bestie. Highly trusted, active, verified.' },
            { range: '600–799', label: 'Good', color: '#D4AF37', desc: 'Reliable and social. Strong track record.' },
            { range: '400–599', label: 'Fair', color: '#9B93C0', desc: 'Building up. Keep completing sessions.' },
            { range: '50–399', label: 'New', color: '#9B93C0', desc: 'Just getting started. Fill your profile to boost fast.' },
          ].map(s => (
            <div key={s.range} style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
              <div style={{ width: '80px', padding: '4px 10px', borderRadius: '999px', background: `rgba(${s.color === '#39FF14' ? '57,255,20' : s.color === '#D4AF37' ? '212,175,55' : '155,147,192'},0.1)`, border: `1px solid ${s.color}30`, textAlign: 'center' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: s.color }}>{s.label}</span>
              </div>
              <div style={{ flex: 1 }}>
                <span style={{ fontSize: '14px', fontWeight: 600, color: '#E8E0FF' }}>{s.range} </span>
                <span style={{ fontSize: '13px', color: '#9B93C0' }}>— {s.desc}</span>
              </div>
            </div>
          ))}
        </div>

        {/* How to earn */}
        <div style={{ background: '#0F0F1E', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '20px', padding: '24px', marginBottom: '20px' }}>
          <h2 style={{ fontFamily: 'DM Serif Display, serif', fontSize: '20px', color: '#E8E0FF', marginBottom: '20px' }}>✅ How to earn points</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
            {[
              { action: 'Add profile photo', points: '+50', emoji: '📸' },
              { action: 'Write your bio', points: '+30', emoji: '✍️' },
              { action: 'Add your city', points: '+20', emoji: '📍' },
              { action: 'Create an activity', points: '+50', emoji: '🎯' },
              { action: 'Get verified', points: '+100', emoji: '✓' },
              { action: 'Complete a session', points: '+30', emoji: '🤝' },
              { action: 'Receive a 5★ review', points: '+40', emoji: '⭐' },
              { action: 'Receive a 4★ review', points: '+20', emoji: '⭐' },
              { action: 'Receive a Spark ✨', points: '+15', emoji: '✨' },
            ].map(item => (
              <div key={item.action} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '11px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '18px' }}>{item.emoji}</span>
                  <span style={{ fontSize: '14px', color: '#E8E0FF' }}>{item.action}</span>
                </div>
                <span style={{ fontSize: '14px', fontWeight: 700, color: '#39FF14' }}>{item.points}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Penalties */}
        <div style={{ background: '#0F0F1E', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '20px', padding: '24px', marginBottom: '20px' }}>
          <h2 style={{ fontFamily: 'DM Serif Display, serif', fontSize: '20px', color: '#E8E0FF', marginBottom: '20px' }}>⚠️ Penalties</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
            {[
              { action: 'Receive a 3★ review', points: '-25', emoji: '😐' },
              { action: 'Receive a 2★ review', points: '-60', emoji: '😕' },
              { action: 'Receive a 1★ review', points: '-100', emoji: '😞' },
              { action: 'Inactive 7–29 days', points: '-1/day', emoji: '💤' },
              { action: 'Inactive 30–59 days', points: '-3/day', emoji: '😴' },
              { action: 'Inactive 60+ days', points: '-5/day', emoji: '🪦' },
              { action: '3 reports against you', points: '-50 + review', emoji: '🚩' },
            ].map(item => (
              <div key={item.action} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '11px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '18px' }}>{item.emoji}</span>
                  <span style={{ fontSize: '14px', color: '#E8E0FF' }}>{item.action}</span>
                </div>
                <span style={{ fontSize: '14px', fontWeight: 700, color: '#ff6b6b' }}>{item.points}</span>
              </div>
            ))}
          </div>
          <p style={{ fontSize: '12px', color: '#9B93C0', marginTop: '12px' }}>
            Minimum score is always 50 — you can always recover.
          </p>
        </div>

        {/* Sparks */}
        <div style={{ background: '#0F0F1E', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '20px', padding: '24px', marginBottom: '20px' }}>
          <h2 style={{ fontFamily: 'DM Serif Display, serif', fontSize: '20px', color: '#E8E0FF', marginBottom: '12px' }}>✨ What are Sparks?</h2>
          <p style={{ fontSize: '14px', color: '#9B93C0', lineHeight: 1.7, marginBottom: '16px' }}>
            Sparks are rare tokens of respect. Every user gets <strong style={{ color: '#D4AF37' }}>30 Sparks</strong> on signup. You can give max <strong style={{ color: '#D4AF37' }}>3 Sparks</strong> to one person — each for a different quality. Once you run out, you can purchase more.
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
          <h2 style={{ fontFamily: 'DM Serif Display, serif', fontSize: '20px', color: '#ff6b6b', marginBottom: '12px' }}>🚫 Bans & Flags</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {[
              { label: '3 reports', desc: '-50 BS + account flagged for review' },
              { label: '5+ reports', desc: 'Temporary suspension pending review' },
              { label: 'Confirmed violation', desc: 'Permanent ban, Score → 0' },
              { label: 'No-show without notice', desc: '-30 BS per incident' },
            ].map(item => (
              <div key={item.label} style={{ display: 'flex', gap: '12px', padding: '10px 0', borderBottom: '1px solid rgba(255,80,80,0.1)' }}>
                <span style={{ fontSize: '13px', fontWeight: 600, color: '#ff6b6b', minWidth: '120px' }}>{item.label}</span>
                <span style={{ fontSize: '13px', color: '#9B93C0' }}>{item.desc}</span>
              </div>
            ))}
          </div>
        </div>

        <Link href="/dashboard" style={{ display: 'block', textAlign: 'center', padding: '14px', borderRadius: '14px', fontSize: '15px', fontWeight: 600, background: 'linear-gradient(135deg, #D4AF37 0%, #B8960C 100%)', color: '#080810', textDecoration: 'none' }}>
          Back to Dashboard →
        </Link>
      </div>
    </div>
  )
}
