'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import type { Tag, ThesisWithRelations } from '@/types/database'
import ThesisCard from '@/components/ThesisCard'

interface ThesesGridClientProps {
  initialTheses: ThesisWithRelations[]
  initialUserUploads: ThesisWithRelations[]
  availableTags: Tag[]
  tagIds: string[]
  bookmarkMap: Record<string, string[]>
  query: string
  userSignedIn: boolean
}

export default function ThesesGridClient({
  initialTheses,
  initialUserUploads,
  availableTags,
  tagIds,
  bookmarkMap,
  query,
  userSignedIn,
}: ThesesGridClientProps) {
  const searchParams = useSearchParams()
  const isUploaded = searchParams.get('uploaded') === 'true'
  const [showUploadToast, setShowUploadToast] = useState(isUploaded)
  const [localUploads, setLocalUploads] = useState<ThesisWithRelations[]>([])

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

  // Merge server userUploads with localUploads
  const combinedUserUploads = [...localUploads, ...initialUserUploads.filter(t => !localUploads.some(l => l.id === t.id))]

  // Merge catalog theses with localUploads (filtered if search/tag active)
  let filteredLocal = [...localUploads]
  if (query) {
    const q = query.toLowerCase()
    filteredLocal = filteredLocal.filter(t =>
      t.title.toLowerCase().includes(q) ||
      t.authors.toLowerCase().includes(q) ||
      t.abstract.toLowerCase().includes(q)
    )
  }
  if (tagIds.length > 0) {
    filteredLocal = filteredLocal.filter(t =>
      t.tags && t.tags.some(tag => tagIds.includes(tag.id))
    )
  }

  const combinedCatalog = [
    ...filteredLocal,
    ...initialTheses.filter(t => !filteredLocal.some(l => l.id === t.id)),
  ]

  return (
    <div className="space-y-8">
      {/* Upload Success Toast */}
      {showUploadToast && (
        <div
          role="status"
          className="p-4 rounded-xl flex items-center justify-between gap-4"
          style={{
            backgroundColor: '#E7EFE9',
            border: '1.5px solid #2E6A47',
            color: '#173B28',
          }}
        >
          <div className="flex items-center gap-3">
            <span className="text-xl">✓</span>
            <div>
              <p className="text-sm font-bold">Thesis Submitted Successfully!</p>
              <p className="text-xs text-emerald-900/80 mt-0.5">
                Your thesis manuscript has been saved and is now accessible in the Refero repository.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowUploadToast(false)}
            className="text-emerald-900 hover:text-emerald-950 text-sm font-bold px-2 py-1"
            aria-label="Dismiss message"
          >
            ✕
          </button>
        </div>
      )}

      {/* ── My Uploads (only when not searching and signed in) ──────── */}
      {userSignedIn && !query && tagIds.length === 0 && combinedUserUploads.length > 0 && (
        <section>
          <div className="section-bar mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="h-5 w-1 rounded-full bg-emerald-700" />
              <h2
                className="text-xl font-bold"
                style={{ fontFamily: "'Playfair Display', Georgia, serif", color: '#112117' }}
              >
                My Theses
              </h2>
            </div>
            <Link href="/theses/upload" className="btn btn-primary btn-sm">
              + Upload
            </Link>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {combinedUserUploads.map(thesis => (
              <ThesisCard
                key={thesis.id}
                thesis={thesis}
                showActions
                isBookmarked={Boolean(bookmarkMap[thesis.id]?.length)}
              />
            ))}
          </div>
          <div className="mt-8 pt-6 border-t border-slate-200">
            <div className="section-header mb-4">
              <h2 className="section-title text-xl">All Theses</h2>
            </div>
          </div>
        </section>
      )}

      {/* ── Theses Grid ────────────────────────────────────────────── */}
      {combinedCatalog.length > 0 ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {combinedCatalog.map(thesis => (
            <ThesisCard
              key={thesis.id}
              thesis={thesis}
              activeTags={availableTags.filter(t => tagIds.includes(t.id)).map(t => t.name)}
              isBookmarked={Boolean(bookmarkMap[thesis.id]?.length)}
            />
          ))}
        </div>
      ) : (
        <div className="card p-14 text-center">
          <div className="text-4xl mb-3">🔍</div>
          <p className="font-semibold text-slate-700">No theses found</p>
          <p className="text-sm text-slate-400 mt-1">
            {query
              ? `No results for "${query}". Try different keywords.`
              : 'No theses match the current filters.'}
          </p>
          {(query || tagIds.length > 0) && (
            <Link href="/theses" className="btn btn-ghost btn-sm mt-4 inline-flex">
              Clear all filters
            </Link>
          )}
        </div>
      )}
    </div>
  )
}
