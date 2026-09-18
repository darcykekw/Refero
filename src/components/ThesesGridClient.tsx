'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import type { ThesisWithRelations } from '@/types/database'
import ThesisCard from '@/components/ThesisCard'
import { ThesisGridSkeleton } from '@/components/ThesisCardSkeleton'

type SortOption = 'newest' | 'oldest' | 'title_asc' | 'year_desc'

interface ThesesGridClientProps {
  initialUserTheses: ThesisWithRelations[]
  bookmarkMap: Record<string, string[]>
  userSignedIn: boolean
}

export default function ThesesGridClient({
  initialUserTheses,
  bookmarkMap,
  userSignedIn,
}: ThesesGridClientProps) {
  const searchParams = useSearchParams()
  const isUploaded = searchParams.get('uploaded') === 'true'
  const [showUploadToast, setShowUploadToast] = useState(isUploaded)
  const [localUploads, setLocalUploads] = useState<ThesisWithRelations[]>([])
  const [filterQuery, setFilterQuery] = useState('')
  const [selectedSort, setSelectedSort] = useState<SortOption>('newest')
  const [isSorting, setIsSorting] = useState<boolean>(false)
  const sortTimeoutRef = useRef<NodeJS.Timeout | null>(null)

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

  useEffect(() => {
    try {
      const raw = localStorage.getItem('refero_user_theses_v1')
      if (raw) {
        const parsed = JSON.parse(raw)
        if (Array.isArray(parsed)) {
          setLocalUploads(parsed)
        }
      }
    } catch {}

    const handleUpload = (e: Event) => {
      const customEvent = e as CustomEvent<{ thesis: ThesisWithRelations }>
      if (customEvent.detail?.thesis) {
        setLocalUploads(prev => [customEvent.detail.thesis, ...prev.filter(t => t.id !== customEvent.detail.thesis.id)])
      }
    }

    window.addEventListener('refero-thesis-uploaded', handleUpload)
    return () => window.removeEventListener('refero-thesis-uploaded', handleUpload)
  }, [])

  // Merge server initialUserTheses with locally cached uploads
  const allUserTheses = useMemo(() => {
    const map = new Map<string, ThesisWithRelations>()
    localUploads.forEach(t => map.set(t.id, t))
    initialUserTheses.forEach(t => {
      if (!map.has(t.id)) map.set(t.id, t)
    })
    return Array.from(map.values())
  }, [localUploads, initialUserTheses])

  const filteredTheses = useMemo(() => {
    let list = allUserTheses
    if (filterQuery.trim()) {
      const q = filterQuery.trim().toLowerCase()
      list = list.filter(t =>
        t.title.toLowerCase().includes(q) ||
        t.authors.toLowerCase().includes(q) ||
        t.abstract.toLowerCase().includes(q) ||
        (t.tags && t.tags.some(tag => tag.name.toLowerCase().includes(q)))
      )
    }

    // Apply sorting
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
      if (selectedSort === 'title_asc') {
        return (a.title || '').localeCompare(b.title || '')
      }
      return 0
    })

    return list
  }, [allUserTheses, filterQuery, selectedSort])

  if (!userSignedIn) {
    return (
      <div
        className="p-12 text-center rounded-2xl max-w-lg mx-auto space-y-4"
        style={{
          backgroundColor: '#FFFFFF',
          border: '1.5px solid #D2DDD4',
          boxShadow: '0 4px 20px rgba(17,33,23,0.06)',
        }}
      >
        <div className="text-4xl">🔐</div>
        <h2 className="text-xl font-bold font-serif text-slate-900">Sign in to view My Theses</h2>
        <p className="text-sm text-slate-600">
          You must be signed in to see, track, and manage your uploaded thesis manuscripts.
        </p>
        <Link href="/login" className="btn btn-primary inline-flex">
          Sign In
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Upload Success Toast */}
      {showUploadToast && (
        <div
          role="status"
          className="p-4 rounded-xl flex items-center justify-between gap-4 animate-fade-in"
          style={{
            backgroundColor: '#E7EFE9',
            border: '1.5px solid #2E6A47',
            color: '#173B28',
          }}
        >
          <div className="flex items-center gap-3">
            <span className="text-xl">✓</span>
            <div>
              <p className="text-sm font-bold">Thesis Uploaded Successfully!</p>
              <p className="text-xs text-emerald-900/80 mt-0.5">
                Your thesis manuscript has been submitted for verification. It is listed below in your repository uploads.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowUploadToast(false)}
            className="text-emerald-900 hover:text-emerald-950 text-sm font-bold px-2 py-1 cursor-pointer"
            aria-label="Dismiss message"
          >
            ✕
          </button>
        </div>
      )}

      {/* ── Filter toolbar ────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl" style={{ backgroundColor: '#FFFFFF', border: '1px solid #D2DDD4' }}>
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-slate-700">
            Total Submissions: <strong className="text-emerald-800">{allUserTheses.length}</strong>
          </span>
          <span className="text-slate-300">|</span>
          <span className="text-xs text-slate-500">
            {filteredTheses.length} matching search
          </span>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="relative flex-1 sm:w-64">
            <input
              type="search"
              value={filterQuery}
              onChange={e => setFilterQuery(e.target.value)}
              placeholder="Search your theses..."
              className="w-full text-xs text-slate-800 pl-8 pr-3 py-1.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
              style={{
                backgroundColor: '#F3F6F3',
                border: '1px solid #C4D3C6',
              }}
            />
            <svg className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>

          {/* Sort Select */}
          <div className="relative">
            <select
              value={selectedSort}
              onChange={e => handleSortChange(e.target.value as SortOption)}
              disabled={isSorting}
              className="text-xs font-semibold px-2.5 py-1.5 pr-7 rounded-lg cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-600 appearance-none shadow-xs disabled:opacity-80"
              style={{
                backgroundColor: '#F3F6F3',
                color: '#173B28',
                border: '1px solid #C4D3C6',
              }}
              title="Sort your theses"
            >
              <option value="newest">Newest</option>
              <option value="oldest">Oldest</option>
              <option value="year_desc">Year</option>
              <option value="title_asc">Title (A-Z)</option>
            </select>
            <svg
              className="w-3 h-3 absolute right-2 top-1/2 -translate-y-1/2 text-emerald-800 pointer-events-none"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
            </svg>
          </div>

          <Link href="/theses/upload" className="btn btn-primary btn-sm whitespace-nowrap">
            + Upload Thesis
          </Link>
        </div>
      </div>

      {/* ── My Theses Grid ────────────────────────────────────────── */}
      {isSorting ? (
        <ThesisGridSkeleton count={Math.min(6, Math.max(filteredTheses.length, 3))} />
      ) : filteredTheses.length > 0 ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filteredTheses.map(thesis => (
            <ThesisCard
              key={thesis.id}
              thesis={thesis}
              showActions
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
          <div className="text-4xl mb-3">📄</div>
          <h3 className="text-lg font-bold font-serif text-slate-900">
            {filterQuery ? 'No matching manuscripts found' : 'No theses uploaded yet'}
          </h3>
          <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">
            {filterQuery
              ? `No manuscripts match "${filterQuery}". Try different keywords.`
              : 'You have not uploaded any thesis manuscripts to Refero yet. Submit your first research work to make it accessible to the College of Sciences.'}
          </p>
          <div className="mt-5 flex justify-center gap-3">
            {filterQuery ? (
              <button
                type="button"
                onClick={() => setFilterQuery('')}
                className="btn btn-ghost btn-sm"
                style={{ backgroundColor: '#F3F6F3', border: '1px solid #D2DDD4' }}
              >
                Clear Search
              </button>
            ) : null}
            <Link href="/theses/upload" className="btn btn-primary btn-sm">
              + Upload a Thesis
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
