import Link from 'next/link'

export default function ThesisNotFound() {
  return (
    <div className="max-w-5xl page-gutter py-10">
      <div className="card p-10 text-center space-y-4">
        <div className="text-6xl font-extrabold text-slate-200">404</div>
        <h1 className="text-xl font-semibold text-slate-900">Thesis not found</h1>
        <p className="text-sm text-slate-500 max-w-md mx-auto">
          This thesis does not exist, or it has been deleted by its owner.
        </p>
        <div className="flex items-center justify-center gap-3 mt-4">
          <Link href="/theses" className="btn btn-primary">
            Browse all theses
          </Link>
          <Link href="/" className="btn btn-ghost">
            Home
          </Link>
        </div>
      </div>
    </div>
  )
}
