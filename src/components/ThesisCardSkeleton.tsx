import React from 'react'

export default function ThesisCardSkeleton() {
  return (
    <div
      className="flex flex-col gap-2.5 w-full animate-fade-in"
      role="status"
      aria-label="Loading thesis card"
    >
      {/* Large rounded rectangle preview canvas */}
      <div
        className="w-full aspect-[16/10] sm:aspect-[4/3] rounded-2xl skeleton"
        style={{
          backgroundColor: '#E5ECE6',
          borderRadius: '1.125rem',
          minHeight: '160px',
        }}
      />

      {/* Meta row: dot/icon + title bar */}
      <div className="flex items-center gap-2 pt-0.5 px-0.5">
        <div
          className="w-4 h-4 rounded-md skeleton shrink-0"
          style={{
            backgroundColor: '#D6E0D8',
            borderRadius: '0.375rem',
          }}
        />
        <div
          className="h-3.5 w-3/4 rounded-full skeleton"
          style={{
            backgroundColor: '#D6E0D8',
            borderRadius: '9999px',
          }}
        />
      </div>
    </div>
  )
}

export function ThesisGridSkeleton({ count = 9 }: { count?: number }) {
  return (
    <div
      className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 animate-fade-in w-full"
      role="status"
      aria-label="Loading thesis manuscripts"
    >
      {Array.from({ length: count }).map((_, idx) => (
        <ThesisCardSkeleton key={`thesis-skeleton-${idx}`} />
      ))}
    </div>
  )
}
