// @ts-nocheck
import React from 'react'
import {
  Heart, PartyPopper, ShieldCheck, Gem, Shield, Zap, Ear, Star, Clock,
  Waves, Target, Lightbulb, Flame, Sprout, Palette, Sparkles, Handshake,
  MessageCircle, Flower2, Globe2, GraduationCap, Rocket,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

// One icon per spark type — replaces the emoji zoo with a consistent,
// gold-tinted lucide set that matches the badge/crest language.
export const SPARK_ICONS: Record<string, LucideIcon> = {
  kind:          Heart,
  fun:           PartyPopper,
  reliable:      ShieldCheck,
  genuine:       Gem,
  safe:          Shield,
  energetic:     Zap,
  good_listener: Ear,
  social:        Star,
  punctual:      Clock,
  open:          Waves,
  focused:       Target,
  insightful:    Lightbulb,
  motivating:    Rocket,
  supportive:    Sprout,
  creative:      Palette,
  inspiring:     Flame,
  professional:  Handshake,
  articulate:    MessageCircle,
  calming:       Flower2,
  high_energy:   Zap,
  worldly:       Globe2,
  knowledgeable: GraduationCap,
}

export function SparkIcon({
  type,
  size = 13,
  color = '#D4AF37',
  strokeWidth = 2,
}: {
  type: string
  size?: number
  color?: string
  strokeWidth?: number
}) {
  const Icon = SPARK_ICONS[type] || Sparkles
  return <Icon size={size} color={color} strokeWidth={strokeWidth} style={{ flexShrink: 0 }} />
}
