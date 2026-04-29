# BESTIE

Social passport app — bestiehere.com

## Stack
- Next.js 14 (App Router)
- Supabase (DB + Auth)
- Tailwind CSS
- Netlify hosting

## Deploy to Netlify

1. Push this folder to GitHub (GeneFoks/bestie repo)
2. In Netlify → Site settings → Environment variables, add:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```
3. Netlify will auto-build and deploy

## Local dev
```bash
npm install
npm run dev
```

## Pages
- `/` — Landing page
- `/browse` — Browse Besties
- `/login` — Login
- `/signup` — Sign up
- `/dashboard` — User dashboard (requires Supabase)
- `/[username]` — Public profile

## Colors
- Background: #080810
- Cards: #0F0F1E
- Gold: #D4AF37
- Neon: #39FF14
- Text: #E8E0FF
- Muted: #9B93C0
