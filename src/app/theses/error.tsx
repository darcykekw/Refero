'use client'

import { useEffect } from 'react'

export default function ThesesError({
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
    <div className="max-w-5xl page-gutter py-10">
      <div className="card p-10 text-center space-y-4">
        <h1 className="text-xl font-semibold text-slate-900">Something went wrong</h1>
        <p className="text-sm text-slate-500">
          An error occurred while loading theses. Please try again.
        </p>
        <button onClick={() => retry()} className="btn btn-primary mt-4">
          Try again
        </button>
      </div>
    </div>
  )
}
