'use client'

import { useState, useMemo, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { Program, Tag, ThesisWithRelations } from '@/types/database'
import ThesisCard from '@/components/ThesisCard'

interface SearchInterfaceClientProps {
  initialTheses: ThesisWithRelations[]
  availableTags: Tag[]
  programs: Program[]
  bookmarkMap: Record<string, string[]>
  initialQuery?: string
  initialTag?: string
  initialYear?: number
  initialSort?: string
}

const PAGE_SIZE = 9

type SortOption = 'relevance' | 'newest' | 'oldest' | 'title_asc' | 'title_desc' | 'year_desc' | 'year_asc' | 'views'

const STOP_WORDS = new Set([
  'a', 'about', 'above', 'after', 'again', 'against', 'all', 'am', 'an', 'and', 'any', 'are', 'as', 'at',
  'be', 'because', 'been', 'before', 'being', 'below', 'between', 'both', 'but', 'by', 'can',
  'could', 'did', 'do', 'does', 'doing', 'down', 'during', 'each',
  'few', 'for', 'from', 'further', 'had', 'has', 'have', 'having', 'he', 'her',
  'here', 'hers', 'herself', 'him', 'himself', 'his', 'how', 'i', 'if', 'in', 'into', 'is', 'it', 'its',
  'itself', 'me', 'more', 'most', 'my', 'myself', 'no', 'nor', 'not', 'of', 'off', 'on',
  'once', 'only', 'or', 'other', 'our', 'ours', 'ourselves', 'out', 'over', 'own', 'same', 'she', 'should',
  'so', 'some', 'such', 'than', 'that', 'the', 'their', 'theirs', 'them', 'themselves', 'then',
  'there', 'these', 'they', 'this', 'those', 'through', 'to', 'too', 'under', 'until', 'up', 'very', 'was',
  'we', 'were', 'what', 'when', 'where', 'which', 'while', 'who', 'whom', 'why', 'with', 'you', 'your'
])

function getSafeTagName(tag: any): string {
  if (!tag) return ''
  if (typeof tag === 'string') return tag.trim()
  if (typeof tag === 'object') {
    if (typeof tag.name === 'string') return tag.name.trim()
    if (tag.tag && typeof tag.tag.name === 'string') return tag.tag.name.trim()
  }
  return ''
}

function formatTagDisplayName(name: string): string {
  if (!name) return ''
  return name.charAt(0).toUpperCase() + name.slice(1)
}

export default function SearchInterfaceClient({
  initialTheses,
  availableTags,
  programs,
  bookmarkMap,
  initialQuery = '',
  initialTag,
  initialYear,
  initialSort,
}: SearchInterfaceClientProps) {
  const router = useRouter()

  // Clean initial tags safely
  const initialTagList = useMemo(() => {
    if (!initialTag) return []
    try {
      const decoded = decodeURIComponent(initialTag).trim()
      return decoded
        .split(',')
        .map(t => t.trim())
        .filter(Boolean)
    } catch {
      return initialTag.split(',').map(t => t.trim()).filter(Boolean)
    }
  }, [initialTag])

  const [query, setQuery] = useState(initialQuery)
  const [selectedTagNames, setSelectedTagNames] = useState<string[]>(initialTagList)
  const [selectedYear, setSelectedYear] = useState<number | null>(initialYear ?? null)
  const [selectedProgramId, setSelectedProgramId] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState<number>(1)
  const [showAllTags, setShowAllTags] = useState<boolean>(false)

  // Avoid circular URL update effects
  const isFirstMount = useRef(true)

  // Sync when initialQuery changes (e.g., from server props)
  useEffect(() => {
    setQuery(initialQuery)
  }, [initialQuery])

  // Listen for query changes from navbar search or browser back/forward navigation
  useEffect(() => {
    function onQueryChange(e: Event) {
      const customEvent = e as CustomEvent<string>
      if (typeof customEvent.detail === 'string') {
        setQuery(customEvent.detail)
      }
    }
    function onPopState() {
      const params = new URLSearchParams(window.location.search)
      setQuery(params.get('q') || '')
      const tagParam = params.get('tag')
      if (tagParam) {
        setSelectedTagNames(tagParam.split(',').map(t => t.trim()).filter(Boolean))
      } else {
        setSelectedTagNames([])
      }
      const yearParam = params.get('year')
      setSelectedYear(yearParam ? Number(yearParam) : null)
      const progParam = params.get('program')
      setSelectedProgramId(progParam || null)
    }

    window.addEventListener('refero:query-change', onQueryChange)
    window.addEventListener('popstate', onPopState)
    return () => {
      window.removeEventListener('refero:query-change', onQueryChange)
      window.removeEventListener('popstate', onPopState)
    }
  }, [])

  // Reset pagination when filters change
  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false
      return
    }
    setCurrentPage(1)
  }, [query, selectedTagNames, selectedYear, selectedProgramId])

  // Update URL search params smoothly without reloading or conflicting with useSearchParams
  const updateUrlParams = useCallback((newQuery: string, tags: string[], year: number | null, progId: string | null) => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams()
    if (newQuery.trim()) params.set('q', newQuery.trim())
    if (tags.length > 0) params.set('tag', tags.join(','))
    if (year) params.set('year', String(year))
    if (progId) params.set('program', progId)

    const newUrl = params.toString() ? `/search?${params.toString()}` : '/search'
    window.history.replaceState(null, '', newUrl)
  }, [])

  // Sync state to URL bar
  useEffect(() => {
    updateUrlParams(query, selectedTagNames, selectedYear, selectedProgramId)
  }, [query, selectedTagNames, selectedYear, selectedProgramId, updateUrlParams])

  // Distinct available years from dataset
  const availableYears = useMemo(() => {
    const years = new Set<number>()
    if (Array.isArray(initialTheses)) {
      initialTheses.forEach(t => {
        if (t?.year_submitted && !isNaN(t.year_submitted)) {
          years.add(t.year_submitted)
        }
      })
    }
    return Array.from(years).sort((a, b) => b - a)
  }, [initialTheses])

  // Tag frequency map for display count badges
  const tagCounts = useMemo(() => {
    const counts = new Map<string, number>()
    if (Array.isArray(initialTheses)) {
      initialTheses.forEach(t => {
        if (Array.isArray(t?.tags)) {
          t.tags.forEach(rawTag => {
            const name = getSafeTagName(rawTag)
            if (name) {
              const lower = name.toLowerCase()
              counts.set(lower, (counts.get(lower) ?? 0) + 1)
            }
          })
        }
      })
    }
    return counts
  }, [initialTheses])

  // Clean deduplicated list of available tags harvested from verified theses and catalog
  const cleanAvailableTags = useMemo(() => {
    const seen = new Set<string>()
    const list: { id: string; name: string }[] = []

    // 1. Gather all tags directly from verified theses
    if (Array.isArray(initialTheses)) {
      initialTheses.forEach(t => {
        if (Array.isArray(t?.tags)) {
          t.tags.forEach(rawTag => {
            const name = getSafeTagName(rawTag)
            if (name && !seen.has(name.toLowerCase())) {
              seen.add(name.toLowerCase())
              list.push({
                id: (typeof rawTag === 'object' && rawTag?.id) ? rawTag.id : name,
                name,
              })
            }
          })
        }
      })
    }

    // 2. Also incorporate tags from availableTags
    if (Array.isArray(availableTags)) {
      availableTags.forEach((t, i) => {
        const name = getSafeTagName(t)
        if (name && !seen.has(name.toLowerCase())) {
          seen.add(name.toLowerCase())
          list.push({
            id: (typeof t === 'object' && t?.id) ? t.id : `tag-${i}`,
            name,
          })
        }
      })
    }
    return list
  }, [initialTheses, availableTags])

  // Sorted tags: ONLY show tags that actually have at least 1 verified thesis!
  // Ordered by frequency (highest count first), then alphabetically
  const sortedTags = useMemo(() => {
    return cleanAvailableTags
      .filter(t => (tagCounts.get(t.name.toLowerCase()) ?? 0) > 0)
      .sort((a, b) => {
        const countA = tagCounts.get(a.name.toLowerCase()) ?? 0
        const countB = tagCounts.get(b.name.toLowerCase()) ?? 0
        if (countB !== countA) return countB - countA
        return a.name.localeCompare(b.name)
      })
  }, [cleanAvailableTags, tagCounts])

  // Visible tags slice
  const displayedTags = showAllTags ? sortedTags : sortedTags.slice(0, 24)

  // Toggle tag selection safely
  const handleTagToggle = useCallback((tagName: string) => {
    const trimmed = tagName.trim()
    if (!trimmed) return

    setSelectedTagNames(prev => {
      const lower = trimmed.toLowerCase()
      const exists = prev.some(t => t.toLowerCase() === lower)
      if (exists) {
        return prev.filter(t => t.toLowerCase() !== lower)
      } else {
        return [...prev, trimmed]
      }
    })
  }, [])

  function handleClearAllFilters() {
    setQuery('')
    setSelectedTagNames([])
    setSelectedYear(null)
    setSelectedProgramId(null)
    if (typeof window !== 'undefined') {
      window.history.replaceState(null, '', '/search')
      window.dispatchEvent(new CustomEvent('refero:query-change', { detail: '' }))
    }
  }

  // ── Relevance calculation & comprehensive filtering ────────────────────────
  const filteredAndRankedTheses = useMemo(() => {
    if (!Array.isArray(initialTheses)) return []

    const cleanQuery = query.trim().toLowerCase()
    const activeTagsLower = selectedTagNames.map(t => t.toLowerCase())

    // Prepare query tokens
    const queryTokens = cleanQuery
      ? cleanQuery
          .split(/[\s,.;:!?\-+()"/]+/)
          .map(w => w.trim())
          .filter(w => w.length >= 2)
      : []

    const searchKeywords = queryTokens.filter(w => !STOP_WORDS.has(w))
    const effectiveKeywords = searchKeywords.length > 0 ? searchKeywords : queryTokens

    const scoredTheses: { thesis: ThesisWithRelations; score: number }[] = []

    for (const t of initialTheses) {
      if (!t) continue

      // 1. Year filter
      if (selectedYear !== null && t.year_submitted !== selectedYear) {
        continue
      }

      // 2. Program filter
      if (selectedProgramId !== null && t.program_id !== selectedProgramId) {
        continue
      }

      // 3. Tag filter: must match at least one selected tag
      const thesisTagNames: string[] = Array.isArray(t.tags)
        ? t.tags.map(getSafeTagName).filter(Boolean).map(n => n.toLowerCase())
        : []

      if (activeTagsLower.length > 0) {
        const matchesAnyTag = activeTagsLower.some(sel => thesisTagNames.includes(sel))
        if (!matchesAnyTag) {
          continue
        }
      }

      // 4. Query text search & relevance scoring
      let relevanceScore = 0

      if (cleanQuery) {
        const title = (t.title || '').toLowerCase()
        const authors = (t.authors || '').toLowerCase()
        const abstract = (t.abstract || '').toLowerCase()
        const progName = (t.program?.prog_name || '').toLowerCase()

        // Exact full query matches (highest priority)
        if (title.includes(cleanQuery)) {
          relevanceScore += 200
          if (title.startsWith(cleanQuery)) relevanceScore += 50
        }
        if (thesisTagNames.some(tag => tag === cleanQuery)) {
          relevanceScore += 150
        } else if (thesisTagNames.some(tag => tag.includes(cleanQuery))) {
          relevanceScore += 90
        }
        if (progName.includes(cleanQuery)) {
          relevanceScore += 80
        }
        if (authors.includes(cleanQuery)) {
          relevanceScore += 70
        }
        if (abstract.includes(cleanQuery)) {
          relevanceScore += 40
        }

        // Keyword matches
        let matchedKeywordCount = 0
        for (const kw of effectiveKeywords) {
          let kwMatched = false

          // Title keyword
          if (title.includes(kw)) {
            relevanceScore += 35
            kwMatched = true
          }

          // Tag keyword
          if (thesisTagNames.some(tag => tag.includes(kw))) {
            relevanceScore += 40
            kwMatched = true
          }

          // Program keyword
          if (progName.includes(kw)) {
            relevanceScore += 25
            kwMatched = true
          }

          // Author keyword
          if (authors.includes(kw)) {
            relevanceScore += 25
            kwMatched = true
          }

          // Abstract keyword (flexible substring/stem match)
          if (abstract.includes(kw)) {
            relevanceScore += 15
            kwMatched = true
          }

          if (kwMatched) {
            matchedKeywordCount++
          }
        }

        // Only include if there is at least one match
        if (relevanceScore === 0) {
          continue
        }

        // Bonus if all search keywords matched
        if (effectiveKeywords.length > 1 && matchedKeywordCount === effectiveKeywords.length) {
          relevanceScore += 50
        }
      } else {
        // No query text: base score can factor tag overlap
        if (activeTagsLower.length > 0) {
          const overlap = activeTagsLower.filter(sel => thesisTagNames.includes(sel)).length
          relevanceScore = overlap * 10
        }
      }

      scoredTheses.push({ thesis: t, score: relevanceScore })
    }

    // 5. Automatic Sorting: By relevance when query is present, newest first otherwise
    scoredTheses.sort((a, b) => {
      if (cleanQuery) {
        if (b.score !== a.score) return b.score - a.score
        return (b.thesis.year_submitted ?? 0) - (a.thesis.year_submitted ?? 0)
      }

      const dateA = a.thesis.date_added ? new Date(a.thesis.date_added).getTime() : 0
      const dateB = b.thesis.date_added ? new Date(b.thesis.date_added).getTime() : 0
      if (dateB !== dateA) return dateB - dateA
      return (b.thesis.year_submitted ?? 0) - (a.thesis.year_submitted ?? 0)
    })

    return scoredTheses.map(item => item.thesis)
  }, [initialTheses, query, selectedTagNames, selectedYear, selectedProgramId])

  // Pagination calculations
  const totalPages = Math.max(1, Math.ceil(filteredAndRankedTheses.length / PAGE_SIZE))
  const startIndex = (currentPage - 1) * PAGE_SIZE
  const paginatedTheses = filteredAndRankedTheses.slice(startIndex, startIndex + PAGE_SIZE)

  function handlePageChange(newPage: number) {
    setCurrentPage(newPage)
    const element = document.getElementById('search-results-top')
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' })
    }
  }

  const hasActiveFilters =
    query.trim().length > 0 ||
    selectedTagNames.length > 0 ||
    selectedYear !== null ||
    selectedProgramId !== null

  return (
    <div className="w-full max-w-7xl page-gutter py-6 sm:py-10 space-y-6 sm:space-y-8 animate-fade-in">
      {/* ── Breadcrumb ──────────────────────────────────────────────── */}
      <nav className="breadcrumb-bar" aria-label="Breadcrumb">
        <Link href="/">Home</Link>
        <span className="divider">/</span>
        <span className="current">Search Theses</span>
      </nav>


      {/* ── Available Tags Section ───────────────────────────────────── */}
      <div
        className="rounded-2xl p-5 sm:p-6 shadow-sm"
        style={{
          backgroundColor: '#FFFFFF',
          border: '1.5px solid #D2DDD4',
        }}
      >
        <div className="flex items-center justify-between gap-4 mb-3 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-base font-bold" style={{ color: '#173B28' }}>
              🏷️ Available Tags
            </span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
              {sortedTags.length} tags
            </span>
          </div>

          {selectedTagNames.length > 0 && (
            <button
              type="button"
              onClick={() => setSelectedTagNames([])}
              className="text-xs font-bold text-rose-700 hover:text-rose-900 bg-rose-50 hover:bg-rose-100 border border-rose-200 px-2.5 py-1 rounded-full transition-colors cursor-pointer"
            >
              Clear selected tags ({selectedTagNames.length}) ×
            </button>
          )}
        </div>

        <p className="text-xs text-slate-500 mb-3.5">
          Click any tag below to filter matching research manuscripts:
        </p>

        {/* Interactive Tag Chips */}
        <div className="flex flex-wrap gap-2 items-center">
          {displayedTags.map(tag => {
            const isSelected = selectedTagNames.some(t => t.toLowerCase() === tag.name.toLowerCase())
            const count = tagCounts.get(tag.name.toLowerCase()) ?? 0

            return (
              <button
                key={tag.id}
                type="button"
                onClick={() => handleTagToggle(tag.name)}
                className={`group text-xs font-semibold px-3 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-sm ${
                  isSelected
                    ? 'bg-[#173B28] text-white ring-2 ring-emerald-700 scale-105'
                    : 'bg-[#F3F7F4] text-[#244C33] border border-[#D2DDD4] hover:bg-emerald-100 hover:border-emerald-300'
                }`}
                aria-pressed={isSelected}
              >
                {isSelected && <span>✓</span>}
                <span>{formatTagDisplayName(tag.name)}</span>
                {count > 0 && (
                  <span
                    className={`text-[0.6875rem] px-1.5 py-0.5 rounded-full font-bold ${
                      isSelected
                        ? 'bg-emerald-900 text-emerald-200'
                        : 'bg-emerald-100 text-emerald-800 group-hover:bg-emerald-200'
                    }`}
                  >
                    {count}
                  </span>
                )}
              </button>
            )
          })}

          {sortedTags.length > 24 && (
            <button
              type="button"
              onClick={() => setShowAllTags(!showAllTags)}
              className="text-xs font-bold text-emerald-800 hover:text-emerald-950 underline underline-offset-4 px-2 py-1 transition-colors cursor-pointer"
            >
              {showAllTags ? 'Show fewer tags' : `+ ${sortedTags.length - 24} more tags`}
            </button>
          )}
        </div>
      </div>

      {/* ── Search Results Header & Filter Controls (Aligned in one row) ─ */}
      <div
        id="search-results-top"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '1rem',
          flexWrap: 'wrap',
          gap: '0.75rem',
        }}
        className="scroll-mt-24 pt-2"
      >
        {/* Left: Smaller Section Header Badge & Result Count */}
        <div className="flex items-center gap-3 flex-wrap">
          <div
            className="inline-flex items-center gap-2 bg-white rounded-xl shadow-sm"
            style={{
              padding: '0.35rem 0.85rem 0.35rem 0.6rem',
              border: '1px solid rgba(143, 168, 133, 0.35)',
            }}
          >
            <span
              style={{
                width: 3,
                height: '1rem',
                borderRadius: 999,
                background: 'linear-gradient(to bottom, #29593D, #8FA885)',
                display: 'block',
                flexShrink: 0,
              }}
            />
            <h2
              style={{
                fontFamily: "'Playfair Display', Georgia, serif",
                fontSize: '1.05rem',
                fontWeight: 700,
                color: '#112117',
                margin: 0,
                lineHeight: 1.2,
              }}
            >
              Search Results
            </h2>
          </div>

          {/* Results summary counter */}
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
            <p className="text-xs sm:text-sm font-semibold text-slate-700">
              Showing <strong className="text-emerald-900 font-bold">{filteredAndRankedTheses.length}</strong>{' '}
              {filteredAndRankedTheses.length === 1 ? 'relevant thesis' : 'relevant theses'}
              {query.trim() && (
                <span className="text-slate-500 font-normal"> for &ldquo;{query.trim()}&rdquo;</span>
              )}
            </p>
          </div>
        </div>

        {/* Right: Aligned filter controls (without large shared background) */}
        <div className="flex items-center flex-wrap gap-2.5">
          {/* Program Filter Dropdown (Optional) */}
          {programs.length > 0 && (
            <div className="flex items-center gap-1.5">
              <label htmlFor="search-program-select" className="text-xs font-bold text-emerald-900 tracking-wide uppercase">
                Program:
              </label>
              <div className="relative">
                <select
                  id="search-program-select"
                  value={selectedProgramId ?? ''}
                  onChange={e => setSelectedProgramId(e.target.value || null)}
                  className="text-xs font-semibold px-3 py-1.5 pr-8 rounded-xl cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-600 appearance-none shadow-sm max-w-[170px] truncate"
                  style={{
                    backgroundColor: '#FFFFFF',
                    color: '#173B28',
                    border: '1.5px solid #C4D3C6',
                  }}
                >
                  <option value="">All Programs</option>
                  {programs.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.prog_name}
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
          )}

          {/* Year Filter Dropdown */}
          <div className="flex items-center gap-1.5">
            <label htmlFor="search-year-select" className="text-xs font-bold text-emerald-900 tracking-wide uppercase">
              Year:
            </label>
            <div className="relative">
              <select
                id="search-year-select"
                value={selectedYear ?? ''}
                onChange={e => setSelectedYear(e.target.value ? Number(e.target.value) : null)}
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

          {/* Reset Filters button */}
          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleClearAllFilters}
              className="text-xs font-semibold px-3 py-1 rounded-full text-rose-700 hover:text-rose-900 bg-white border border-rose-200 cursor-pointer shadow-sm transition-colors"
            >
              Reset All ×
            </button>
          )}
        </div>
      </div>

      {/* ── Theses Grid (3x3 / 9 per page) ──────────────────────────── */}
      {paginatedTheses.length > 0 ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {paginatedTheses.map(thesis => (
            <ThesisCard
              key={thesis.id}
              thesis={thesis}
              activeTags={selectedTagNames}
              isBookmarked={Boolean(bookmarkMap[thesis.id]?.length)}
              onTagClick={handleTagToggle}
            />
          ))}
        </div>
      ) : (
        /* Empty State */
        <div
          className="p-12 text-center rounded-2xl shadow-sm"
          style={{
            backgroundColor: '#FFFFFF',
            border: '1.5px solid #D2DDD4',
          }}
        >
          <div className="text-4xl mb-3">🔍</div>
          <h2
            className="text-xl font-bold mb-1.5"
            style={{ fontFamily: "'Playfair Display', Georgia, serif", color: '#173B28' }}
          >
            No relevant manuscripts found
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 max-w-md mx-auto mb-5">
            {query.trim()
              ? `We couldn't find any verified theses matching "${query}". Try adjusting keywords, deselecting specific tags, or clearing filters.`
              : 'No theses found matching the selected combination of tags and year filters.'}
          </p>
          <button
            type="button"
            onClick={handleClearAllFilters}
            className="btn btn-primary inline-flex cursor-pointer text-xs"
          >
            Clear Search & Reset Filters
          </button>
        </div>
      )}

      {/* ── Pagination Controls ───────────────────────────────────────── */}
      {totalPages > 1 && (
        <div
          className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-2xl shadow-sm"
          style={{ backgroundColor: '#FFFFFF', border: '1.5px solid #D2DDD4' }}
        >
          <p className="text-xs font-medium text-slate-600">
            Showing <strong className="text-slate-900">{startIndex + 1}</strong> –{' '}
            <strong className="text-slate-900">
              {Math.min(startIndex + PAGE_SIZE, filteredAndRankedTheses.length)}
            </strong>{' '}
            of <strong className="text-slate-900">{filteredAndRankedTheses.length}</strong> theses
          </p>

          <nav aria-label="Search results pagination" className="flex items-center gap-1.5">
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
    </div>
  )
}
