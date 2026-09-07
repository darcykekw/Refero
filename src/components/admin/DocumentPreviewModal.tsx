'use client'

import { useState, useTransition } from 'react'
import type { AdminThesisItem } from '@/lib/admin-data'
import { verifyThesis, rejectThesis } from '@/app/actions/admin'

interface DocumentPreviewModalProps {
  thesis: AdminThesisItem | null
  onClose: () => void
  onSuccess?: () => void
}

export default function DocumentPreviewModal({
  thesis,
  onClose,
  onSuccess,
}: DocumentPreviewModalProps) {
  const [isActionPending, startTransition] = useTransition()
  const [activeTab, setActiveTab] = useState<'pdf' | 'gradesheet'>('pdf')
  const [showRejectInput, setShowRejectInput] = useState(false)
  const [rejectionReason, setRejectionReason] = useState('')
  const [actionError, setActionError] = useState<string | null>(null)

  if (!thesis) return null

  const isAlreadyVerified = thesis.status === 'verified' || (!thesis.status && thesis.status !== 'pending' && thesis.status !== 'rejected')
  const isPendingStatus = thesis.status === 'pending'
  const isRejectedStatus = thesis.status === 'rejected'

  // Compute storage URLs
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://zivzqlwpthywloafcpaf.supabase.co'
  const pdfUrl = thesis.pdf_file
    ? (thesis.pdf_file.startsWith('http')
        ? thesis.pdf_file
        : `${supabaseUrl}/storage/v1/object/public/thesis-pdfs/${thesis.pdf_file}`)
    : ''
  const gradeSheetUrl = thesis.grade_sheet_file
    ? (thesis.grade_sheet_file.startsWith('http')
        ? thesis.grade_sheet_file
        : `${supabaseUrl}/storage/v1/object/public/thesis-pdfs/${thesis.grade_sheet_file}`)
    : ''

  function handleApprove() {
    if (!thesis) return
    setActionError(null)
    startTransition(async () => {
      const res = await verifyThesis(thesis.id)
      if (res.success) {
        onSuccess?.()
        onClose()
      } else {
        setActionError(res.error || 'Failed to approve thesis')
      }
    })
  }

  function handleReject() {
    if (!thesis) return
    if (!showRejectInput) {
      setShowRejectInput(true)
      return
    }
    setActionError(null)
    startTransition(async () => {
      const res = await rejectThesis(thesis.id, rejectionReason)
      if (res.success) {
        onSuccess?.()
        onClose()
      } else {
        setActionError(res.error || 'Failed to reject thesis')
      }
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div
        className="bg-white w-full max-w-7xl h-[92vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-slate-200"
        onClick={e => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="h-16 px-6 border-b border-slate-200 flex items-center justify-between bg-slate-900 text-white shrink-0">
          <div className="flex items-center gap-3">
            {isAlreadyVerified ? (
              <span className="px-2.5 py-1 text-xs font-bold uppercase tracking-wider rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1.5 shadow-xs">
                <span className="text-emerald-400 font-extrabold">✓</span> Already Verified
              </span>
            ) : isRejectedStatus ? (
              <span className="px-2.5 py-1 text-xs font-bold uppercase tracking-wider rounded-md bg-rose-500/20 text-rose-300 border border-rose-500/30">
                Rejected Thesis
              </span>
            ) : (
              <span className="px-2.5 py-1 text-xs font-bold uppercase tracking-wider rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30">
                Reviewing Verification
              </span>
            )}
            <span className="text-sm text-slate-300 font-mono truncate max-w-xs sm:max-w-md">
              ID: {thesis.id}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>

        {/* Modal Body: Split Screen */}
        <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden">
          {/* Left Panel: Document Viewer (60%) */}
          <div className="w-full md:w-[60%] flex flex-col bg-slate-100 border-r border-slate-200 min-h-0">
            {/* Document Tabs */}
            <div className="h-11 px-4 border-b border-slate-200 bg-slate-200/70 flex items-center justify-between shrink-0">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('pdf')}
                  className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                    activeTab === 'pdf'
                      ? 'bg-white text-emerald-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  📄 Thesis Manuscript (PDF)
                </button>
                {thesis.grade_sheet_file && (
                  <button
                    type="button"
                    onClick={() => setActiveTab('gradesheet')}
                    className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                      activeTab === 'gradesheet'
                        ? 'bg-white text-emerald-900 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    📊 Grade Sheet
                  </button>
                )}
              </div>

              {pdfUrl && (
                <a
                  href={activeTab === 'pdf' ? pdfUrl : gradeSheetUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] font-medium text-emerald-800 hover:underline flex items-center gap-1"
                >
                  <span>Open in new tab</span>
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              )}
            </div>

            {/* Viewer frame */}
            <div className="flex-1 min-h-0 bg-slate-800 relative">
              {activeTab === 'pdf' ? (
                pdfUrl ? (
                  <iframe
                    src={`${pdfUrl}#view=FitH`}
                    title="Thesis PDF Preview"
                    className="w-full h-full border-0"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 p-6 text-center">
                    <p className="text-sm font-semibold">No PDF document attached to this record.</p>
                  </div>
                )
              ) : (
                gradeSheetUrl ? (
                  <iframe
                    src={`${gradeSheetUrl}#view=FitH`}
                    title="Grade Sheet Preview"
                    className="w-full h-full border-0"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 p-6 text-center">
                    <p className="text-sm font-semibold">No grade sheet file attached.</p>
                  </div>
                )
              )}
            </div>
          </div>

          {/* Right Panel: Metadata & Verification Actions (40%) */}
          <div className="w-full md:w-[40%] flex flex-col bg-white overflow-y-auto">
            <div className="p-6 flex-1 space-y-5">
              {/* Program & College tags */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2.5 py-1 text-xs font-bold uppercase tracking-wider rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200">
                  {thesis.program?.prog_name || 'Program'}
                </span>
                <span className="px-2.5 py-1 text-xs font-medium rounded-lg bg-slate-100 text-slate-700">
                  {thesis.college?.college_name || 'College'}
                </span>
                <span className="px-2 py-0.5 text-xs font-mono font-semibold rounded bg-slate-100 text-slate-600">
                  Class of {thesis.year_submitted}
                </span>
                {isAlreadyVerified && (
                  <span className="px-2.5 py-1 text-xs font-bold uppercase tracking-wider rounded-lg bg-emerald-100 text-emerald-900 border border-emerald-300 flex items-center gap-1 shadow-2xs">
                    <span className="text-emerald-700 font-bold">✓</span> Already Verified
                  </span>
                )}
                {isRejectedStatus && (
                  <span className="px-2.5 py-1 text-xs font-bold uppercase tracking-wider rounded-lg bg-rose-100 text-rose-900 border border-rose-300 flex items-center gap-1 shadow-2xs">
                    ✕ Rejected
                  </span>
                )}
              </div>

              {/* Title */}
              <div>
                <h2 className="font-serif text-xl md:text-2xl font-bold text-slate-900 leading-snug">
                  {thesis.title}
                </h2>
                <p className="text-xs text-slate-500 mt-1.5 font-medium" suppressHydrationWarning>
                  Submitted on {new Date(thesis.date_added).toLocaleDateString('en-US', { dateStyle: 'long' })}
                </p>
              </div>

              {/* Authors & Adviser */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
                <div>
                  <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400">Author(s)</p>
                  <p className="text-sm font-semibold text-slate-800 mt-0.5">{thesis.authors}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400">Adviser</p>
                  <p className="text-sm font-medium text-slate-700 mt-0.5">{thesis.adviser || 'None listed'}</p>
                </div>
                {thesis.panel_score != null && (
                  <div className="col-span-2 pt-2 border-t border-slate-200/60 flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-600">Panel Evaluation Score</span>
                    <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
                      ★ {thesis.panel_score.toFixed(1)} / 5.0
                    </span>
                  </div>
                )}
              </div>

              {/* Abstract */}
              <div>
                <p className="text-xs uppercase tracking-wider font-bold text-slate-400 mb-1.5">Abstract</p>
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs md:text-sm text-slate-700 leading-relaxed max-h-56 overflow-y-auto">
                  {thesis.abstract}
                </div>
              </div>

              {/* Tags */}
              {thesis.tags && thesis.tags.length > 0 && (
                <div>
                  <p className="text-xs uppercase tracking-wider font-bold text-slate-400 mb-1.5">Subject Tags</p>
                  <div className="flex flex-wrap gap-1.5">
                    {thesis.tags.map(t => (
                      <span
                        key={t.id}
                        className="px-2.5 py-1 text-xs rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200/70 font-medium"
                      >
                        #{t.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Action error banner if any */}
              {actionError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                  {actionError}
                </div>
              )}

              {/* Optional Rejection Reason input */}
              {showRejectInput && (
                <div className="p-4 rounded-xl bg-rose-50/70 border border-rose-200 space-y-2 animate-fade-in">
                  <label className="block text-xs font-bold text-rose-900">
                    Reason for Rejection (Visible to student uploader)
                  </label>
                  <textarea
                    value={rejectionReason}
                    onChange={e => setRejectionReason(e.target.value)}
                    placeholder="e.g., Incomplete manuscript pages, missing adviser sign-off..."
                    className="w-full p-2.5 text-xs bg-white border border-rose-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500/30 text-slate-800"
                    rows={3}
                  />
                </div>
              )}
            </div>

            {/* Bottom Sticky Action Bar */}
            <div className="p-5 border-t border-slate-200 bg-slate-50 flex items-center justify-between gap-3 shrink-0">
              <button
                type="button"
                onClick={onClose}
                disabled={isActionPending}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 hover:bg-slate-100 transition-all cursor-pointer"
              >
                {isAlreadyVerified ? 'Close' : 'Cancel'}
              </button>

              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={handleReject}
                  disabled={isActionPending}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 transition-all shadow-sm cursor-pointer disabled:opacity-50"
                >
                  {isActionPending ? 'Processing…' : showRejectInput ? 'Confirm Rejection' : 'Reject Thesis'}
                </button>

                {isAlreadyVerified ? (
                  <button
                    type="button"
                    disabled
                    className="px-6 py-2.5 rounded-xl text-xs font-bold text-emerald-800 bg-emerald-100 border border-emerald-300 flex items-center gap-1.5 cursor-default select-none shadow-xs"
                    title="This thesis has already been approved and verified"
                  >
                    <svg className="w-4 h-4 text-emerald-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Already Verified</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleApprove}
                    disabled={isActionPending}
                    className="px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 transition-all shadow-md shadow-emerald-900/20 cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>{isActionPending ? 'Verifying…' : 'Approve & Verify'}</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
