import type { Metadata } from 'next'
import './globals.css'
import { AuthProvider } from './providers'
import BottomNav from '@/components/BottomNav'

export const metadata: Metadata = {
  title: 'Bestie — Your Social Passport',
  description: 'Find real people for real activities. Bestie Score: your social passport.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
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
