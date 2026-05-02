import { NextRequest, NextResponse } from 'next/server'

const RESEND_API_KEY = process.env.RESEND_API_KEY

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
      subject = `Your booking was accepted!`
      html = emailTemplate(
        'Booking accepted! 🎉',
        `<strong style="color:#E8E0FF">${data.providerName}</strong> accepted your session request for <strong style="color:#E8E0FF">${data.activityTitle}</strong>. Check your sessions for details.`,
        'View my sessions →',
        'https://bestiehere.com/sessions'
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

    await sendEmail(to, subject, html)
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
