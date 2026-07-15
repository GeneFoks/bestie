import Link from 'next/link'

export const metadata = { title: 'Terms of Service — Bestie' }

const H = ({ children }: { children: React.ReactNode }) => (
  <h2 style={{ fontFamily: 'DM Serif Display, serif', fontSize: '20px', color: '#F0EAFF', margin: '32px 0 10px' }}>{children}</h2>
)
const P = ({ children }: { children: React.ReactNode }) => (
  <p style={{ fontSize: '14px', color: '#A99ECC', lineHeight: 1.7, margin: '0 0 12px' }}>{children}</p>
)

export default function TermsPage() {
  return (
    <div style={{ minHeight: '100vh', background: '#09090F', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
      <nav style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', borderBottom: '1px solid rgba(255,255,255,0.10)' }}>
        <Link href="/" style={{ fontFamily: 'DM Serif Display, serif', fontSize: '20px', fontWeight: 700, color: '#D4AF37', textDecoration: 'none' }}>BESTIE</Link>
        <Link href="/privacy" style={{ fontSize: '13px', color: '#A99ECC', textDecoration: 'none' }}>Privacy Policy →</Link>
      </nav>

      <div style={{ maxWidth: '680px', margin: '0 auto', padding: '48px 24px 100px' }}>
        <h1 style={{ fontFamily: 'DM Serif Display, serif', fontSize: '32px', color: '#F0EAFF', marginBottom: '8px' }}>Terms of Service</h1>
        <p style={{ fontSize: '13px', color: '#6B6490', marginBottom: '32px' }}>Last updated: July 15, 2026</p>

        <P>Welcome to Bestie ("Bestie", "we", "us"), operated at bestiehere.com. By creating an account or using Bestie you agree to these Terms. If you do not agree, do not use the service.</P>

        <H>1. Who can use Bestie</H>
        <P>You must be at least 18 years old. You must provide accurate information, use your real identity, and keep your account credentials secure. One account per person.</P>

        <H>2. What Bestie is — and is not</H>
        <P>Bestie is a platform that helps people discover each other and organize meetups, events, and conversations. Bestie is <b style={{ color: '#F0EAFF' }}>not</b> a party to any meeting, event, transaction, or relationship between users. We do not conduct background checks on users unless explicitly stated for a specific feature. Badges such as scores or verification indicators are informational signals, not guarantees of anyone's identity, character, or safety.</P>

        <H>3. Meeting people in real life</H>
        <P>Meeting anyone you met online carries inherent risk. You agree that you meet other users at your own risk, that you are solely responsible for your interactions with other users, and that you will exercise caution: meet in public places, tell someone where you are going, and never send money to people you have not met. To the maximum extent permitted by law, Bestie is not liable for any loss, injury, or damage arising out of user interactions, whether online or offline.</P>

        <H>4. Your content</H>
        <P>You keep ownership of the content you post (photos, messages, event pages, reviews). You grant Bestie a non-exclusive, worldwide license to host and display that content for the purpose of operating the service. You may not post content that is illegal, harassing, hateful, sexually explicit, deceptive, or that violates the rights of others.</P>

        <H>5. Community rules</H>
        <P>No harassment, hate speech, or threats. No impersonation. No spam or commercial solicitation outside of features designed for it. No attempting to manipulate scores, reviews, or matching. We may remove content, restrict features, suspend, or permanently ban accounts that violate these rules, at our discretion and without prior notice.</P>

        <H>6. Payments</H>
        <P>Some features are paid (e.g. Bestie Plus subscription, paid events or sessions). Payments are processed by Stripe; we do not store your card details. Except where required by law, payments are non-refundable. For paid events organized by users, the host — not Bestie — is responsible for the event taking place as described.</P>

        <H>7. Safety reports</H>
        <P>You can report or block any user you have interacted with. We review reports and may take action, but we cannot guarantee a response time or a specific outcome. In an emergency, always contact local emergency services first (911 in the US).</P>

        <H>8. Termination</H>
        <P>You may delete your account at any time. We may suspend or terminate your account if you violate these Terms or if required by law. Sections that by their nature should survive termination (liability limits, disputes) survive.</P>

        <H>9. Disclaimers & limitation of liability</H>
        <P>The service is provided "as is" without warranties of any kind. To the maximum extent permitted by law, Bestie's total liability for any claim arising out of the service will not exceed the greater of $100 or the amount you paid us in the 12 months before the claim.</P>

        <H>10. Disputes</H>
        <P>These Terms are governed by the laws of the State of Texas, USA. Any dispute will be resolved by binding arbitration on an individual basis; you waive the right to participate in a class action, to the extent permitted by law.</P>

        <H>11. Changes</H>
        <P>We may update these Terms. If changes are material we will notify you in the app or by email. Continuing to use Bestie after changes take effect means you accept them.</P>

        <H>Contact</H>
        <P>Questions about these Terms: <a href="mailto:hello@bestiehere.com" style={{ color: '#D4AF37', textDecoration: 'none' }}>hello@bestiehere.com</a></P>
      </div>
    </div>
  )
}
