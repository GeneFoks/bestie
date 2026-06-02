import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const RESEND_API_KEY = process.env.RESEND_API_KEY

// Knock / match emails are privacy-sensitive: the client must NOT know the
// recipient's email address (knocks are anonymous). For these types the client
// passes only `data.receiverId`, and we resolve the email server-side with the
// service-role key. Other transactional types keep passing `to` directly.
function serviceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

async function sendEmail(to: string, subject: string, html: string) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'Bestie <noreply@bestiehere.com>',
      to,
      subject,
      html,
    }),
  })
  return res.ok
}

function emailTemplate(title: string, body: string, ctaText: string, ctaUrl: string) {
  return `
    <div style="background:#080810;min-height:100vh;padding:40px 24px;font-family:sans-serif;">
      <div style="max-width:520px;margin:0 auto;">
        <p style="font-size:22px;font-weight:700;color:#D4AF37;margin:0 0 32px;">BESTIE</p>
        <div style="background:#0F0F1E;border:1px solid rgba(212,175,55,0.2);border-radius:20px;padding:32px;">
          <h1 style="font-size:22px;color:#E8E0FF;margin:0 0 12px;">${title}</h1>
          <p style="font-size:15px;color:#9B93C0;line-height:1.7;margin:0 0 24px;">${body}</p>
          <a href="${ctaUrl}" style="display:inline-block;padding:12px 28px;border-radius:12px;background:#D4AF37;color:#080810;font-weight:700;font-size:14px;text-decoration:none;">${ctaText}</a>
        </div>
        <p style="font-size:12px;color:#6B5EA8;margin:24px 0 0;text-align:center;">bestiehere.com · Austin, TX</p>
      </div>
    </div>
  `
}

export async function POST(req: NextRequest) {
  try {
    const { type, to, data } = await req.json()
    let subject = ''
    let html = ''

    // Privacy-sensitive types resolve the recipient server-side from receiverId.
    let recipient = to
    if ((type === 'new_knock' || type === 'new_match') && data?.receiverId) {
      const { data: receiver } = await serviceClient()
        .from('users')
        .select('email')
        .eq('id', data.receiverId)
        .single()
      recipient = receiver?.email || null
    }

    if (type === 'new_knock') {
      // Anonymous teaser — never reveal who knocked. Curiosity is the hook.
      subject = `Someone knocked on Bestie 👀`
      html = emailTemplate(
        `You've got a knock 👋`,
        `Someone’s interested in connecting with you on Bestie. It’s completely private — <strong style="color:#E8E0FF">knock back to reveal who</strong> you matched with. If you both knock, you’re a match.`,
        'See who knocked →',
        'https://bestiehere.com/dashboard'
      )
    }

    if (type === 'new_match') {
      // Both sides have knocked — safe to reveal the match.
      const name = data?.matcherName || 'Someone'
      const url = data?.matcherUsername
        ? `https://bestiehere.com/book/${data.matcherUsername}`
        : 'https://bestiehere.com/dashboard'
      subject = `It's a match! 🎉 You and ${name} both knocked`
      html = emailTemplate(
        `It's a match! 🎉`,
        `You and <strong style="color:#E8E0FF">${name}</strong> both knocked — you’re connected on Bestie. Say hi and schedule your first session while the spark is fresh.`,
        'Schedule a session →',
        url
      )
    }

    if (type === 'new_booking') {
      subject = `New booking request from ${data.seekerName}`
      html = emailTemplate(
        `${data.seekerName} wants to book a session`,
        `You have a new booking request for <strong style="color:#E8E0FF">${data.activityTitle}</strong>. Accept or decline in your dashboard.`,
        'View booking →',
        'https://bestiehere.com/bookings'
      )
    }

    if (type === 'booking_accepted') {
      subject = `Your booking was accepted! 🎉`
      html = emailTemplate(
        'Booking accepted! 🎉',
        `<strong style="color:#E8E0FF">${data.providerName}</strong> accepted your session request for <strong style="color:#E8E0FF">${data.activityTitle}</strong>. Check your sessions for details.`,
        'View my sessions →',
        'https://bestiehere.com/sessions'
      )
    }

    if (type === 'booking_declined') {
      subject = `Booking update for ${data.activityTitle}`
      html = emailTemplate(
        'Booking not available',
        `Unfortunately <strong style="color:#E8E0FF">${data.providerName}</strong> wasn't able to accept your request for <strong style="color:#E8E0FF">${data.activityTitle}</strong> this time. Browse other Besties and find your match!`,
        'Browse Besties →',
        'https://bestiehere.com/browse'
      )
    }

    if (type === 'booking_cancelled') {
      subject = `Booking cancelled for ${data.activityTitle}`
      html = emailTemplate(
        'A booking was cancelled',
        `<strong style="color:#E8E0FF">${data.seekerName}</strong> cancelled their request for <strong style="color:#E8E0FF">${data.activityTitle}</strong>. Your calendar is now open for new bookings.`,
        'View bookings →',
        'https://bestiehere.com/bookings'
      )
    }

    if (type === 'booking_completed') {
      subject = `Session completed — leave a review! ⭐`
      html = emailTemplate(
        'How was your session?',
        `Your session with <strong style="color:#E8E0FF">${data.providerName}</strong> for <strong style="color:#E8E0FF">${data.activityTitle}</strong> is marked as completed. Leave a review and give Sparks!`,
        'Leave a review →',
        data.reviewUrl || 'https://bestiehere.com/sessions'
      )
    }

    if (type === 'new_message') {
      subject = `New message from ${data.senderName}`
      html = emailTemplate(
        `${data.senderName} sent you a message`,
        `"${data.preview}"`,
        'Reply →',
        'https://bestiehere.com/messages'
      )
    }

    if (type === 'new_spark') {
      subject = `${data.giverName} gave you a Spark ✨`
      html = emailTemplate(
        `You received a Spark!`,
        `<strong style="color:#E8E0FF">${data.giverName}</strong> gave you a <strong style="color:#D4AF37">${data.sparkType}</strong> Spark. Check your Social Passport.`,
        'View my passport →',
        `https://bestiehere.com/${data.username}`
      )
    }

    if (!subject) {
      return NextResponse.json({ error: 'Unknown type' }, { status: 400 })
    }
    if (!recipient) {
      // No address (e.g. receiver has no email on file) — succeed silently so
      // the knock/match flow is never blocked on email delivery.
      return NextResponse.json({ ok: true, skipped: 'no-recipient' })
    }

    await sendEmail(recipient, subject, html)
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
