import type { Metadata } from 'next'
import Link from 'next/link'
import { Suspense } from 'react'
import { getCurrentUser } from '@/lib/auth'
import { getThesesList, getAvailableTags, getUserTheses } from '@/lib/data'
import ThesisCard from '@/components/ThesisCard'
import ThesisSearch from '@/components/ThesisSearch'

export const metadata: Metadata = {
  title: 'Theses',
  description: 'Search and browse all university theses in the Refero repository. Filter by tags, search by title, authors, or abstract.',
}

interface ThesesPageProps {
  searchParams: Promise<{
    q?: string
    tag?: string | string[]
    page?: string
  }>
}

export default async function ThesesPage({ searchParams }: ThesesPageProps) {
  const params = await searchParams
  const query = params.q?.trim() ?? ''
  const rawTags = params.tag
  const tagIds: string[] = rawTags
    ? Array.isArray(rawTags) ? rawTags : [rawTags]
    : []
  const page = Math.max(1, parseInt(params.page ?? '1', 10))

  // The list and the tag panel do not depend on who is asking, so they load
  // alongside the user lookup instead of waiting on it.
  const [user, listResult, availableTags] = await Promise.all([
    getCurrentUser(),
    getThesesList({ query, tagIds, page }),
    getAvailableTags(40),
  ])

  // "Your uploads" only appears on the unfiltered list, and only for a signed-in
  // visitor, so it is fetched after the user is known.
  const userUploads = user && !query && tagIds.length === 0
    ? await getUserTheses(user.id)
    : []

  const { theses, totalCount, totalPages } = listResult

  // Build URL helper — preserves existing params, updates/removes one key
  function buildUrl(updates: Record<string, string | null>) {
    const p = new URLSearchParams()
    if (query) p.set('q', query)
    tagIds.forEach(t => p.append('tag', t))
    if (page > 1) p.set('page', String(page))
    Object.entries(updates).forEach(([k, v]) => {
      if (v === null) p.delete(k)
      else { p.delete(k); p.set(k, v) }
    })
    const s = p.toString()
    return `/theses${s ? `?${s}` : ''}`
  }

  function toggleTagUrl(tagId: string) {
    const p = new URLSearchParams()
    if (query) p.set('q', query)
    const next = tagIds.includes(tagId)
      ? tagIds.filter(t => t !== tagId)
      : [...tagIds, tagId]
    next.forEach(t => p.append('tag', t))
    return `/theses${p.toString() ? `?${p.toString()}` : ''}`
  }

  return (
    <div className="max-w-7xl page-gutter py-10 space-y-8">

      {/* ── Page header + search ─────────────────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Theses</h1>
          <p className="text-slate-500 text-sm mt-1">
            {totalCount.toLocaleString()} {totalCount === 1 ? 'thesis' : 'theses'} found
          </p>
        </div>
        <Suspense>
          <ThesisSearch initialQuery={query} />
        </Suspense>
      </div>

      {/* ── Tag filter chips ─────────────────────────────────────────── */}
      {availableTags.length > 0 && (
        <div className="card p-4">
          <p className="text-xs uppercase tracking-widest text-slate-400 font-semibold mb-3">
            Filter by Tag
          </p>
          <div className="flex flex-wrap gap-2">
            {availableTags.map(tag => (
              <Link
                key={tag.id}
                href={toggleTagUrl(tag.id)}
                className={`tag-chip ${tagIds.includes(tag.id) ? 'is-active' : ''}`}
              >
                {tag.name}
              </Link>
            ))}
          </div>

          {tagIds.length > 0 && (
            <div className="mt-3 flex items-center gap-3 text-sm text-slate-500 border-t border-slate-100 pt-3">
              <span>
                Active filters:{' '}
                <strong className="text-slate-700">
                  {availableTags.filter(t => tagIds.includes(t.id)).map(t => t.name).join(', ')}
                </strong>
              </span>
              <Link
                href={buildUrl({ tag: null, page: null })}
                className="text-sky-600 hover:text-sky-700 font-medium"
              >
                Clear ×
              </Link>
            </div>
          )}
        </div>
      )}

      {/* ── My Uploads (only when not searching) ─────────────────────── */}
      {user && Array.isArray(userUploads) && userUploads.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-4">
            <div className="h-5 w-1 rounded-full bg-sky-600" />
            <h2 className="text-xl font-bold text-slate-800">My Theses</h2>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {userUploads.map(thesis => (
              <ThesisCard
                key={thesis.id}
                thesis={thesis}
                showActions
              />
            ))}
          </div>
          <div className="mt-8 pt-6 border-t border-slate-200">
            <div className="flex items-center gap-2 mb-4">
              <div className="h-5 w-1 rounded-full bg-slate-300" />
              <h2 className="text-xl font-bold text-slate-800">All Theses</h2>
            </div>
          </div>
        </section>
      )}

      {/* ── Theses grid ──────────────────────────────────────────────── */}
      {theses.length > 0 ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {theses.map(thesis => (
            <ThesisCard
              key={thesis.id}
              thesis={thesis}
              activeTags={availableTags.filter(t => tagIds.includes(t.id)).map(t => t.name)}
            />
          ))}
        </div>
      ) : (
        <div className="card p-14 text-center">
          <div className="text-4xl mb-3">🔍</div>
          <p className="font-semibold text-slate-700">No theses found</p>
          <p className="text-sm text-slate-400 mt-1">
            {query ? `No results for "${query}". Try different keywords.` : 'No theses match the current filters.'}
          </p>
          {(query || tagIds.length > 0) && (
            <Link href="/theses" className="btn btn-ghost btn-sm mt-4 inline-flex">
              Clear all filters
            </Link>
          )}
        </div>
      )}

      {/* ── Pagination ───────────────────────────────────────────────── */}
      {totalPages > 1 && (
        <nav aria-label="Thesis pagination" className="flex items-center justify-center gap-2">
          <Link
            href={buildUrl({ page: page > 1 ? String(page - 1) : null })}
            aria-disabled={page === 1}
            className={`btn btn-ghost btn-sm ${page === 1 ? 'opacity-40 pointer-events-none' : ''}`}
          >
            ← Previous
          </Link>

          {/* Page number pills */}
          <div className="flex gap-1">
            {(() => {
              const total = totalPages
              let pageNums: (number | null)[] = []
              if (total <= 7) {
                pageNums = Array.from({ length: total }, (_, j) => j + 1)
              } else {
                const start = Math.max(2, page - 2)
                const end   = Math.min(total - 1, page + 2)
                pageNums = [1]
                if (start > 2) pageNums.push(null)
                for (let n = start; n <= end; n++) pageNums.push(n)
                if (end < total - 1) pageNums.push(null)
                pageNums.push(total)
              }
              return pageNums.filter((v, i, a) => i === 0 || v !== a[i - 1]).map((n, i) =>
                n === null ? (
                  <span key={`ellipsis-${i}`} className="px-2 py-1 text-slate-400 text-sm">…</span>
                ) : (
                  <Link
                    key={n}
                    href={buildUrl({ page: n === 1 ? null : String(n) })}
                    className={`h-8 w-8 rounded-lg flex items-center justify-center text-sm font-medium transition-colors ${
                      n === page
                        ? 'bg-sky-600 text-white'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                    aria-current={n === page ? 'page' : undefined}
                  >
                    {n}
                  </Link>
                )
              )
            })()}
          </div>


          <Link
            href={buildUrl({ page: page < totalPages ? String(page + 1) : null })}
            aria-disabled={page === totalPages}
            className={`btn btn-ghost btn-sm ${page === totalPages ? 'opacity-40 pointer-events-none' : ''}`}
          >
            Next →
          </Link>
        </nav>
      )}

    </div>
  )
}
