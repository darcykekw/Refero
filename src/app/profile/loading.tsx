export default function Loading() {
  return (
    <div className="max-w-5xl page-gutter py-10 space-y-10">
      {/* Profile header card */}
      <div className="card p-6 sm:p-8 space-y-6">
        <div className="flex items-start gap-4">
          <div className="h-16 w-16 rounded-full skeleton shrink-0" />
          <div className="space-y-2 flex-1">
            <div className="h-6 w-48 rounded skeleton" />
            <div className="h-4 w-64 rounded skeleton" />
          </div>
        </div>

        {/* Stat tiles */}
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="space-y-2">
              <div className="h-8 w-16 rounded skeleton" />
              <div className="h-3 w-20 rounded skeleton" />
            </div>
          ))}
        </div>
      </div>

      {/* Uploads grid */}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="card p-5 space-y-3">
            <div className="h-3 w-32 rounded skeleton" />
            <div className="h-5 w-full rounded skeleton" />
            <div className="h-3 w-3/4 rounded skeleton" />
            <div className="h-3 w-full rounded skeleton" />
          </div>
        ))}
      </div>
    </div>
  )
}
