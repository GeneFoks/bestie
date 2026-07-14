import { NextRequest, NextResponse } from 'next/server'
import { rateLimit } from '@/lib/rateLimit'

// Best-effort Open Graph / metadata scraper for wishlist gift links.
// Works for most stores (Amazon, Etsy, etc.) by reading og:* / twitter:* /
// price meta tags. Returns whatever it can find; the client falls back to a
// manual title if the fetch is blocked or empty.

function pick(html: string, patterns: RegExp[]): string | null {
  for (const re of patterns) {
    const m = html.match(re)
    if (m && m[1]) return m[1].trim()
  }
  return null
}

function decode(s: string | null): string | null {
  if (!s) return s
  return s
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .trim()
}

export async function POST(req: NextRequest) {
  const limited = rateLimit(req, 'link-preview', { limit: 20, windowMs: 60_000 })
  if (limited) return limited

  try {
    const { url } = await req.json()
    if (!url || typeof url !== 'string' || !/^https?:\/\//i.test(url)) {
      return NextResponse.json({ error: 'Invalid url' }, { status: 400 })
    }

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 8000)

    let html = ''
    try {
      const res = await fetch(url, {
        signal: controller.signal,
        headers: {
          // A real-browser UA gets far fewer bot blocks than the default.
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml',
          'Accept-Language': 'en-US,en;q=0.9',
        },
      })
      html = await res.text()
    } finally {
      clearTimeout(timeout)
    }

    // Only scan the <head>-ish top of the doc; keeps big product pages cheap.
    const head = html.slice(0, 200_000)

    const title = decode(pick(head, [
      /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i,
      /<meta[^>]+name=["']twitter:title["'][^>]+content=["']([^"']+)["']/i,
      /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:title["']/i,
      /<title[^>]*>([^<]+)<\/title>/i,
    ]))

    const image = decode(pick(head, [
      /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i,
      /<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i,
      /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i,
      /<link[^>]+rel=["']image_src["'][^>]+href=["']([^"']+)["']/i,
    ]))

    const price = decode(pick(head, [
      /<meta[^>]+property=["']product:price:amount["'][^>]+content=["']([^"']+)["']/i,
      /<meta[^>]+property=["']og:price:amount["'][^>]+content=["']([^"']+)["']/i,
      /<meta[^>]+itemprop=["']price["'][^>]+content=["']([^"']+)["']/i,
      /"price"\s*:\s*"?([0-9][0-9.,]*)"?/i,
    ]))

    return NextResponse.json({ title, image, price })
  } catch {
    // Blocked / timeout / parse error — let the client fall back to manual entry.
    return NextResponse.json({ title: null, image: null, price: null })
  }
}
