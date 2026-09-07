import { getAllTagsWithUsage, getAuditLogsList } from '@/lib/admin-data'
import TagManager from '@/components/admin/TagManager'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Settings & Tags | Refero Admin',
}

export default async function AdminSettingsPage() {
  const [tags, auditLogs] = await Promise.all([
    getAllTagsWithUsage(),
    getAuditLogsList(100),
  ])

  return (
    <div className="space-y-6">
      {/* Header Banner Card */}
      <div className="page-header-banner flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl md:text-3xl font-bold text-slate-900">
            Tags & Audit Settings
          </h1>
          <p className="text-sm text-slate-600 mt-1 font-medium">
            Manage taxonomy keywords, taxonomy settings, and review administrative audit trails.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-3.5 py-2 rounded-xl bg-white border border-slate-200/80 text-slate-700 text-xs font-semibold shadow-xs">
            Active Tags: <strong className="text-emerald-900">{tags.length}</strong>
          </span>
        </div>
      </div>

      <TagManager initialTags={tags} auditLogs={auditLogs} />
    </div>
  )
}
