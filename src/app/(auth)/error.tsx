'use client'

import { useEffect } from 'react'

export default function AuthError({
  error,
  retry,
}: {
  error: Error & { digest?: string }
  retry: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  // No page wrapper here: (auth)/layout.tsx already centres its child in a
  // max-w-md column, so this only needs to be the card that sits inside it.
  return (
    <div className="card p-8 text-center space-y-4">
      <h1 className="text-lg font-semibold text-slate-900">Something went wrong</h1>
      <p className="text-sm text-slate-500">
        We could not complete that request. Please try again.
      </p>
      <button onClick={() => retry()} className="btn btn-primary btn-full mt-2">
        Try again
      </button>
    </div>
  )
}
