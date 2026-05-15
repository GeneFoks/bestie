import type { Metadata } from 'next'
import './globals.css'
import { AuthProvider } from './providers'
import BottomNav from '@/components/BottomNav'

export const metadata: Metadata = {
  title: 'Bestie — Your Social Passport',
  description: 'Find real people for real activities. Bestie connects you with people who share your vibe — for hikes, deep talks, travel, and more.',
  metadataBase: new URL('https://bestiehere.com'),
  keywords: ['social app', 'find friends', 'activities', 'bestie score', 'meet people', 'social passport'],
  authors: [{ name: 'Bestie', url: 'https://bestiehere.com' }],
  openGraph: {
    title: 'Bestie — Your Social Passport',
    description: 'Find real people for real activities. Bestie connects you with people who share your vibe.',
    url: 'https://bestiehere.com',
    siteName: 'Bestie',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'Bestie — Real people. Real moments.' }],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Bestie — Your Social Passport',
    description: 'Find real people for real activities.',
    images: ['/og-image.png'],
  },
  robots: { index: true, follow: true },
  alternates: { canonical: 'https://bestiehere.com' },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#080810" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </head>
      <body>
        <AuthProvider>
          {children}
          <BottomNav />
        </AuthProvider>
      </body>
    </html>
  )
}
