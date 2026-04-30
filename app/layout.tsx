import type { Metadata } from 'next'
import './globals.css'
import { AuthProvider } from './providers'

export const metadata: Metadata = {
  title: 'Bestie — Your Social Passport',
  description: 'Find real people for real activities. Bestie Score: your social passport.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  )
}
