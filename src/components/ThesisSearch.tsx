'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useTransition } from 'react'

interface ThesisSearchProps {
  initialQuery: string
}

export default function ThesisSearch({ initialQuery }: ThesisSearchProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [pending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const data = new FormData(e.currentTarget)
    const q = (data.get('q') as string).trim()
    const params = new URLSearchParams(searchParams.toString())
    if (q) {
      params.set('q', q)
    } else {
      params.delete('q')
    }
    params.delete('page') // reset pagination on new search
    startTransition(() => router.push(`${pathname}?${params.toString()}`))
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 w-full sm:w-auto">
      <div className="relative flex-1 sm:w-72">
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none"
          fill="none" viewBox="0 0 24 24" stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          id="thesis-search-input"
          name="q"
          type="search"
          defaultValue={initialQuery}
          placeholder="Search titles, authors, abstract…"
          className="input pl-9"
        />
      </div>
      <button
        id="thesis-search-btn"
        type="submit"
        disabled={pending}
        className="btn btn-primary gap-1.5"
      >
        {pending ? <span className="spinner" /> : null}
        Search
      </button>
    </form>
  )
}
