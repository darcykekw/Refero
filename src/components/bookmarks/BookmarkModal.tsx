'use client'

import { useState, useEffect, useTransition } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import type { Collection } from '@/types/database'
import {
  getThesisBookmarkStatusAction,
  updateThesisCollectionsAction,
  type BookmarkActionResult,
} from '@/app/actions/bookmarks'

interface BookmarkModalProps {
  thesisId: string
  thesisTitle: string
  isOpen: boolean
  onClose: () => void
  onStatusChange?: (isBookmarked: boolean, collectionIds: string[]) => void
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

export default function BookmarkModal({
  thesisId,
  thesisTitle,
  isOpen,
  onClose,
  onStatusChange,
}: BookmarkModalProps) {
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const [loading, setLoading] = useState(true)
  const [isSignedIn, setIsSignedIn] = useState(true)
  const [collections, setCollections] = useState<Collection[]>([])
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [isPending, startTransition] = useTransition()
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  // New collection inline form state
  const [showNewForm, setShowNewForm] = useState(false)
  const [newColName, setNewColName] = useState('')
  const [newColColor, setNewColColor] = useState('#2E6A47')

  useEffect(() => {
    setMounted(true)
  }, [])

  // Lock body scroll when modal is open to prevent page jumps
  useEffect(() => {
    if (!isOpen) return
    const orig = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = orig
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return

    setLoading(true)
    setShowNewForm(false)
    setNewColName('')
    setToast(null)

    getThesisBookmarkStatusAction(thesisId).then(data => {
      setIsSignedIn(data.isSignedIn)
      let allCols = data.collections ?? []
      try {
        const raw = localStorage.getItem('refero_user_collections_v1')
        if (raw) {
          const localCols: Collection[] = JSON.parse(raw)
          const existingIds = new Set(allCols.map(c => c.id))
          const toAdd = localCols.filter(c => !existingIds.has(c.id))
          allCols = [...allCols, ...toAdd]
        }
      } catch {}
      setCollections(allCols)

      let initialSelected = data.selectedCollectionIds ?? []
      try {
        const rawB = localStorage.getItem('refero_user_bookmarks_v1')
        if (rawB) {
          const bMap = JSON.parse(rawB)
          if (bMap[thesisId] && Array.isArray(bMap[thesisId])) {
            initialSelected = Array.from(new Set([...initialSelected, ...bMap[thesisId]]))
          }
        }
      } catch {}

      setSelectedIds(initialSelected)
      setLoading(false)
    }).catch(err => {
      console.warn('Error fetching bookmark status:', err)
      let allCols: Collection[] = []
      try {
        const raw = localStorage.getItem('refero_user_collections_v1')
        if (raw) allCols = JSON.parse(raw)
      } catch {}
      setCollections(allCols)

      let initialSelected: string[] = []
      try {
        const rawB = localStorage.getItem('refero_user_bookmarks_v1')
        if (rawB) {
          const bMap = JSON.parse(rawB)
          if (bMap[thesisId] && Array.isArray(bMap[thesisId])) {
            initialSelected = bMap[thesisId]
          }
        }
      } catch {}

      setSelectedIds(initialSelected)
      setLoading(false)
    })
  }, [isOpen, thesisId])

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen || !mounted) return null

  const toggleCollection = (colId: string) => {
    setSelectedIds(prev =>
      prev.includes(colId) ? prev.filter(id => id !== colId) : [...prev, colId]
    )
  }

