import { getMasterlistTheses } from '@/lib/admin-data'
import { getAllPrograms, getAvailableTags } from '@/lib/data'
import ThesisMasterlistTable from '@/components/admin/ThesisMasterlistTable'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Thesis Masterlist | Refero Admin',
}

interface PageProps {
  searchParams: Promise<{
    program?: string
    status?: string
    query?: string
  }>
}

export default async function AdminThesesPage({ searchParams }: PageProps) {
  const params = await searchParams
  const [theses, programs, tags] = await Promise.all([
    getMasterlistTheses({
      programId: params.program,
      status: params.status,
      query: params.query,
    }),
    getAllPrograms(),
    getAvailableTags(200),
  ])

  return (
    <div className="space-y-6">
      {/* Header Banner Card */}
      <div className="page-header-banner flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl md:text-3xl font-bold text-slate-900">
            Thesis Masterlist
          </h1>
          <p className="text-sm text-slate-600 mt-1 font-medium">
            Browse, manage, edit metadata, adjust subject tags, and oversee all research manuscripts.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-3.5 py-2 rounded-xl bg-white border border-slate-200/80 text-slate-700 text-xs font-semibold shadow-xs">
            Total Records: <strong className="text-emerald-900">{theses.length}</strong>
          </span>
        </div>
      </div>

      <ThesisMasterlistTable
        theses={theses}
        programs={programs}
        allTags={tags}
        initialProgramId={params.program || ''}
        initialQuery={params.query || ''}
      />
    </div>
  )
}
