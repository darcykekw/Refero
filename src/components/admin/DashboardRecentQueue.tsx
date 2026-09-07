'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { AdminThesisItem } from '@/lib/admin-data'
import DocumentPreviewModal from '@/components/admin/DocumentPreviewModal'
import { useRouter } from 'next/navigation'

interface DashboardRecentQueueProps {
  pendingTheses: AdminThesisItem[]
}

export default function DashboardRecentQueue({ pendingTheses }: DashboardRecentQueueProps) {
  const [selectedThesis, setSelectedThesis] = useState<AdminThesisItem | null>(null)
  const router = useRouter()

  return (
    <div
      className="bg-white rounded-[26px] border shadow-sm overflow-hidden"
      style={{
        borderColor: 'rgba(143, 168, 133, 0.28)',
        boxShadow: '0 10px 28px -6px rgba(23, 59, 40, 0.05), 0 2px 8px rgba(0,0,0,0.02)',
      }}
    >
      <div style={{ height: 3, background: 'linear-gradient(90deg, #173B28, #8FA885)' }} />
      <div className="p-6 border-b border-slate-100 flex items-center justify-between">
        <div>
          <h2 className="font-serif text-lg font-bold text-slate-900">
            Awaiting Verification
          </h2>
          <p className="text-xs text-slate-500">
            Most recent student submissions requiring verification before appearing in public feeds.
          </p>
        </div>
        <Link
          href="/admin/verification"
          className="text-xs font-semibold text-emerald-800 hover:text-emerald-950 flex items-center gap-1"
        >
          <span>View all queue</span>
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      </div>

      {pendingTheses.length === 0 ? (
        <div className="p-8 text-center text-slate-500 text-xs sm:text-sm">
          <div className="w-12 h-12 mx-auto mb-2.5 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center">
            ✓
          </div>
          <p className="font-semibold text-slate-800">Verification queue is completely clear!</p>
          <p className="text-slate-400 mt-1">All uploaded theses have been verified or processed.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/70 border-b border-slate-100 text-slate-500 uppercase tracking-wider font-semibold">
              <tr>
                <th className="py-3 px-4">Date Uploaded</th>
                <th className="py-3 px-4">Title</th>
                <th className="py-3 px-4">Author(s)</th>
                <th className="py-3 px-4">Program</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {pendingTheses.map(thesis => (
                <tr key={thesis.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3.5 px-4 font-mono text-slate-500 whitespace-nowrap" suppressHydrationWarning>
                    {new Date(thesis.date_added).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </td>
                  <td className="py-3.5 px-4 font-medium text-slate-900 max-w-xs truncate">
                    {thesis.title}
                  </td>
                  <td className="py-3.5 px-4 text-slate-600 max-w-[180px] truncate">
                    {thesis.authors}
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 font-medium text-[11px] border border-emerald-100 whitespace-nowrap">
                      {thesis.program?.prog_name || 'Program'}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => setSelectedThesis(thesis)}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 transition-all shadow-sm cursor-pointer"
                    >
                      Review
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Document Preview Modal */}
      {selectedThesis && (
        <DocumentPreviewModal
          thesis={selectedThesis}
          onClose={() => setSelectedThesis(null)}
          onSuccess={() => {
            router.refresh()
          }}
        />
      )}
    </div>
  )
}
