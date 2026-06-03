// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { rateLimit } from '@/lib/rateLimit'

// ── helpers ──────────────────────────────────────────────────────────────────

async function sha256hex(text: string): Promise<string> {
  const enc = new TextEncoder()
  const buf = await crypto.subtle.digest('SHA-256', enc.encode(text))
  return Array.from(new Uint8Array(buf))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

function normaliseEmail(email: string): string {
  return email.trim().toLowerCase()
}

function normalisePhone(phone: string): string {
  // Strip everything except digits and leading +
  return phone.replace(/[^\d+]/g, '')
}

// ── route ────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  // Expensive (hashing + bulk match) → cap per IP.
  const limited = rateLimit(req, 'contacts-import', { limit: 5, windowMs: 60_000 })
  if (limited) return limited

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Auth: get caller from Authorization header (Bearer token)
  const authHeader = req.headers.get('authorization') || ''
  const token = authHeader.replace('Bearer ', '').trim()
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: { user }, error: authErr } = await supabaseAdmin.auth.getUser(token)
  if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const ownerId = user.id

  // Body: { contacts: Array<{ email?: string; phone?: string; name?: string }> }
  let body: any
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Bad JSON' }, { status: 400 }) }

  const contacts: Array<{ email?: string; phone?: string; name?: string }> = body?.contacts || []
  if (!Array.isArray(contacts) || contacts.length === 0) {
    return NextResponse.json({ error: 'No contacts provided' }, { status: 400 })
  }
  if (contacts.length > 5000) {
    return NextResponse.json({ error: 'Too many contacts (max 5000)' }, { status: 400 })
  }

  // Hash every contact
  const rows: Array<{ owner_id: string; hashed_email?: string; hashed_phone?: string }> = []
  const hashedEmails: string[] = []
  const hashedPhones: string[] = []

  for (const c of contacts) {
    const row: any = { owner_id: ownerId }
    if (c.email) {
      const h = await sha256hex(normaliseEmail(c.email))
      row.hashed_email = h
      hashedEmails.push(h)
    }
    if (c.phone) {
      const h = await sha256hex(normalisePhone(c.phone))
      row.hashed_phone = h
      hashedPhones.push(h)
    }
    if (row.hashed_email || row.hashed_phone) rows.push(row)
  }

  // Upsert contact hashes (ignore duplicates)
  if (rows.length > 0) {
    await supabaseAdmin
      .from('user_contacts')
      .upsert(rows, { onConflict: 'owner_id,hashed_email', ignoreDuplicates: true })
    // Also upsert phone-keyed rows separately (different unique constraint)
    const phoneOnlyRows = rows.filter(r => r.hashed_phone && !r.hashed_email)
    if (phoneOnlyRows.length > 0) {
      await supabaseAdmin
        .from('user_contacts')
        .upsert(phoneOnlyRows, { onConflict: 'owner_id,hashed_phone', ignoreDuplicates: true })
    }
  }

  // Match against registered users
  const matchedUsers: any[] = []

  if (hashedEmails.length > 0) {
    const { data } = await supabaseAdmin
      .from('users')
      .select('id, full_name, username, photo, city, bestie_score')
      .in('hashed_email', hashedEmails)
      .neq('id', ownerId)
    if (data) matchedUsers.push(...data)
  }

  if (hashedPhones.length > 0) {
    const { data } = await supabaseAdmin
      .from('users')
      .select('id, full_name, username, photo, city, bestie_score')
      .in('hashed_phone', hashedPhones)
      .neq('id', ownerId)
    if (data) {
      // de-dupe by id
      const seen = new Set(matchedUsers.map(u => u.id))
      for (const u of data) if (!seen.has(u.id)) matchedUsers.push(u)
    }
  }

  // Update matched_user_id in user_contacts
  for (const mu of matchedUsers) {
    // We can't easily update by email/phone hash here — just upsert a row
    // with matched_user_id set; the route is idempotent
    await supabaseAdmin
      .from('user_contacts')
      .update({ matched_user_id: mu.id })
      .eq('owner_id', ownerId)
      .or(`hashed_email.in.(${hashedEmails.map(h => `"${h}"`).join(',')}),hashed_phone.in.(${hashedPhones.map(h => `"${h}"`).join(',')})`)
  }

  // Also update the owner's own hashed_email/phone on users table
  // so other users can find them when they import contacts later
  const ownerEmail = user.email
  if (ownerEmail) {
    const hEmail = await sha256hex(normaliseEmail(ownerEmail))
    await supabaseAdmin.from('users').update({ hashed_email: hEmail }).eq('id', ownerId)

    // Trigger notifications for existing users who already have the owner as a contact
    const { data: existingImporters } = await supabaseAdmin
      .from('user_contacts')
      .select('owner_id')
      .eq('hashed_email', hEmail)
      .neq('owner_id', ownerId)

    if (existingImporters?.length) {
      const { data: ownerProfile } = await supabaseAdmin
        .from('users')
        .select('full_name, username')
        .eq('id', ownerId)
        .single()

      const name = ownerProfile?.full_name || ownerProfile?.username || 'Someone you know'
      const notificationRows = existingImporters.map(row => ({
        user_id: row.owner_id,
        type: 'contact_joined',
        title: `${name} joined Bestie!`,
        body: 'Your contact is now on Bestie.',
        link: `/${ownerProfile?.username}`,
      }))
      await supabaseAdmin.from('notifications').insert(notificationRows)
    }
  }

  return NextResponse.json({
    imported: rows.length,
    matched: matchedUsers.length,
    users: matchedUsers,
  })
}
