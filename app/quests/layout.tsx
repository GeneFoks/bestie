import type { Metadata } from 'next'
import AdminGate from '@/components/AdminGate'

// Quests are part of Bestie World (in development): admins only, no indexing.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
}

export default function QuestsLayout({ children }: { children: React.ReactNode }) {
  return <AdminGate>{children}</AdminGate>
}
