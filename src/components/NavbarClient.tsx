'use client'

import { useState, useEffect, useRef, startTransition } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'

interface NavbarClientProps {
  initialUser: User | null
}

const NAV_LINKS = [
  { href: '/',              label: 'Home'      },
  { href: '/theses',        label: 'Theses'    },
  { href: '/theses/upload', label: 'Upload'    },
  { href: '/bookmarks',     label: 'Bookmarks' },
]

export default function NavbarClient({ initialUser }: NavbarClientProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [user, setUser] = useState<User | null>(initialUser)
  const [menuOpen, setMenuOpen] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [signingOut, setSigningOut] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const supabase = createClient()
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  useEffect(() => { startTransition(() => setMenuOpen(false)) }, [pathname])

  async function handleSignOut() {
    setSigningOut(true)
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const displayName = user?.user_metadata?.full_name
    ?? user?.email?.split('@')[0]
    ?? 'User'

  const avatarUrl = user?.user_metadata?.avatar_url ?? null
  const initials = displayName.charAt(0).toUpperCase()

  const adminEmails = ['202380256@psu.palawan.edu.ph', 'lawsmagnet6@gmail.com']
  const isAdmin =
    (user?.email && adminEmails.includes(user.email.toLowerCase())) ||
    user?.app_metadata?.role === 'admin' ||
    user?.user_metadata?.role === 'admin'

  const menuItems = [
    ...(isAdmin ? [{ href: '/admin', label: 'Admin Dashboard', icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z' }] : []),
    { href: '/bookmarks', label: 'My Bookmarks', icon: 'M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z' },
    { href: '/profile', label: 'Profile', icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' },
    { href: '/theses/upload', label: 'Upload Thesis', icon: 'M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12' },
  ]

  return (
    <>
      {/* Desktop nav */}
      <nav className="hidden md:flex items-center gap-1">
        {NAV_LINKS.map(link => {
          const isActive = pathname === link.href
          return (
            <Link
              key={link.href}
              href={link.href}
              style={{
                padding: '0.4rem 1rem',
                borderRadius: '6px',
                fontSize: '0.875rem',
                fontWeight: isActive ? 600 : 500,
                letterSpacing: '0.01em',
                textDecoration: 'none',
                color: isActive ? '#A3C49B' : 'rgba(255,255,255,0.75)',
                background: isActive ? 'rgba(143,168,133,0.16)' : 'transparent',
                border: isActive ? '1px solid rgba(143,168,133,0.3)' : '1px solid transparent',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={e => {
                if (!isActive) {
                  (e.target as HTMLElement).style.color = '#fff'
                  ;(e.target as HTMLElement).style.background = 'rgba(255,255,255,0.08)'
                }
              }}
              onMouseLeave={e => {
                if (!isActive) {
                  (e.target as HTMLElement).style.color = 'rgba(255,255,255,0.75)'
                  ;(e.target as HTMLElement).style.background = 'transparent'
                }
              }}
            >
              {link.label}
            </Link>
          )
        })}

        {isAdmin && (
          <Link
            href="/admin"
            style={{
              padding: '0.4rem 0.9rem',
              borderRadius: '6px',
              fontSize: '0.8125rem',
              fontWeight: 700,
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              textDecoration: 'none',
              color: '#FDE047',
              background: 'rgba(234, 179, 8, 0.15)',
              border: '1px solid rgba(234, 179, 8, 0.4)',
              transition: 'all 0.15s ease',
              marginLeft: '0.25rem',
            }}
          >
            🛡️ Admin
          </Link>
        )}
      </nav>

      {/* Right side */}
      <div className="flex items-center gap-3">
        {user ? (
          <div className="relative" ref={dropdownRef}>
            <button
              id="user-menu-button"
              type="button"
              onClick={() => setDropdownOpen(prev => !prev)}
              aria-expanded={dropdownOpen}
              aria-haspopup="true"
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}
            >
              <span style={{
                width: 36, height: 36,
                borderRadius: '50%',
                overflow: 'hidden',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: '2px solid rgba(143,168,133,0.6)',
                flexShrink: 0,
              }}>
                {avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img className="h-full w-full object-cover" src={avatarUrl} alt={displayName} referrerPolicy="no-referrer" />
                ) : (
                  <span style={{
                    width: '100%', height: '100%',
                    background: 'linear-gradient(135deg, #2E6A47, #4A815B)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#fff', fontWeight: 700, fontSize: '0.875rem',
                  }}>
                    {initials}
                  </span>
                )}
              </span>
              <span style={{ color: 'rgba(255,255,255,0.85)', fontWeight: 500, fontSize: '0.875rem' }} className="hidden lg:block max-w-[120px] truncate">
                {displayName}
              </span>
              <svg style={{ color: 'rgba(255,255,255,0.4)' }} className="h-4 w-4 hidden lg:block" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>

            {dropdownOpen && (
              <div
                id="user-menu"
                role="menu"
                style={{
                  position: 'absolute', right: 0, top: 'calc(100% + 10px)',
                  width: 230,
                  background: '#fff',
                  borderRadius: 12,
                  boxShadow: '0 8px 32px -4px rgba(17,33,23,0.2), 0 0 0 1px rgba(0,0,0,0.06)',
                  padding: '4px 0',
                  zIndex: 50,
                }}
              >
                <div style={{ padding: '12px 16px', borderBottom: '1px solid #E5ECE6' }}>
                  <p style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#7C9283', marginBottom: 2 }}>Signed in as</p>
                  <p style={{ fontSize: '0.875rem', fontWeight: 600, color: '#112117', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{displayName}</p>
                  <p style={{ fontSize: '0.75rem', color: '#7C9283', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.email}</p>
                </div>

                {menuItems.map(item => (
                  <Link
                    key={item.href}
                    href={item.href}
                    role="menuitem"
                    onClick={() => setDropdownOpen(false)}
                    style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '10px 16px', fontSize: '0.875rem', color: '#112117', textDecoration: 'none', transition: 'background 0.12s' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#F3F6F3' }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
                  >
                    <svg style={{ flexShrink: 0, color: '#2E6A47' }} className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d={item.icon} />
                    </svg>
                    {item.label}
                  </Link>
                ))}

                <div style={{ borderTop: '1px solid #E5ECE6', marginTop: 4, paddingTop: 4 }}>
                  <button
                    role="menuitem"
                    onClick={handleSignOut}
                    disabled={signingOut}
                    style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '10px 16px', fontSize: '0.875rem', color: '#B91C1C', background: 'none', border: 'none', cursor: 'pointer', transition: 'background 0.12s', opacity: signingOut ? 0.5 : 1 }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#FEF2F2' }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
                  >
                    {signingOut ? (
                      <span className="spinner h-4 w-4" />
                    ) : (
                      <svg style={{ flexShrink: 0 }} className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                    )}
                    Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <Link href="/login" style={{
            padding: '0.5rem 1.25rem',
            borderRadius: '6px',
            fontSize: '0.875rem',
            fontWeight: 600,
            color: '#0D2418',
            background: 'linear-gradient(135deg, #8FA885, #A3C49B)',
            textDecoration: 'none',
            boxShadow: '0 2px 8px rgba(46,106,71,0.35)',
            transition: 'all 0.2s ease',
          }}>
            Sign In
          </Link>
        )}

        {/* Mobile hamburger */}
        <button
          id="mobile-menu-button"
          type="button"
          onClick={() => setMenuOpen(prev => !prev)}
          aria-expanded={menuOpen}
          aria-label="Toggle navigation menu"
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 8, borderRadius: 8, border: 'none', cursor: 'pointer', background: 'rgba(255,255,255,0.08)', color: '#fff' }}
          className="md:hidden"
        >
          {menuOpen ? (
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>
      </div>

      {/* Mobile drawer */}
      {menuOpen && (
        <div
          id="mobile-menu"
          className="md:hidden"
          style={{
            position: 'absolute', top: '100%', left: 0, right: 0,
            background: '#11241A',
            borderTop: '1px solid rgba(143,168,133,0.2)',
            borderBottom: '1px solid rgba(143,168,133,0.15)',
            boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
            padding: '8px 0',
            zIndex: 40,
          }}
        >
          {NAV_LINKS.map(link => {
            const isActive = pathname === link.href
            return (
              <Link
                key={link.href}
                href={link.href}
                style={{
                  display: 'block', padding: '12px 24px',
                  fontSize: '0.9375rem', fontWeight: isActive ? 600 : 500,
                  color: isActive ? '#A3C49B' : 'rgba(255,255,255,0.8)',
                  textDecoration: 'none',
                  background: isActive ? 'rgba(143,168,133,0.12)' : 'transparent',
                  borderLeft: isActive ? '3px solid #8FA885' : '3px solid transparent',
                  transition: 'all 0.15s',
                }}
              >
                {link.label}
              </Link>
            )
          })}
          {isAdmin && (
            <Link
              href="/admin"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '12px 24px',
                fontSize: '0.9375rem',
                fontWeight: 600,
                color: '#FDE047',
                textDecoration: 'none',
                background: 'rgba(234, 179, 8, 0.1)',
                borderLeft: '3px solid #EAB308',
              }}
            >
              <span>🛡️ Admin Dashboard</span>
            </Link>
          )}
          {user && (
            <>
              <Link href="/profile" style={{ display: 'block', padding: '12px 24px', fontSize: '0.9375rem', color: 'rgba(255,255,255,0.8)', textDecoration: 'none', borderLeft: '3px solid transparent' }}>
                Profile
              </Link>
              <button
                onClick={handleSignOut}
                disabled={signingOut}
                style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '12px 24px', fontSize: '0.9375rem', fontWeight: 500, color: '#FCA5A5', background: 'none', border: 'none', cursor: 'pointer', borderLeft: '3px solid transparent' }}
              >
                {signingOut ? <span className="spinner h-4 w-4" /> : null}
                Sign Out
              </button>
            </>
          )}
        </div>
      )}
    </>
  )
}
