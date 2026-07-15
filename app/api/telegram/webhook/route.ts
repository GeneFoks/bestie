import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const BASE_URL = 'https://api.telegram.org/bot'

// Fast-path dedupe for retries that hit the same warm instance.
// The durable cross-instance guard is the telegram_updates table below.
const seenUpdates = new Set<number>()

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

async function tg(method: string, body: object) {
  const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!
  const res = await fetch(`${BASE_URL}${BOT_TOKEN}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  return res.json()
}

async function sendMessage(chatId: number, text: string, parseMode = 'HTML') {
  return tg('sendMessage', { chat_id: chatId, text, parse_mode: parseMode })
}

async function approveJoinRequest(chatId: number, userId: number) {
  return tg('approveChatJoinRequest', { chat_id: chatId, user_id: userId })
}

// ── /link <invite code> — bind THIS Telegram group to a crew ────────────────
// Sent inside the crew's Telegram group. The invite code (shown on the crew
// page) acts as the shared secret proving the sender belongs to the crew.
async function handleLink(message: any) {
  const supabase = getSupabase()
  const chat = message.chat
  const fromId = message.from.id

  if (!chat || (chat.type !== 'group' && chat.type !== 'supergroup')) {
    await sendMessage(fromId, '❌ Отправь <code>/link КОД</code> внутри Telegram-группы своего крю.')
    return
  }

  const parts = (message.text || '').trim().split(/\s+/)
  const code = (parts[1] || '').replace(/^@/, '').toUpperCase()
  if (!code) {
    await sendMessage(chat.id, '❌ Использование: <code>/link КОД</code> — код приглашения со страницы крю на Bestie.')
    return
  }

  const { data: crew } = await supabase
    .from('crews')
    .select('id, name')
    .eq('invite_code', code)
    .single()

  if (!crew) {
    await sendMessage(chat.id, '❌ Крю с таким кодом приглашения не найден.')
    return
  }

  await supabase.from('crews').update({ telegram_chat_id: chat.id }).eq('id', crew.id)

  await sendMessage(
    chat.id,
    `✅ Группа привязана к крю <b>${crew.name}</b>.\n` +
    `Теперь заявки на вступление будут автоматически проверяться по членству на Bestie.`
  )
}

// ── chat_join_request — someone asked to join the group ─────────────────────
async function handleJoinRequest(update: any) {
  const supabase = getSupabase()
  const { chat, from } = update.chat_join_request
  const userId = from.id
  const chatId = chat.id
  const firstName = from.first_name || 'Hey'

  // Which crew owns this Telegram group?
  const { data: crew } = await supabase
    .from('crews')
    .select('id, name')
    .eq('telegram_chat_id', chatId)
    .single()

  // Remember the pending request so /verify can approve it later.
  await supabase.from('telegram_pending_joins').upsert(
    { telegram_user_id: userId, telegram_username: from.username || null, chat_id: chatId },
    { onConflict: 'telegram_user_id' }
  )

  const crewName = crew?.name || chat.title || 'этот крю'
  await sendMessage(
    userId,
    `👋 <b>${firstName}!</b>\n\n` +
    `Чтобы вступить в группу <b>${chat.title}</b>, нужно быть в крю <b>${crewName}</b> на Bestie.\n\n` +
    `<b>Шаги:</b>\n` +
    `1️⃣ Зарегистрируйся на <b>bestiehere.com</b>\n` +
    `2️⃣ Вступи в крю <b>${crewName}</b>\n` +
    `3️⃣ Напиши мне: <code>/verify @твой_username</code>\n\n` +
    `После проверки я одобрю заявку автоматически 🚀`
  )
}

// ── /verify @username — approve the pending join if they're a crew member ───
async function handleVerify(message: any) {
  const supabase = getSupabase()
  const userId = message.from.id
  const text: string = message.text || ''
  const parts = text.trim().split(/\s+/)
  const rawUsername = parts[1]

  if (!rawUsername) {
    await sendMessage(userId, '❌ Укажи свой Bestie username: <code>/verify @username</code>')
    return
  }

  const bestieUsername = rawUsername.replace(/^@/, '').toLowerCase()

  // Look up the pending request (gives us which group/chat they want to join).
  const { data: pending } = await supabase
    .from('telegram_pending_joins')
    .select('chat_id')
    .eq('telegram_user_id', userId)
    .single()

  if (!pending) {
    await sendMessage(userId, '❌ Заявка на вступление не найдена. Сначала подай заявку в группу.')
    return
  }

  // Which crew is this group linked to?
  const { data: crew } = await supabase
    .from('crews')
    .select('id, name')
    .eq('telegram_chat_id', pending.chat_id)
    .single()

  if (!crew) {
    await sendMessage(userId, '❌ Эта группа ещё не привязана к крю. Капитан должен отправить <code>/link КОД</code> в группе.')
    return
  }

  // Check the Bestie user exists.
  const { data: user } = await supabase
    .from('users')
    .select('id')
    .eq('username', bestieUsername)
    .single()

  if (!user) {
    await sendMessage(userId,
      `❌ Пользователь <b>@${bestieUsername}</b> не найден на Bestie.\n\nПроверь username или зарегистрируйся на <b>bestiehere.com</b>`
    )
    return
  }

  // Check they're actually a member of THIS crew.
  const { data: member } = await supabase
    .from('crew_members')
    .select('id')
    .eq('user_id', user.id)
    .eq('crew_id', crew.id)
    .single()

  if (!member) {
    await sendMessage(userId,
      `❌ Ты ещё не в крю <b>${crew.name}</b> на Bestie.\n\nЗайди на <b>bestiehere.com</b>, вступи в крю и попробуй снова.`
    )
    return
  }

  // All good — approve.
  await approveJoinRequest(pending.chat_id, userId)
  await supabase.from('telegram_pending_joins').delete().eq('telegram_user_id', userId)

  await sendMessage(userId,
    `✅ <b>Готово!</b> Твоя заявка в <b>${crew.name}</b> одобрена.\n\nДобро пожаловать! 🎉`
  )
}

export async function POST(req: NextRequest) {
  try {
    // ── Verify the request really came from Telegram ──────────────────────────
    // Telegram echoes the secret we registered via setWebhook(secret_token=…)
    // in this header on every update. Reject anything that doesn't match.
    const expectedSecret = process.env.TELEGRAM_WEBHOOK_SECRET
    if (expectedSecret) {
      const got = req.headers.get('x-telegram-bot-api-secret-token')
      if (got !== expectedSecret) {
        return NextResponse.json({ ok: false }, { status: 401 })
      }
    }

    const update = await req.json()

    // ── Dedupe: Telegram sometimes delivers the same update to several
    // serverless instances, producing 3–4 identical bot replies. Claim the
    // update_id in the DB (primary key); if it's already claimed, skip.
    if (typeof update.update_id === 'number') {
      if (seenUpdates.has(update.update_id)) return NextResponse.json({ ok: true })
      seenUpdates.add(update.update_id)
      const { error: dupErr } = await getSupabase()
        .from('telegram_updates')
        .insert({ update_id: update.update_id })
      // 23505 = duplicate key → another instance already handled this update
      if (dupErr && dupErr.code === '23505') return NextResponse.json({ ok: true })
      // any other error (e.g. table missing) → proceed; in-memory set still helps
    }

    if (update.chat_join_request) {
      await handleJoinRequest(update)
    }

    const msgText: string = update.message?.text || ''
    if (msgText.startsWith('/link')) {
      await handleLink(update.message)
    } else if (msgText.startsWith('/verify')) {
      await handleVerify(update.message)
    }

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('Telegram webhook error:', e)
    return NextResponse.json({ ok: false })
  }
}
