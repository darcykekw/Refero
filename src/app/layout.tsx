import type { Metadata } from 'next'
import './globals.css'
import Navbar from '@/components/Navbar'

export const metadata: Metadata = {
  title: {
    default: 'Refero — College of Sciences Thesis Repository',
    template: '%s | Refero',
  },
  description:
    'Discover, upload, and explore theses and scientific research from the College of Sciences at PALSU.',
  keywords: ['thesis', 'research', 'college of sciences', 'academic', 'repository', 'PALSU'],
}

import { headers } from 'next/headers'

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const headerList = await headers()
  const pathname = headerList.get('x-pathname') || ''
  const isAdminRoute = pathname.startsWith('/admin')

  return (
    <html lang="en" className="h-full" data-scroll-behavior="smooth" suppressHydrationWarning>
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        {!isAdminRoute && <Navbar />}
        {/* Offset for fixed navbar only on non-admin routes */}
        <main
          className="flex-1 flex flex-col"
          style={{ paddingTop: isAdminRoute ? '0px' : '66px' }}
        >
          {children}
        </main>
      </body>
    </html>
  )
}
