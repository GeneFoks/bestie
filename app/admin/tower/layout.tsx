import type { Metadata } from 'next'
import AdminGate from '@/components/AdminGate'

// «Вышки в США» bot + subscriptions: admins only, never indexed, not in nav.
export const metadata: Metadata = {
  title: 'Tower bot — Admin',
  robots: { index: false, follow: false },
}

export default function AdminTowerLayout({ children }: { children: React.ReactNode }) {
  return <AdminGate>{children}</AdminGate>
}
