import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: "#080810",
        card: "#0F0F1E",
        card2: "#13132A",
        gold: "#D4AF37",
        "gold-dim": "#A08520",
        neon: "#39FF14",
        bestie: "#E8E0FF",
        muted: "#9B93C0",
        border: "rgba(212,175,55,0.15)",
      },
      fontFamily: {
        serif: ["DM Serif Display", "serif"],
        sans: ["Plus Jakarta Sans", "sans-serif"],
      },
      borderRadius: {
        bestie: "14px",
      },
      animation: {
        "pulse-dot": "pulse-dot 2s infinite",
        "fade-in": "fade-in 0.4s ease-out",
        "slide-up": "slide-up 0.4s ease-out",
      },
      keyframes: {
        "pulse-dot": {
          "0%, 100%": { opacity: "1", transform: "scale(1)" },
          "50%": { opacity: "0.5", transform: "scale(0.8)" },
        },
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "slide-up": {
          from: { opacity: "0", transform: "translateY(16px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
