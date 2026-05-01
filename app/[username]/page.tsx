// @ts-nocheck
export const revalidate = 0
import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

const SPARK_TYPES = [
  { id: 'kind', emoji: '💛', label: 'Kind' },
  { id: 'fun', emoji: '🎉', label: 'Fun' },
  { id: 'reliable', emoji: '🔒', label: 'Reliable' },
  { id: 'genuine', emoji: '💎', label: 'Genuine' },
  { id: 'safe', emoji: '🛡️', label: 'Safe' },
  { id: 'energetic', emoji: '⚡', label: 'Energetic' },
  { id: 'good_listener', emoji: '👂', label: 'Good listener' },
  { id: 'social', emoji: '🌟', label: 'Social' },
  { id: 'punctual', emoji: '⏰', label: 'Punctual' },
  { id: 'open', emoji: '🌊', label: 'Open' },
]

const ACTIVITY_EMOJI = {
  meet_irl: '🤝', dance_crew: '💃', trail_crew: '🥾', travel_buddy: '✈️',
  game_night: '🎮', watch_together: '🎬', vibe_call: '📱', deep_chat: '🫂',
  real_talk: '💬', festival_crew: '🎪', epic_journey: '🌍', fishing_crew: '🎣',
}

function getMemberBadge(createdAt) {
  if (!createdAt) return null
  const months = Math.floor((Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24 * 30))
  if (months >= 24) return { emoji: '👑', label: 'OG Bestie', color: '#D4AF37', desc: '2+ years' }
  if (months >= 12) return { emoji: '💎', label: 'Legend', color: '#39FF14', desc: '1+ year' }
  if (months >= 6) return { emoji: '🔥', label: 'Veteran', color: '#FF6B35', desc: '6+ months' }
  if (months >= 3) return { emoji: '⭐', label: 'Regular', color: '#9B93C0', desc: '3+ months' }
  if (months >= 1) return { emoji: '🌱', label: 'New Bestie', color: '#9B93C0', desc: '1+ month' }
  return { emoji: '✨', label: 'Just joined', color: '#9B93C0', desc: 'New here' }
}

export async function generateMetadata({ params }) {
  const { data: profile } = await supabase
    .from('users').select('*').eq('username', params.username).single()
  if (!profile) return { title: 'Bestie' }
  return {
    title: `${profile.full_name} — BS ${profile.bestie_score || 0} · Bestie`,
    description: `${profile.bio || 'Check my Social Passport on Bestie.'} · Bestie Score: ${profile.bestie_score || 0}`,
    openGraph: {
      title: `${profile.full_name} — Bestie Score ${profile.bestie_score || 0}`,
      description: profile.bio || 'Check my Social Passport on Bestie.',
      images: profile.avatar_url ? [{ url: profile.avatar_url, width: 400, height: 400 }] : [],
      url: `https://bestiehere.com/${profile.username}`,
    },
    twitter: {
      card: 'summary',
      title: `${profile.full_name} — BS ${profile.bestie_score || 0}`,
      description: profile.bio || 'Check my Social Passport on Bestie.',
      images: profile.avatar_url ? [profile.avatar_url] : [],
    },
  }
}

export default async function ProfilePage({ params }) {
  const { data: profile } = await supabase
    .from('users').select('*, activity_packages(*)')
    .eq('username', params.username).single()

  if (!profile) {
    return (
      <div style={{ minHeight: '100vh', background: '#080810', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: '48px', marginBottom: '16px' }}>🔍</p>
          <h1 style={{ fontFamily: 'DM Serif Display, serif', fontSize: '28px', color: '#E8E0FF', marginBottom: '8px' }}>Profile not found</h1>
          <p style={{ fontSize: '14px', color: '#9B93C0', marginBottom: '24px' }}>@{params.username} doesn't exist yet</p>
          <Link href="/browse" style={{ padding: '10px 24px', borderRadius: '12px', fontSize: '14px', fontWeight: 600, background: 'linear-gradient(135deg, #D4AF37 0%, #B8960C 100%)', color: '#080810', textDecoration: 'none' }}>Browse Besties</Link>
        </div>
      </div>
    )
  }

  const { data: sparks } = await supabase.from('sparks').select('spark_type').eq('receiver_id', profile.id)
  const sparkCounts = {}
  sparks?.forEach(s => { sparkCounts[s.spark_type] = (sparkCounts[s.spark_type] || 0) + 1 })
  const totalSparks = sparks?.length || 0
  const topSparks = SPARK_TYPES
    .map(s => ({ ...s, count: sparkCounts[s.id] || 0 }))
    .filter(s => s.count > 0)
    .sort((a, b) => b.count - a.count)

  const score = profile.bestie_score || 0
  const scoreColor = score >= 800 ? '#39FF14' : score >= 600 ? '#D4AF37' : '#9B93C0'
  const scoreLabel = score >= 800 ? 'Excellent' : score >= 600 ? 'Good' : score >= 400 ? 'Fair' : 'New'
  const initials = profile.full_name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?'
  const memberBadge = getMemberBadge(profile.created_at)
  const memberSince = profile.created_at ? new Date(profile.created_at).toLocaleDateString('en-US', { month: 'long'
