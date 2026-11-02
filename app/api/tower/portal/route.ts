// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { rateLimit } from '@/lib/rateLimit'
import { getStripe, verifyLink, loadRow, portalConfigId, payUrl, esc } from '@/lib/tower'

// GET ?t=<signed 'manage' link from the bot> → Stripe Customer Portal
// (change plan, card, cancel). Pay links (k = 'pay') are rejected here.
export const dynamic = 'force-dynamic'

function page(title, text, status = 400) {
  const html = `<!doctype html><html lang="ru"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex">
<title>${esc(title)}</title></head>
<body style="margin:0;min-height:100vh;background:#09090F;color:#F0EAFF;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;display:flex;align-items:center;justify-content:center;padding:16px;box-sizing:border-box;">
<div style="max-width:420px;width:100%;background:#111120;border:1px solid rgba(212,175,55,0.3);border-radius:20px;padding:28px 22px;text-align:center;">
<p style="font-size:40px;margin:0 0 10px;">⚠️</p>
<h1 style="font-size:20px;margin:0 0 10px;">${esc(title)}</h1>
<p style="font-size:15px;line-height:1.6;color:#A99ECC;margin:0 0 22px;">${esc(text)}</p>
<a href="https://t.me/TowerCrewBot" style="display:inline-block;padding:12px 22px;border-radius:12px;background:#D4AF37;color:#09090F;font-weight:700;font-size:15px;text-decoration:none;">Открыть бота</a>
</div></body></html>`
  return new NextResponse(html, { status, headers: { 'content-type': 'text/html; charset=utf-8' } })
}

export async function GET(req: NextRequest) {
  const limited = rateLimit(req, 'tower-portal', { limit: 20, windowMs: 60000 })
  if (limited) return limited

  const t = req.nextUrl.searchParams.get('t') || ''
  const p = verifyLink(t, 'manage')
  if (!p) {
    return page('Ссылка устарела', 'Нажмите /manage в боте @TowerCrewBot, чтобы получить новую.', 401)
  }

  try {
    // Back to the plan page with a fresh pay link (never the manage token).
    const joinUrl = payUrl({ u: p.u, c: p.c, n: p.n, un: p.un })
    const row = await loadRow(p.c, p.u)
    if (!row?.stripe_customer_id) {
      // No subscription yet → choose a plan.
      return NextResponse.redirect(joinUrl, 303)
    }

    let configuration = null
    try {
      configuration = await portalConfigId()
    } catch (e) {
      console.warn('[tower/portal] portal configuration:', e?.message)
    }

    const session = await getStripe().billingPortal.sessions.create({
      customer: row.stripe_customer_id,
      return_url: joinUrl,
      locale: 'ru',
      ...(configuration ? { configuration } : {}),
    })
    return NextResponse.redirect(session.url, 303)
  } catch (e) {
    console.error('[tower/portal] error:', e?.message || e)
    return page('Не получилось открыть управление подпиской',
      'Попробуйте ещё раз через минуту или напишите /manage в боте @TowerCrewBot.', 500)
  }
}
