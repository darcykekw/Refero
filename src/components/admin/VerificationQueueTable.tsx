'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { AdminThesisItem } from '@/lib/admin-data'
import DocumentPreviewModal from '@/components/admin/DocumentPreviewModal'
import { bulkVerifyTheses, bulkRejectTheses, verifyThesis, rejectThesis } from '@/app/actions/admin'

interface VerificationQueueTableProps {
  initialTheses: AdminThesisItem[]
}

export default function VerificationQueueTable({ initialTheses }: VerificationQueueTableProps) {
  const router = useRouter()
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [reviewingThesis, setReviewingThesis] = useState<AdminThesisItem | null>(null)
  const [isPending, startTransition] = useTransition()
  const [actionMessage, setActionMessage] = useState<string | null>(null)

  const allSelected = initialTheses.length > 0 && selectedIds.length === initialTheses.length

  function toggleSelectAll() {
    if (allSelected) {
      setSelectedIds([])
    } else {
      setSelectedIds(initialTheses.map(t => t.id))
    }
  }

  function toggleSelectOne(id: string) {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(i => i !== id))
    } else {
      setSelectedIds([...selectedIds, id])
    }
  }

  function handleBulkApprove() {
    if (selectedIds.length === 0) return
    if (!confirm(`Are you sure you want to approve and verify ${selectedIds.length} thesis submissions?`)) return

    startTransition(async () => {
      const res = await bulkVerifyTheses(selectedIds)
      if (res.success) {
        setSelectedIds([])
        setActionMessage(`Successfully verified ${res.count} thesis uploads!`)
        router.refresh()
      } else {
        alert('Error: ' + res.error)
      }
    })
  }

  function handleBulkReject() {
    if (selectedIds.length === 0) return
    const reason = prompt(`Enter optional rejection reason for ${selectedIds.length} theses:`, 'Incomplete submission requirements')
    if (reason === null) return

    startTransition(async () => {
      const res = await bulkRejectTheses(selectedIds, reason)
      if (res.success) {
        setSelectedIds([])
        setActionMessage(`Rejected ${res.count} thesis submissions.`)
        router.refresh()
      } else {
        alert('Error: ' + res.error)
      }
    })
  }

  function handleQuickVerify(id: string) {
    startTransition(async () => {
      const res = await verifyThesis(id)
      if (res.success) {
        setActionMessage('Thesis approved and verified!')
        router.refresh()
      } else {
        alert('Error: ' + res.error)
      }
    })
  }

  return (
    <div className="space-y-4">
      {/* Toast notice */}
      {actionMessage && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center justify-between">
          <span>✓ {actionMessage}</span>
          <button type="button" onClick={() => setActionMessage(null)} className="text-emerald-600 hover:text-emerald-950">✕</button>
        </div>
      )}

      {/* Bulk Action Toolbar */}
      {selectedIds.length > 0 && (
        <div className="p-3.5 rounded-xl bg-slate-900 text-white flex flex-wrap items-center justify-between gap-3 shadow-lg animate-fade-in">
          <div className="flex items-center gap-3">
            <span className="px-2.5 py-1 rounded-md bg-emerald-500/20 text-emerald-300 font-bold text-xs">
              {selectedIds.length} selected
            </span>
            <span className="text-xs text-slate-300">
              Apply batch actions to selected theses:
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleBulkApprove}
              disabled={isPending}
              className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition-all cursor-pointer disabled:opacity-50"
            >
              ✓ Approve Selected ({selectedIds.length})
            </button>
            <button
              type="button"
              onClick={handleBulkReject}
              disabled={isPending}
              className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white transition-all cursor-pointer disabled:opacity-50"
            >
              ✕ Reject Selected ({selectedIds.length})
            </button>
            <button
              type="button"
              onClick={() => setSelectedIds([])}
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-white"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {/* Main Data Table */}
      <div
        className="bg-white rounded-2xl border shadow-sm overflow-hidden"
        style={{
          borderColor: 'rgba(143, 168, 133, 0.35)',
          boxShadow: '0 4px 16px -4px rgba(17, 33, 23, 0.06)',
        }}
      >
        <div style={{ height: 3, background: 'linear-gradient(90deg, #F59E0B, #173B28)' }} />
        {initialTheses.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-700 mx-auto flex items-center justify-center font-bold text-lg mb-2">
              ✓
            </div>
            <p className="font-semibold text-slate-800 text-sm">Verification Queue is Empty</p>
            <p className="text-xs text-slate-400 mt-1">All submitted theses have been verified or resolved.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
                <tr>
                  <th className="py-3.5 px-4 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={toggleSelectAll}
                      className="rounded border-slate-300 text-emerald-700 focus:ring-emerald-600 cursor-pointer"
                      title="Select all"
                    />
                  </th>
                  <th className="py-3.5 px-4">Date Uploaded</th>
                  <th className="py-3.5 px-4">Author(s)</th>
                  <th className="py-3.5 px-4">Title</th>
                  <th className="py-3.5 px-4">Program</th>
                  <th className="py-3.5 px-4 text-center">Manuscript</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {initialTheses.map(thesis => {
                  const isSelected = selectedIds.includes(thesis.id)
                  return (
                    <tr
                      key={thesis.id}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        isSelected ? 'bg-emerald-50/30' : ''
                      }`}
                    >
                      <td className="py-3.5 px-4 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectOne(thesis.id)}
                          className="rounded border-slate-300 text-emerald-700 focus:ring-emerald-600 cursor-pointer"
                        />
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-500 whitespace-nowrap" suppressHydrationWarning>
                        {new Date(thesis.date_added).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </td>
                      <td className="py-3.5 px-4 font-medium text-slate-700 max-w-[170px] truncate">
                        {thesis.authors}
                      </td>
                      <td className="py-3.5 px-4 font-medium text-slate-900 max-w-sm truncate">
                        <span className="font-serif font-bold text-[13px]">{thesis.title}</span>
                        {thesis.adviser && (
                          <p className="text-[11px] text-slate-400 font-sans font-normal truncate">
                            Adviser: {thesis.adviser}
                          </p>
                        )}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-800 font-semibold text-[11px] border border-emerald-100">
                          {thesis.program?.prog_name || 'Program'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        {thesis.pdf_file ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700">
                            <span>PDF Attached</span>
                            {thesis.grade_sheet_file && (
                              <span className="text-[9px] px-1 bg-amber-100 text-amber-900 rounded font-bold">
                                +Grade
                              </span>
                            )}
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-400">No PDF</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => setReviewingThesis(thesis)}
                            className="px-3 py-1.5 rounded-lg text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-all cursor-pointer"
                          >
                            Review
                          </button>
                          <button
                            type="button"
                            onClick={() => handleQuickVerify(thesis.id)}
                            disabled={isPending}
                            title="Quick Approve"
                            className="w-7 h-7 rounded-lg text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 flex items-center justify-center transition-all cursor-pointer disabled:opacity-50"
                          >
                            ✓
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Document Preview Modal */}
      {reviewingThesis && (
        <DocumentPreviewModal
          thesis={reviewingThesis}
          onClose={() => setReviewingThesis(null)}
          onSuccess={() => {
            setActionMessage('Thesis verified successfully!')
            router.refresh()
          }}
        />
      )}
    </div>
  )
}
