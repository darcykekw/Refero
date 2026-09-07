'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface AdminSidebarProps {
  pendingCount: number
}

interface NavItem {
  href: string
  label: string
  exact?: boolean
  badge?: number
  icon: React.ReactNode
}

interface NavSection {
  group: string
  items: NavItem[]
}

export default function AdminSidebar({ pendingCount }: AdminSidebarProps) {
  const pathname = usePathname()

  const sections: NavSection[] = [
    {
      group: 'MENU',
      items: [
        {
          href: '/admin',
          label: 'Dashboard',
          exact: true,
          icon: (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
          ),
        },
        {
          href: '/admin/feed',
          label: 'Thesis Feed',
          icon: (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          ),
        },
      ],
    },
    {
      group: 'VERIFICATION',
      items: [
        {
          href: '/admin/verification',
          label: 'Verification Queue',
          badge: pendingCount > 0 ? pendingCount : undefined,
          icon: (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ),
        },
      ],
    },
    {
      group: 'DATABASE',
      items: [
        {
          href: '/admin/theses',
          label: 'Thesis Masterlist',
          icon: (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          ),
        },
        {
          href: '/admin/users',
          label: 'User Management',
          icon: (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          ),
        },
      ],
    },
    {
      group: 'SETTINGS',
      items: [
        {
          href: '/admin/settings',
          label: 'Tags & Settings',
          icon: (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
            </svg>
          ),
        },
      ],
    },
  ]

  return (
    <aside
      className="w-64 fixed top-4 left-4 bottom-4 z-40 hidden md:flex flex-col rounded-[28px] overflow-hidden transition-all duration-300"
      style={{
        background: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(16px)',
        border: '1px solid rgba(143, 168, 133, 0.3)',
        boxShadow: '0 10px 30px -5px rgba(23, 59, 40, 0.06), 0 2px 8px -2px rgba(17, 33, 23, 0.04)',
      }}
    >
      {/* Brand Header */}
      <div className="p-5 pb-4 flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-2xl flex items-center justify-center font-serif text-lg font-bold text-white shadow-md"
          style={{
            background: 'linear-gradient(135deg, #173B28 0%, #2E6A47 100%)',
            boxShadow: '0 6px 16px -2px rgba(23, 59, 40, 0.35)',
          }}
        >
          R
        </div>
        <div>
          <div className="flex items-center gap-1.5">
            <h1 className="font-serif font-bold text-slate-900 text-lg tracking-wide">
              Refero
            </h1>
            <span className="text-[10px] font-sans font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-emerald-100/80 text-emerald-800 border border-emerald-300/60">
              Admin
            </span>
          </div>
          <p className="text-[11px] text-slate-400 font-medium">College of Sciences</p>
        </div>
      </div>

      {/* Navigation Sections */}
      <nav className="flex-1 px-4 py-2 space-y-4 overflow-y-auto">
        {sections.map(section => (
          <div key={section.group} className="space-y-1">
            <p className="px-3.5 py-1 text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
              {section.group}
            </p>
            {section.items.map(item => {
              const isActive = item.exact ? pathname === item.href : pathname.startsWith(item.href)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-semibold transition-all duration-200 ${
                    isActive
                      ? 'text-white shadow-md'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-[#EBF2EA]/60'
                  }`}
                  style={{
                    background: isActive
                      ? 'linear-gradient(135deg, #173B28 0%, #2E6A47 100%)'
                      : 'transparent',
                    boxShadow: isActive
                      ? '0 6px 18px -3px rgba(23, 59, 40, 0.3)'
                      : 'none',
                  }}
                >
                  <div className="flex items-center gap-3">
                    <span className={isActive ? 'text-white' : 'text-slate-400'}>
                      {item.icon}
                    </span>
                    <span>{item.label}</span>
                  </div>
                  {item.badge !== undefined && (
                    <span
                      className={`px-2 py-0.5 text-[10px] font-extrabold rounded-full ${
                        isActive
                          ? 'bg-amber-400 text-amber-950'
                          : 'bg-amber-100 text-amber-800 border border-amber-300'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </Link>
              )
            })}
          </div>
        ))}
      </nav>

      {/* Bottom Promo / Info Card (DealDeck "Upgrade Pro" style widget) */}
      <div className="p-4 pt-2">
        <div
          className="rounded-[22px] p-3 text-white relative overflow-hidden shadow-md flex items-center justify-center"
          style={{
            background: 'linear-gradient(135deg, #091911 0%, #0D2418 60%, #173B28 100%)',
            border: '1px solid rgba(143, 168, 133, 0.25)',
            minHeight: '145px',
          }}
        >
          {/* Abstract background circles */}
          <div className="absolute -right-4 -top-4 w-20 h-20 rounded-full bg-emerald-500/10 pointer-events-none" />
          <div className="absolute -right-2 -bottom-2 w-16 h-16 rounded-full bg-emerald-400/10 pointer-events-none" />

          {/* alche.png illustration */}
          <div className="relative w-full h-32 flex items-center justify-center">
            <Image
              src="/alche.png"
              alt="Refero Emblem"
              width={148}
              height={148}
              className="object-contain drop-shadow-[0_4px_12px_rgba(0,0,0,0.45)] transition-transform duration-200 hover:scale-105"
              priority
            />
          </div>
        </div>
      </div>
    </aside>
  )
}
