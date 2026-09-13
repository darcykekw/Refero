import Link from 'next/link'
import Image from 'next/image'
import { getCurrentUser } from '@/lib/auth'
import NavbarClient from './NavbarClient'

export default async function Navbar() {
  const user = await getCurrentUser()

  return (
    <header className="fixed top-0 inset-x-0 z-50" style={{
      background: 'rgba(17, 36, 26, 0.96)',
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
      borderBottom: '1px solid rgba(143, 168, 133, 0.25)',
      boxShadow: '0 4px 24px -4px rgba(10, 24, 16, 0.45)',
    }}>
      <div className="max-w-7xl page-gutter">
        <div className="relative flex h-[66px] items-center justify-between">

          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 group flex-shrink-0">
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: '8px',
                overflow: 'hidden',
                boxShadow: '0 2px 10px rgba(10, 24, 16, 0.4)',
                border: '1px solid rgba(143, 168, 133, 0.35)',
                transition: 'transform 0.2s ease, box-shadow 0.2s ease',
              }}
              className="group-hover:scale-105 group-hover:shadow-lg relative shrink-0 bg-[#173B28]"
            >
              <Image
                src="/refero_logo.png"
                alt="Refero Logo"
                width={38}
                height={38}
                className="w-full h-full object-cover"
                priority
              />
            </div>

            <div>
              <p style={{ fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 700, fontSize: '1.0625rem', color: '#FFFFFF', lineHeight: 1.1, letterSpacing: '-0.01em' }}>
                REFERO
              </p>
              <p style={{ fontSize: '0.6rem', fontWeight: 600, letterSpacing: '0.15em', color: '#8FA885', textTransform: 'uppercase', lineHeight: 1 }}>
                College of Sciences
              </p>
            </div>
          </Link>

          {/* Client-rendered: nav links + user menu + mobile drawer */}
          <NavbarClient initialUser={user} />
        </div>
      </div>
    </header>
  )
}
