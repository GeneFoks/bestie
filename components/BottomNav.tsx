'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function BottomNav() {
  const path = usePathname()

  const links = [
    { href: '/', icon: '🏠', label: 'Home' },
    { href: '/browse', icon: '🔍', label: 'Browse' },
    { href: '/crews', icon: '⚔️', label: 'Crews' },
    { href: '/messages', icon: '💬', label: 'Messages' },
    { href: '/dashboard', icon: '👤', label: 'Profile' },
  ]

  return (
    <nav className="bottom-nav">
      {links.map(link => (
        <Link
          key={link.href}
          href={link.href}
          className={path === link.href ? 'active' : ''}
          style={{ color: path === link.href ? '#D4AF37' : '#9B93C0' }}
        >
          <span className="nav-icon">{link.icon}</span>
          {link.label}
        </Link>
      ))}
    </nav>
  )
}
