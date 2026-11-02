// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { rateLimit } from '@/lib/rateLimit'
import {
  getDb, getStripe, verifyLink, resolveChatId, memberStatus, isBannedByAdmin, loadRow, priceFor,
  syncSubscription, findLiveTowerSub, manageInBotUrl, isLiveStatus, PLANS, SITE, TOWER_KIND, BANNED_TEXT,
} from '@/lib/tower'

// POST { t, plan } → Stripe Checkout (subscription) for the «Вышки в США» group.
export const dynamic = 'force-dynamic'

const fail = (message, status = 400, extra = {}) =>
  NextResponse.json({ error: message, ...extra }, { status })

export async function POST(req: NextRequest) {
  const limited = rateLimit(req, 'tower-checkout', { limit: 20, windowMs: 60000 })
  if (limited) return limited

  let body
  try { body = await req.json() } catch { return fail('Неверный запрос') }
  const t = typeof body?.t === 'string' ? body.t : ''
  const plan = body?.plan
  const p = verifyLink(t, 'pay')
  if (!p) {
    return fail('Ссылка устарела — нажмите /start в боте @TowerCrewBot, чтобы получить новую', 401, { expired: true })
  }
  if (!Object.prototype.hasOwnProperty.call(PLANS, plan)) return fail('Выберите тариф')

  let chatId
  try {
    chatId = await resolveChatId()
  } catch (e) {
    console.error('[tower/checkout] resolveChatId:', e?.message)
    return fail('Не удалось связаться с Telegram — попробуйте через минуту', 503)
  }
  if (p.c !== chatId) return fail('Эта ссылка не от нашей группы — нажмите /start в боте @TowerCrewBot', 400, { expired: true })

  const db = getDb()
  const s = getStripe()
  // The pay token never opens the billing portal — managing goes through the bot.
  const already = async (status, rowPlan) =>
    NextResponse.json({ already: true, status, plan: rowPlan, manageUrl: await manageInBotUrl() })

  try {
    let row = await loadRow(chatId, p.u)

    // Already paying? Double-check with Stripe so a missed webhook can't block a new checkout.
    if (row?.stripe_subscription_id && isLiveStatus(row.status)) {
      try {
        const sub = await s.subscriptions.retrieve(row.stripe_subscription_id)
        if (isLiveStatus(sub.status)) return already(sub.status, row.plan)
        await syncSubscription(sub)
        row = await loadRow(chatId, p.u)
      } catch (e) {
        if (e?.code !== 'resource_missing') throw e
      }
    }

    // A subscription the row doesn't know about yet (webhook not landed, or a
    // second tab already paid) → never start a second one.
    if (row?.stripe_customer_id) {
      const live = await findLiveTowerSub(row.stripe_customer_id, chatId, p.u)
      if (live) {
        try { await syncSubscription(live) } catch (e) { console.warn('[tower/checkout] sync:', e?.message) }
        return already(live.status, row.plan)
      }
    }

    // Banned by an admin → don't take their money. Also tells us whether they
    // were already in the group before paying (then we never kick them).
    const m = await memberStatus(chatId, p.u)
    if (!m.ok) return fail('Не удалось проверить участие в группе — попробуйте через минуту', 503)
    if (isBannedByAdmin(m)) return fail(BANNED_TEXT, 403, { banned: true })

    const priceId = await priceFor(plan)

    let customerId = row?.stripe_customer_id || null
    const newCustomer = async () => {
      const c = await s.customers.create({
        name: p.n || (p.un ? '@' + p.un : 'Telegram ' + p.u),
        metadata: {
          kind: TOWER_KIND,
          telegram_user_id: String(p.u),
          ...(p.un ? { telegram_username: p.un } : {}),
        },
      })
      return c.id
    }
    const now = new Date().toISOString()
    if (!row) {
      if (!customerId) customerId = await newCustomer()
      const { error } = await db.from('tg_subscriptions').insert({
        chat_id: chatId,
        telegram_user_id: p.u,
        telegram_username: p.un || null,
        plan,
        status: 'incomplete',
        stripe_customer_id: customerId,
        was_member_before: m.isMember,
      })
      if (error && error.code !== '23505') throw new Error('tg_subscriptions insert: ' + error.message)
      if (error) {
        // A parallel request created the row first → reuse its customer.
        const raced = await loadRow(chatId, p.u)
        if (raced?.stripe_customer_id) {
          customerId = raced.stripe_customer_id
        } else {
          await db.from('tg_subscriptions').update({ stripe_customer_id: customerId, updated_at: now })
            .eq('chat_id', chatId).eq('telegram_user_id', p.u)
        }
      }
    } else {
      const patch: any = {
        telegram_username: p.un || row.telegram_username || null,
        updated_at: now,
      }
      if (!isLiveStatus(row.status)) patch.plan = plan
      // Never paid before → membership is independent of us; refresh the flag.
      if (!row.stripe_subscription_id) patch.was_member_before = m.isMember
      if (!customerId) customerId = await newCustomer()
      patch.stripe_customer_id = customerId
      const { error } = await db.from('tg_subscriptions').update(patch).eq('id', row.id)
      if (error) throw new Error('tg_subscriptions update: ' + error.message)
    }

    // One open payment page at a time: close older tower Checkout sessions
    // (other tab / other plan), so two subscriptions can't both be paid.
    const expireOpenSessions = async (customer) => {
      try {
        const recent = await s.checkout.sessions.list({ customer, limit: 20 })
        for (const cs of recent.data || []) {
          if (cs.status !== 'open' || cs.metadata?.kind !== TOWER_KIND) continue
          try { await s.checkout.sessions.expire(cs.id) } catch (e) { console.warn('[tower/checkout] expire:', e?.message) }
        }
      } catch (e) {
        console.warn('[tower/checkout] list open sessions:', e?.message)
      }
    }

    const meta: any = { kind: TOWER_KIND, telegram_user_id: String(p.u), chat_id: String(chatId), plan }
    if (p.un) meta.telegram_username = p.un

    const params = (customer) => ({
      mode: 'subscription',
      customer,
      line_items: [{ price: priceId, quantity: 1 }],
      client_reference_id: String(p.u),
      metadata: meta,
      subscription_data: { metadata: meta },
      success_url: `${SITE}/tower/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${SITE}/tower/join?t=${encodeURIComponent(t)}`,
      allow_promotion_codes: true,
      locale: 'ru',
    })

    await expireOpenSessions(customerId)
    let session
    try {
      session = await s.checkout.sessions.create(params(customerId))
    } catch (e) {
      // Stored customer missing (e.g. created with a test key) → make a fresh one once.
      if (e?.code === 'resource_missing' && e?.param === 'customer') {
        customerId = await newCustomer()
        await db.from('tg_subscriptions').update({ stripe_customer_id: customerId, updated_at: new Date().toISOString() })
          .eq('chat_id', chatId).eq('telegram_user_id', p.u)
        session = await s.checkout.sessions.create(params(customerId))
      } else {
        throw e
      }
    }

    return NextResponse.json({ url: session.url })
  } catch (e) {
    console.error('[tower/checkout] error:', e?.message || e)
    return fail('Не получилось открыть оплату — попробуйте ещё раз через минуту', 500)
  }
}
