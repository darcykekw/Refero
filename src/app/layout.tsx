import type { Metadata } from 'next'
import './globals.css'
import Navbar from '@/components/Navbar'

export const metadata: Metadata = {
  title: {
    default: 'Refero — University Thesis Repository',
    template: '%s | Refero',
  },
  description:
    'Discover, upload, and explore university theses. The central academic hub for PALSU research across every college and program.',
  keywords: ['thesis', 'research', 'university', 'academic', 'repository', 'PALSU'],
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
        {/* Offset for fixed navbar */}
        <main className="flex-1 flex flex-col pt-16">
          {children}
        </main>
      </body>
    </html>
  )
}
