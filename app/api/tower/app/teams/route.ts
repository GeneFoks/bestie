// @ts-nocheck
import { NextRequest } from 'next/server'
import { withApp, appTeams, appTeamDetail, appTeamAction } from '@/lib/tower-app'

// Mini App «Команды».
// GET → my team + every team; GET ?id=<uuid> → one team.
// POST { action:'create'|'join'|'cancel'|'leave'|'decide', … } — same rules as the bot.
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  return withApp(req, (user, { params }) => {
    const id = params.get('id')
    return id ? appTeamDetail(user, id) : appTeams(user)
  })
}

export async function POST(req: NextRequest) {
  return withApp(req, (user, { body }) => appTeamAction(user, body))
}
