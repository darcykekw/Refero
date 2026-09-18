import type { Metadata } from 'next'
import { getAllProgramsWithStats } from '@/lib/admin-data'
import ProgramManager from '@/components/admin/ProgramManager'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Academic Programs | Refero Admin',
  description: 'Manage degree programs, upload custom program logos, and track student thesis distribution.',
}

export default async function AdminProgramsPage() {
  const programs = await getAllProgramsWithStats()

  return (
    <div className="space-y-6">
      {/* Header Banner Card */}
      <div className="page-header-banner flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full bg-emerald-600" />
            <span className="text-xs font-bold uppercase tracking-widest text-emerald-800">
              Department & Degree Taxonomy
            </span>
          </div>
          <h1 className="font-serif text-2xl md:text-3xl font-bold text-slate-900">
            Academic Programs
          </h1>
          <p className="text-sm text-slate-600 mt-1 font-medium">
            Create, update degree titles and department logos, and manage university academic programs.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-3.5 py-2 rounded-xl bg-white border border-slate-200/80 text-slate-700 text-xs font-semibold shadow-xs">
            Active Programs: <strong className="text-emerald-900">{programs.length}</strong>
          </span>
        </div>
      </div>

      <ProgramManager initialPrograms={programs} />
    </div>
  )
}
