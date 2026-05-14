export function getFrameColor(sessions: number): string {
  if (sessions >= 25) return '#FFFFFF'
  if (sessions >= 10) return '#D4AF37'
  if (sessions >= 5)  return '#9B8FFF'
  if (sessions >= 1)  return 'rgba(155,147,192,0.55)'
  return 'rgba(255,255,255,0.08)'
}

export function getAvatarFrame(sessions: number): React.CSSProperties {
  if (sessions >= 25) return { border: '2.5px solid rgba(255,255,255,0.95)', boxShadow: '0 0 18px rgba(255,255,255,0.35)' }
  if (sessions >= 10) return { border: '2px solid rgba(212,175,55,0.9)' }
  if (sessions >= 5)  return { border: '2px solid rgba(155,143,255,0.75)' }
  if (sessions >= 1)  return { border: '2px solid rgba(155,147,192,0.45)' }
  return { border: '2px solid rgba(255,255,255,0.08)' }
}
