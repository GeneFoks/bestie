import type { Metadata } from 'next'

// Paid Telegram group «Вышки в США» — landing pages reached from @TowerCrewBot.
// Personal signed links → never indexed.
export const metadata: Metadata = {
  title: 'Вышки в США — подписка на группу',
  description: 'Доступ в Telegram-группу «Вышки в США» по подписке.',
  robots: { index: false, follow: false },
}

export default function TowerLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
