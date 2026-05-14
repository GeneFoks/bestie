import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const BASE_URL = 'https://api.telegram.org/bot'

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

async function declineJoinRequest(chatId: number, userId: number) {
  return tg('declineChatJoinRequest', { chat_id: chatId, user_id: userId })
}

async function handleJoinRequest(update: any) {
  const supabase = getSupabase()
  const { chat, from } = update.chat_join_request
  const userId = from.id
  const chatId = chat.id
  const firstName = from.first_name || 'Hey'

  // Save pending request
  await supabase.from('telegram_pending_joins').upsert(
    { telegram_user_id: userId, telegram_username: from.username || null, chat_id: chatId },
    { onConflict: 'telegram_user_id' }
  )

  await sendMessage(
    userId,
    `👋 <b>${firstName}!</b>\n\n` +
    `Чтобы вступить в группу <b>${chat.title}</b>, нужно зарегистрироваться на Bestie и вступить в крю.\n\n` +
    `<b>Шаги:</b>\n` +
    `1️⃣ Зарегистрируйся на <b>bestiehere.com</b>\n` +
    `2️⃣ Найди крю <b>Вышки</b> и вступи\n` +
    `3️⃣ Напиши мне: <code>/verify @твой_username</code>\n\n` +
    `После проверки я одобрю твою заявку автоматически 🚀`
  )
}

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

  // Look up pending request
  const { data: pending } = await supabase
    .from('telegram_pending_joins')
    .select('chat_id')
    .eq('telegram_user_id', userId)
    .single()

  if (!pending) {
    await sendMessage(userId, '❌ Заявка на вступление не найдена. Сначала подай заявку в группу.')
    return
  }

  // Check user exists on Bestie
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

  // Check crew membership
  const { data: crew } = await supabase
    .from('crews')
    .select('id')
    .eq('slug', process.env.TELEGRAM_CREW_SLUG!)
    .single()

  if (!crew) {
    await sendMessage(userId, '❌ Крю не найден. Обратись к администратору.')
    return
  }

  const { data: member } = await supabase
    .from('crew_members')
    .select('id')
    .eq('user_id', user.id)
    .eq('crew_id', crew.id)
    .single()

  if (!member) {
    await sendMessage(userId,
      `❌ Ты ещё не в крю <b>Вышки</b> на Bestie.\n\nЗайди на <b>bestiehere.com</b>, найди крю и вступи, затем попробуй снова.`
    )
    return
  }

  // All good — approve
  await approveJoinRequest(pending.chat_id, userId)
  await supabase.from('telegram_pending_joins').delete().eq('telegram_user_id', userId)

  await sendMessage(userId,
    `✅ <b>Готово!</b> Твоя заявка одобрена.\n\nДобро пожаловать в группу! Увидимся на вышках 🏙`
  )
}

export async function POST(req: NextRequest) {
  try {
    const update = await req.json()

    if (update.chat_join_request) {
      await handleJoinRequest(update)
    }

    if (update.message?.text?.startsWith('/verify')) {
      await handleVerify(update.message)
    }

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('Telegram webhook error:', e)
    return NextResponse.json({ ok: false })
  }
}
