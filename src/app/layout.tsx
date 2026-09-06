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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full flex flex-col">
        <Navbar />
        {/* Offset for fixed navbar (66px height) */}
        <main className="flex-1 flex flex-col" style={{ paddingTop: '66px' }}>
          {children}
        </main>
      </body>
    </html>
  )
}
