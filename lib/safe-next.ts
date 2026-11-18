// ?next= / localStorage bestie_next — only paths on this site are followed.
// Browsers drop tabs and newlines from URLs ('/\t/evil.com' → '//evil.com'),
// and '/\' reads like '//', so control characters and backslashes are refused
// outright, then the result must resolve to our own origin.
// → a clean '/path?query#hash', or null.
export function safeNext(v: unknown): string | null {
  if (typeof v !== 'string' || v.length > 2048) return null
  if (!v.startsWith('/') || v.startsWith('//') || /[\\\u0000-\u001f\u007f]/.test(v)) return null
  if (typeof window === 'undefined') return null
  try {
    const u = new URL(v, window.location.origin)
    return u.origin === window.location.origin ? u.pathname + u.search + u.hash : null
  } catch {
    return null
  }
}
