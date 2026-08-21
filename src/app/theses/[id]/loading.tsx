export default function Loading() {
  return (
    <div className="max-w-5xl page-gutter py-10 space-y-8">
      {/* Breadcrumb */}
      <div className="h-4 w-64 rounded skeleton" />

      {/* Header card */}
      <div className="card p-6 sm:p-8 space-y-4">
        <div className="h-3 w-48 rounded skeleton" />
        <div className="space-y-2">
          <div className="h-7 w-full rounded skeleton" />
          <div className="h-7 w-2/3 rounded skeleton" />
        </div>
        <div className="flex gap-2 pt-2">
          <div className="h-6 w-20 rounded-full skeleton" />
          <div className="h-6 w-24 rounded-full skeleton" />
        </div>
      </div>

      {/* Abstract card */}
      <div className="card p-6 sm:p-8 space-y-3">
        <div className="h-5 w-32 rounded skeleton" />
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="h-3 w-full rounded skeleton" />
        ))}
        <div className="h-3 w-1/2 rounded skeleton" />
      </div>

      {/* PDF viewer placeholder */}
      <div className="card p-6 sm:p-8 space-y-3">
        <div className="h-5 w-28 rounded skeleton" />
        <div className="h-96 w-full rounded-xl skeleton" />
      </div>
    </div>
  )
}
