// @ts-nocheck
import { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'

export const metadata: Metadata = {
  title: 'Blog — Bestie',
  description: 'Tips, stories, and guides on making real connections, finding activity partners, and living a more social life.',
  alternates: { canonical: 'https://bestiehere.com/blog' },
}

async function getPosts() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    const { data } = await supabase
      .from('blog_posts')
      .select('slug, title, description, cover_image, tags, author, created_at')
      .eq('published', true)
      .order('created_at', { ascending: false })
    return data || []
  } catch {
    return []
  }
}

export default async function BlogPage() {
  const posts = await getPosts()

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
      <nav style={{ position: 'sticky', top: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', background: 'var(--nav-bg)', backdropFilter: 'blur(20px)', borderBottom: '1px solid var(--border)' }}>
        <Link href="/" style={{ fontFamily: 'DM Serif Display, serif', fontSize: '20px', fontWeight: 700, color: '#D4AF37', textDecoration: 'none' }}>BESTIE</Link>
        <Link href="/browse" style={{ fontSize: '14px', color: 'var(--text-muted)', textDecoration: 'none', padding: '8px 16px', borderRadius: '10px', border: '1px solid var(--border)' }}>Browse Besties</Link>
      </nav>

      <div style={{ maxWidth: '860px', margin: '0 auto', padding: '60px 24px' }}>
        <h1 style={{ fontFamily: 'DM Serif Display, serif', fontSize: 'clamp(28px, 6vw, 48px)', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '12px' }}>Bestie Blog</h1>
        <p style={{ fontSize: '16px', color: 'var(--text-muted)', marginBottom: '48px' }}>Stories, tips, and guides on real human connection.</p>

        {posts.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: '15px' }}>Posts coming soon...</p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 380px), 1fr))', gap: '24px' }}>
            {posts.map((post: any) => (
              <Link key={post.slug} href={`/blog/${post.slug}`} style={{ textDecoration: 'none' }}>
                <article style={{ background: 'var(--surface-1)', border: '1px solid var(--border)', borderRadius: '20px', overflow: 'hidden', transition: 'border-color 0.2s', cursor: 'pointer' }}>
                  {post.cover_image && (
                    <img src={post.cover_image} alt={post.title} style={{ width: '100%', height: '200px', objectFit: 'cover' }} />
                  )}
                  <div style={{ padding: '20px' }}>
                    {post.tags?.length > 0 && (
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '10px' }}>
                        {post.tags.slice(0, 3).map((tag: string) => (
                          <span key={tag} style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '999px', background: 'rgba(212,175,55,0.1)', color: '#D4AF37', border: '1px solid rgba(212,175,55,0.2)' }}>{tag}</span>
                        ))}
                      </div>
                    )}
                    <h2 style={{ fontSize: '17px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px', lineHeight: 1.3 }}>{post.title}</h2>
                    {post.description && <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: '12px' }}>{post.description}</p>}
                    <p style={{ fontSize: '12px', color: 'var(--text-dim)' }}>
                      {post.author} · {new Date(post.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                    </p>
                  </div>
                </article>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
