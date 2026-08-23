'use client'

import { useState } from 'react'
import { MapPin, Users, Sparkles } from 'lucide-react'
import { getFrameColor } from '@/lib/avatarFrame'
import { ActivityIcon } from '@/lib/activityIcons'
import KnockButton from '@/components/KnockButton'
import { ButtonLink } from '@/components/ui/Button'
import { colors } from '@/lib/tokens'

interface ActivityPackage {
  title: string
  activity_type: string
  price_per_session?: number
  is_free?: boolean
}

interface TopSpark {
  id: string
  emoji: string
  label: string
  count: number
}

interface Provider {
  id: string
  username: string
  full_name: string
  avatar_url?: string
  city?: string
  country?: string
  bio?: string
  bestie_score?: number
  is_verified?: boolean
  avg_rating?: number
  average_rating?: number
  rating_count?: number
  total_sessions?: number
  sparks_received?: number
  top_sparks?: TopSpark[]
  activity_packages?: ActivityPackage[]
}

interface ProviderCardProps {
  provider: Provider
  featured?: boolean
}

export default function ProviderCard({ provider, featured = false }: ProviderCardProps) {
  const [imgError, setImgError] = useState(false)
  const mainPackage = provider.activity_packages?.[0]
  // Distinct activities this person offers — shown as chips so their breadth is
  // visible in the feed without opening the profile.
  const activityTypes = Array.from(new Set((provider.activity_packages || []).map((p: any) => p.activity_type))).slice(0, 4)
  const extraActivities = (provider.activity_packages?.length || 0) - activityTypes.length
  const score = provider.bestie_score || 0
  const scoreColor = score >= 800 ? colors.green : score >= 600 ? '#D4AF37' : colors.textMuted
  const initials = provider.full_name?.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2) || '??'
  const totalSessions = provider.total_sessions ?? 0
  const sparksReceived = provider.sparks_received ?? 0
  const frameColor = getFrameColor(totalSessions)
  const frameGlow = totalSessions >= 25
    ? `0 0 0 1.5px rgba(255,255,255,0.3), 0 8px 32px rgba(255,255,255,0.08)`
    : totalSessions >= 10
    ? `0 0 0 1px rgba(212,175,55,0.35)`
    : totalSessions >= 5
    ? `0 0 0 1px rgba(155,143,255,0.25)`
    : '0 4px 24px rgba(0,0,0,0.4)'

  return (
    <div
      className="group relative rounded-2xl overflow-hidden transition-all duration-300 hover:-translate-y-1"
      style={{
        background: '#0F0F1E',
        boxShadow: featured
          ? '0 0 0 1px rgba(212,175,55,0.25), 0 20px 60px rgba(0,0,0,0.5)'
          : frameGlow,
      }}
    >
      {totalSessions >= 1 && (
        <div style={{ height: '3px', background: frameColor, opacity: totalSessions >= 25 ? 1 : 0.7 }} />
      )}
      <div className="relative w-full overflow-hidden" style={{ height: '280px' }}>
        {provider.avatar_url && !imgError ? (
          <img
            src={provider.avatar_url}
            alt={provider.full_name}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            onError={() => setImgError(true)}
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center text-5xl font-bold"
            style={{ background: 'linear-gradient(135deg, #1a1a35 0%, #0F0F1E 100%)', color: '#D4AF37', fontFamily: 'DM Serif Display, serif' }}
          >
            {initials}
          </div>
        )}

        <div className="absolute inset-0 pointer-events-none" style={{ background: 'linear-gradient(to top, rgba(15,15,30,1) 0%, rgba(15,15,30,0.5) 45%, transparent 100%)' }} />

        <div className="absolute top-3 left-3 right-3 flex justify-between items-start">
          {mainPackage && (
            <span className="text-xs px-2.5 py-1 rounded-full font-medium" style={{ background: 'rgba(8,8,16,0.75)', backdropFilter: 'blur(8px)', color: colors.textPrimary, border: '1px solid rgba(232,224,255,0.12)', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <ActivityIcon type={mainPackage.activity_type} size={12} color="#D4AF37" strokeWidth={1.8} /> {mainPackage.activity_type.replace(/_/g, ' ')}
            </span>
          )}
          {provider.is_verified && (
            <span className="text-xs px-2.5 py-1 rounded-full font-semibold ml-auto" style={{ background: 'rgba(212,175,55,0.15)', backdropFilter: 'blur(8px)', color: '#D4AF37', border: '1px solid rgba(212,175,55,0.3)' }}>
              ✓ Verified
            </span>
          )}
        </div>

        <div className="absolute bottom-0 left-0 right-0 px-4 pb-3 pt-6">
          <div className="flex items-end justify-between">
            <div>
              <h3 className="text-base font-semibold leading-tight" style={{ color: colors.textPrimary, fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                {provider.full_name}
              </h3>
              {provider.city && (
                <p className="text-xs mt-0.5" style={{ color: colors.textMuted, display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  <MapPin size={11} strokeWidth={2} /> {provider.city}{provider.country ? `, ${provider.country}` : ''}
                </p>
              )}
            </div>
            {score > 0 && (
              <div className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold flex-shrink-0" style={{ background: 'rgba(8,8,16,0.8)', border: `1px solid ${scoreColor}35`, color: scoreColor }}>
                <span style={{ fontSize: '9px', opacity: 0.8 }}>BS</span>
                <span>{score}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="px-4 pb-4 pt-3 space-y-3">
        {/* Stats row: BS · met · sparks · rating */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '11px', fontWeight: 700, color: scoreColor }}>BS {score}</span>
          {totalSessions > 0 && (
            <span style={{ fontSize: '11px', color: colors.textMuted, display: 'inline-flex', alignItems: 'center', gap: '6px' }}>· <Users size={11} strokeWidth={2} /> {totalSessions} met</span>
          )}
          {sparksReceived > 0 && (
            <span style={{ fontSize: '11px', color: colors.textMuted, display: 'inline-flex', alignItems: 'center', gap: '6px' }}>· <Sparkles size={11} strokeWidth={2} /> {sparksReceived}</span>
          )}
          {(() => {
            const rating = provider.avg_rating ?? provider.average_rating ?? 0
            const count = provider.rating_count ?? 0
            return rating > 0 ? (
              <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                <span style={{ fontSize: '10px', color: '#D4AF37' }}>★</span>
                <span style={{ fontSize: '11px', color: colors.textMuted }}>
                  {Number(rating).toFixed(1)}
                  {count > 0 && <span style={{ color: 'rgba(155,147,192,0.6)' }}> ({count})</span>}
                </span>
              </span>
            ) : null
          })()}
        </div>

        {provider.bio && (
          <p className="text-xs leading-relaxed line-clamp-2" style={{ color: colors.textMuted, fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
            {provider.bio}
          </p>
        )}

        {/* Open to — activity chips so people see what they offer up-front */}
        {activityTypes.length >= 2 && (
          <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', alignItems: 'center' }}>
            {activityTypes.map((t: string) => (
              <span key={t} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '3px 9px', borderRadius: '999px', fontSize: '10px', fontWeight: 600, background: 'rgba(155,127,255,0.10)', border: '1px solid rgba(155,127,255,0.22)', color: '#B7A6FF', whiteSpace: 'nowrap' }}>
                <ActivityIcon type={t} size={11} color="#B7A6FF" strokeWidth={1.8} /> {t.replace(/_/g, ' ')}
              </span>
            ))}
            {extraActivities > 0 && (
              <span style={{ fontSize: '10px', color: colors.textMuted }}>+{extraActivities} more</span>
            )}
          </div>
        )}

        {/* Spark tags with counts */}
        {provider.top_sparks && provider.top_sparks.length > 0 && (
          <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
            {provider.top_sparks.map(s => (
              <span key={s.id} style={{ display: 'flex', alignItems: 'center', gap: '3px', padding: '3px 9px', borderRadius: '999px', fontSize: '10px', fontWeight: 600, background: 'rgba(212,175,55,0.08)', border: '1px solid rgba(212,175,55,0.18)', color: '#D4AF37', whiteSpace: 'nowrap' }}>
                {s.emoji} {s.label} <span style={{ opacity: 0.7, fontWeight: 500 }}>{s.count}</span>
              </span>
            ))}
          </div>
        )}

        {mainPackage && (
          <div className="flex items-center justify-between py-2.5 px-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <p className="text-xs font-medium truncate pr-2" style={{ color: colors.textPrimary }}>{mainPackage.title}</p>
            {mainPackage.is_free ? (
              <span className="text-xs font-bold flex-shrink-0" style={{ color: colors.green }}>Free</span>
            ) : mainPackage.price_per_session ? (
              <span className="text-xs flex-shrink-0" style={{ color: colors.textPrimary }}>
                <strong>${mainPackage.price_per_session}</strong>
                <span style={{ color: colors.textMuted }}>/session</span>
              </span>
            ) : null}
          </div>
        )}

        <div style={{ display: 'flex', gap: '6px' }}>
          <div style={{ flex: 1.5, display: 'flex' }}>
            <KnockButton profileId={provider.id} profileUsername={provider.username} variant="card" />
          </div>
          <ButtonLink href={`/${provider.username}`} variant="ghost" size="sm" style={{ flex: 1 }}>
            View →
          </ButtonLink>
        </div>
      </div>
    </div>
  )
}
