'use client'

import { Suspense } from 'react'
import MessagesContent from './MessagesContent'

export default function MessagesPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', background: '#09090F', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: '40px', height: '40px', border: '3px solid rgba(212,175,55,0.2)', borderTop: '3px solid #D4AF37', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    }>
      <MessagesContent />
    </Suspense>
  )
}
