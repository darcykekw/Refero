'use client'

import { useState } from 'react'
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
          aria-label={isBookmarked ? 'Edit bookmark collections' : 'Bookmark this thesis'}
          title={isBookmarked ? 'Bookmarked (Click to manage collections)' : 'Bookmark thesis'}
          className={`bookmark-btn ${className}`}
          style={{
            width: size === 'sm' ? 30 : 34,
            height: size === 'sm' ? 30 : 34,
            borderRadius: '8px',
            border: isBookmarked ? '1px solid rgba(46, 106, 71, 0.4)' : '1px solid rgba(143, 168, 133, 0.3)',
            backgroundColor: isBookmarked ? '#E7EFE9' : 'rgba(255, 255, 255, 0.85)',
            color: isBookmarked ? '#173B28' : '#7C9283',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'all 0.18s ease',
            backdropFilter: 'blur(4px)',
            WebkitBackdropFilter: 'blur(4px)',
          }}
          onMouseEnter={(e) => {
            if (!isBookmarked) {
              (e.currentTarget as HTMLElement).style.color = '#173B28'
              ;(e.currentTarget as HTMLElement).style.backgroundColor = '#F3F6F3'
              ;(e.currentTarget as HTMLElement).style.borderColor = 'rgba(46, 106, 71, 0.5)'
            }
          }}
          onMouseLeave={(e) => {
            if (!isBookmarked) {
              (e.currentTarget as HTMLElement).style.color = '#7C9283'
              ;(e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(255, 255, 255, 0.85)'
              ;(e.currentTarget as HTMLElement).style.borderColor = 'rgba(143, 168, 133, 0.3)'
            }
          }}
        >
          <svg
            width={size === 'sm' ? 14 : 16}
            height={size === 'sm' ? 14 : 16}
            viewBox="0 0 24 24"
            fill={isBookmarked ? 'currentColor' : 'none'}
            stroke="currentColor"
            strokeWidth={isBookmarked ? 1 : 2}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
          </svg>
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
          <svg
            width={16}
            height={16}
            viewBox="0 0 24 24"
            fill={isBookmarked ? 'currentColor' : 'none'}
            stroke="currentColor"
            strokeWidth={isBookmarked ? 1 : 2}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
          </svg>
          <span>{isBookmarked ? 'Bookmarked' : 'Save Thesis'}</span>
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
          ★ {isBookmarked ? 'Bookmarked' : 'Bookmark'}
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
