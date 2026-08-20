import React from 'react'
import {
  // Active & outdoors
  Mountain, Footprints, Bike, Dumbbell, Waves, Snowflake, Activity,
  // Fun & social
  Gamepad2, Film, Music2, Mic2, PartyPopper, Plane, Glasses, Laugh,
  Beer, Tv, Trophy as TrophyIcon, Fish, Tent, MapPinned,
  // Mind / talk
  Brain, MessagesSquare, BookOpen, GraduationCap, Briefcase, DollarSign,
  Notebook, Globe2, Speech, Target as TargetIcon, Compass,
  // Creative
  ChefHat, Palette, Music, Camera, Drama, PenTool, ImagePlus,
  // Spiritual
  Sparkles as SparklesIcon, Wind, Moon, Bell as BellIcon, Sun, Heart as HeartIcon,
  // Chill
  Coffee, Laptop, PhoneOff as PhoneOffIcon, Bath, Cigarette, Star as StarIcon,
  // Support / emotional
  MessageCircle, Flame, Hand, HandHeart, Shield, MoonStar,
  // Generic / fallback
  Users, UserCheck, Phone, Smartphone, Handshake, Sparkles,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

// Centralised activity → Lucide icon mapping.
// Edit this map whenever a new activity type is added in the database/schema.
export const ACTIVITY_ICONS: Record<string, LucideIcon> = {
  // Active & outdoors
  hiking:           Footprints,
  running:          Activity,
  gym_partner:      Dumbbell,
  cycling:          Bike,
  swimming:         Waves,
  cold_plunge:      Snowflake,
  yoga:             Sun,
  martial_arts:     Shield,
  climbing:         Mountain,
  pickleball:       Activity,
  trail_crew:       Footprints,
  fishing_crew:     Fish,

  // Fun & social
  game_night:       Gamepad2,
  movie_night:      Film,
  night_out:        Glasses,
  bar_hopping:      Beer,
  karaoke:          Mic2,
  festival_crew:    Tent,
  burning_man:      Flame,
  travel_buddy:     Plane,
  wing_person:      Glasses,
  comedy_show:      Laugh,
  dance_crew:       Music,
  epic_journey:     MapPinned,
  watch_together:   Tv,

  // Mind & growth
  deep_chat:        MessagesSquare,
  debate_club:      Speech,
  book_club:        BookOpen,
  language_exchange: Globe2,
  life_coaching:    Compass,
  career_talk:      Briefcase,
  money_talk:       DollarSign,
  journaling:       Notebook,
  accountability_partner: TargetIcon,
  storytelling_night: Drama,

  // Creative & skills
  music_lesson:     Music2,
  art_together:     Palette,
  photography_walk: Camera,
  cooking_together: ChefHat,
  dance:            Music,
  improv_acting:    Drama,
  writing_club:     PenTool,

  // Spiritual & sacred
  meditation_circle: SparklesIcon,
  breathwork:       Wind,
  cacao_ceremony:   HeartIcon,
  sound_healing:    BellIcon,
  girls_circle:     HeartIcon,
  mens_circle:      Flame,
  tarot:            MoonStar,
  retreat_buddy:    Tent,
  psychedelic_integration: Brain,
  nature_ritual:    Sun,
  lucid_dream_club: Moon,

  // Chill & everyday
  coffee_chat:      Coffee,
  coworking:        Laptop,
  digital_detox_walk: PhoneOffIcon,
  skincare_night:   Bath,
  smoke_buddy:      Cigarette,
  astrology_session: StarIcon,
  errand_buddy:     Hand,
  walk_meet:        Footprints,

  // Emotional & support
  vent_session:     MessageCircle,
  '3am_talk':       Moon,
  hype_person:      Flame,
  sobriety_buddy:   Shield,
  silence_buddy:    PhoneOffIcon,
  grief_support:    HandHeart,
  ugly_cry_buddy:   HeartIcon,

  // Connection / misc
  meet_irl:         Handshake,
  real_talk:        MessageCircle,
  vibe_call:        Smartphone,
}

const FALLBACK: LucideIcon = Sparkles

type ActivityIconProps = {
  type?: string | null
  size?: number
  color?: string
  strokeWidth?: number
  className?: string
}

/**
 * Renders the Lucide icon for an activity type.
 * Falls back to <Sparkles /> for unknown types.
 */
export function ActivityIcon({
  type,
  size = 18,
  color = 'currentColor',
  strokeWidth = 1.8,
  className,
}: ActivityIconProps) {
  const Icon = (type && ACTIVITY_ICONS[type]) || FALLBACK
  return <Icon size={size} color={color} strokeWidth={strokeWidth} {...(className ? { className } as any : {})} />
}

/**
 * Returns the icon component class for an activity type (without rendering).
 * Useful when you need to render the icon yourself with custom props.
 */
export function getActivityIcon(type?: string | null): LucideIcon {
  return (type && ACTIVITY_ICONS[type]) || FALLBACK
}
