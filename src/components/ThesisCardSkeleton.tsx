import React from 'react'

export default function ThesisCardSkeleton() {
  return (
    <article
      className="card flex flex-col overflow-hidden relative h-full animate-fade-in"
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        minHeight: '300px',
        backgroundColor: '#FFFFFF',
        border: '1.5px solid #D2DDD4',
        borderRadius: '1rem',
        boxShadow: '0 2px 8px rgba(17, 33, 23, 0.04)',
      }}
      aria-hidden="true"
    >
      {/* Top accent border skeleton */}
      <div
        style={{
          height: 3,
          background: 'linear-gradient(90deg, rgba(46, 106, 71, 0.35), rgba(143, 168, 133, 0.35))',
          flexShrink: 0,
        }}
      />

      <div
        style={{
          padding: '1.25rem 1.375rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.875rem',
          flex: 1,
        }}
      >
        {/* College · Program + Bookmark skeleton */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '0.5rem',
          }}
        >
          <div
            className="skeleton"
            style={{
              height: '0.75rem',
              width: '45%',
              borderRadius: '4px',
            }}
          />
          <div
            className="skeleton"
            style={{
              width: '1.75rem',
              height: '1.75rem',
              borderRadius: '9999px',
              flexShrink: 0,
            }}
          />
        </div>

        {/* Title (2 lines) */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem',
            marginTop: '0.25rem',
          }}
        >
          <div
            className="skeleton"
            style={{
              height: '1.125rem',
              width: '88%',
              borderRadius: '4px',
            }}
          />
          <div
            className="skeleton"
            style={{
              height: '1.125rem',
              width: '60%',
              borderRadius: '4px',
            }}
          />
        </div>

        {/* Authors · Year */}
        <div
          className="skeleton"
          style={{
            height: '0.75rem',
            width: '40%',
            borderRadius: '4px',
            marginTop: '0.125rem',
          }}
        />

        {/* Abstract (3 lines) */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem',
            margin: '0.5rem 0',
            flex: 1,
          }}
        >
          <div
            className="skeleton"
            style={{
              height: '0.75rem',
              width: '100%',
              borderRadius: '4px',
            }}
          />
          <div
            className="skeleton"
            style={{
              height: '0.75rem',
              width: '95%',
              borderRadius: '4px',
            }}
          />
          <div
            className="skeleton"
            style={{
              height: '0.75rem',
              width: '70%',
              borderRadius: '4px',
            }}
          />
        </div>

        {/* Tags chips row */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '0.375rem',
            marginTop: 'auto',
            paddingTop: '0.5rem',
          }}
        >
          <div
            className="skeleton"
            style={{
              height: '1.35rem',
              width: '4.5rem',
              borderRadius: '9999px',
            }}
          />
          <div
            className="skeleton"
            style={{
              height: '1.35rem',
              width: '5.25rem',
              borderRadius: '9999px',
            }}
          />
          <div
            className="skeleton"
            style={{
              height: '1.35rem',
              width: '3.75rem',
              borderRadius: '9999px',
            }}
          />
        </div>
      </div>
    </article>
  )
}

export function ThesisGridSkeleton({ count = 9 }: { count?: number }) {
  return (
    <div
      className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 animate-fade-in"
      role="status"
      aria-label="Loading thesis manuscripts"
    >
      {Array.from({ length: count }).map((_, idx) => (
        <ThesisCardSkeleton key={`thesis-skeleton-${idx}`} />
      ))}
    </div>
  )
}
