'use client'

import { useEffect } from 'react'
import Link from 'next/link'

export default function BookmarksError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Bookmarks error:', error)
  }, [error])

  return (
    <div className="w-full max-w-4xl page-gutter py-12">
      <div
        className="card text-center p-8 sm:p-12 space-y-5"
        style={{
          borderRadius: '16px',
          border: '1.5px solid #D2DDD4',
          boxShadow: '0 10px 30px -5px rgba(23, 59, 40, 0.08)',
        }}
      >
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: '50%',
            backgroundColor: '#E7EFE9',
            color: '#173B28',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto',
            fontSize: '1.5rem',
          }}
        >
          🔖
        </div>

        <h1
          style={{
            fontSize: '1.5rem',
            fontWeight: 700,
            color: '#112117',
            fontFamily: "'Playfair Display', Georgia, serif",
          }}
        >
          Bookmarks & Library
        </h1>

        <p style={{ fontSize: '0.875rem', color: '#598567', maxWidth: '440px', margin: '0 auto', lineHeight: 1.6 }}>
          We could not load your research library at this moment. This may be due to a temporary connection delay with the database.
        </p>

        <div style={{ display: 'flex', justifyContent: 'center', gap: '0.75rem', paddingTop: '0.5rem' }}>
          <button
            type="button"
            onClick={() => reset()}
            className="btn btn-primary"
            style={{ minWidth: '130px' }}
          >
            Reload Library
          </button>
          <Link href="/theses" className="btn btn-ghost">
            Browse Theses
          </Link>
        </div>
      </div>
    </div>
  )
}
