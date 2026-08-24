// @ts-nocheck
import Link from 'next/link'

export const metadata = { title: 'Privacy Policy — Bestie' }

const H = ({ children }: { children: React.ReactNode }) => (
  <h2 style={{ fontFamily: 'DM Serif Display, serif', fontSize: '20px', color: 'var(--text-primary)', margin: '32px 0 10px' }}>{children}</h2>
)
const P = ({ children }: { children: React.ReactNode }) => (
  <p style={{ fontSize: '14px', color: 'var(--text-muted)', lineHeight: 1.7, margin: '0 0 12px' }}>{children}</p>
)

export default function PrivacyPage() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
      <nav style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', borderBottom: '1px solid var(--border)' }}>
        <Link href="/" style={{ fontFamily: 'DM Serif Display, serif', fontSize: '20px', fontWeight: 700, color: '#D4AF37', textDecoration: 'none' }}>BESTIE</Link>
        <Link href="/terms" style={{ fontSize: '13px', color: 'var(--text-muted)', textDecoration: 'none' }}>Terms of Service →</Link>
      </nav>

      <div style={{ maxWidth: '680px', margin: '0 auto', padding: '48px 24px 100px' }}>
        <h1 style={{ fontFamily: 'DM Serif Display, serif', fontSize: '32px', color: 'var(--text-primary)', marginBottom: '8px' }}>Privacy Policy</h1>
        <p style={{ fontSize: '13px', color: 'var(--text-dim)', marginBottom: '32px' }}>Last updated: July 15, 2026</p>

        <P>This policy explains what Bestie (bestiehere.com) collects, why, and what control you have. Short version: we collect what's needed to run a social meetup product, we don't sell your data, and your contact imports never leave your device as raw data.</P>

        <H>1. What we collect</H>
        <P><b style={{ color: 'var(--text-primary)' }}>Account & profile:</b> email, name, username, photo, city, bio, birth date (optional), activities, personality test answers and resulting type.</P>
        <P><b style={{ color: 'var(--text-primary)' }}>Activity on the platform:</b> meetups, events and RSVPs, messages, knocks, sparks, reviews, photos you upload, and reputation signals (Bestie Score inputs).</P>
        <P><b style={{ color: 'var(--text-primary)' }}>Contact matching (optional):</b> if you use "find friends", emails/phone numbers are hashed (SHA-256) before being sent — we store one-way fingerprints, never your raw contact list.</P>
        <P><b style={{ color: 'var(--text-primary)' }}>Technical:</b> device type, pages visited, and basic usage analytics collected first-party. Payments are handled by Stripe — we never see your card number.</P>

        <H>2. What we use it for</H>
        <P>Running the product: matching you with compatible people, showing your public passport, powering events and chats. Safety: reviewing reports, preventing spam and fraud. Communication: transactional emails (knocks, matches, event updates) and, with your consent, product news. We do <b style={{ color: 'var(--text-primary)' }}>not</b> sell your personal data to third parties.</P>

        <H>3. What's public</H>
        <P>Your passport (name, photo, city, type, score, badges, activities, memories you choose to share) is visible to other users and may be visible to non-registered visitors via your profile link. Messages and birthday-event guest chats are visible to their participants. You control what goes on your profile.</P>

        <H>4. Who we share with</H>
        <P>Service providers that run our infrastructure: Supabase (database & auth), Netlify (hosting), Stripe (payments), Resend (email), Telegram (only if you link the bot). Each receives only what it needs to provide its service. We may disclose data if required by law or to protect users' safety.</P>

        <H>5. Retention & deletion</H>
        <P>We keep your data while your account is active. If you delete your account, your profile and personal data are deleted; some records may be retained where required for safety (e.g. reports) or by law. To delete your account, contact us at the email below.</P>

        <H>6. Your rights</H>
        <P>You can access and edit your profile data in the app. Depending on your location you may have rights to access, correct, delete, or export your data — email us and we'll honor them. We do not knowingly collect data from anyone under 18; such accounts are removed.</P>

        <H>7. Security</H>
        <P>Data is encrypted in transit, access is controlled with row-level security, and sensitive reputation fields are protected against tampering at the database level. No system is perfectly secure — if a breach affects you, we will notify you as required by law.</P>

        <H>8. Changes</H>
        <P>We'll post any changes here and update the date above; material changes will be announced in the app or by email.</P>

        <H>Contact</H>
        <P>Privacy questions or data requests: <a href="mailto:hello@bestiehere.com" style={{ color: '#D4AF37', textDecoration: 'none' }}>hello@bestiehere.com</a></P>
      </div>
    </div>
  )
}
