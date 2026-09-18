'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import type { Program, ThesisWithRelations } from '@/types/database'
import ThesisCard from '@/components/ThesisCard'
import { ThesisGridSkeleton } from '@/components/ThesisCardSkeleton'

type SortOption = 'newest' | 'oldest' | 'year_desc' | 'year_asc' | 'title_asc' | 'title_desc'

interface AllThesesSectionProps {
  initialTheses: ThesisWithRelations[]
  programs: Program[]
  bookmarkMap: Record<string, string[]>
}

const PAGE_SIZE = 9

export default function AllThesesSection({
  initialTheses,
  programs,
  bookmarkMap,
}: AllThesesSectionProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const urlProgram = searchParams.get('program')
  const urlQuery = searchParams.get('q') || ''
  const urlYear = searchParams.get('year')

  const [selectedProgramId, setSelectedProgramId] = useState<string | null>(urlProgram)
  const [selectedYear, setSelectedYear] = useState<number | null>(urlYear ? Number(urlYear) : null)
  const [selectedSort, setSelectedSort] = useState<SortOption>('newest')
  const [isSorting, setIsSorting] = useState<boolean>(false)
  const sortTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const isFirstMount = useRef(true)
  const [searchFilter, setSearchFilter] = useState<string>(urlQuery)
  const [currentPage, setCurrentPage] = useState<number>(1)

  const handleSortChange = (newSort: SortOption) => {
    if (newSort === selectedSort) return
    setIsSorting(true)
    setSelectedSort(newSort)
    if (sortTimeoutRef.current) clearTimeout(sortTimeoutRef.current)
    sortTimeoutRef.current = setTimeout(() => {
      setIsSorting(false)
    }, 450)
  }

  useEffect(() => {
    return () => {
      if (sortTimeoutRef.current) clearTimeout(sortTimeoutRef.current)
    }
  }, [])

  // Sync with searchParams when user navigates or uses the Program Carousel
  useEffect(() => {
    setSelectedProgramId(urlProgram)
  }, [urlProgram])

  useEffect(() => {
    setSelectedYear(urlYear ? Number(urlYear) : null)
  }, [urlYear])

  useEffect(() => {
    setSearchFilter(urlQuery)
  }, [urlQuery])

  // Reset page when filter changes & trigger sorting skeleton
  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false
      return
    }
    setCurrentPage(1)
    setIsSorting(true)
    if (sortTimeoutRef.current) clearTimeout(sortTimeoutRef.current)
    sortTimeoutRef.current = setTimeout(() => {
      setIsSorting(false)
    }, 450)
  }, [selectedProgramId, selectedYear, searchFilter, selectedSort])

  const selectedProgram = useMemo(() => {
    return selectedProgramId ? programs.find(p => p.id === selectedProgramId) : null
  }, [selectedProgramId, programs])

  // Extract distinct available years, sorted descending
  const availableYears = useMemo(() => {
    const years = new Set<number>()
    initialTheses.forEach(t => {
      if (t.year_submitted && !isNaN(t.year_submitted)) {
        years.add(t.year_submitted)
      }
    })
    return Array.from(years).sort((a, b) => b - a)
  }, [initialTheses])

  // Filter theses
  const filteredTheses = useMemo(() => {
    let list = initialTheses

    if (selectedProgramId) {
      list = list.filter(t => t.program_id === selectedProgramId)
    }

    if (selectedYear) {
      list = list.filter(t => t.year_submitted === selectedYear)
    }

    if (searchFilter.trim()) {
      const q = searchFilter.trim().toLowerCase()
      list = list.filter(t =>
        t.title.toLowerCase().includes(q) ||
        t.authors.toLowerCase().includes(q) ||
        t.abstract.toLowerCase().includes(q) ||
        (t.tags && t.tags.some(tag => tag.name.toLowerCase().includes(q)))
      )
    }

    // Sort list
    list = [...list].sort((a, b) => {
      if (selectedSort === 'newest') {
        const dateA = a.date_added ? new Date(a.date_added).getTime() : 0
        const dateB = b.date_added ? new Date(b.date_added).getTime() : 0
        if (dateB !== dateA) return dateB - dateA
        return (b.year_submitted ?? 0) - (a.year_submitted ?? 0)
      }
      if (selectedSort === 'oldest') {
        const dateA = a.date_added ? new Date(a.date_added).getTime() : 0
        const dateB = b.date_added ? new Date(b.date_added).getTime() : 0
        if (dateA !== dateB) return dateA - dateB
        return (a.year_submitted ?? 0) - (b.year_submitted ?? 0)
      }
      if (selectedSort === 'year_desc') {
        return (b.year_submitted ?? 0) - (a.year_submitted ?? 0)
      }
      if (selectedSort === 'year_asc') {
        return (a.year_submitted ?? 0) - (b.year_submitted ?? 0)
      }
      if (selectedSort === 'title_asc') {
        return (a.title || '').localeCompare(b.title || '')
      }
      if (selectedSort === 'title_desc') {
        return (b.title || '').localeCompare(a.title || '')
      }
      return 0
    })

    return list
  }, [initialTheses, selectedProgramId, selectedYear, searchFilter, selectedSort])

  const totalPages = Math.max(1, Math.ceil(filteredTheses.length / PAGE_SIZE))
  const startIndex = (currentPage - 1) * PAGE_SIZE
  const paginatedTheses = filteredTheses.slice(startIndex, startIndex + PAGE_SIZE)

  function clearAllFilters() {
    setSearchFilter('')
    setSelectedProgramId(null)
    setSelectedYear(null)
    const params = new URLSearchParams(searchParams.toString())
    params.delete('program')
    params.delete('q')
    params.delete('year')
    router.push(params.toString() ? `/?${params.toString()}#all-theses` : '/#all-theses', { scroll: false })
  }

  function handlePageChange(newPage: number) {
    setCurrentPage(newPage)
    const element = document.getElementById('all-theses')
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' })
    }
  }

  return (
    <section id="all-theses" className="w-full space-y-6 animate-fade-in-up scroll-mt-24">
      {/* ── Section Header (Same style as other section headers) ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div className="section-header" style={{ marginBottom: 0 }}>
          <h2 className="section-title">All Theses</h2>
        </div>

        {/* Right controls: Year filter dropdown & active filter indicators */}
        <div className="flex items-center flex-wrap gap-2.5">
          {/* Year Filter Dropdown */}
          <div className="flex items-center gap-1.5">
            <label htmlFor="thesis-year-filter" className="text-xs font-bold text-emerald-900 tracking-wide uppercase">
              Year:
            </label>
            <div className="relative">
              <select
                id="thesis-year-filter"
                value={selectedYear ?? ''}
                onChange={e => {
                  const val = e.target.value ? Number(e.target.value) : null
                  setSelectedYear(val)
                  const params = new URLSearchParams(searchParams.toString())
                  if (val) {
                    params.set('year', String(val))
                  } else {
                    params.delete('year')
                  }
                  router.push(params.toString() ? `/?${params.toString()}#all-theses` : '/#all-theses', { scroll: false })
                }}
                className="text-xs font-semibold px-3 py-1.5 pr-8 rounded-xl cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-600 appearance-none shadow-sm"
                style={{
                  backgroundColor: '#FFFFFF',
                  color: '#173B28',
                  border: '1.5px solid #C4D3C6',
                }}
              >
                <option value="">All Years</option>
                {availableYears.map(yr => (
                  <option key={yr} value={yr}>
                    {yr}
                  </option>
                ))}
              </select>
              <svg
                className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-emerald-800 pointer-events-none"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>

          {/* Sort Filter Dropdown */}
          <div className="flex items-center gap-1.5">
            <label htmlFor="all-theses-sort" className="text-xs font-bold text-emerald-900 tracking-wide uppercase flex items-center gap-1.5">
              <span>Sort:</span>
              {isSorting && <span className="spinner text-emerald-700" style={{ width: '0.75rem', height: '0.75rem' }} />}
            </label>
            <div className="relative">
              <select
                id="all-theses-sort"
                value={selectedSort}
                onChange={e => handleSortChange(e.target.value as SortOption)}
                disabled={isSorting}
                className="text-xs font-semibold px-3 py-1.5 pr-8 rounded-xl cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-600 appearance-none shadow-sm transition-opacity disabled:opacity-80"
                style={{
                  backgroundColor: '#FFFFFF',
                  color: '#173B28',
                  border: '1.5px solid #C4D3C6',
                }}
              >
                <option value="newest">Newest Added</option>
                <option value="oldest">Oldest Added</option>
                <option value="year_desc">Year (Newest)</option>
                <option value="year_asc">Year (Oldest)</option>
                <option value="title_asc">Title (A → Z)</option>
                <option value="title_desc">Title (Z → A)</option>
              </select>
              <svg
                className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-emerald-800 pointer-events-none"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>

          {/* Action reset if program, year, or search query is active */}
          {(selectedProgramId || selectedYear || searchFilter.trim()) && (
            <div className="flex items-center gap-2">
              {selectedProgram && (
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                  {selectedProgram.prog_name}
                </span>
              )}
              {searchFilter.trim() && (
                <span className="text-xs text-slate-700 font-medium">
                  &ldquo;{searchFilter}&rdquo;
                </span>
              )}
              <button
                type="button"
                onClick={clearAllFilters}
                className="text-xs font-semibold px-3 py-1 rounded-full text-rose-700 hover:text-rose-900 bg-white border border-rose-200 cursor-pointer shadow-sm transition-colors"
              >
                Reset Filter ×
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── 3x3 Theses Grid (9 per page) ───────────────────────── */}
      {isSorting ? (
        <ThesisGridSkeleton count={Math.min(PAGE_SIZE, Math.max(paginatedTheses.length, 6))} />
      ) : paginatedTheses.length > 0 ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {paginatedTheses.map(thesis => (
            <ThesisCard
              key={thesis.id}
              thesis={thesis}
              isBookmarked={Boolean(bookmarkMap[thesis.id]?.length)}
            />
          ))}
        </div>
      ) : (
        <div
          className="p-12 text-center rounded-2xl"
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #D2DDD4',
            boxShadow: '0 2px 8px rgba(17,33,23,0.04)',
          }}
        >
          <div className="text-3xl mb-2">🔍</div>
          <p className="font-bold text-slate-800">No theses found</p>
          <p className="text-xs text-slate-500 mt-1">
            {searchFilter
              ? `No manuscripts match "${searchFilter}". Try different keywords.`
              : 'No theses match the selected filters.'}
          </p>
          <button
            type="button"
            onClick={clearAllFilters}
            className="mt-3 btn btn-primary btn-sm inline-flex"
          >
            Reset Filters
          </button>
        </div>
      )}

      {/* ── Pagination Controls (9 cards / 3x3 grid) ───────────── */}
      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-xl" style={{ backgroundColor: '#FFFFFF', border: '1px solid #D2DDD4' }}>
          <p className="text-xs font-medium text-slate-600">
            Showing <strong className="text-slate-900">{startIndex + 1}</strong> –{' '}
            <strong className="text-slate-900">{Math.min(startIndex + PAGE_SIZE, filteredTheses.length)}</strong> of{' '}
            <strong className="text-slate-900">{filteredTheses.length}</strong> theses
          </p>

          <nav aria-label="Archive pagination" className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              style={{
                backgroundColor: '#F3F6F3',
                color: '#173B28',
                border: '1.5px solid #D2DDD4',
              }}
            >
              ← Previous
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1).map(pageNum => {
              const isActive = pageNum === currentPage
              return (
                <button
                  key={pageNum}
                  type="button"
                  onClick={() => handlePageChange(pageNum)}
                  className="w-8 h-8 rounded-lg text-xs font-bold flex items-center justify-center transition-all cursor-pointer"
                  style={{
                    backgroundColor: isActive ? '#173B28' : '#F3F6F3',
                    color: isActive ? '#FFFFFF' : '#173B28',
                    border: isActive ? '1.5px solid #173B28' : '1.5px solid #D2DDD4',
                  }}
                  aria-current={isActive ? 'page' : undefined}
                >
                  {pageNum}
                </button>
              )
            })}

            <button
              type="button"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              style={{
                backgroundColor: '#F3F6F3',
                color: '#173B28',
                border: '1.5px solid #D2DDD4',
              }}
            >
              Next →
            </button>
          </nav>
        </div>
      )}
    </section>
  )
}
