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
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3, 4, 5, 6].map(i => (
          <div key={i} className="card p-5 space-y-3">
            <div className="h-3 w-32 rounded skeleton" />
            <div className="h-5 w-full rounded skeleton" />
            <div className="h-3 w-3/4 rounded skeleton" />
            <div className="h-3 w-full rounded skeleton" />
            <div className="h-3 w-5/6 rounded skeleton" />
          </div>
        ))}
      </div>
    </div>
  )
}
