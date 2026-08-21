import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="max-w-5xl page-gutter py-10">
      <div className="card p-10 text-center space-y-4">
        <div className="text-6xl font-extrabold text-slate-200">404</div>
        <h1 className="text-xl font-semibold text-slate-900">Page not found</h1>
        <p className="text-sm text-slate-500 max-w-md mx-auto">
          The page you are looking for does not exist or has been moved.
        </p>
        <Link
          href="/"
          className="btn btn-primary inline-block mt-4"
        >
          Back to home
        </Link>
      </div>
    </div>
  )
}