  const handleSave = () => {
    startTransition(async () => {
      let res: BookmarkActionResult | null = null
      try {
        res = await updateThesisCollectionsAction(
          thesisId,
          selectedIds,
          showNewForm && newColName.trim() ? newColName.trim() : undefined,
          newColColor
        )
      } catch (err) {
        console.warn('updateThesisCollectionsAction error:', err)
      }

      const finalIds = res?.success
        ? (res.collectionIds ?? selectedIds)
        : [...selectedIds]

      if (!res?.success && showNewForm && newColName.trim()) {
        const localId = 'col_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7)
        const newLocalCol = {
          id: localId,
          user_id: 'local',
          name: newColName.trim(),
          description: '',
          color: newColColor,
          is_default: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          thesis_count: 1,
        }
        finalIds.push(localId)
        try {
          const raw = localStorage.getItem('refero_user_collections_v1')
          const existing = raw ? JSON.parse(raw) : []
          localStorage.setItem('refero_user_collections_v1', JSON.stringify([...existing, newLocalCol]))
        } catch {}
      }

      const isBookmarked = finalIds.length > 0

      // Sync local bookmarks and broadcast cross-component update
      try {
        const raw = localStorage.getItem('refero_user_bookmarks_v1')
        const map = raw ? JSON.parse(raw) : {}
        if (finalIds.length > 0) {
          map[thesisId] = finalIds
        } else {
          delete map[thesisId]
        }
        localStorage.setItem('refero_user_bookmarks_v1', JSON.stringify(map))
        window.dispatchEvent(new CustomEvent('refero-bookmark-changed', {
          detail: { thesisId, isBookmarked, collectionIds: finalIds }
        }))
      } catch {}

      if (onStatusChange) {
        onStatusChange(isBookmarked, finalIds)
      }

      // Close modal immediately so UI doesn't stutter/freeze
      onClose()

      // Refresh server components in background
      try {
        router.refresh()
      } catch {}
    })
  }

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="bookmark-modal-title"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
        backgroundColor: 'rgba(17, 33, 23, 0.65)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
        animation: 'fadeIn 0.15s ease-out',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '480px',
          backgroundColor: '#FFFFFF',
          borderRadius: '16px',
          boxShadow: '0 20px 40px -10px rgba(17, 33, 23, 0.25), 0 0 0 1px rgba(0, 0, 0, 0.05)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '90vh',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '1.25rem 1.5rem',
            borderBottom: '1px solid #E5ECE6',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'linear-gradient(180deg, #FAFDF9 0%, #FFFFFF 100%)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0 }}>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: '10px',
                background: 'rgba(46, 106, 71, 0.12)',
                color: '#173B28',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24">
                <path d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
              </svg>
            </div>
            <div style={{ minWidth: 0 }}>
              <h2
                id="bookmark-modal-title"
                style={{
                  fontSize: '1.125rem',
                  fontWeight: 700,
                  color: '#112117',
                  lineHeight: 1.2,
                  fontFamily: "'Playfair Display', Georgia, serif",
                }}
              >
                Save to Collection
              </h2>
              <p
                style={{
                  fontSize: '0.75rem',
                  color: '#7C9283',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  marginTop: '0.2rem',
                }}
                title={thesisTitle}
              >
                {thesisTitle}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: '#7C9283',
              width: 32,
              height: 32,
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background 0.15s, color 0.15s',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.background = '#F3F6F3'
              ;(e.currentTarget as HTMLElement).style.color = '#112117'
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.background = 'transparent'
              ;(e.currentTarget as HTMLElement).style.color = '#7C9283'
            }}
          >
            <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content Area */}
        <div style={{ padding: '1.25rem 1.5rem', overflowY: 'auto', flex: 1 }}>
          {toast && (
            <div
              style={{
                marginBottom: '1rem',
                padding: '0.625rem 0.875rem',
                borderRadius: '8px',
                fontSize: '0.8125rem',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                backgroundColor: toast.type === 'success' ? '#E7EFE9' : '#FEF2F2',
                color: toast.type === 'success' ? '#173B28' : '#991B1B',
                border: `1px solid ${toast.type === 'success' ? 'rgba(46, 106, 71, 0.2)' : 'rgba(185, 28, 28, 0.2)'}`,
              }}
            >
              <span>{toast.type === 'success' ? '✓' : '⚠'}</span>
              <span>{toast.message}</span>
            </div>
          )}

          {!isSignedIn ? (
            <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
              <p style={{ fontSize: '0.875rem', color: '#435A4C', marginBottom: '1.25rem' }}>
                You must be signed in to create collections and bookmark theses.
              </p>
              <button
                type="button"
                onClick={() => router.push(`/login?redirectTo=/theses/${thesisId}`)}
                className="btn btn-primary"
                style={{ width: '100%' }}
              >
                Sign In to Continue
              </button>
            </div>
          ) : loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', padding: '1rem 0' }}>
              {[1, 2, 3].map(i => (
                <div
                  key={i}
                  style={{
                    height: 48,
                    borderRadius: 10,
                    backgroundColor: '#F3F6F3',
                    animation: 'pulse 1.5s infinite ease-in-out',
                  }}
                />
              ))}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <p style={{ fontSize: '0.75rem', fontWeight: 600, color: '#7C9283', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>
                Select Collections
              </p>

              {collections.map(col => {
                const isSelected = selectedIds.includes(col.id)
                return (
                  <button
                    key={col.id}
                    type="button"
                    onClick={() => toggleCollection(col.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.75rem 1rem',
                      borderRadius: '10px',
                      border: isSelected ? `1.5px solid ${col.color || '#2E6A47'}` : '1.5px solid #E5ECE6',
                      backgroundColor: isSelected ? 'rgba(46, 106, 71, 0.05)' : '#FFFFFF',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.15s ease',
                      width: '100%',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <span
                        style={{
                          width: 12,
                          height: 12,
                          borderRadius: '50%',
                          backgroundColor: col.color || '#2E6A47',
                          flexShrink: 0,
                        }}
                      />
                      <div>
                        <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#112117' }}>
                          {col.name}
                        </span>
                        {col.is_default && (
                          <span
                            style={{
                              marginLeft: '0.5rem',
                              fontSize: '0.65rem',
                              fontWeight: 600,
                              color: '#7C9283',
                              backgroundColor: '#E5ECE6',
                              padding: '2px 6px',
                              borderRadius: 4,
                            }}
                          >
                            Default
                          </span>
                        )}
                      </div>
                    </div>

                    <div
                      style={{
                        width: 20,
                        height: 20,
                        borderRadius: '6px',
                        border: isSelected ? `2px solid ${col.color || '#2E6A47'}` : '2px solid #B5C6B8',
                        backgroundColor: isSelected ? (col.color || '#2E6A47') : 'transparent',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {isSelected && (
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      )}
                    </div>
                  </button>
                )
              })}

              {/* Inline Create Collection Form */}
              <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px dashed #E5ECE6' }}>
                {!showNewForm ? (
                  <button
                    type="button"
                    onClick={() => setShowNewForm(true)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      background: 'none',
                      border: 'none',
                      color: '#2E6A47',
                      fontSize: '0.8125rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      padding: '0.375rem 0',
                    }}
                  >
                    <span style={{ fontSize: '1rem', lineHeight: 1 }}>+</span>
                    Create new collection
                  </button>
                ) : (
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.625rem',
                      backgroundColor: '#F7FAF7',
                      padding: '0.875rem',
                      borderRadius: '10px',
                      border: '1px solid #D2DDD4',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <label htmlFor="new-col-name" style={{ fontSize: '0.75rem', fontWeight: 600, color: '#173B28' }}>
                        New Collection Name
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowNewForm(false)}
                        style={{ fontSize: '0.75rem', color: '#7C9283', background: 'none', border: 'none', cursor: 'pointer' }}
                      >
                        Cancel
                      </button>
                    </div>

                    <input
                      id="new-col-name"
                      type="text"
                      placeholder="e.g. Artificial Intelligence, Thesis Drafts"
                      value={newColName}
                      onChange={e => setNewColName(e.target.value)}
                      maxLength={80}
                      autoFocus
                      style={{
                        width: '100%',
                        padding: '0.5rem 0.75rem',
                        fontSize: '0.8125rem',
                        borderRadius: '6px',
                        border: '1px solid #B5C6B8',
                        outline: 'none',
                        backgroundColor: '#FFFFFF',
                      }}
                    />

                    {/* Color Presets */}
                    <div>
                      <p style={{ fontSize: '0.7rem', color: '#7C9283', marginBottom: '0.35rem' }}>
                        Theme Color
                      </p>
                      <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap' }}>
                        {COLOR_PALETTE.map(item => (
                          <button
                            key={item.value}
                            type="button"
                            onClick={() => setNewColColor(item.value)}
                            title={item.name}
                            style={{
                              width: 22,
                              height: 22,
                              borderRadius: '50%',
                              backgroundColor: item.value,
                              border: newColColor === item.value ? '2px solid #112117' : '2px solid transparent',
                              boxShadow: newColColor === item.value ? '0 0 0 2px rgba(46, 106, 71, 0.4)' : 'none',
                              cursor: 'pointer',
                              transition: 'transform 0.1s',
                            }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        {isSignedIn && (
          <div
            style={{
              padding: '1rem 1.5rem',
              borderTop: '1px solid #E5ECE6',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: '0.75rem',
              backgroundColor: '#FAFDF9',
            }}
          >
            <button
              type="button"
              onClick={onClose}
              className="btn btn-ghost btn-sm"
              disabled={isPending}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isPending || loading}
              className="btn btn-primary btn-sm"
              style={{ minWidth: '110px' }}
            >
              {isPending ? (
                <>
                  <span className="spinner h-3.5 w-3.5 mr-1" />
                  Saving…
                </>
              ) : (
                'Save Changes'
              )}
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body
  )
}
