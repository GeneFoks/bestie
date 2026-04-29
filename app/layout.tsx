import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Bestie — Your Social Passport',
  description: 'Find real people for real activities. Bestie Score: your social passport.',
  metadataBase: new URL('https://bestiehere.com'),
  openGraph: {
    title: 'Bestie — Your Social Passport',
    description: 'Find a Bestie for any activity. Verified profiles. Real moments.',
    siteName: 'Bestie',
    type: 'website',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
