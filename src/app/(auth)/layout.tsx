import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  robots: { index: false },
}

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-4 py-12 bg-gradient-to-br from-sky-50 via-slate-50 to-blue-50">
      {/* Decorative background blobs */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden -z-10" aria-hidden="true">
        <div className="absolute -top-40 -right-40 w-[600px] h-[600px] rounded-full bg-sky-100/60 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-[500px] h-[500px] rounded-full bg-blue-100/50 blur-3xl" />
      </div>

      {/* Logo mark (above the card) */}
      <Link href="/login" className="flex items-center gap-2.5 mb-8 group" aria-label="Refero Home">
        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-sky-500 to-sky-700 flex items-center justify-center shadow-md group-hover:shadow-lg transition-shadow">
          <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
        </div>
        <div>
          <p className="font-bold text-xl tracking-tight text-slate-900 leading-tight">Refero</p>
          <p className="text-[11px] font-medium tracking-widest text-slate-400 uppercase leading-tight">Thesis Hub</p>
        </div>
      </Link>

      {/* Auth card */}
      <div className="w-full max-w-md">
        {children}
      </div>

      {/* Footer note */}
      <p className="mt-8 text-xs text-slate-400 text-center">
        © {new Date().getFullYear()} Refero · PALSU University Research Repository
      </p>
    </div>
  )
}
