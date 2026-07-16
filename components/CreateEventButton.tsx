'use client'

import { useState, type CSSProperties } from 'react'
import Link from 'next/link'
import { Plus, UsersRound, Cake, Users, X } from 'lucide-react'

// One easy-to-reach entry point for creating any kind of event.
// `variant`:
//   'primary'  — filled gold button (page headers)
//   'compact'  — small gold button (tight toolbars)
//   'fab'      — floating action button (mobile, bottom-right)
export default function CreateEventButton({
  variant = 'primary',
}: {
  variant?: 'primary' | 'compact' | 'fab'
}) {
  const [open, setOpen] = useState(false)

  const trigger =
    variant === 'fab' ? (
      <button
        onClick={() => setOpen(true)}
        aria-label="Create event"
        className="create-event-fab"
        style={{
          position: 'fixed', left: '18px', bottom: 'calc(84px + env(safe-area-inset-bottom))',
          zIndex: 90, width: '56px', height: '56px', borderRadius: '50%', border: 'none',
          background: 'linear-gradient(135deg, #D4AF37 0%, #B8960C 100%)', color: '#09090F',
          display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
          boxShadow: '0 8px 28px rgba(212,175,55,0.4)',
        }}
      >
        <Plus size={26} strokeWidth={2.5} />
      </button>
    ) : (
      <button
        onClick={() => setOpen(true)}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: '7px',
          padding: variant === 'compact' ? '9px 16px' : '12px 22px',
          borderRadius: '12px', fontSize: variant === 'compact' ? '13px' : '15px', fontWeight: 700,
          background: 'linear-gradient(135deg, #D4AF37 0%, #B8960C 100%)', color: '#09090F',
          border: 'none', cursor: 'pointer', whiteSpace: 'nowrap',
          fontFamily: 'Plus Jakarta Sans, sans-serif',
        }}
      >
        <Plus size={variant === 'compact' ? 15 : 17} strokeWidth={2.5} /> Create event
      </button>
    )

  return (
    <>
      {trigger}

      {open && (
        <div
          onClick={() => setOpen(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(4,4,10,0.7)',
            backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'flex-end',
            justifyContent: 'center', padding: '0',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              width: '100%', maxWidth: '480px', background: '#111120',
              border: '1px solid rgba(255,255,255,0.12)', borderBottom: 'none',
              borderRadius: '24px 24px 0 0', padding: '24px 20px calc(28px + env(safe-area-inset-bottom))',
              animation: 'ce-up 0.25s ease',
            }}
          >
            <style>{`@keyframes ce-up { from { transform: translateY(100%) } to { transform: translateY(0) } }`}</style>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
              <h3 style={{ fontFamily: 'DM Serif Display, serif', fontSize: '20px', color: '#F0EAFF', margin: 0 }}>Create an event</h3>
              <button onClick={() => setOpen(false)} aria-label="Close" style={{ background: 'rgba(255,255,255,0.06)', border: 'none', borderRadius: '10px', width: '34px', height: '34px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#A99ECC' }}>
                <X size={18} strokeWidth={2} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <Link href="/group-sessions/new" onClick={() => setOpen(false)} style={optionStyle}>
                <span style={{ ...iconWrap, background: 'rgba(212,175,55,0.12)' }}><UsersRound size={22} color="#D4AF37" strokeWidth={1.8} /></span>
                <span style={{ flex: 1 }}>
                  <span style={optTitle}>Group session</span>
                  <span style={optSub}>Host a hangout others can join — coffee, sports, coworking…</span>
                </span>
                <span style={{ color: '#A99ECC' }}>→</span>
              </Link>

              <Link href="/birthday/new" onClick={() => setOpen(false)} style={optionStyle}>
                <span style={{ ...iconWrap, background: 'rgba(255,107,53,0.14)' }}><Cake size={22} color="#FF6B35" strokeWidth={1.8} /></span>
                <span style={{ flex: 1 }}>
                  <span style={optTitle}>Birthday</span>
                  <span style={optSub}>Shareable page — RSVP, photo wall, gift wishlist & guest chat</span>
                </span>
                <span style={{ color: '#A99ECC' }}>→</span>
              </Link>

              <Link href="/crews" onClick={() => setOpen(false)} style={optionStyle}>
                <span style={{ ...iconWrap, background: 'rgba(155,127,255,0.14)' }}><Users size={22} color="#9B7FFF" strokeWidth={1.8} /></span>
                <span style={{ flex: 1 }}>
                  <span style={optTitle}>Crew event</span>
                  <span style={optSub}>Create an event inside your crew — open your crew page to add it</span>
                </span>
                <span style={{ color: '#A99ECC' }}>→</span>
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

const optionStyle: CSSProperties = {
  display: 'flex', alignItems: 'center', gap: '14px', padding: '16px',
  borderRadius: '16px', background: '#0F0F1E', border: '1px solid rgba(255,255,255,0.10)',
  textDecoration: 'none',
}
const iconWrap: CSSProperties = {
  width: '46px', height: '46px', borderRadius: '13px', display: 'flex',
  alignItems: 'center', justifyContent: 'center', flexShrink: 0,
}
const optTitle: CSSProperties = { display: 'block', fontSize: '15px', fontWeight: 700, color: '#F0EAFF', marginBottom: '2px' }
const optSub: CSSProperties = { display: 'block', fontSize: '12px', color: '#A99ECC', lineHeight: 1.4 }
