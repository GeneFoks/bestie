'use client'

import { Suspense } from 'react'
import MessagesContent from './MessagesContent'
import { PageLoader } from '@/components/Loading'

export default function MessagesPage() {
  return (
    <Suspense fallback={<PageLoader message="Loading messages…" />}>
      <MessagesContent />
    </Suspense>
  )
}
