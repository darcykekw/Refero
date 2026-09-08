'use client'

import { useEffect } from 'react'
import Link from 'next/link'

export default function ThesisUploadError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Thesis upload error:', error)
  }, [error])

  return (
    <div className="w-full max-w-3xl page-gutter py-12">
      <div
        className="card text-center p-8 sm:p-12 space-y-5"
        style={{
          borderRadius: '16px',
          border: '1.5px solid #D2DDD4',
          boxShadow: '0 10px 30px -5px rgba(23, 59, 40, 0.08)',
          backgroundColor: '#FFFFFF',
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
          📄
        </div>

        <h1
          style={{
            fontSize: '1.5rem',
            fontWeight: 700,
            color: '#112117',
            fontFamily: "'Playfair Display', Georgia, serif",
          }}
        >
          Thesis Upload Unavailable
        </h1>

        <p style={{ fontSize: '0.875rem', color: '#598567', maxWidth: '440px', margin: '0 auto', lineHeight: 1.6 }}>
          We encountered an issue preparing the thesis submission form. Please try reloading or return to the theses repository.
        </p>

        <div style={{ display: 'flex', justifyContent: 'center', gap: '0.75rem', paddingTop: '0.5rem', flexWrap: 'wrap' }}>
          <button
            onClick={() => reset()}
            className="btn btn-primary btn-sm"
          >
            Try Again
          </button>
          <Link
            href="/login?redirectTo=/theses/upload"
            className="btn btn-secondary btn-sm"
          >
            Sign In
          </Link>
          <Link
            href="/theses"
            className="btn btn-ghost btn-sm"
          >
            Back to Theses
          </Link>
        </div>
      </div>
    </div>
  )
}
