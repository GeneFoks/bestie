import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/dashboard', '/bookings', '/sessions', '/messages', '/review', '/edit-profile', '/settings'],
      },
    ],
    sitemap: 'https://bestiehere.com/sitemap.xml',
  }
}
