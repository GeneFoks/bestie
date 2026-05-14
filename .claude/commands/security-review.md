---
name: security-review
description: Security audit for Bestie — checks Supabase RLS, API endpoints, file uploads, auth, and sensitive data handling.
allowed_tools: ["Read", "Grep", "Glob", "Bash"]
---

# /security-review

Run a security audit on the current code or a specific file/feature in the Bestie codebase.

## What to Check

### 1. Supabase & RLS
- [ ] RLS enabled on all tables that hold user data
- [ ] No server components using anon client for RLS-protected queries (use service role or session-based client)
- [ ] No raw SQL string concatenation — always use Supabase query builder
- [ ] `.env.local` not committed; `NEXT_PUBLIC_SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY` only in env vars

### 2. API Routes (`app/api/**`)
- [ ] Auth check at the top of every route — reject unauthenticated requests with 401
- [ ] Authorization check — user can only modify their own data
- [ ] No stack traces or internal error details returned to the client
- [ ] Rate limiting on expensive or public endpoints (e.g. search, email sending)

### 3. File Uploads (avatars, session photos)
- [ ] File size limit enforced (max 5MB)
- [ ] File type validated by MIME type AND extension, not just filename
- [ ] Files uploaded to user-scoped Supabase Storage paths (e.g. `avatars/{userId}/...`)
- [ ] No user-controlled filenames used directly in storage paths

### 4. User Input
- [ ] No user input rendered with `dangerouslySetInnerHTML` without sanitization
- [ ] Message/bio fields have length limits enforced both client and server side
- [ ] No user-provided values passed directly to `.order()`, `.limit()`, or raw queries

### 5. Auth & Sessions
- [ ] Session tokens not stored in localStorage — Supabase handles this via httpOnly cookies
- [ ] `supabase.auth.getUser()` used (not `getSession()`) for server-side auth verification
- [ ] Sensitive pages redirect to `/login` when unauthenticated

### 6. Sensitive Data in Logs
- [ ] No `console.log` with user emails, tokens, or payment info
- [ ] No sensitive fields returned in API responses that aren't needed by the client

## How to Use

Run on a specific area:
- "Run /security-review on the bookings API"
- "Run /security-review on the file upload flow"
- "Run /security-review before merging this PR"

## Output Format

Report findings as:
- **FAIL** — must fix before shipping
- **WARN** — should fix, low risk right now
- **PASS** — looks good
