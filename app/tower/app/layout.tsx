// @ts-nocheck
import type { Metadata } from 'next'

// «Вышки в США» Mini App (opened inside Telegram) — never indexed.
export const metadata: Metadata = {
  title: 'Вышки в США — рейтинг и отзывы',
  robots: { index: false, follow: false },
}

export default function TowerAppLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
