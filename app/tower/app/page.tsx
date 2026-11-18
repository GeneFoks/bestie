// @ts-nocheck
import { appLink } from '@/lib/tower'
import TowerMiniApp from './TowerMiniApp'

// /tower/app — the «Вышки в США» Mini App. Everything happens on the client
// (auth = Telegram initData, verified by /api/tower/app/*); the server only
// works out the «Открыть в Telegram» link for people who open it in a browser.
export const dynamic = 'force-dynamic'

export default async function TowerAppPage() {
  let openUrl = 'https://t.me/TowerCrewBot?start=app'
  try {
    openUrl = await appLink('home')
  } catch {}
  return <TowerMiniApp openUrl={openUrl} />
}
