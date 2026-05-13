'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

export default function EditActivitiesLink({ profileUserId }: { profileUserId: string }) {
  const [isOwner, setIsOwner] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user?.id === profileUserId) setIsOwner(true)
    })
  }, [profileUserId])

  if (!isOwner) return null

  return (
    <Link
      href="/profile/edit"
      style={{
        fontSize: '13px',
        fontWeight: 600,
        color: '#D4AF37',
        textDecoration: 'none',
        padding: '4px 12px',
        borderRadius: '8px',
        background: 'rgba(212,175,55,0.08)',
        border: '1px solid rgba(212,175,55,0.2)',
      }}
    >
      ✏️ Edit
    </Link>
  )
}
