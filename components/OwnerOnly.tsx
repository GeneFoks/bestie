// @ts-nocheck
'use client'

// Renders its children only for the owner of a page (logged-in user id ===
// ownerId). Everyone else — including logged-out visitors — gets nothing.
// Used to keep private progress (e.g. the Bestie Score) visible to its owner
// only, while public surfaces show what only grows: sparks and meetups.

import React, { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function OwnerOnly({ ownerId, children }: { ownerId: string; children: React.ReactNode }) {
  const [isOwner, setIsOwner] = useState(false)

  useEffect(() => {
    let alive = true
    if (!ownerId) { setIsOwner(false); return }
    supabase.auth.getUser()
      .then(({ data }) => { if (alive) setIsOwner(data?.user?.id === ownerId) })
      .catch(() => { if (alive) setIsOwner(false) })
    return () => { alive = false }
  }, [ownerId])

  if (!isOwner) return null
  return <>{children}</>
}
