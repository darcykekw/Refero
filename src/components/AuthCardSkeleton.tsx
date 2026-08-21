/**
 * Placeholder for the auth card — a heading, a line of help text, and three
 * field-sized bars.
 *
 * Used in two different kinds of boundary, which is why it lives here rather
 * than inside either one:
 *   - `(auth)/loading.tsx`, while the route segment itself is loading;
 *   - the inline `<Suspense>` in the login and reset-password pages, which is
 *     required because their forms read `useSearchParams()`.
 *
 * No outer wrapper: `(auth)/layout.tsx` already centres its child in a
 * `max-w-md` column, so this only needs to be the card that sits inside it.
 */
export default function AuthCardSkeleton() {
  return (
    <div className="card p-8 shadow-lg space-y-5" aria-hidden="true">
      <div className="space-y-2">
        <div className="h-6 w-40 rounded skeleton" />
        <div className="h-4 w-56 rounded skeleton" />
      </div>
      <div className="space-y-4 pt-2">
        <div className="h-11 w-full rounded-xl skeleton" />
        <div className="h-11 w-full rounded-xl skeleton" />
        <div className="h-11 w-full rounded-xl skeleton" />
      </div>
    </div>
  )
}
