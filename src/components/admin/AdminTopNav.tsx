'use client'

import { useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

interface AdminTopNavProps {
  userEmail: string
  userName: string
  pendingCount?: number
}

export default function AdminTopNav({ userEmail, userName, pendingCount = 0 }: AdminTopNavProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [loggingOut, setLoggingOut] = useState(false)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  const pageTitles: Record<string, { title: string; subtitle: string }> = {
    '/admin': {
      title: 'Administrative Overview',
      subtitle: 'College of Sciences Thesis Repository & Verification Portal',
    },
    '/admin/feed': {
      title: 'Thesis Feed',
      subtitle: 'Manuscript feed across all academic programs',
    },
    '/admin/verification': {
      title: 'Verification Queue',
      subtitle: 'Manuscripts awaiting verification and publication',
    },
    '/admin/theses': {
      title: 'Thesis Masterlist',
      subtitle: 'Master repository registry, metadata & tags',
    },
    '/admin/users': {
      title: 'User Management',
      subtitle: 'Registered accounts, roles, and university domains',
    },
    '/admin/settings': {
      title: 'Tags & Audit Settings',
      subtitle: 'Subject taxonomies and administrative audit trail',
    },
  }

  const currentInfo = pageTitles[pathname] || {
    title: 'Admin Console',
    subtitle: 'College of Sciences Thesis Hub',
  }

  const todayFormatted = new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }).format(new Date())

  async function handleLogout() {
    setLoggingOut(true)
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const adminNavItems = [
    { href: '/admin', label: 'Dashboard', icon: '📊', exact: true },
    { href: '/admin/feed', label: 'Thesis Feed', icon: '📰' },
    { href: '/admin/verification', label: 'Verification Queue', icon: '🛡️', badge: pendingCount > 0 ? pendingCount : undefined },
    { href: '/admin/theses', label: 'Thesis Masterlist', icon: '📚' },
    { href: '/admin/users', label: 'User Management', icon: '👥' },
    { href: '/admin/settings', label: 'Tags & Settings', icon: '⚙️' },
  ]

  return (
    <>
      <header
        className="rounded-[20px] sm:rounded-[24px] px-4 py-3 sm:px-6 sm:py-4 flex items-center justify-between gap-3 transition-all relative z-30"
        style={{
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(16px)',
          border: '1px solid rgba(143, 168, 133, 0.3)',
          boxShadow: '0 8px 24px -4px rgba(23, 59, 40, 0.05), 0 1px 4px rgba(17, 33, 23, 0.03)',
        }}
      >
        {/* Page Title & Subtitle */}
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="font-serif font-bold text-slate-900 text-lg sm:text-2xl leading-snug truncate">
              {currentInfo.title}
            </h1>
            <span className="md:hidden text-[9px] font-sans font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-emerald-100/80 text-emerald-800 border border-emerald-300/60 flex-shrink-0">
              Admin
            </span>
          </div>
          <p className="text-[11px] sm:text-xs text-slate-500 font-medium mt-0.5 flex items-center gap-1.5 truncate" suppressHydrationWarning>
            <span suppressHydrationWarning>{todayFormatted}</span>
            <span className="text-emerald-700/60 font-bold">·</span>
            <span className="text-emerald-800 font-semibold truncate">{currentInfo.subtitle}</span>
          </p>
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
          {/* Quick Link to Feed */}
          <Link
            href="/admin/feed"
            className="hidden sm:flex w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-slate-50 hover:bg-emerald-50 text-slate-600 hover:text-emerald-800 border border-slate-200/80 hover:border-emerald-200 items-center justify-center transition-all shadow-xs"
            title="Go to Thesis Feed"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
            </svg>
          </Link>

          {/* Verification Queue notification bell */}
          <Link
            href="/admin/verification"
            className="relative w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-slate-50 hover:bg-amber-50 text-slate-600 hover:text-amber-800 border border-slate-200/80 hover:border-amber-300 flex items-center justify-center transition-all shadow-xs"
            title="Verification Queue"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            {pendingCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-amber-500 ring-2 ring-white" />
            )}
          </Link>

          {/* Admin Profile Pill */}
          <div className="flex items-center gap-2 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-full bg-slate-50 border border-slate-200/80 shadow-xs">
            <div
              className="w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-white font-bold text-xs shadow-xs"
              style={{
                background: 'linear-gradient(135deg, #173B28 0%, #2E6A47 100%)',
              }}
            >
              {userName ? userName.charAt(0).toUpperCase() : 'A'}
            </div>
            <div className="text-left hidden lg:block">
              <p className="text-xs font-bold text-slate-900 leading-tight">
                {userName || 'System Admin'}
              </p>
              <p className="text-[10px] text-emerald-800 font-mono font-medium leading-tight truncate max-w-[150px]">
                {userEmail}
              </p>
            </div>
          </div>

          {/* Secure Logout (Desktop) */}
          <button
            type="button"
            onClick={handleLogout}
            disabled={loggingOut}
            className="hidden sm:flex p-2.5 rounded-full text-rose-700 hover:text-rose-900 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-all cursor-pointer disabled:opacity-50 shadow-xs"
            title="Sign out of Admin Session"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>

          {/* Mobile Hamburger Button */}
          <button
            type="button"
            onClick={() => setMobileNavOpen(prev => !prev)}
            aria-label="Toggle admin menu"
            className="md:hidden p-2 rounded-xl text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300/80 transition-all cursor-pointer flex items-center justify-center"
          >
            {mobileNavOpen ? (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>
      </header>

      {/* Mobile Admin Navigation Drawer */}
      {mobileNavOpen && (
        <div
          className="md:hidden fixed inset-0 z-50 flex flex-col justify-end"
          style={{ background: 'rgba(9, 29, 19, 0.6)', backdropFilter: 'blur(4px)' }}
          onClick={() => setMobileNavOpen(false)}
        >
          <div
            className="w-full bg-white rounded-t-[28px] p-5 shadow-2xl border-t border-[rgba(143,168,133,0.3)] animate-fade-in-up"
            onClick={e => e.stopPropagation()}
            style={{ maxHeight: '85vh', overflowY: 'auto' }}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center font-serif text-sm font-bold text-white shadow-xs"
                  style={{ background: 'linear-gradient(135deg, #173B28, #2E6A47)' }}
                >
                  R
                </div>
                <div>
                  <h2 className="font-serif font-bold text-slate-900 text-sm">Refero Admin</h2>
                  <p className="text-[10px] text-slate-400 font-medium">College of Sciences</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setMobileNavOpen(false)}
                className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 bg-slate-100"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <nav className="py-3 space-y-1.5">
              {adminNavItems.map(item => {
                const isActive = item.exact ? pathname === item.href : pathname.startsWith(item.href)
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileNavOpen(false)}
                    className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                      isActive
                        ? 'text-white'
                        : 'text-slate-700 hover:bg-slate-100'
                    }`}
                    style={{
                      background: isActive
                        ? 'linear-gradient(135deg, #173B28 0%, #2E6A47 100%)'
                        : 'transparent',
                    }}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="text-base">{item.icon}</span>
                      <span>{item.label}</span>
                    </div>
                    {item.badge !== undefined && (
                      <span className="px-2 py-0.5 text-[10px] font-extrabold rounded-full bg-amber-400 text-amber-950">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                )
              })}
            </nav>

            <div className="pt-3 border-t border-slate-100 flex flex-col gap-2">
              <Link
                href="/"
                onClick={() => setMobileNavOpen(false)}
                className="w-full py-2.5 px-3 rounded-xl bg-slate-100 text-slate-700 text-xs font-semibold flex items-center justify-center gap-2 text-center"
              >
                <span>← Return to Student Library</span>
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                disabled={loggingOut}
                className="w-full py-2.5 px-3 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Sign Out of Admin</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
