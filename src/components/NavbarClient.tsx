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
  { href: '/',              label: 'Home'    },
  { href: '/theses',        label: 'Theses'  },
  { href: '/theses/upload', label: 'Upload'  },
]

export default function NavbarClient({ initialUser }: NavbarClientProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [user, setUser] = useState<User | null>(initialUser)
  const [menuOpen, setMenuOpen] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [signingOut, setSigningOut] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Keep auth state fresh on client
  useEffect(() => {
    const supabase = createClient()
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })
    return () => subscription.unsubscribe()
  }, [])

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  // Close mobile menu on navigation (startTransition avoids set-state-in-effect lint)
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

  return (
    <>
      {/* Desktop nav links */}
      <nav className="hidden md:flex items-center gap-1">
        {NAV_LINKS.map(link => (
          <Link
            key={link.href}
            href={link.href}
            className={`nav-link ${pathname === link.href ? 'active' : ''}`}
          >
            {link.label}
          </Link>
        ))}
      </nav>

      {/* Right side: user menu or sign in */}
      <div className="flex items-center gap-3">
        {user ? (
          <div className="relative" ref={dropdownRef}>
            <button
              id="user-menu-button"
              type="button"
              onClick={() => setDropdownOpen(prev => !prev)}
              aria-expanded={dropdownOpen}
              aria-haspopup="true"
              className="flex items-center gap-2 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 transition-all"
            >
              {/* Avatar */}
              <span className="h-9 w-9 rounded-full ring-2 ring-transparent hover:ring-sky-200 transition-all overflow-hidden flex-shrink-0 flex items-center justify-center">
                {avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    className="h-full w-full object-cover"
                    src={avatarUrl}
                    alt={displayName}
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <span className="h-full w-full bg-gradient-to-br from-sky-100 to-sky-200 flex items-center justify-center text-sky-700 font-bold text-sm">
                    {initials}
                  </span>
                )}
              </span>
              <span className="text-slate-700 font-medium text-sm hidden lg:block max-w-[120px] truncate">
                {displayName}
              </span>
              <svg
                className="h-4 w-4 text-slate-400 hidden lg:block"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                aria-hidden="true"
              >
                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>

            {/* Dropdown */}
            {dropdownOpen && (
              <div
                id="user-menu"
                role="menu"
                className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg ring-1 ring-slate-900/5 py-1 z-50 animate-in fade-in slide-in-from-top-2 duration-150"
              >
                {/* User info header */}
                <div className="px-4 py-3 border-b border-slate-100">
                  <p className="text-xs text-slate-400 uppercase font-semibold tracking-wide">Signed in as</p>
                  <p className="text-sm font-medium text-slate-800 truncate mt-0.5">{displayName}</p>
                  <p className="text-xs text-slate-400 truncate">{user.email}</p>
                </div>

                <Link
                  href="/profile"
                  role="menuitem"
                  onClick={() => setDropdownOpen(false)}
                  className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 hover:text-sky-600 transition-colors"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  Profile
                </Link>

                <Link
                  href="/theses/upload"
                  role="menuitem"
                  onClick={() => setDropdownOpen(false)}
                  className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 hover:text-sky-600 transition-colors"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                  Upload Thesis
                </Link>

                <div className="border-t border-slate-100 mt-1 pt-1">
                  <button
                    role="menuitem"
                    onClick={handleSignOut}
                    disabled={signingOut}
                    className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                  >
                    {signingOut ? (
                      <span className="spinner h-4 w-4" />
                    ) : (
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                    )}
                    Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <Link href="/login" className="btn btn-primary btn-sm">
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
          className="md:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors"
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

      {/* Mobile menu drawer */}
      {menuOpen && (
        <div
          id="mobile-menu"
          className="md:hidden absolute top-full left-0 right-0 bg-white border-b border-slate-200 shadow-lg z-40 py-2"
        >
          {NAV_LINKS.map(link => (
            <Link
              key={link.href}
              href={link.href}
              className={`block px-4 py-3 text-sm font-medium transition-colors ${
                pathname === link.href
                  ? 'text-sky-600 bg-sky-50'
                  : 'text-slate-700 hover:bg-slate-50 hover:text-sky-600'
              }`}
            >
              {link.label}
            </Link>
          ))}
          {user && (
            <>
              <Link
                href="/profile"
                className="block px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 hover:text-sky-600 transition-colors"
              >
                Profile
              </Link>
              <button
                onClick={handleSignOut}
                disabled={signingOut}
                className="flex items-center gap-2 w-full px-4 py-3 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
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
