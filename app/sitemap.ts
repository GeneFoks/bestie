import { MetadataRoute } from 'next'
import { createClient } from '@supabase/supabase-js'

// Revalidate the sitemap hourly so freshly created cities/profiles/crews get
// discovered by search engines without a redeploy.
export const revalidate = 3600

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = 'https://bestiehere.com'

  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    { url: base, lastModified: new Date(), changeFrequency: 'daily', priority: 1 },
    { url: `${base}/browse`, lastModified: new Date(), changeFrequency: 'hourly', priority: 0.9 },
    { url: `${base}/cities`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.8 },
    { url: `${base}/crews`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.8 },
    { url: `${base}/blog`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.8 },
    { url: `${base}/map`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.7 },
    { url: `${base}/plus`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.6 },
    { url: `${base}/login`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.3 },
  ]

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    // Pull the data that powers our indexable content pages in parallel.
    const [{ data: posts }, { data: cityRows }, { data: profiles }, { data: crews }] =
      await Promise.all([
        supabase.from('blog_posts').select('slug, updated_at').eq('published', true),
        supabase.from('users').select('city').not('city', 'is', null).neq('city', ''),
        supabase.from('users').select('username, updated_at').not('username', 'is', null).neq('username', '').limit(5000),
        supabase.from('crews').select('slug, updated_at').eq('is_public', true).not('slug', 'is', null).limit(5000),
      ])

    // Blog posts
    const blogPages: MetadataRoute.Sitemap = (posts || []).map(post => ({
      url: `${base}/blog/${post.slug}`,
      lastModified: new Date(post.updated_at),
      changeFrequency: 'monthly',
      priority: 0.7,
    }))

    // City hubs — one URL per distinct city
    const citySet = new Set<string>()
    ;(cityRows || []).forEach((r: any) => {
      const c = (r.city || '').trim()
      if (c) citySet.add(c)
    })
    const cityPages: MetadataRoute.Sitemap = Array.from(citySet).map(city => ({
      url: `${base}/cities/${encodeURIComponent(city)}`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.7,
    }))

    // Public member profiles
    const profilePages: MetadataRoute.Sitemap = (profiles || []).map((u: any) => ({
      url: `${base}/${u.username}`,
      lastModified: u.updated_at ? new Date(u.updated_at) : new Date(),
      changeFrequency: 'weekly',
      priority: 0.6,
    }))

    // Public crews
    const crewPages: MetadataRoute.Sitemap = (crews || []).map((c: any) => ({
      url: `${base}/crews/${c.slug}`,
      lastModified: c.updated_at ? new Date(c.updated_at) : new Date(),
      changeFrequency: 'weekly',
      priority: 0.6,
    }))

    return [...staticPages, ...blogPages, ...cityPages, ...profilePages, ...crewPages]
  } catch {
    return staticPages
  }
}
