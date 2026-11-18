// @ts-nocheck
'use client'

// fetch helper for /api/tower/app/*. Sends the raw Telegram initData in the
// X-Tg-Init-Data header on every call (the server verifies it against the bot
// token). Always resolves to a JSON body { ok, … } — never throws. initData is
// never put in a URL and never logged.

export const TEXT = {
  generic: '⚠️ Не получилось — попробуй ещё раз.',
  network: 'Нет связи — проверь интернет и попробуй ещё раз.',
  rate: 'Слишком много запросов — подожди минутку.',
  auth: 'Сессия устарела. Закрой приложение и открой снова.',
  schema: 'Приложение обновляется — загляни через пару минут.',
}

const BASE = '/api/tower/app/'
const TIMEOUT_MS = 20000

// initData: the string itself or a getter (the root fills it after boot).
// onAuth: called on any code:'auth' answer (the app shows «Сессия устарела»).
export function createApi(initData, onAuth = null) {
  const getInit = typeof initData === 'function' ? initData : () => initData

  async function call(method, path, params, body) {
    let url = BASE + path
    if (params) {
      const q = new URLSearchParams()
      Object.keys(params).forEach((k) => {
        const v = params[k]
        if (v !== undefined && v !== null && v !== '') q.set(k, String(v))
      })
      const qs = q.toString()
      if (qs) url += '?' + qs
    }
    const headers = { 'X-Tg-Init-Data': String(getInit() || '') }
    if (body) headers['Content-Type'] = 'application/json'
    const ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null
    const timer = ctrl ? setTimeout(() => ctrl.abort(), TIMEOUT_MS) : null
    let res = null
    try {
      res = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
        cache: 'no-store',
        signal: ctrl ? ctrl.signal : undefined,
      })
    } catch {
      if (timer) clearTimeout(timer)
      return { ok: false, code: 'network', error: TEXT.network }
    }
    if (timer) clearTimeout(timer)
    let data = null
    try { data = await res.json() } catch {}
    let out
    if (data && typeof data === 'object' && typeof data.ok === 'boolean') {
      out = data
      if (!out.ok) {
        if (!out.code) out.code = res.status === 401 ? 'auth' : res.status === 429 ? 'rate' : 'error'
        if (!out.error) out.error = TEXT[out.code] || TEXT.generic
      }
    } else if (res.status === 401) out = { ok: false, code: 'auth', error: TEXT.auth }
    else if (res.status === 429) out = { ok: false, code: 'rate', error: TEXT.rate }
    else out = { ok: false, code: 'error', error: TEXT.generic }
    if (!out.ok && out.code === 'auth' && onAuth) {
      try { onAuth() } catch {}
    }
    return out
  }

  return {
    get: (path, params = null) => call('GET', path, params, null),
    post: (path, body = {}) => call('POST', path, null, body || {}),
  }
}
