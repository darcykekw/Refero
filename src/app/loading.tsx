export default function Loading() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center py-20 gap-4">
      <span className="spinner text-sky-600 text-2xl" aria-hidden="true" />
      <p className="text-sm text-slate-400">Loading…</p>
    </div>
  )
}
