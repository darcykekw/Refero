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
  toggleThesisCollectionAction,
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

type ViewMode = 'list' | 'grid'
type SortBy = 'date_added' | 'year' | 'title' | 'views'

export default function BookmarksManager({
  initialCollections,
  initialTheses,
}: BookmarksManagerProps) {
  const router = useRouter()
  const [selectedCollectionId, setSelectedCollectionId] = useState<string | 'all'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [sortBy, setSortBy] = useState<SortBy>('date_added')
  const [selectedThesisId, setSelectedThesisId] = useState<string | null>(
    initialTheses[0]?.thesis.id ?? null
  )
  const [isPending, startTransition] = useTransition()
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [editingCollection, setEditingCollection] = useState<CollectionWithCount | null>(null)
  const [deletingCollection, setDeletingCollection] = useState<CollectionWithCount | null>(null)

  // Form fields
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

  // Filter & sort theses
  const filteredTheses = useMemo(() => {
    const filtered = initialTheses.filter(item => {
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

    // Sort
    return filtered.sort((a, b) => {
      if (sortBy === 'year') {
        return b.thesis.year_submitted - a.thesis.year_submitted
      }
      if (sortBy === 'title') {
        return a.thesis.title.localeCompare(b.thesis.title)
      }
      if (sortBy === 'views') {
        return b.thesis.view_count - a.thesis.view_count
      }
      // default: date_added (newest saved first)
      return new Date(b.saved_at).getTime() - new Date(a.saved_at).getTime()
    })
  }, [initialTheses, selectedCollectionId, searchQuery, sortBy])

  const activeCollection = useMemo(() => {
    if (selectedCollectionId === 'all') return null
    return collectionsMap.get(selectedCollectionId) || null
  }, [selectedCollectionId, collectionsMap])

  // Active thesis selected for the Zotero Inspector side pane
  const activeSelectedThesis = useMemo(() => {
    if (!selectedThesisId) return filteredTheses[0] ?? null
    return initialTheses.find(t => t.thesis.id === selectedThesisId) ?? filteredTheses[0] ?? null
  }, [selectedThesisId, initialTheses, filteredTheses])

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

  // Remove thesis from active collection or all
  const handleRemoveThesis = (thesisId: string) => {
    startTransition(async () => {
      const targetColId = selectedCollectionId !== 'all' ? selectedCollectionId : undefined
      const res = await removeBookmarkAction(thesisId, targetColId)
      if (res.success) {
        setToast({
          message: selectedCollectionId !== 'all'
            ? 'Removed from this collection.'
            : 'Removed from bookmarks.',
          type: 'success',
        })
        router.refresh()
      } else {
        setToast({ message: res.error || 'Failed to remove bookmark.', type: 'error' })
      }
    })
  }

  // Toggle collection membership from the Zotero inspector panel
  const handleToggleInspectorCollection = (thesisId: string, collectionId: string) => {
    startTransition(async () => {
      const res = await toggleThesisCollectionAction(thesisId, collectionId)
      if (res.success) {
        router.refresh()
      } else {
        setToast({ message: res.error || 'Failed to update collection', type: 'error' })
      }
    })
  }

  return (
    <div className="w-full max-w-7xl page-gutter py-6 sm:py-10 space-y-5">
      {/* Breadcrumb Bar */}
      <nav className="breadcrumb-bar" aria-label="Breadcrumb">
        <Link href="/">Home</Link>
        <span className="divider">/</span>
        <span className="current">Bookmarks & Library</span>
      </nav>

      {/* Toast Alert */}
      {toast && (
        <div
          style={{
            padding: '0.75rem 1.25rem',
            borderRadius: '10px',
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

      {/* ── Zotero-Style Workspace Shell ── */}
      <div
        className="card"
        style={{
          borderRadius: '16px',
          overflow: 'hidden',
          border: '1.5px solid #D2DDD4',
          boxShadow: '0 8px 30px -4px rgba(23, 59, 40, 0.08)',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Workspace Top Application Bar */}
        <div
          style={{
            padding: '0.75rem 1.25rem',
            backgroundColor: '#173B28',
            color: '#FFFFFF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid rgba(143, 168, 133, 0.25)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: '6px',
                background: 'linear-gradient(135deg, #2E6A47, #4A815B)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#FFF',
              }}
            >
              <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
                <path d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
              </svg>
            </div>
            <div>
              <span style={{ fontSize: '0.875rem', fontWeight: 700, letterSpacing: '0.02em' }}>
                REFERO RESEARCH LIBRARY
              </span>
              <span style={{ fontSize: '0.75rem', color: '#8FA885', marginLeft: '0.5rem' }}>
                • Zotero Collections
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.75rem', color: '#A3C49B' }}>
              {initialTheses.length} total saved items
            </span>
          </div>
        </div>

        {/* ── Main Split View ── */}
        <div style={{ display: 'flex', minHeight: '620px' }} className="flex-col md:flex-row">

          {/* ──── LEFT PANE: My Library & Collections (Zotero Style Tree) ──── */}
          <aside
            style={{
              backgroundColor: '#FAFDF9',
              borderRight: '1.5px solid #E5ECE6',
              display: 'flex',
              flexDirection: 'column',
              flexShrink: 0,
            }}
            className="w-full md:w-72 lg:w-80"
          >
            {/* Sidebar Header */}
            <div
              style={{
                padding: '0.875rem 1rem',
                borderBottom: '1px solid #E5ECE6',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="#2E6A47">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#112117', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  My Library
                </span>
              </div>

              {/* + New Collection Folder Button */}
              <button
                type="button"
                onClick={handleOpenCreate}
                title="New Collection Folder"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '4px 8px',
                  borderRadius: '6px',
                  border: '1px solid rgba(46, 106, 71, 0.3)',
                  backgroundColor: '#E7EFE9',
                  color: '#173B28',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.backgroundColor = '#D2DDD4' }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.backgroundColor = '#E7EFE9' }}
              >
                <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                </svg>
                <span>+ New</span>
              </button>
            </div>

            {/* Sidebar Item List */}
            <div style={{ padding: '0.5rem', flex: 1, overflowY: 'auto' }}>
              {/* Root item: All Bookmarks */}
              <button
                type="button"
                onClick={() => setSelectedCollectionId('all')}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.55rem 0.75rem',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: selectedCollectionId === 'all' ? '#173B28' : 'transparent',
                  color: selectedCollectionId === 'all' ? '#FFFFFF' : '#112117',
                  fontSize: '0.8125rem',
                  fontWeight: selectedCollectionId === 'all' ? 700 : 500,
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'background 0.12s',
                  marginBottom: '2px',
                }}
                onMouseEnter={e => {
                  if (selectedCollectionId !== 'all') (e.currentTarget as HTMLElement).style.backgroundColor = '#EBF2EA'
                }}
                onMouseLeave={e => {
                  if (selectedCollectionId !== 'all') (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                  <svg width="16" height="16" fill={selectedCollectionId === 'all' ? '#FFFFFF' : '#2E6A47'} viewBox="0 0 24 24">
                    <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z" />
                  </svg>
                  <span>All Bookmarks</span>
                </div>
                <span
                  style={{
                    fontSize: '0.6875rem',
                    fontWeight: 700,
                    padding: '2px 7px',
                    borderRadius: '999px',
                    backgroundColor: selectedCollectionId === 'all' ? 'rgba(255,255,255,0.2)' : '#E5ECE6',
                    color: selectedCollectionId === 'all' ? '#FFFFFF' : '#173B28',
                  }}
                >
                  {initialTheses.length}
                </span>
              </button>

              {/* Collections section divider */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.625rem 0.5rem 0.35rem',
                  marginTop: '0.25rem',
                }}
              >
                <span style={{ fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#7C9283' }}>
                  Collections ({initialCollections.length})
                </span>
              </div>

              {/* Individual Collections Tree */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                {initialCollections.map(col => {
                  const isSelected = selectedCollectionId === col.id
                  return (
                    <div
                      key={col.id}
                      className="group"
                      style={{
                        position: 'relative',
                        display: 'flex',
                        alignItems: 'center',
                        borderRadius: '8px',
                        backgroundColor: isSelected ? 'rgba(46, 106, 71, 0.12)' : 'transparent',
                        borderLeft: isSelected ? `3px solid ${col.color || '#2E6A47'}` : '3px solid transparent',
                        transition: 'background 0.12s',
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => setSelectedCollectionId(col.id)}
                        style={{
                          flex: 1,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '0.5rem 0.625rem',
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          textAlign: 'left',
                          minWidth: 0,
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0 }}>
                          {/* Folder Icon with Custom Color */}
                          <svg
                            width="16"
                            height="16"
                            fill={col.color || '#2E6A47'}
                            viewBox="0 0 24 24"
                            style={{ flexShrink: 0 }}
                          >
                            <path d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z" />
                          </svg>

                          <span
                            style={{
                              fontSize: '0.8125rem',
                              fontWeight: isSelected ? 700 : 500,
                              color: isSelected ? '#173B28' : '#112117',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                            title={col.name}
                          >
                            {col.name}
                          </span>
                        </div>

                        <span
                          style={{
                            fontSize: '0.6875rem',
                            fontWeight: 700,
                            padding: '1px 6px',
                            borderRadius: '999px',
                            backgroundColor: isSelected ? 'rgba(46, 106, 71, 0.2)' : '#E5ECE6',
                            color: '#173B28',
                            flexShrink: 0,
                            marginLeft: '0.35rem',
                          }}
                        >
                          {col.thesis_count}
                        </span>
                      </button>

                      {/* Collection Context Actions: Edit / Delete */}
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '2px',
                          paddingRight: '6px',
                        }}
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleOpenEdit(col)
                          }}
                          title="Rename / Edit Collection"
                          style={{
                            width: 22,
                            height: 22,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            color: '#598567',
                            borderRadius: '4px',
                          }}
                          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.backgroundColor = '#D2DDD4' }}
                          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent' }}
                        >
                          <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>

                        {!col.is_default && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              setDeletingCollection(col)
                            }}
                            title="Delete Collection"
                            style={{
                              width: 22,
                              height: 22,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              background: 'none',
                              border: 'none',
                              cursor: 'pointer',
                              color: '#B91C1C',
                              borderRadius: '4px',
                            }}
                            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.backgroundColor = '#FEE2E2' }}
                            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent' }}
                          >
                            <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Sidebar Bottom Action */}
            <div style={{ padding: '0.75rem', borderTop: '1px solid #E5ECE6' }}>
              <button
                type="button"
                onClick={handleOpenCreate}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  borderRadius: '8px',
                  border: '1.5px dashed #B5C6B8',
                  backgroundColor: '#FFFFFF',
                  color: '#2E6A47',
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.borderColor = '#2E6A47'
                  ;(e.currentTarget as HTMLElement).style.backgroundColor = '#EBF2EA'
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.borderColor = '#B5C6B8'
                  ;(e.currentTarget as HTMLElement).style.backgroundColor = '#FFFFFF'
                }}
              >
                <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M12 4v16m8-8H4" />
                </svg>
                <span>New Collection</span>
              </button>
            </div>
          </aside>

          {/* ──── RIGHT PANE: Items List & Details Toolbar ──── */}
          <main style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, backgroundColor: '#FFFFFF' }}>

            {/* Collection Header Bar */}
            <div
              style={{
                padding: '0.875rem 1.25rem',
                borderBottom: '1px solid #E5ECE6',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '0.75rem',
                backgroundColor: '#FAFDF9',
              }}
            >
              {/* Collection Title & Info */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', minWidth: 0 }}>
                {activeCollection ? (
                  <svg width="22" height="22" fill={activeCollection.color || '#2E6A47'} viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
                    <path d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z" />
                  </svg>
                ) : (
                  <svg width="22" height="22" fill="#2E6A47" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
                    <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z" />
                  </svg>
                )}
                <div style={{ minWidth: 0 }}>
                  <h2
                    style={{
                      fontSize: '1.125rem',
                      fontWeight: 700,
                      color: '#112117',
                      fontFamily: "'Playfair Display', Georgia, serif",
                      lineHeight: 1.2,
                    }}
                  >
                    {activeCollection ? activeCollection.name : 'All Bookmarks'}
                  </h2>
                  <p style={{ fontSize: '0.75rem', color: '#7C9283', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {activeCollection?.description || `${filteredTheses.length} theses available`}
                  </p>
                </div>
              </div>

              {/* View mode & Action Controls */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {activeCollection && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginRight: '0.5rem' }}>
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(activeCollection)}
                      className="btn btn-ghost btn-sm"
                      style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem' }}
                      title="Rename or change color"
                    >
                      Edit Collection
                    </button>

                    {!activeCollection.is_default && (
                      <button
                        type="button"
                        onClick={() => setDeletingCollection(activeCollection)}
                        className="btn btn-sm"
                        style={{
                          fontSize: '0.75rem',
                          padding: '0.3rem 0.6rem',
                          backgroundColor: '#FEF2F2',
                          color: '#B91C1C',
                          border: '1px solid rgba(185,28,28,0.2)',
                        }}
                        title="Delete collection"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                )}

                {/* Sort Dropdown */}
                <select
                  value={sortBy}
                  onChange={e => setSortBy(e.target.value as SortBy)}
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    padding: '0.35rem 0.6rem',
                    borderRadius: '6px',
                    border: '1px solid #D2DDD4',
                    backgroundColor: '#FFFFFF',
                    color: '#173B28',
                    cursor: 'pointer',
                    outline: 'none',
                  }}
                >
                  <option value="date_added">Sort: Date Saved</option>
                  <option value="year">Sort: Year (Newest)</option>
                  <option value="title">Sort: Title (A-Z)</option>
                  <option value="views">Sort: Most Views</option>
                </select>

                {/* View Switcher: Zotero List vs Cards */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    backgroundColor: '#E5ECE6',
                    padding: '2px',
                    borderRadius: '6px',
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setViewMode('list')}
                    title="Zotero List View"
                    style={{
                      padding: '4px 8px',
                      borderRadius: '4px',
                      border: 'none',
                      backgroundColor: viewMode === 'list' ? '#FFFFFF' : 'transparent',
                      color: viewMode === 'list' ? '#173B28' : '#7C9283',
                      boxShadow: viewMode === 'list' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                    }}
                  >
                    <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                    <span>List</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setViewMode('grid')}
                    title="Card Grid View"
                    style={{
                      padding: '4px 8px',
                      borderRadius: '4px',
                      border: 'none',
                      backgroundColor: viewMode === 'grid' ? '#FFFFFF' : 'transparent',
                      color: viewMode === 'grid' ? '#173B28' : '#7C9283',
                      boxShadow: viewMode === 'grid' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                    }}
                  >
                    <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                    </svg>
                    <span>Grid</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Search Filter Bar */}
            <div
              style={{
                padding: '0.625rem 1.25rem',
                borderBottom: '1px solid #E5ECE6',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                backgroundColor: '#FFFFFF',
              }}
            >
              <div style={{ position: 'relative', flex: 1 }}>
                <span
                  style={{
                    position: 'absolute',
                    left: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: '#7C9283',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </span>
                <input
                  type="text"
                  placeholder={`Search by title, author, tag in ${activeCollection ? activeCollection.name : 'all bookmarks'}...`}
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.45rem 2rem 0.45rem 2rem',
                    fontSize: '0.8125rem',
                    borderRadius: '6px',
                    border: '1px solid #D2DDD4',
                    outline: 'none',
                    backgroundColor: '#FAFDF9',
                  }}
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    style={{
                      position: 'absolute',
                      right: '8px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      color: '#7C9283',
                      cursor: 'pointer',
                      fontSize: '0.7rem',
                    }}
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>

            {/* ──── Items Display Area ──── */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              {filteredTheses.length === 0 ? (
                <div
                  style={{
                    padding: '4rem 1.5rem',
                    textAlign: 'center',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.75rem',
                  }}
                >
                  <div
                    style={{
                      width: 52,
                      height: 52,
                      borderRadius: '50%',
                      backgroundColor: '#E7EFE9',
                      color: '#2E6A47',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                    </svg>
                  </div>
                  <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#112117', fontFamily: "'Playfair Display', Georgia, serif" }}>
                    {searchQuery
                      ? 'No matching results found'
                      : activeCollection
                      ? `"${activeCollection.name}" is empty`
                      : 'No bookmarks yet'}
                  </h3>
                  <p style={{ fontSize: '0.8125rem', color: '#598567', maxWidth: '380px' }}>
                    {searchQuery
                      ? 'Try clearing your search term or searching across all bookmarks.'
                      : activeCollection
                      ? 'Browse your saved theses or the repository and add theses to this collection.'
                      : 'Explore university theses and click the bookmark ribbon to save them to your library.'}
                  </p>
                  <div style={{ marginTop: '0.5rem' }}>
                    <Link href="/theses" className="btn btn-primary btn-sm">
                      Browse Repository
                    </Link>
                  </div>
                </div>
              ) : viewMode === 'list' ? (
                /* ── Zotero Table / List View ── */
                <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
                  <div style={{ flex: 1, overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem', textAlign: 'left' }}>
                      <thead>
                        <tr style={{ backgroundColor: '#FAFDF9', borderBottom: '1px solid #E5ECE6', color: '#7C9283', fontSize: '0.6875rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                          <th style={{ padding: '0.625rem 1rem' }}>Title</th>
                          <th style={{ padding: '0.625rem 0.75rem' }}>Authors</th>
                          <th style={{ padding: '0.625rem 0.75rem' }}>Year</th>
                          <th style={{ padding: '0.625rem 0.75rem' }}>Program</th>
                          <th style={{ padding: '0.625rem 0.75rem' }}>Collections</th>
                          <th style={{ padding: '0.625rem 1rem', textAlign: 'right' }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredTheses.map(item => {
                          const { thesis, collection_ids } = item
                          const isSelected = activeSelectedThesis?.thesis.id === thesis.id
                          return (
                            <tr
                              key={thesis.id}
                              onClick={() => setSelectedThesisId(thesis.id)}
                              style={{
                                borderBottom: '1px solid #F3F6F3',
                                backgroundColor: isSelected ? 'rgba(46, 106, 71, 0.08)' : 'transparent',
                                cursor: 'pointer',
                                transition: 'background 0.1s',
                              }}
                              onMouseEnter={e => {
                                if (!isSelected) (e.currentTarget as HTMLElement).style.backgroundColor = '#FAFDF9'
                              }}
                              onMouseLeave={e => {
                                if (!isSelected) (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'
                              }}
                            >
                              {/* Title Column with Thesis icon */}
                              <td style={{ padding: '0.75rem 1rem', maxWidth: '320px' }}>
                                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                                  <svg width="16" height="16" fill="#2E6A47" viewBox="0 0 24 24" style={{ flexShrink: 0, marginTop: '2px' }}>
                                    <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z" />
                                  </svg>
                                  <div>
                                    <Link
                                      href={`/theses/${thesis.id}`}
                                      style={{
                                        color: '#112117',
                                        fontWeight: 600,
                                        textDecoration: 'none',
                                        display: '-webkit-box',
                                        WebkitLineClamp: 2,
                                        WebkitBoxOrient: 'vertical',
                                        overflow: 'hidden',
                                        lineHeight: 1.3,
                                      }}
                                      onClick={e => e.stopPropagation()}
                                    >
                                      {thesis.title}
                                    </Link>
                                  </div>
                                </div>
                              </td>

                              {/* Authors Column */}
                              <td style={{ padding: '0.75rem 0.75rem', color: '#435A4C', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {thesis.authors}
                              </td>

                              {/* Year Column */}
                              <td style={{ padding: '0.75rem 0.75rem', color: '#7C9283', fontWeight: 600 }}>
                                {thesis.year_submitted}
                              </td>

                              {/* Program Column */}
                              <td style={{ padding: '0.75rem 0.75rem', color: '#598567', maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {thesis.program.prog_name}
                              </td>

                              {/* Collections Pills */}
                              <td style={{ padding: '0.75rem 0.75rem' }}>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px' }}>
                                  {collection_ids.map(cid => {
                                    const col = collectionsMap.get(cid)
                                    if (!col) return null
                                    return (
                                      <span
                                        key={col.id}
                                        style={{
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          gap: '3px',
                                          padding: '1px 6px',
                                          borderRadius: '4px',
                                          fontSize: '0.6875rem',
                                          fontWeight: 600,
                                          backgroundColor: '#F3F6F3',
                                          color: '#173B28',
                                          border: `1px solid ${col.color || '#D2DDD4'}50`,
                                        }}
                                      >
                                        <span style={{ width: 5, height: 5, borderRadius: '50%', backgroundColor: col.color || '#2E6A47' }} />
                                        {col.name}
                                      </span>
                                    )
                                  })}
                                </div>
                              </td>

                              {/* Action Buttons */}
                              <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>
                                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                                  <Link
                                    href={`/theses/${thesis.id}`}
                                    style={{
                                      fontSize: '0.75rem',
                                      fontWeight: 600,
                                      color: '#2E6A47',
                                      textDecoration: 'none',
                                      padding: '2px 6px',
                                      borderRadius: '4px',
                                      backgroundColor: '#E7EFE9',
                                    }}
                                    onClick={e => e.stopPropagation()}
                                  >
                                    View
                                  </Link>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      handleRemoveThesis(thesis.id)
                                    }}
                                    title="Remove from collection"
                                    style={{
                                      fontSize: '0.75rem',
                                      color: '#B91C1C',
                                      background: 'none',
                                      border: 'none',
                                      cursor: 'pointer',
                                      padding: '2px 4px',
                                    }}
                                  >
                                    ✕
                                  </button>
                                </div>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* ──── Zotero Inspector Side Panel (for selected item) ──── */}
                  {activeSelectedThesis && (
                    <div
                      style={{
                        width: '320px',
                        borderLeft: '1.5px solid #E5ECE6',
                        backgroundColor: '#FAFDF9',
                        padding: '1rem',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.875rem',
                        flexShrink: 0,
                        overflowY: 'auto',
                      }}
                      className="hidden lg:flex"
                    >
                      {/* Inspector Header */}
                      <div style={{ borderBottom: '1px solid #E5ECE6', paddingBottom: '0.75rem' }}>
                        <span style={{ fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#7C9283' }}>
                          Item Details (Zotero View)
                        </span>
                        <h4
                          style={{
                            fontFamily: "'Playfair Display', Georgia, serif",
                            fontSize: '0.9375rem',
                            fontWeight: 700,
                            color: '#112117',
                            marginTop: '0.25rem',
                            lineHeight: 1.3,
                          }}
                        >
                          {activeSelectedThesis.thesis.title}
                        </h4>
                      </div>

                      {/* Metadata fields */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.75rem' }}>
                        <div>
                          <strong style={{ color: '#173B28' }}>Authors:</strong>{' '}
                          <span style={{ color: '#435A4C' }}>{activeSelectedThesis.thesis.authors}</span>
                        </div>
                        {activeSelectedThesis.thesis.adviser && (
                          <div>
                            <strong style={{ color: '#173B28' }}>Adviser:</strong>{' '}
                            <span style={{ color: '#435A4C' }}>{activeSelectedThesis.thesis.adviser}</span>
                          </div>
                        )}
                        <div>
                          <strong style={{ color: '#173B28' }}>Year:</strong>{' '}
                          <span style={{ color: '#435A4C' }}>{activeSelectedThesis.thesis.year_submitted}</span>
                        </div>
                        <div>
                          <strong style={{ color: '#173B28' }}>Program:</strong>{' '}
                          <span style={{ color: '#435A4C' }}>{activeSelectedThesis.thesis.program.prog_name}</span>
                        </div>
                        <div>
                          <strong style={{ color: '#173B28' }}>College:</strong>{' '}
                          <span style={{ color: '#435A4C' }}>{activeSelectedThesis.thesis.college.college_name}</span>
                        </div>
                      </div>

                      {/* Collections Checkbox Manager (Interactive in Inspector) */}
                      <div style={{ borderTop: '1px solid #E5ECE6', paddingTop: '0.75rem' }}>
                        <p style={{ fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#7C9283', marginBottom: '0.5rem' }}>
                          In Collections
                        </p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          {initialCollections.map(col => {
                            const isInCol = activeSelectedThesis.collection_ids.includes(col.id)
                            return (
                              <label
                                key={col.id}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '6px',
                                  fontSize: '0.75rem',
                                  color: '#112117',
                                  cursor: 'pointer',
                                  padding: '3px 4px',
                                  borderRadius: '4px',
                                }}
                              >
                                <input
                                  type="checkbox"
                                  checked={isInCol}
                                  onChange={() => handleToggleInspectorCollection(activeSelectedThesis.thesis.id, col.id)}
                                  style={{ accentColor: col.color || '#2E6A47', cursor: 'pointer' }}
                                />
                                <span style={{ width: 7, height: 7, borderRadius: '50%', backgroundColor: col.color || '#2E6A47' }} />
                                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {col.name}
                                </span>
                              </label>
                            )
                          })}
                        </div>
                      </div>

                      {/* Abstract summary */}
                      <div style={{ borderTop: '1px solid #E5ECE6', paddingTop: '0.75rem', flex: 1 }}>
                        <p style={{ fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#7C9283', marginBottom: '0.25rem' }}>
                          Abstract Preview
                        </p>
                        <p style={{ fontSize: '0.75rem', color: '#435A4C', lineHeight: 1.5, maxHeight: '120px', overflowY: 'auto' }}>
                          {activeSelectedThesis.thesis.abstract}
                        </p>
                      </div>

                      {/* Actions */}
                      <div style={{ display: 'flex', gap: '0.5rem', borderTop: '1px solid #E5ECE6', paddingTop: '0.75rem' }}>
                        <Link
                          href={`/theses/${activeSelectedThesis.thesis.id}`}
                          className="btn btn-primary btn-sm"
                          style={{ flex: 1, fontSize: '0.75rem' }}
                        >
                          Open Thesis →
                        </Link>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                /* ── Card Grid View ── */
                <div style={{ padding: '1.25rem' }} className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {filteredTheses.map(item => {
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
                          <div style={{ height: 3, background: 'linear-gradient(90deg, #2E6A47, #8FA885)', flexShrink: 0 }} />

                          <div style={{ padding: '1.25rem 1.375rem', display: 'flex', flexDirection: 'column', gap: '0.875rem', flex: 1 }}>
                            {/* Header: College + Bookmark button */}
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
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

                            {/* Collection Tags */}
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem' }}>
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
                                    <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: col.color || '#2E6A47' }} />
                                    {col.name}
                                  </span>
                                )
                              })}
                            </div>

                            {/* Footer */}
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
                                  style={{ fontSize: '0.75rem', fontWeight: 600, color: '#173B28', textDecoration: 'none' }}
                                >
                                  View Thesis →
                                </Link>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveThesis(thesis.id)}
                                  title="Remove from collection"
                                  style={{
                                    fontSize: '0.75rem',
                                    fontWeight: 600,
                                    color: '#B91C1C',
                                    background: 'none',
                                    border: 'none',
                                    cursor: 'pointer',
                                    padding: '2px 6px',
                                  }}
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
            </div>
          </main>
        </div>
      </div>

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
                  New Zotero Collection
                </h3>
                <p style={{ fontSize: '0.75rem', color: '#7C9283', marginTop: '0.25rem' }}>
                  Create a collection folder to organize your research papers.
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
                    placeholder="e.g. Artificial Intelligence, Marine Biology"
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
                    placeholder="Short description of this research group..."
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
                    Folder Color Badge
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
                  Edit Collection Folder
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
                    Folder Color Badge
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
              Delete Zotero Collection?
            </h3>
            <p style={{ fontSize: '0.875rem', color: '#598567', marginTop: '0.5rem', lineHeight: 1.5 }}>
              Are you sure you want to delete <strong>&ldquo;{deletingCollection.name}&rdquo;</strong>? The theses in this collection will remain safe in your library and the university repository.
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
