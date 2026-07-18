import type { Metadata } from 'next'

const title = 'Eterotype — free 16-type personality test · Bestie'
const description =
  '28 questions · 5 minutes · no signup. Discover your eterotype — one of 16 personality types — and see who you naturally click with.'

export const metadata: Metadata = {
  title,
  description,
  openGraph: { title, description, type: 'website' },
  twitter: { card: 'summary_large_image', title, description },
}

export default function BestieTypeLayout({ children }: { children: React.ReactNode }) {
  return children
}
