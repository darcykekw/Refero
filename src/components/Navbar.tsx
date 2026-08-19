import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import NavbarClient from './NavbarClient'

/**
 * Server Component shell — fetches current user on the server so the
 * nav renders correctly without a client-side flash, then delegates
 * all interactive behaviour to NavbarClient.
 */
export default async function Navbar() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <header className="fixed top-0 inset-x-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 group flex-shrink-0">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-sky-500 to-sky-700 flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow">
              <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <div>
              <p className="font-bold text-base tracking-tight text-slate-900 leading-tight">Refero</p>
              <p className="text-[10px] font-medium tracking-wider text-slate-400 uppercase leading-tight">Thesis Hub</p>
            </div>
          </Link>

          {/* Client-rendered: desktop nav + user menu + mobile drawer */}
          <NavbarClient initialUser={user} />
        </div>
      </div>
    </header>
  )
}
