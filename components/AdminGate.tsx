// @ts-nocheck
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

// Renders children only for admins (users.is_admin). Everyone else is sent
// home. Used to keep in-development areas (Bestie World, quests) private.
export default function AdminGate({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [allowed, setAllowed] = useState(false)

  useEffect(() => {
    let cancelled = false
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { router.replace('/'); return }
      const { data } = await supabase.from('users').select('is_admin').eq('id', user.id).single()
      if (cancelled) return
      if (data?.is_admin) setAllowed(true)
      else router.replace('/')
    })
    return () => { cancelled = true }
  }, [])

  if (!allowed) return <div style={{ position: 'fixed', inset: 0, background: 'var(--bg)' }} />
  return <>{children}</>
}
