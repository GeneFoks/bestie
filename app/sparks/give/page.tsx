'use client'

import { Suspense } from 'react'
import GiveSparkContent from './GiveSparkContent'
import { PageLoader } from '@/components/Loading'

export default function GiveSparkPage() {
  return (
    <Suspense fallback={<PageLoader message="Loading…" />}>
      <GiveSparkContent />
    </Suspense>
  )
}
