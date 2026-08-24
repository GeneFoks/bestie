// @ts-nocheck
import { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'

async function getPost(slug: string) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  const { data } = await supabase
    .from('blog_posts')
    .select('*')
    .eq('slug', slug)
    .eq('published', true)
    .single()
  return data
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const post = await getPost(params.slug)
  if (!post) return {}
  return {
    title: `${post.title} — Bestie Blog`,
    description: post.description,
    alternates: { canonical: `https://bestiehere.com/blog/${post.slug}` },
    openGraph: {
      title: post.title,
      description: post.description,
      url: `https://bestiehere.com/blog/${post.slug}`,
      type: 'article',
      images: post.cover_image ? [{ url: post.cover_image }] : [],
      publishedTime: post.created_at,
      modifiedTime: post.updated_at,
      tags: post.tags,
    },
  }
}

export default async function BlogPostPage({ params }: { params: { slug: string } }) {
  const post = await getPost(params.slug)
  if (!post) notFound()

  // JSON-LD Schema markup
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.description,
    image: post.cover_image,
    author: { '@type': 'Organization', name: post.author || 'Bestie Team', url: 'https://bestiehere.com' },
    publisher: { '@type': 'Organization', name: 'Bestie', url: 'https://bestiehere.com', logo: { '@type': 'ImageObject', url: 'https://bestiehere.com/icon-192.png' } },
    datePublished: post.created_at,
    dateModified: post.updated_at,
    mainEntityOfPage: { '@type': 'WebPage', '@id': `https://bestiehere.com/blog/${post.slug}` },
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />

      <nav style={{ position: 'sticky', top: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', background: 'var(--nav-bg)', backdropFilter: 'blur(20px)', borderBottom: '1px solid var(--border)' }}>
        <Link href="/" style={{ fontFamily: 'DM Serif Display, serif', fontSize: '20px', fontWeight: 700, color: '#D4AF37', textDecoration: 'none' }}>BESTIE</Link>
        <Link href="/blog" style={{ fontSize: '14px', color: 'var(--text-muted)', textDecoration: 'none', padding: '8px 16px', borderRadius: '10px', border: '1px solid var(--border)' }}>← Blog</Link>
      </nav>

      <article style={{ maxWidth: '720px', margin: '0 auto', padding: '60px 24px' }}>
        {post.cover_image && (
          <img src={post.cover_image} alt={post.title} style={{ width: '100%', height: '360px', objectFit: 'cover', borderRadius: '20px', marginBottom: '40px' }} />
        )}

        {post.tags?.length > 0 && (
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '16px' }}>
            {post.tags.map((tag: string) => (
              <span key={tag} style={{ fontSize: '12px', padding: '4px 10px', borderRadius: '999px', background: 'rgba(212,175,55,0.1)', color: '#D4AF37', border: '1px solid rgba(212,175,55,0.2)' }}>{tag}</span>
            ))}
          </div>
        )}

        <h1 style={{ fontFamily: 'DM Serif Display, serif', fontSize: 'clamp(24px, 5vw, 40px)', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.2, marginBottom: '16px' }}>{post.title}</h1>
        {post.description && <p style={{ fontSize: '17px', color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: '24px' }}>{post.description}</p>}

        <p style={{ fontSize: '13px', color: 'var(--text-dim)', marginBottom: '40px', paddingBottom: '24px', borderBottom: '1px solid var(--border)' }}>
          By {post.author || 'Bestie Team'} · {new Date(post.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
        </p>

        <div
          style={{ fontSize: '16px', lineHeight: 1.8, color: 'var(--text-muted)' }}
          dangerouslySetInnerHTML={{ __html: post.content }}
        />

        <div style={{ marginTop: '60px', padding: '28px', background: 'var(--surface-1)', border: '1px solid rgba(212,175,55,0.2)', borderRadius: '20px', textAlign: 'center' }}>
          <p style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px' }}>Ready to find your people?</p>
          <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '20px' }}>Join Bestie and start making real connections today.</p>
          <Link href="/login" style={{ display: 'inline-block', padding: '12px 28px', borderRadius: '12px', fontSize: '14px', fontWeight: 700, background: 'linear-gradient(135deg, #D4AF37 0%, #B8960C 100%)', color: '#09090F', textDecoration: 'none' }}>
            Join Bestie Free →
          </Link>
        </div>
      </article>
    </div>
  )
}
