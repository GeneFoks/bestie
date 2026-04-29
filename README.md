# BESTIE

Social passport app — bestiehere.com

## Tech Stack
- Next.js 14 (App Router)
- Supabase (DB + Auth)
- Tailwind CSS
- TypeScript

## Setup

### 1. Install dependencies
```bash
npm install
```

### 2. Create Supabase project
- Go to supabase.com → New project
- Copy Project URL and anon key

### 3. Set up environment variables
```bash
cp .env.local.example .env.local
# Fill in your Supabase URL and keys
```

### 4. Run database schema
- Open Supabase dashboard → SQL Editor
- Copy contents of `lib/schema.sql`
- Run it

### 5. Start development server
```bash
npm run dev
```

Open http://localhost:3000

## Deploy to Netlify

1. Push to GitHub
2. Connect repo in Netlify
3. Add environment variables in Netlify dashboard
4. Deploy

## Project Structure

```
bestie/
├── app/
│   ├── page.tsx              # Landing page
│   ├── layout.tsx            # Root layout
│   ├── globals.css           # Global styles
│   ├── auth/
│   │   ├── login/page.tsx
│   │   ├── signup/page.tsx
│   │   └── onboarding/page.tsx
│   ├── browse/page.tsx       # Browse Besties
│   ├── dashboard/page.tsx    # User dashboard
│   ├── messages/page.tsx     # Chat
│   ├── profile/page.tsx      # Edit profile
│   └── [username]/page.tsx   # Public profile
├── components/
│   ├── cards/ProviderCard.tsx
│   ├── modals/MatchModal.tsx
│   └── layout/Nav.tsx
├── lib/
│   ├── supabase.ts
│   └── schema.sql
└── types/index.ts
```

## Brand

| Color | Hex |
|-------|-----|
| Background | #080810 |
| Card | #0F0F1E |
| Gold (CTA) | #D4AF37 |
| Neon (verified) | #39FF14 |
| Text | #E8E0FF |
| Muted | #9B93C0 |

Founder: Gennadii Fokin
Instagram: @join.bestie | Twitter: @joinbestie
