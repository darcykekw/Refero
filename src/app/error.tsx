'use client'

import { useEffect } from 'react'

export default function RootError({
  error,
  retry,
}: {
  error: Error & { digest?: string }
  retry: () => void
}) {
  useEffect(() => {
    // Errors from Server Components arrive with a generic message and a digest
    // that matches the server log; logging both is what makes them traceable.
    console.error(error)
  }, [error])

  return (
    <div className="max-w-5xl page-gutter py-10">
      <div className="card p-10 text-center space-y-4">
        <h1 className="text-xl font-semibold text-slate-900">Something went wrong</h1>
        <p className="text-sm text-slate-500 max-w-md mx-auto">
          An unexpected error occurred. Trying again often resolves it — the
          cause is frequently a temporary network or database hiccup.
        </p>
        {error.digest && (
          <p className="text-xs text-slate-400 font-mono">
            Reference: {error.digest}
          </p>
        )}
        <button onClick={() => retry()} className="btn btn-primary mt-4">
          Try again
        </button>
      </div>
    </div>
  )
}
