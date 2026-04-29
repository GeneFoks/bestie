import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        bg: '#080810',
        card: '#0F0F1E',
        gold: '#D4AF37',
        neon: '#39FF14',
        'text-primary': '#E8E0FF',
        muted: '#9B93C0',
      },
      fontFamily: {
        serif: ['DM Serif Display', 'serif'],
        sans: ['Plus Jakarta Sans', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

export default config
