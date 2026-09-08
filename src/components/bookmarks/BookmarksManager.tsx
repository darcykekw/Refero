'use client'

import { useState, useTransition, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { CollectionWithCount } from '@/types/database'
import type { EnrichedBookmarkedThesis } from '@/lib/bookmarks'
import {
  createCollectionAction,
  updateCollectionAction,
  deleteCollectionAction,
  removeBookmarkAction,
} from '@/app/actions/bookmarks'
import BookmarkButton from './BookmarkButton'

interface BookmarksManagerProps {
  initialCollections: CollectionWithCount[]
  initialTheses: EnrichedBookmarkedThesis[]
  initialTotalCount: number
}

const COLOR_PALETTE = [
  { name: 'Emerald', value: '#2E6A47' },
  { name: 'Deep Pine', value: '#173B28' },
  { name: 'Sage', value: '#598567' },
  { name: 'Amber Gold', value: '#D1A354' },
  { name: 'Ocean Blue', value: '#0284C7' },
  { name: 'Indigo', value: '#6366F1' },
  { name: 'Berry', value: '#BE185D' },
  { name: 'Slate', value: '#475569' },
]

export default function BookmarksManager({
  initialCollections,
  initialTheses,
}: BookmarksManagerProps) {
  const router = useRouter()
  const [selectedCollectionId, setSelectedCollectionId] = useState<string | 'all'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [isPending, startTransition] = useTransition()
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [editingCollection, setEditingCollection] = useState<CollectionWithCount | null>(null)
  const [deletingCollection, setDeletingCollection] = useState<CollectionWithCount | null>(null)

  // Create/Edit form fields
  const [formName, setFormName] = useState('')
  const [formDesc, setFormDesc] = useState('')
  const [formColor, setFormColor] = useState('#2E6A47')

  // Map collections for quick lookup
  const collectionsMap = useMemo(() => {
    const map = new Map<string, CollectionWithCount>()
    for (const c of initialCollections) {
      map.set(c.id, c)
    }
    return map
  }, [initialCollections])

  // Filter theses by collection and search query
  const filteredTheses = useMemo(() => {
    return initialTheses.filter(item => {
      // Collection filter
      if (selectedCollectionId !== 'all') {
        if (!item.collection_ids.includes(selectedCollectionId)) {
          return false
        }
      }

      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const matchTitle = item.thesis.title.toLowerCase().includes(q)
        const matchAuthors = item.thesis.authors.toLowerCase().includes(q)
        const matchCollege = item.thesis.college.college_name.toLowerCase().includes(q)
        const matchProgram = item.thesis.program.prog_name.toLowerCase().includes(q)
        const matchAbstract = item.thesis.abstract.toLowerCase().includes(q)
        const matchTags = item.thesis.tags.some(t => t.name.toLowerCase().includes(q))
        return matchTitle || matchAuthors || matchCollege || matchProgram || matchAbstract || matchTags
      }

      return true
    })
  }, [initialTheses, selectedCollectionId, searchQuery])

  const activeCollection = useMemo(() => {
    if (selectedCollectionId === 'all') return null
    return collectionsMap.get(selectedCollectionId) || null
  }, [selectedCollectionId, collectionsMap])

  // Open Create Modal
  const handleOpenCreate = () => {
    setFormName('')
    setFormDesc('')
    setFormColor('#2E6A47')
    setIsCreateOpen(true)
  }

  // Submit Create
  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formName.trim()) return

    startTransition(async () => {
      const res = await createCollectionAction({
        name: formName.trim(),
        description: formDesc.trim(),
        color: formColor,
      })

      if (res.success) {
        setToast({ message: `Collection "${formName.trim()}" created!`, type: 'success' })
        setIsCreateOpen(false)
        if (res.collection) {
          setSelectedCollectionId(res.collection.id)
        }
        router.refresh()
      } else {
        setToast({ message: res.error || 'Failed to create collection', type: 'error' })
      }
    })
  }

  // Open Edit Modal
  const handleOpenEdit = (col: CollectionWithCount) => {
    setEditingCollection(col)
    setFormName(col.name)
    setFormDesc(col.description || '')
    setFormColor(col.color || '#2E6A47')
  }

  // Submit Edit
  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingCollection || !formName.trim()) return

    startTransition(async () => {
      const res = await updateCollectionAction({
        collectionId: editingCollection.id,
        name: formName.trim(),
        description: formDesc.trim(),
        color: formColor,
      })

      if (res.success) {
        setToast({ message: 'Collection updated!', type: 'success' })
        setEditingCollection(null)
        router.refresh()
      } else {
        setToast({ message: res.error || 'Failed to update collection', type: 'error' })
      }
    })
  }

  // Submit Delete
  const handleDeleteSubmit = () => {
    if (!deletingCollection) return

    startTransition(async () => {
      const res = await deleteCollectionAction(deletingCollection.id)
      if (res.success) {
        setToast({ message: `Collection "${deletingCollection.name}" deleted.`, type: 'success' })
        setDeletingCollection(null)
        if (selectedCollectionId === deletingCollection.id) {
          setSelectedCollectionId('all')
        }
        router.refresh()
      } else {
        setToast({ message: res.error || 'Failed to delete collection', type: 'error' })
      }
    })
  }

  // Remove bookmark from active collection or all
  const handleRemoveThesis = (thesisId: string) => {
    startTransition(async () => {
      const targetColId = selectedCollectionId !== 'all' ? selectedCollectionId : undefined
      const res = await removeBookmarkAction(thesisId, targetColId)
      if (res.success) {
        setToast({
          message: selectedCollectionId !== 'all'
            ? 'Removed from this collection.'
            : 'Removed from all collections.',
          type: 'success',
        })
        router.refresh()
      } else {
        setToast({ message: res.error || 'Failed to remove bookmark.', type: 'error' })
      }
    })
  }

  return (
    <div className="w-full max-w-7xl page-gutter py-6 sm:py-10 space-y-6 sm:space-y-8">
      {/* Breadcrumbs */}
      <nav className="breadcrumb-bar" aria-label="Breadcrumb">
        <Link href="/">Home</Link>
        <span className="divider">/</span>
        <span className="current">Bookmarks & Collections</span>
      </nav>

      {/* Toast Alert */}
      {toast && (
        <div
          style={{
            padding: '0.875rem 1.25rem',
            borderRadius: '12px',
            fontSize: '0.875rem',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: toast.type === 'success' ? '#E7EFE9' : '#FEF2F2',
            color: toast.type === 'success' ? '#173B28' : '#991B1B',
            border: `1px solid ${toast.type === 'success' ? 'rgba(46, 106, 71, 0.3)' : 'rgba(185, 28, 28, 0.3)'}`,
            boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span>{toast.type === 'success' ? '✓' : '⚠'}</span>
            <span>{toast.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setToast(null)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', fontWeight: 700 }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Header Banner */}
      <div className="page-header-banner flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #2E6A47, #4A815B)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#FFFFFF',
                boxShadow: '0 4px 14px rgba(46, 106, 71, 0.35)',
              }}
            >
              <svg width="22" height="22" fill="currentColor" viewBox="0 0 24 24">
                <path d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold" style={{ fontFamily: "'Playfair Display', Georgia, serif", color: '#112117' }}>
                Bookmarks & Collections
              </h1>
              <p className="text-sm mt-0.5" style={{ color: '#598567', fontWeight: 500 }}>
                Curate, organize, and quickly access research theses for your academic work.
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={handleOpenCreate}
          className="btn btn-primary"
          style={{ alignSelf: 'flex-start' }}
        >
          <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M12 4v16m8-8H4" />
          </svg>
          <span>New Collection</span>
        </button>
      </div>

      {/* Search & Stats Bar */}
      <div className="card p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div style={{ position: 'relative', width: '100%', maxWidth: '420px' }}>
          <span
            style={{
              position: 'absolute',
              left: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#7C9283',
              pointerEvents: 'none',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </span>
          <input
            type="text"
            placeholder="Search within saved theses..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '0.625rem 2.25rem 0.625rem 2.5rem',
              fontSize: '0.875rem',
              borderRadius: '8px',
              border: '1.5px solid #D2DDD4',
              outline: 'none',
              backgroundColor: '#FAFDF9',
              color: '#112117',
              transition: 'border-color 0.15s',
            }}
            onFocus={(e) => { e.currentTarget.style.borderColor = '#2E6A47' }}
            onBlur={(e) => { e.currentTarget.style.borderColor = '#D2DDD4' }}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              style={{
                position: 'absolute',
                right: '10px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                color: '#7C9283',
                cursor: 'pointer',
                fontSize: '0.75rem',
                fontWeight: 700,
              }}
            >
              ✕
            </button>
          )}
        </div>

        <div className="flex items-center gap-4 text-xs sm:text-sm font-semibold text-slate-600">
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <strong style={{ color: '#173B28', fontSize: '1rem' }}>{initialTheses.length}</strong>
            <span>Saved Theses</span>
          </span>
          <span style={{ color: '#D2DDD4' }}>•</span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <strong style={{ color: '#173B28', fontSize: '1rem' }}>{initialCollections.length}</strong>
            <span>Collections</span>
          </span>
        </div>
      </div>

      {/* Collection Tabs */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
        {/* All Bookmarks Pill */}
        <button
          type="button"
          onClick={() => setSelectedCollectionId('all')}
          style={{
            padding: '0.5rem 1.1rem',
            borderRadius: '999px',
            fontSize: '0.8125rem',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.18s ease',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            border: selectedCollectionId === 'all'
              ? '1.5px solid #2E6A47'
              : '1.5px solid #D2DDD4',
            backgroundColor: selectedCollectionId === 'all'
              ? '#173B28'
              : '#FFFFFF',
            color: selectedCollectionId === 'all'
              ? '#FFFFFF'
              : '#435A4C',
            boxShadow: selectedCollectionId === 'all'
              ? '0 4px 12px rgba(23, 59, 40, 0.2)'
              : 'none',
          }}
        >
          <span>All Bookmarks</span>
          <span
            style={{
              padding: '1px 7px',
              borderRadius: '999px',
              fontSize: '0.75rem',
              fontWeight: 700,
              backgroundColor: selectedCollectionId === 'all' ? 'rgba(255, 255, 255, 0.25)' : '#E5ECE6',
              color: selectedCollectionId === 'all' ? '#FFFFFF' : '#173B28',
            }}
          >
            {initialTheses.length}
          </span>
        </button>

        {/* Individual Collection Tabs */}
        {initialCollections.map((col) => {
          const isSelected = selectedCollectionId === col.id
          return (
            <button
              key={col.id}
              type="button"
              onClick={() => setSelectedCollectionId(col.id)}
              style={{
                padding: '0.5rem 1.1rem',
                borderRadius: '999px',
                fontSize: '0.8125rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.18s ease',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                border: isSelected
                  ? `1.5px solid ${col.color || '#2E6A47'}`
                  : '1.5px solid #D2DDD4',
                backgroundColor: isSelected
                  ? (col.color || '#2E6A47')
                  : '#FFFFFF',
                color: isSelected
                  ? '#FFFFFF'
                  : '#435A4C',
                boxShadow: isSelected
                  ? '0 4px 12px rgba(0, 0, 0, 0.15)'
                  : 'none',
              }}
            >
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  backgroundColor: isSelected ? '#FFFFFF' : (col.color || '#2E6A47'),
                  flexShrink: 0,
                }}
              />
              <span>{col.name}</span>
              <span
                style={{
                  padding: '1px 7px',
                  borderRadius: '999px',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  backgroundColor: isSelected ? 'rgba(255, 255, 255, 0.25)' : '#E5ECE6',
                  color: isSelected ? '#FFFFFF' : '#173B28',
                }}
              >
                {col.thesis_count}
              </span>
            </button>
          )
        })}

        {/* "+ Create" shortcut button */}
        <button
          type="button"
          onClick={handleOpenCreate}
          style={{
            padding: '0.5rem 0.875rem',
            borderRadius: '999px',
            fontSize: '0.8125rem',
            fontWeight: 600,
            cursor: 'pointer',
            border: '1.5px dashed #B5C6B8',
            backgroundColor: 'transparent',
            color: '#2E6A47',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem',
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.borderColor = '#2E6A47'
            ;(e.currentTarget as HTMLElement).style.backgroundColor = '#EBF2EA'
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.borderColor = '#B5C6B8'
            ;(e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'
          }}
        >
          <span>+</span>
          <span>Add Collection</span>
        </button>
      </div>

      {/* Selected Collection Banner (if specific collection chosen) */}
      {activeCollection && (
        <div
          className="card p-4 sm:p-5"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1rem',
            borderLeft: `4px solid ${activeCollection.color || '#2E6A47'}`,
            backgroundColor: '#FAFDF9',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
              <span
                style={{
                  width: 14,
                  height: 14,
                  borderRadius: '50%',
                  backgroundColor: activeCollection.color || '#2E6A47',
                }}
              />
              <h2 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#112117' }}>
                {activeCollection.name}
              </h2>
              {activeCollection.is_default && (
                <span style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#7C9283', backgroundColor: '#E5ECE6', padding: '2px 6px', borderRadius: 4 }}>
                  Default Collection
                </span>
              )}
            </div>
            {activeCollection.description ? (
              <p style={{ fontSize: '0.8125rem', color: '#598567', marginTop: '0.25rem' }}>
                {activeCollection.description}
              </p>
            ) : (
              <p style={{ fontSize: '0.8125rem', color: '#7C9283', marginTop: '0.25rem' }}>
                No description provided.
              </p>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <button
              type="button"
              onClick={() => handleOpenEdit(activeCollection)}
              className="btn btn-ghost btn-sm"
              style={{ fontSize: '0.8125rem', height: 34 }}
            >
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              <span>Edit</span>
            </button>

            {!activeCollection.is_default && (
              <button
                type="button"
                onClick={() => setDeletingCollection(activeCollection)}
                className="btn btn-sm"
                style={{
                  fontSize: '0.8125rem',
                  height: 34,
                  backgroundColor: '#FEF2F2',
                  color: '#B91C1C',
                  border: '1px solid rgba(185, 28, 28, 0.2)',
                }}
              >
                <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                <span>Delete</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Theses Grid / Empty States */}
      {filteredTheses.length === 0 ? (
        <div
          className="card p-10 sm:p-16 text-center"
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '1rem',
          }}
        >
          <div
            style={{
              width: 60,
              height: 60,
              borderRadius: '50%',
              backgroundColor: '#E7EFE9',
              color: '#2E6A47',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
            </svg>
          </div>

          <div>
            <h3
              style={{
                fontFamily: "'Playfair Display', Georgia, serif",
                fontSize: '1.25rem',
                fontWeight: 700,
                color: '#112117',
              }}
            >
              {searchQuery
                ? 'No matching bookmarked theses found'
                : selectedCollectionId !== 'all'
                ? 'This collection is empty'
                : 'No bookmarked theses yet'}
            </h3>
            <p style={{ fontSize: '0.875rem', color: '#598567', maxWidth: '420px', marginTop: '0.25rem' }}>
              {searchQuery
                ? `No theses matching "${searchQuery}" in ${selectedCollectionId === 'all' ? 'any collection' : 'this collection'}.`
                : selectedCollectionId !== 'all'
                ? 'Add theses to this collection by clicking the bookmark ribbon on any thesis card.'
                : 'Save university theses to your personal library so you can quickly reference them anytime.'}
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
            {searchQuery ? (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="btn btn-ghost"
              >
                Clear Search
              </button>
            ) : (
              <Link href="/theses" className="btn btn-primary">
                Explore Theses Repository
              </Link>
            )}
          </div>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filteredTheses.map((item) => {
            const { thesis, collection_ids } = item
            const abstract = thesis.abstract.length > 170
              ? thesis.abstract.slice(0, 170).trimEnd() + '…'
              : thesis.abstract
            const isVerified = thesis.status === 'verified' || !thesis.status

            return (
              <div key={thesis.id} style={{ position: 'relative', display: 'flex', flexDirection: 'column' }}>
                {isVerified && (
                  <img
                    src="/verify.png"
                    alt="Verified"
                    title="Verified Thesis"
                    style={{
                      position: 'absolute',
                      top: -10,
                      right: -10,
                      zIndex: 10,
                      width: 36,
                      height: 36,
                      filter: 'drop-shadow(0 2px 5px rgba(0,0,0,0.25))',
                      pointerEvents: 'none',
                    }}
                  />
                )}

                <article
                  className="card card-hover"
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                    position: 'relative',
                    height: '100%',
                  }}
                >
                  {/* Top accent bar */}
                  <div style={{ height: 3, background: 'linear-gradient(90deg, #2E6A47, #8FA885)', flexShrink: 0 }} />

                  <div style={{ padding: '1.25rem 1.375rem', display: 'flex', flexDirection: 'column', gap: '0.875rem', flex: 1 }}>
                    {/* Header Row: College/Program + Bookmark Button */}
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem' }}>
                      <p style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.09em', textTransform: 'uppercase', color: '#2E6A47', lineHeight: 1.2 }}>
                        {thesis.college.college_name} · {thesis.program.prog_name}
                      </p>
                      <BookmarkButton
                        thesisId={thesis.id}
                        thesisTitle={thesis.title}
                        initialIsBookmarked={true}
                        size="sm"
                      />
                    </div>

                    {/* Title + Authors */}
                    <div>
                      <Link
                        href={`/theses/${thesis.id}`}
                        style={{
                          fontFamily: "'Playfair Display', Georgia, serif",
                          fontSize: '1.0625rem',
                          fontWeight: 700,
                          color: '#112117',
                          lineHeight: 1.3,
                          textDecoration: 'none',
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                          transition: 'color 0.15s',
                        }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#2E6A47' }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#112117' }}
                      >
                        {thesis.title}
                      </Link>
                      <p style={{ fontSize: '0.8125rem', color: '#7C9283', marginTop: '0.375rem', fontWeight: 500 }}>
                        {thesis.authors} · {thesis.year_submitted}
                      </p>
                    </div>

                    {/* Abstract */}
                    <p style={{ fontSize: '0.875rem', color: '#435A4C', lineHeight: 1.7, flex: 1 }}>
                      {abstract}
                    </p>

                    {/* Collection Tags where this thesis is saved */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem', paddingTop: '0.25rem' }}>
                      {collection_ids.map(cid => {
                        const col = collectionsMap.get(cid)
                        if (!col) return null
                        return (
                          <span
                            key={col.id}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '2px 8px',
                              borderRadius: '6px',
                              fontSize: '0.6875rem',
                              fontWeight: 600,
                              backgroundColor: '#F3F6F3',
                              color: '#173B28',
                              border: `1px solid ${col.color || '#D2DDD4'}40`,
                            }}
                          >
                            <span
                              style={{
                                width: 6,
                                height: 6,
                                borderRadius: '50%',
                                backgroundColor: col.color || '#2E6A47',
                              }}
                            />
                            {col.name}
                          </span>
                        )
                      })}
                    </div>

                    {/* Tags */}
                    {thesis.tags.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem' }}>
                        {thesis.tags.slice(0, 4).map(tag => (
                          <Link
                            key={tag.id}
                            href={`/theses?tag=${encodeURIComponent(tag.id)}`}
                            className="tag-chip"
                          >
                            {tag.name}
                          </Link>
                        ))}
                      </div>
                    )}

                    {/* Footer Row */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '0.75rem', borderTop: '1px solid #E5ECE6', marginTop: 'auto' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.75rem', color: '#7C9283', fontWeight: 500 }}>
                        <svg style={{ width: 13, height: 13 }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        {thesis.view_count.toLocaleString()}
                      </span>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Link
                          href={`/theses/${thesis.id}`}
                          style={{
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            color: '#173B28',
                            textDecoration: 'none',
                          }}
                        >
                          View Thesis →
                        </Link>
                        <button
                          type="button"
                          onClick={() => handleRemoveThesis(thesis.id)}
                          title={selectedCollectionId !== 'all' ? 'Remove from this collection' : 'Remove from bookmarks'}
                          style={{
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            color: '#B91C1C',
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            padding: '2px 6px',
                            borderRadius: '4px',
                          }}
                          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.backgroundColor = '#FEF2F2' }}
                          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent' }}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                </article>
              </div>
            )
          })}
        </div>
      )}

      {/* ── CREATE COLLECTION MODAL ── */}
      {isCreateOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="create-collection-title"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
            backgroundColor: 'rgba(17, 33, 23, 0.65)',
            backdropFilter: 'blur(6px)',
            WebkitBackdropFilter: 'blur(6px)',
          }}
          onClick={(e) => { if (e.target === e.currentTarget) setIsCreateOpen(false) }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '460px',
              backgroundColor: '#FFFFFF',
              borderRadius: '16px',
              boxShadow: '0 20px 40px -10px rgba(17, 33, 23, 0.25)',
              overflow: 'hidden',
            }}
          >
            <form onSubmit={handleCreateSubmit}>
              <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #E5ECE6' }}>
                <h3 id="create-collection-title" style={{ fontSize: '1.125rem', fontWeight: 700, color: '#112117', fontFamily: "'Playfair Display', Georgia, serif" }}>
                  Create New Collection
                </h3>
                <p style={{ fontSize: '0.75rem', color: '#7C9283', marginTop: '0.25rem' }}>
                  Group and organize your saved research papers by topic or course.
                </p>
              </div>

              <div style={{ padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label htmlFor="modal-col-name" style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#173B28', marginBottom: '0.35rem' }}>
                    Collection Name *
                  </label>
                  <input
                    id="modal-col-name"
                    type="text"
                    required
                    maxLength={80}
                    placeholder="e.g. Marine Biodiversity, Deep Learning"
                    value={formName}
                    onChange={e => setFormName(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.625rem 0.875rem',
                      fontSize: '0.875rem',
                      borderRadius: '8px',
                      border: '1.5px solid #D2DDD4',
                      outline: 'none',
                    }}
                  />
                </div>

                <div>
                  <label htmlFor="modal-col-desc" style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#173B28', marginBottom: '0.35rem' }}>
                    Description (optional)
                  </label>
                  <textarea
                    id="modal-col-desc"
                    rows={2}
                    maxLength={300}
                    placeholder="Short description of what theses belong here..."
                    value={formDesc}
                    onChange={e => setFormDesc(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.625rem 0.875rem',
                      fontSize: '0.875rem',
                      borderRadius: '8px',
                      border: '1.5px solid #D2DDD4',
                      outline: 'none',
                      resize: 'none',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#173B28', marginBottom: '0.35rem' }}>
                    Badge Color
                  </label>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {COLOR_PALETTE.map(item => (
                      <button
                        key={item.value}
                        type="button"
                        onClick={() => setFormColor(item.value)}
                        title={item.name}
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: '50%',
                          backgroundColor: item.value,
                          border: formColor === item.value ? '2.5px solid #112117' : '2.5px solid transparent',
                          boxShadow: formColor === item.value ? '0 0 0 2px rgba(46, 106, 71, 0.4)' : 'none',
                          cursor: 'pointer',
                        }}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid #E5ECE6', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', backgroundColor: '#FAFDF9' }}>
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="btn btn-ghost btn-sm"
                  disabled={isPending}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending || !formName.trim()}
                  className="btn btn-primary btn-sm"
                >
                  {isPending ? 'Creating…' : 'Create Collection'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── EDIT COLLECTION MODAL ── */}
      {editingCollection && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-collection-title"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
            backgroundColor: 'rgba(17, 33, 23, 0.65)',
            backdropFilter: 'blur(6px)',
            WebkitBackdropFilter: 'blur(6px)',
          }}
          onClick={(e) => { if (e.target === e.currentTarget) setEditingCollection(null) }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '460px',
              backgroundColor: '#FFFFFF',
              borderRadius: '16px',
              boxShadow: '0 20px 40px -10px rgba(17, 33, 23, 0.25)',
              overflow: 'hidden',
            }}
          >
            <form onSubmit={handleEditSubmit}>
              <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #E5ECE6' }}>
                <h3 id="edit-collection-title" style={{ fontSize: '1.125rem', fontWeight: 700, color: '#112117', fontFamily: "'Playfair Display', Georgia, serif" }}>
                  Edit Collection
                </h3>
              </div>

              <div style={{ padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label htmlFor="edit-col-name" style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#173B28', marginBottom: '0.35rem' }}>
                    Collection Name *
                  </label>
                  <input
                    id="edit-col-name"
                    type="text"
                    required
                    maxLength={80}
                    value={formName}
                    onChange={e => setFormName(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.625rem 0.875rem',
                      fontSize: '0.875rem',
                      borderRadius: '8px',
                      border: '1.5px solid #D2DDD4',
                      outline: 'none',
                    }}
                  />
                </div>

                <div>
                  <label htmlFor="edit-col-desc" style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#173B28', marginBottom: '0.35rem' }}>
                    Description
                  </label>
                  <textarea
                    id="edit-col-desc"
                    rows={2}
                    maxLength={300}
                    value={formDesc}
                    onChange={e => setFormDesc(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.625rem 0.875rem',
                      fontSize: '0.875rem',
                      borderRadius: '8px',
                      border: '1.5px solid #D2DDD4',
                      outline: 'none',
                      resize: 'none',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#173B28', marginBottom: '0.35rem' }}>
                    Badge Color
                  </label>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {COLOR_PALETTE.map(item => (
                      <button
                        key={item.value}
                        type="button"
                        onClick={() => setFormColor(item.value)}
                        title={item.name}
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: '50%',
                          backgroundColor: item.value,
                          border: formColor === item.value ? '2.5px solid #112117' : '2.5px solid transparent',
                          boxShadow: formColor === item.value ? '0 0 0 2px rgba(46, 106, 71, 0.4)' : 'none',
                          cursor: 'pointer',
                        }}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid #E5ECE6', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', backgroundColor: '#FAFDF9' }}>
                <button
                  type="button"
                  onClick={() => setEditingCollection(null)}
                  className="btn btn-ghost btn-sm"
                  disabled={isPending}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending || !formName.trim()}
                  className="btn btn-primary btn-sm"
                >
                  {isPending ? 'Saving…' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── DELETE CONFIRMATION MODAL ── */}
      {deletingCollection && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-collection-title"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
            backgroundColor: 'rgba(17, 33, 23, 0.65)',
            backdropFilter: 'blur(6px)',
            WebkitBackdropFilter: 'blur(6px)',
          }}
          onClick={(e) => { if (e.target === e.currentTarget) setDeletingCollection(null) }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '420px',
              backgroundColor: '#FFFFFF',
              borderRadius: '16px',
              boxShadow: '0 20px 40px -10px rgba(17, 33, 23, 0.25)',
              overflow: 'hidden',
              padding: '1.5rem',
            }}
          >
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: '50%',
                backgroundColor: '#FEF2F2',
                color: '#B91C1C',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '1rem',
              }}
            >
              <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </div>

            <h3 id="delete-collection-title" style={{ fontSize: '1.125rem', fontWeight: 700, color: '#112117' }}>
              Delete Collection?
            </h3>
            <p style={{ fontSize: '0.875rem', color: '#598567', marginTop: '0.5rem', lineHeight: 1.5 }}>
              Are you sure you want to delete <strong>&ldquo;{deletingCollection.name}&rdquo;</strong>? The theses in this collection will not be deleted from the university repository.
            </p>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
              <button
                type="button"
                onClick={() => setDeletingCollection(null)}
                className="btn btn-ghost btn-sm"
                disabled={isPending}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteSubmit}
                disabled={isPending}
                className="btn btn-sm"
                style={{
                  backgroundColor: '#B91C1C',
                  color: '#FFFFFF',
                  border: 'none',
                }}
              >
                {isPending ? 'Deleting…' : 'Delete Collection'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
