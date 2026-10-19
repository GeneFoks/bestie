import type { Metadata } from 'next'
import AdminGate from '@/components/AdminGate'

// Bestie World is in development: admins only, invisible to search engines.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
}

export default function WorldLayout({ children }: { children: React.ReactNode }) {
  return <AdminGate>{children}</AdminGate>
}
