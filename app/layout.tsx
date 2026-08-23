import type { Metadata } from 'next'
import './globals.css'
import { AuthProvider } from './providers'
import BottomNav from '@/components/BottomNav'
import PWARegister from '@/components/PWARegister'
import IncomingCall from '@/components/IncomingCall'
import CompanionWidget from '@/components/CompanionWidget'
import AnalyticsProvider from '@/components/AnalyticsProvider'

export const metadata: Metadata = {
  title: 'Bestie — Your Social Passport',
  description: 'Find real people for real activities. Bestie connects you with people who share your vibe — for hikes, deep talks, travel, and more.',
  metadataBase: new URL('https://bestiehere.com'),
  keywords: ['social app', 'find friends', 'activities', 'bestie score', 'meet people', 'social passport'],
  authors: [{ name: 'Bestie', url: 'https://bestiehere.com' }],
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Bestie',
  },
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
        {/* Apply the saved theme before first paint to avoid a flash of the
            wrong palette. 'system' (or unset) follows the device preference. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('bestie-theme');if(t==='light'||t==='dark'){document.documentElement.setAttribute('data-theme',t);}else if(window.matchMedia&&window.matchMedia('(prefers-color-scheme: light)').matches){document.documentElement.setAttribute('data-theme','light');}}catch(e){}})();`,
          }}
        />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="theme-color" content="#09090F" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Bestie" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
        <link rel="apple-touch-icon" sizes="152x152" href="/icon-192.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/icon-192.png" />
        <link rel="apple-touch-icon" sizes="167x167" href="/icon-192.png" />
        <link rel="icon" type="image/png" sizes="192x192" href="/icon-192.png" />
        <link rel="icon" type="image/png" sizes="512x512" href="/icon-512.png" />
      </head>
      <body>
        <AuthProvider>
          {children}
          <BottomNav />
          <PWARegister />
          <IncomingCall />
          <CompanionWidget />
          <AnalyticsProvider />
        </AuthProvider>
      </body>
    </html>
  )
}
