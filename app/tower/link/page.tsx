// @ts-nocheck
import type { Metadata } from 'next'
import { linkPreview } from '@/lib/tower-access'
import { botUsername } from '@/lib/tower'
import TowerLinkClient from './TowerLinkClient'

// /tower/link?t=<personal signed link from @TowerCrewBot, purpose 'link', 30 min>
// — tie that Telegram account to the Bestie profile of whoever is logged in.
// The token is checked here (names for the confirm card) and again by
// POST /api/tower/link, which writes the link.
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Привязать Telegram — Бести',
  robots: { index: false, follow: false },
}

export default async function TowerLinkPage({ searchParams }: { searchParams: { t?: string } }) {
  const t = typeof searchParams?.t === 'string' ? searchParams.t : ''
  const p = linkPreview(t)
  let botLink = 'https://t.me/TowerCrewBot?start=link'
  try { botLink = `https://t.me/${await botUsername()}?start=link` } catch {}
  return <TowerLinkClient t={p.ok ? t : ''} tg={p.ok ? p.tg : null} botLink={botLink} />
}
