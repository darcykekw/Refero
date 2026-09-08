'use client'

import { useState, useEffect } from 'react'
import BookmarkModal from './BookmarkModal'

interface BookmarkButtonProps {
  thesisId: string
  thesisTitle?: string
  initialIsBookmarked?: boolean
  variant?: 'icon' | 'button' | 'badge'
  size?: 'sm' | 'md'
  className?: string
}

export default function BookmarkButton({
  thesisId,
  thesisTitle = 'Thesis',
  initialIsBookmarked = false,
  variant = 'icon',
  size = 'md',
  className = '',
}: BookmarkButtonProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isBookmarked, setIsBookmarked] = useState(initialIsBookmarked)

  // Sync when initialIsBookmarked prop updates
  useEffect(() => {
    setIsBookmarked(initialIsBookmarked)
  }, [initialIsBookmarked])

  // Sync with local storage bookmarks and listen to cross-component changes
  useEffect(() => {
    try {
      const raw = localStorage.getItem('refero_user_bookmarks_v1')
      if (raw) {
        const map = JSON.parse(raw)
        if (map[thesisId] !== undefined) {
          setIsBookmarked(Array.isArray(map[thesisId]) && map[thesisId].length > 0)
        }
      }
    } catch {}

    const handleBookmarkChange = (e: Event) => {
      const customEvent = e as CustomEvent<{ thesisId: string; isBookmarked: boolean }>
      if (customEvent.detail && customEvent.detail.thesisId === thesisId) {
        setIsBookmarked(customEvent.detail.isBookmarked)
      }
    }

    window.addEventListener('refero-bookmark-changed', handleBookmarkChange)
    return () => window.removeEventListener('refero-bookmark-changed', handleBookmarkChange)
  }, [thesisId])

  const handleStatusChange = (newStatus: boolean) => {
    setIsBookmarked(newStatus)
  }

  return (
    <>
      {variant === 'icon' ? (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            setIsOpen(true)
          }}
          aria-label={isBookmarked ? 'Saved to collections' : 'Bookmark this thesis'}
          title={isBookmarked ? 'Saved to collection (Click to manage)' : 'Save to collection'}
          className={`bookmark-btn ${className}`}
          style={{
            width: size === 'sm' ? 32 : 36,
            height: size === 'sm' ? 32 : 36,
            borderRadius: '8px',
            border: isBookmarked ? '1px solid rgba(46, 106, 71, 0.45)' : '1px solid rgba(143, 168, 133, 0.3)',
            backgroundColor: isBookmarked ? '#E4EFE7' : 'rgba(255, 255, 255, 0.85)',
            color: isBookmarked ? '#2E6A47' : '#7C9283',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'all 0.18s ease',
            backdropFilter: 'blur(4px)',
            WebkitBackdropFilter: 'blur(4px)',
            boxShadow: isBookmarked ? '0 1px 4px rgba(46, 106, 71, 0.2)' : 'none',
          }}
          onMouseEnter={(e) => {
            if (!isBookmarked) {
              (e.currentTarget as HTMLElement).style.color = '#173B28'
              ;(e.currentTarget as HTMLElement).style.backgroundColor = '#F3F6F3'
              ;(e.currentTarget as HTMLElement).style.borderColor = 'rgba(46, 106, 71, 0.5)'
            } else {
              (e.currentTarget as HTMLElement).style.backgroundColor = '#D4E7DA'
            }
          }}
          onMouseLeave={(e) => {
            if (!isBookmarked) {
              (e.currentTarget as HTMLElement).style.color = '#7C9283'
              ;(e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(255, 255, 255, 0.85)'
              ;(e.currentTarget as HTMLElement).style.borderColor = 'rgba(143, 168, 133, 0.3)'
            } else {
              (e.currentTarget as HTMLElement).style.backgroundColor = '#E4EFE7'
            }
          }}
        >
          {isBookmarked ? (
            /* Filled Bookmark Icon */
            <svg
              width={size === 'sm' ? 16 : 18}
              height={size === 'sm' ? 16 : 18}
              viewBox="0 0 24 24"
              fill="#2E6A47"
              stroke="#2E6A47"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="drop-shadow-xs transition-transform duration-150 scale-105"
            >
              <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
            </svg>
          ) : (
            /* Outline Bookmark Icon */
            <svg
              width={size === 'sm' ? 15 : 17}
              height={size === 'sm' ? 15 : 17}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="transition-transform duration-150"
            >
              <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
            </svg>
          )}
        </button>
      ) : variant === 'button' ? (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            setIsOpen(true)
          }}
          className={`btn ${isBookmarked ? 'btn-primary' : 'btn-ghost'} ${size === 'sm' ? 'btn-sm' : ''} ${className}`}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
          {isBookmarked ? (
            <svg
              width={16}
              height={16}
              viewBox="0 0 24 24"
              fill="currentColor"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
            </svg>
          ) : (
            <svg
              width={16}
              height={16}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
            </svg>
          )}
          <span>{isBookmarked ? 'Saved to Collection' : 'Save to Collection'}</span>
        </button>
      ) : (
        /* Badge variant */
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            setIsOpen(true)
          }}
          className={`tag-chip ${isBookmarked ? 'is-active' : ''} ${className}`}
          style={{ cursor: 'pointer' }}
        >
          ★ {isBookmarked ? 'Saved in Collection' : 'Save to Collection'}
        </button>
      )}

      {isOpen && (
        <BookmarkModal
          thesisId={thesisId}
          thesisTitle={thesisTitle}
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
          onStatusChange={handleStatusChange}
        />
      )}
    </>
  )
}
