import { ThesisGridSkeleton } from '@/components/ThesisCardSkeleton'

export default function Loading() {
  return (
    <div className="max-w-7xl page-gutter py-10 space-y-8">
      {/* Search skeleton */}
      <div className="flex gap-3">
        <div className="flex-1 h-12 rounded-xl skeleton" />
      </div>

      {/* Filter bar skeleton */}
      <div className="flex gap-2">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="h-8 w-24 rounded-full skeleton" />
        ))}
      </div>

      {/* Card grid skeleton */}
      <ThesisGridSkeleton count={6} />
    </div>
  )
}
