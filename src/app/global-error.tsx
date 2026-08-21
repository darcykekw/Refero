'use client'

import { useEffect } from 'react'

export default function GlobalError({
  error,
  retry,
}: {
  error: Error & { digest?: string }
  retry: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <html lang="en" className="h-full">
      <body className="min-h-full flex flex-col items-center justify-center px-4 py-12 bg-slate-50">
        <div className="card p-10 text-center space-y-4 max-w-md w-full">
          <h1 className="text-xl font-semibold text-slate-900">Something went wrong</h1>
          <p className="text-sm text-slate-500">
            An unexpected error occurred. Please try again.
          </p>
          <button onClick={() => retry()} className="btn btn-primary mt-4">
            Try again
          </button>
        </div>
      </body>
    </html>
  )
}
