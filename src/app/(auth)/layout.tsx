import type { Metadata } from 'next'

export const metadata: Metadata = {
  robots: { index: false },
}

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4 py-8 sm:py-12 relative"
      style={{
        backgroundColor: 'var(--color-surface-2)',
        backgroundImage: "url('/refero_back.png')",
        backgroundSize: 'cover',
        backgroundAttachment: 'fixed',
        backgroundPosition: 'center',
      }}
    >
      {/* Decorative ambient lighting */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden -z-10" aria-hidden="true">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[600px] rounded-full bg-emerald-900/5 blur-3xl" />
      </div>

      {/* Main card container */}
      <div className="w-full flex flex-col items-center justify-center">
        {children}
      </div>

      {/* Footer note */}
      <p className="mt-8 text-xs text-slate-500/80 text-center font-medium">
        © {new Date().getFullYear()} Refero · College of Sciences Academic Thesis Repository
      </p>
    </div>
  )
}
