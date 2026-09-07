import { getVerificationQueue } from '@/lib/admin-data'
import VerificationQueueTable from '@/components/admin/VerificationQueueTable'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Verification Queue | Refero Admin',
}

export default async function VerificationQueuePage() {
  const pendingTheses = await getVerificationQueue(100)

  return (
    <div className="space-y-6">
      {/* Header Banner Card */}
      <div className="page-header-banner flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl md:text-3xl font-bold text-slate-900">
            Thesis Verification Queue
          </h1>
          <p className="text-sm text-slate-600 mt-1 font-medium">
            Review submitted manuscripts before they are published to the student thesis feed.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-3.5 py-2 rounded-xl bg-amber-50 border border-amber-300/80 text-amber-800 text-xs font-bold shadow-xs">
            {pendingTheses.length} Awaiting Review
          </span>
        </div>
      </div>

      <VerificationQueueTable initialTheses={pendingTheses} />
    </div>
  )
}
