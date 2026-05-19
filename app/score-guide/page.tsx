// @ts-nocheck
'use client'

import Link from 'next/link'

export default function ScoreGuidePage() {
  return (
    <div style={{ minHeight: '100vh', background: '#09090F', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
      <nav style={{ position: 'sticky', top: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', background: 'rgba(8,8,16,0.9)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.10)' }}>
        <Link href="/" style={{ fontFamily: 'DM Serif Display, serif', fontSize: '20px', fontWeight: 700, color: '#D4AF37', textDecoration: 'none' }}>BESTIE</Link>
        <Link href="/dashboard" style={{ fontSize: '14px', color: '#A99ECC', textDecoration: 'none', padding: '8px 16px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.1)' }}>← Dashboard</Link>
      </nav>

      <div style={{ maxWidth: '720px', margin: '0 auto', padding: '40px 24px' }}>

        <div style={{ textAlign: 'center', marginBottom: '48px' }}>
          <div style={{ fontSize: '64px', marginBottom: '16px' }}>⭐</div>
          <p style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '2px', color: '#D4AF37', marginBottom: '12px' }}>BESTIE SCORE</p>
          <h1 style={{ fontFamily: 'DM Serif Display, serif', fontSize: '36px', fontWeight: 700, color: '#F0EAFF', marginBottom: '12px' }}>How the system works</h1>
          <p style={{ fontSize: '16px', color: '#A99ECC', lineHeight: 1.7 }}>
            Points are awarded automatically — for real actions. Range: 0–1000.
          </p>
        </div>

        {/* Score ranges */}
        <div style={{ background: '#111120', border: '1px solid rgba(255,255,255,0.10)', borderRadius: '20px', padding: '24px', marginBottom: '20px' }}>
          <h2 style={{ fontFamily: 'DM Serif Display, serif', fontSize: '20px', color: '#F0EAFF', marginBottom: '20px' }}>Score levels</h2>
          {[
            { range: '800–1000', label: 'Excellent', color: '#34D399', desc: 'Top Bestie. High trust, active, verified.' },
            { range: '600–799', label: 'Good', color: '#D4AF37', desc: 'Reliable and social. Strong track record.' },
            { range: '400–599', label: 'Fair', color: '#A99ECC', desc: 'In progress. Keep completing sessions.' },
            { range: '50–399', label: 'New', color: '#A99ECC', desc: 'Just started. Fill your profile — Score will grow fast.' },
          ].map(s => (
            <div key={s.range} style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '12px 0', borderBottom: '1px solid #131323' }}>
              <div style={{ width: '80px', padding: '4px 10px', borderRadius: '999px', background: `rgba(${s.color === '#34D399' ? '57,255,20' : s.color === '#D4AF37' ? '212,175,55' : '155,147,192'},0.1)`, border: `1px solid ${s.color}30`, textAlign: 'center', flexShrink: 0 }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: s.color }}>{s.label}</span>
              </div>
              <div style={{ flex: 1 }}>
                <span style={{ fontSize: '14px', fontWeight: 600, color: '#F0EAFF' }}>{s.range} </span>
                <span style={{ fontSize: '13px', color: '#A99ECC' }}>— {s.desc}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Profile points */}
        <div style={{ background: '#111120', border: '1px solid rgba(255,255,255,0.10)', borderRadius: '20px', padding: '24px', marginBottom: '20px' }}>
          <h2 style={{ fontFamily: 'DM Serif Display, serif', fontSize: '20px', color: '#F0EAFF', marginBottom: '8px' }}>Profile</h2>
          <p style={{ fontSize: '13px', color: '#A99ECC', marginBottom: '20px' }}>Awarded once when completed</p>
          {[
            { emoji: '📸', action: 'Profile photo', sub: 'Upload an avatar', points: '+50' },
            { emoji: '✍️', action: 'Bio', sub: 'Write about yourself', points: '+30' },
            { emoji: '📍', action: 'City', sub: 'Add your location', points: '+20' },
            { emoji: '🎯', action: 'Activity', sub: 'Create at least one', points: '+50' },
            { emoji: '✨', action: 'Bestie Type', sub: 'Take the quiz', points: '+50' },
            { emoji: '✓', action: 'Verification', sub: 'Verify your identity', points: '+100' },
          ].map(item => (
            <div key={item.action} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #131323' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '20px' }}>{item.emoji}</span>
                <div>
                  <p style={{ fontSize: '14px', color: '#F0EAFF', margin: 0 }}>{item.action}</p>
                  <p style={{ fontSize: '12px', color: '#A99ECC', margin: '2px 0 0' }}>{item.sub}</p>
                </div>
              </div>
              <span style={{ fontSize: '15px', fontWeight: 700, color: '#34D399' }}>{item.points}</span>
            </div>
          ))}
        </div>

        {/* Activity points */}
        <div style={{ background: '#111120', border: '1px solid rgba(255,255,255,0.10)', borderRadius: '20px', padding: '24px', marginBottom: '20px' }}>
          <h2 style={{ fontFamily: 'DM Serif Display, serif', fontSize: '20px', color: '#F0EAFF', marginBottom: '8px' }}>Activity</h2>
          <p style={{ fontSize: '13px', color: '#A99ECC', marginBottom: '20px' }}>Per each event</p>
          {[
            { emoji: '🤝', action: '1st session completed', sub: 'Both participants confirmed', points: '+100' },
            { emoji: '🤝', action: '2nd session', sub: 'Diminishing returns', points: '+80' },
            { emoji: '🤝', action: '3rd session', sub: 'Diminishing returns', points: '+60' },
            { emoji: '🤝', action: '4th session', sub: 'Diminishing returns', points: '+40' },
            { emoji: '🤝', action: '5th session', sub: 'Diminishing returns', points: '+20' },
            { emoji: '🤝', action: '6th session and beyond', sub: 'Keep it up', points: '+1' },
            { emoji: '⭐', action: '5-star rating received', sub: 'After a session', points: '+40' },
            { emoji: '⭐', action: '4-star rating received', sub: 'After a session', points: '+20' },
            { emoji: '💛', action: 'Received a Spark', sub: 'Per each', points: '+15' },
          ].map((item, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #131323' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '20px' }}>{item.emoji}</span>
                <div>
                  <p style={{ fontSize: '14px', color: '#F0EAFF', margin: 0 }}>{item.action}</p>
                  <p style={{ fontSize: '12px', color: '#A99ECC', margin: '2px 0 0' }}>{item.sub}</p>
                </div>
              </div>
              <span style={{ fontSize: '15px', fontWeight: 700, color: '#D4AF37' }}>{item.points}</span>
            </div>
          ))}
        </div>

        {/* Penalties */}
        <div style={{ background: '#111120', border: '1px solid rgba(255,255,255,0.10)', borderRadius: '20px', padding: '24px', marginBottom: '20px' }}>
          <h2 style={{ fontFamily: 'DM Serif Display, serif', fontSize: '20px', color: '#F0EAFF', marginBottom: '8px' }}>Penalties & degradation</h2>
          <p style={{ fontSize: '13px', color: '#A99ECC', marginBottom: '20px' }}>Score decreases with inactivity or poor reviews</p>
          {[
            { emoji: '😐', action: '3-star rating', sub: '', points: '−25' },
            { emoji: '😕', action: '2-star rating', sub: '', points: '−60' },
            { emoji: '😞', action: '1-star rating', sub: '', points: '−100' },
            { emoji: '💤', action: 'No activity 7–29 days', sub: '', points: '−1/day' },
            { emoji: '😴', action: 'No activity 30–59 days', sub: '', points: '−3/day' },
            { emoji: '🪦', action: 'No activity 60+ days', sub: '', points: '−5/day' },
            { emoji: '🚩', action: '3 reports on account', sub: 'Review + penalty', points: '−50' },
          ].map((item, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #131323' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '20px' }}>{item.emoji}</span>
                <div>
                  <p style={{ fontSize: '14px', color: '#F0EAFF', margin: 0 }}>{item.action}</p>
                  {item.sub && <p style={{ fontSize: '12px', color: '#A99ECC', margin: '2px 0 0' }}>{item.sub}</p>}
                </div>
              </div>
              <span style={{ fontSize: '15px', fontWeight: 700, color: '#FF6B6B' }}>{item.points}</span>
            </div>
          ))}
          <p style={{ fontSize: '12px', color: '#A99ECC', marginTop: '12px' }}>Minimum score is always 50 — you can always recover.</p>
        </div>

        {/* Sparks */}
        <div style={{ background: '#111120', border: '1px solid rgba(255,255,255,0.10)', borderRadius: '20px', padding: '24px', marginBottom: '20px' }}>
          <h2 style={{ fontFamily: 'DM Serif Display, serif', fontSize: '20px', color: '#F0EAFF', marginBottom: '12px' }}>✨ What are Sparks?</h2>
          <p style={{ fontSize: '14px', color: '#A99ECC', lineHeight: 1.7, marginBottom: '16px' }}>
            Sparks are rare tokens of trust. Every user gets <span style={{ color: '#D4AF37', fontWeight: 600 }}>30 Sparks</span> on signup. You can give max <span style={{ color: '#D4AF37', fontWeight: 600 }}>3 Sparks</span> to one person — each for a different quality.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '8px' }}>
            {[
              { emoji: '💛', label: 'Kind' }, { emoji: '🎉', label: 'Fun' }, { emoji: '🔒', label: 'Reliable' },
              { emoji: '💎', label: 'Genuine' }, { emoji: '🛡️', label: 'Safe' }, { emoji: '⚡', label: 'Energetic' },
              { emoji: '👂', label: 'Good listener' }, { emoji: '🌟', label: 'Social' }, { emoji: '⏰', label: 'Punctual' }, { emoji: '🌊', label: 'Open' },
            ].map(s => (
              <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', borderRadius: '10px', background: 'rgba(212,175,55,0.06)', border: '1px solid rgba(212,175,55,0.15)' }}>
                <span style={{ fontSize: '16px' }}>{s.emoji}</span>
                <span style={{ fontSize: '13px', color: '#F0EAFF' }}>{s.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bans */}
        <div style={{ background: 'rgba(255,80,80,0.05)', border: '1px solid rgba(255,80,80,0.15)', borderRadius: '20px', padding: '24px', marginBottom: '32px' }}>
          <h2 style={{ fontFamily: 'DM Serif Display, serif', fontSize: '20px', color: '#FF6B6B', marginBottom: '12px' }}>🚫 Bans & Flags</h2>
          {[
            { label: '3 reports', desc: '−50 BS + account flagged for review' },
            { label: '5+ reports', desc: 'Temporary suspension pending review' },
            { label: 'Confirmed violation', desc: 'Permanent ban, Score → 0' },
            { label: 'No-show without notice', desc: '−30 BS per incident' },
          ].map(item => (
            <div key={item.label} style={{ display: 'flex', gap: '12px', padding: '10px 0', borderBottom: '1px solid rgba(255,80,80,0.1)' }}>
              <span style={{ fontSize: '13px', fontWeight: 600, color: '#FF6B6B', minWidth: '160px', flexShrink: 0 }}>{item.label}</span>
              <span style={{ fontSize: '13px', color: '#A99ECC' }}>{item.desc}</span>
            </div>
          ))}
        </div>

        <Link href="/dashboard" style={{ display: 'block', textAlign: 'center', padding: '14px', borderRadius: '14px', fontSize: '15px', fontWeight: 600, background: 'linear-gradient(135deg, #D4AF37 0%, #B8960C 100%)', color: '#09090F', textDecoration: 'none' }}>
          Back to Dashboard →
        </Link>
      </div>
    </div>
  )
}
