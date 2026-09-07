'use client'

import { useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

interface AdminTopNavProps {
  userEmail: string
  userName: string
}

export default function AdminTopNav({ userEmail, userName }: AdminTopNavProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [loggingOut, setLoggingOut] = useState(false)

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
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date())

  async function handleLogout() {
    setLoggingOut(true)
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <header
      className="rounded-[24px] px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all"
      style={{
        background: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(16px)',
        border: '1px solid rgba(143, 168, 133, 0.3)',
        boxShadow: '0 8px 24px -4px rgba(23, 59, 40, 0.05), 0 1px 4px rgba(17, 33, 23, 0.03)',
      }}
    >
      {/* Page Title & Date (DealDeck style) */}
      <div>
        <h1 className="font-serif font-bold text-slate-900 text-xl sm:text-2xl leading-snug">
          {currentInfo.title}
        </h1>
        <p className="text-xs text-slate-500 font-medium mt-0.5 flex items-center gap-1.5" suppressHydrationWarning>
          <span suppressHydrationWarning>{todayFormatted}</span>
          <span className="text-emerald-700/60 font-bold">·</span>
          <span className="text-emerald-800 font-semibold">{currentInfo.subtitle}</span>
        </p>
      </div>

      {/* Right Controls: Quick icons + Profile Pill + Logout */}
      <div className="flex items-center gap-3 self-end sm:self-auto">
        {/* Quick Link to Feed or Review */}
        <Link
          href="/admin/feed"
          className="w-10 h-10 rounded-full bg-slate-50 hover:bg-emerald-50 text-slate-600 hover:text-emerald-800 border border-slate-200/80 hover:border-emerald-200 flex items-center justify-center transition-all shadow-xs"
          title="Go to Thesis Feed"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
          </svg>
        </Link>

        {/* Verification Queue notification bell */}
        <Link
          href="/admin/verification"
          className="relative w-10 h-10 rounded-full bg-slate-50 hover:bg-amber-50 text-slate-600 hover:text-amber-800 border border-slate-200/80 hover:border-amber-300 flex items-center justify-center transition-all shadow-xs"
          title="Verification Queue"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-amber-500 ring-2 ring-white" />
        </Link>

        {/* Admin Profile Pill */}
        <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-slate-50 border border-slate-200/80 shadow-xs">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs shadow-xs"
            style={{
              background: 'linear-gradient(135deg, #173B28 0%, #2E6A47 100%)',
            }}
          >
            {userName ? userName.charAt(0).toUpperCase() : 'A'}
          </div>
          <div className="text-left hidden md:block">
            <p className="text-xs font-bold text-slate-900 leading-tight">
              {userName || 'System Admin'}
            </p>
            <p className="text-[10px] text-emerald-800 font-mono font-medium leading-tight">
              {userEmail}
            </p>
          </div>
        </div>

        {/* Secure Logout */}
        <button
          type="button"
          onClick={handleLogout}
          disabled={loggingOut}
          className="p-2.5 rounded-full text-rose-700 hover:text-rose-900 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-all cursor-pointer disabled:opacity-50 shadow-xs"
          title="Sign out of Admin Session"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
        </button>
      </div>
    </header>
  )
}
