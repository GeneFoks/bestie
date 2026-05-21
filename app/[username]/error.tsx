'use client'

import { useEffect } from 'react'

export default function ProfileError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('[profile error]', error)
  }, [error])

  return (
    <div style={{ minHeight: '100vh', background: '#09090F', color: '#F0EAFF', padding: '40px 20px', fontFamily: 'monospace' }}>
      <div style={{ maxWidth: '720px', margin: '0 auto' }}>
        <h1 style={{ fontSize: '20px', marginBottom: '16px', color: '#FF6B6B' }}>Profile page error</h1>
        <p style={{ fontSize: '13px', color: '#A99ECC', marginBottom: '20px' }}>
          A client-side error happened while rendering this profile. The exact message below — please share it.
        </p>
        <div style={{ padding: '16px', borderRadius: '12px', background: '#131323', border: '1px solid rgba(255,107,107,0.3)', marginBottom: '16px' }}>
          <p style={{ fontSize: '13px', color: '#FF6B6B', fontWeight: 700, marginBottom: '8px' }}>{error.name}: {error.message}</p>
          {error.digest && <p style={{ fontSize: '11px', color: '#A99ECC', marginBottom: '8px' }}>digest: {error.digest}</p>}
          <pre style={{ fontSize: '11px', color: '#A99ECC', whiteSpace: 'pre-wrap', wordBreak: 'break-word', margin: 0, maxHeight: '400px', overflow: 'auto' }}>
            {error.stack || '(no stack)'}
          </pre>
        </div>
        <button
          onClick={() => reset()}
          style={{ padding: '10px 20px', borderRadius: '10px', background: '#D4AF37', border: 'none', color: '#09090F', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
        >
          Try again
        </button>
      </div>
    </div>
  )
}
