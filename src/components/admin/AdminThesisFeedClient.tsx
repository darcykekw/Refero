'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { AdminThesisItem } from '@/lib/admin-data'
import type { Program, Tag } from '@/types/database'
import DocumentPreviewModal from '@/components/admin/DocumentPreviewModal'
import { deleteThesisAdmin, updateThesisAdmin, verifyThesis } from '@/app/actions/admin'

interface AdminThesisFeedClientProps {
  theses: AdminThesisItem[]
  programs: Program[]
  tags: (Tag & { count?: number })[]
}

export default function AdminThesisFeedClient({
  theses: initialTheses,
  programs,
  tags,
}: AdminThesisFeedClientProps) {
  const router = useRouter()
  const [theses, setTheses] = useState<AdminThesisItem[]>(initialTheses)
  const [selectedProgram, setSelectedProgram] = useState<string>('')
  const [selectedStatus, setSelectedStatus] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTagId, setSelectedTagId] = useState<string | null>(null)

  // Modals state
  const [previewThesis, setPreviewThesis] = useState<AdminThesisItem | null>(null)
  const [editingThesis, setEditingThesis] = useState<AdminThesisItem | null>(null)
  const [isPending, startTransition] = useTransition()
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  // Edit form state
  const [editTitle, setEditTitle] = useState('')
  const [editAuthors, setEditAuthors] = useState('')
  const [editAbstract, setEditAbstract] = useState('')
  const [editYear, setEditYear] = useState(2024)
  const [editProgramId, setEditProgramId] = useState('')
  const [editStatus, setEditStatus] = useState<'pending' | 'verified' | 'rejected'>('verified')
  const [editTagIds, setEditTagIds] = useState<string[]>([])

  function showToast(msg: string) {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 3500)
  }

  // Filter theses
  const filteredTheses = theses.filter(t => {
    if (selectedProgram && t.program_id !== selectedProgram) return false
    if (selectedStatus !== 'all') {
      const status = t.status || 'verified'
      if (status !== selectedStatus) return false
    }
    if (selectedTagId) {
      const hasTag = (t.tags || []).some(tag => tag.id === selectedTagId)
      if (!hasTag) return false
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      const inTitle = t.title.toLowerCase().includes(q)
      const inAuthors = t.authors.toLowerCase().includes(q)
      const inAbstract = t.abstract.toLowerCase().includes(q)
      if (!inTitle && !inAuthors && !inAbstract) return false
    }
    return true
  })

  const totalCount = theses.length
  const verifiedCount = theses.filter(t => t.status === 'verified' || !t.status).length
  const pendingCount = theses.filter(t => t.status === 'pending').length

  function openEditModal(t: AdminThesisItem) {
    setEditingThesis(t)
    setEditTitle(t.title)
    setEditAuthors(t.authors)
    setEditAbstract(t.abstract)
    setEditYear(t.year_submitted)
    setEditProgramId(t.program_id)
    setEditStatus(t.status || 'verified')
    setEditTagIds((t.tags || []).map(tg => tg.id))
  }

  function handleSaveEdit() {
    if (!editingThesis) return
    startTransition(async () => {
      const res = await updateThesisAdmin(editingThesis.id, {
        title: editTitle,
        authors: editAuthors,
        abstract: editAbstract,
        year_submitted: editYear,
        program_id: editProgramId,
        status: editStatus,
        tagIds: editTagIds,
      })
      if (res.success) {
        showToast('Thesis updated successfully.')
        setTheses(prev =>
          prev.map(item =>
            item.id === editingThesis.id
              ? {
                  ...item,
                  title: editTitle,
                  authors: editAuthors,
                  abstract: editAbstract,
                  year_submitted: editYear,
                  program_id: editProgramId,
                  status: editStatus,
                  tags: tags.filter(tg => editTagIds.includes(tg.id)),
                }
              : item
          )
        )
        setEditingThesis(null)
        router.refresh()
      } else {
        alert(res.error || 'Failed to update thesis')
      }
    })
  }

  function handleQuickVerify(thesisId: string) {
    startTransition(async () => {
      const res = await verifyThesis(thesisId)
      if (res.success) {
        showToast('Thesis verified and published to public feed!')
        setTheses(prev =>
          prev.map(t => (t.id === thesisId ? { ...t, status: 'verified' } : t))
        )
        router.refresh()
      } else {
        alert(res.error || 'Failed to verify thesis')
      }
    })
  }

  function handleDelete(thesisId: string, title: string) {
    if (!confirm(`Are you sure you want to permanently delete "${title}"?`)) return
    startTransition(async () => {
      const res = await deleteThesisAdmin(thesisId)
      if (res.success) {
        showToast('Thesis permanently removed.')
        setTheses(prev => prev.filter(t => t.id !== thesisId))
        router.refresh()
      } else {
        alert(res.error || 'Failed to delete thesis')
      }
    })
  }

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-900 text-white px-5 py-3 rounded-xl shadow-xl flex items-center gap-3 border border-emerald-700 animate-bounce">
          <span className="text-emerald-300">✓</span>
          <span className="text-sm font-medium">{toastMessage}</span>
        </div>
      )}

      {/* Header Banner Card */}
      <div className="page-header-banner flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-emerald-800 uppercase tracking-widest mb-1.5">
            <Link href="/admin" className="hover:underline">Dashboard</Link>
            <span>/</span>
            <span>Thesis Feed</span>
          </div>
          <h1 className="font-serif text-2xl md:text-3xl font-bold text-slate-900">
            Thesis Feed
          </h1>
          <p className="text-sm text-slate-600 mt-1 font-medium">
            Explore and manage all manuscripts in the College of Sciences repository
          </p>
        </div>

        {/* Stats Pill */}
        <div className="flex items-center gap-2">
          <span className="px-3 py-1.5 rounded-xl bg-white border border-slate-200/80 text-xs font-semibold text-slate-700 shadow-sm">
            Total: <strong className="text-emerald-900">{totalCount}</strong>
          </span>
          <span className="px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200/70 text-xs font-semibold text-emerald-800 shadow-sm flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-600" />
            Verified: <strong>{verifiedCount}</strong>
          </span>
          {pendingCount > 0 && (
            <span className="px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-300/80 text-xs font-semibold text-amber-800 shadow-sm flex items-center gap-1.5 animate-pulse">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              Pending: <strong>{pendingCount}</strong>
            </span>
          )}
        </div>
      </div>

      {/* Filter Card */}
      <div
        className="p-6 rounded-[26px] bg-white border shadow-sm space-y-4"
        style={{
          borderColor: 'rgba(143, 168, 133, 0.28)',
          boxShadow: '0 10px 28px -6px rgba(23, 59, 40, 0.05), 0 2px 8px rgba(0,0,0,0.02)',
        }}
      >
        {/* Search and Status row */}
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          <div className="relative flex-1">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-400">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search manuscripts by title, author, abstract..."
              className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600/30 focus:border-emerald-600 transition-all text-slate-800"
            />
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
            {[
              { id: 'all', label: 'All Status' },
              { id: 'verified', label: 'Verified Only' },
              { id: 'pending', label: 'Pending Only' },
            ].map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSelectedStatus(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  selectedStatus === tab.id
                    ? 'bg-white text-emerald-950 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Program Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
          <button
            type="button"
            onClick={() => setSelectedProgram('')}
            className={`px-3.5 py-1.5 rounded-full font-bold whitespace-nowrap transition-all cursor-pointer ${
              selectedProgram === ''
                ? 'bg-emerald-800 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All Programs
          </button>
          {programs.map(prog => (
            <button
              key={prog.id}
              type="button"
              onClick={() => setSelectedProgram(prog.id === selectedProgram ? '' : prog.id)}
              className={`px-3.5 py-1.5 rounded-full font-bold whitespace-nowrap transition-all cursor-pointer ${
                selectedProgram === prog.id
                  ? 'bg-emerald-800 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {prog.prog_name}
            </button>
          ))}
        </div>

        {/* Tag Selector */}
        {tags.length > 0 && (
          <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mr-1">
              Tags:
            </span>
            {tags.slice(0, 18).map(tag => {
              const isActive = selectedTagId === tag.id
              return (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => setSelectedTagId(isActive ? null : tag.id)}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all cursor-pointer ${
                    isActive
                      ? 'bg-emerald-700 text-white shadow-xs'
                      : 'bg-slate-50 text-slate-600 border border-slate-200 hover:border-slate-300'
                  }`}
                >
                  {tag.name}
                  {tag.count ? ` (${tag.count})` : ''}
                </button>
              )
            })}
            {selectedTagId && (
              <button
                type="button"
                onClick={() => setSelectedTagId(null)}
                className="text-[11px] text-rose-600 font-bold hover:underline ml-2"
              >
                Clear Tag
              </button>
            )}
          </div>
        )}
      </div>

      {/* Grid of Cards with Theme Style */}
      {filteredTheses.length === 0 ? (
        <div
          className="p-12 text-center rounded-2xl bg-white border border-slate-200/80 shadow-sm"
          style={{ borderColor: 'rgba(143, 168, 133, 0.3)' }}
        >
          <p className="text-4xl mb-3">🔍</p>
          <h3 className="font-serif text-lg font-bold text-slate-800">No manuscripts found</h3>
          <p className="text-sm text-slate-500 mt-1">Try relaxing your program, tag, or search filters.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTheses.map(thesis => {
            const isVerified = thesis.status === 'verified' || !thesis.status
            const isPendingStatus = thesis.status === 'pending'
            const isRejected = thesis.status === 'rejected'

            return (
              <div
                key={thesis.id}
                style={{ position: 'relative', display: 'flex', flexDirection: 'column' }}
              >
                {/* Verified Stamp on Top-Right */}
                {isVerified && (
                  <img
                    src="/verify.png"
                    alt="Verified Thesis"
                    title="Verified by Refero Admin"
                    style={{
                      position: 'absolute',
                      top: -10,
                      right: -10,
                      zIndex: 10,
                      width: 38,
                      height: 38,
                      filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.28))',
                      pointerEvents: 'none',
                    }}
                  />
                )}

                <article
                  className="rounded-[26px] bg-white border transition-all duration-300 hover:-translate-y-1.5 hover:shadow-lg"
                  style={{
                    borderColor: isPendingStatus ? 'rgba(245, 158, 11, 0.5)' : 'rgba(143, 168, 133, 0.28)',
                    boxShadow: '0 10px 28px -6px rgba(23, 59, 40, 0.05), 0 2px 8px rgba(0,0,0,0.02)',
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                    height: '100%',
                  }}
                >
                  {/* Sage / Emerald Top Accent Gradient */}
                  <div
                    style={{
                      height: 3,
                      background: isPendingStatus
                        ? 'linear-gradient(90deg, #F59E0B, #FBBF24)'
                        : 'linear-gradient(90deg, #173B28, #8FA885)',
                      flexShrink: 0,
                    }}
                  />

                  <div className="p-5 flex flex-col gap-3 flex-1">
                    {/* Status & Program header */}
                    <div className="flex items-center justify-between gap-2">
                      <p
                        style={{
                          fontSize: '0.65rem',
                          fontWeight: 700,
                          letterSpacing: '0.09em',
                          textTransform: 'uppercase',
                          color: '#2E6A47',
                          lineHeight: 1,
                        }}
                      >
                        {thesis.college?.college_name || 'College of Sciences'} · {thesis.program?.prog_name}
                      </p>

                      {isPendingStatus && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-300">
                          Pending Review
                        </span>
                      )}
                      {isRejected && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-rose-100 text-rose-800 border border-rose-300">
                          Rejected
                        </span>
                      )}
                    </div>

                    {/* Title + Authors */}
                    <div>
                      <h3
                        className="font-serif text-base font-bold text-slate-900 leading-snug line-clamp-2 hover:text-emerald-800 transition-colors cursor-pointer"
                        onClick={() => setPreviewThesis(thesis)}
                      >
                        {thesis.title}
                      </h3>
                      <p className="text-xs text-slate-500 mt-1 font-medium">
                        {thesis.authors} · <span className="font-mono">{thesis.year_submitted}</span>
                      </p>
                    </div>

                    {/* Abstract snippet */}
                    <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed flex-1">
                      {thesis.abstract}
                    </p>

                    {/* Tag Chips */}
                    {thesis.tags && thesis.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {thesis.tags.slice(0, 4).map(tag => (
                          <span
                            key={tag.id}
                            className="px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-slate-100 text-slate-600 border border-slate-200"
                          >
                            {tag.name}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Views & Metrics */}
                    <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-100 mt-auto">
                      <span className="flex items-center gap-1 font-mono">
                        👁 {thesis.view_count.toLocaleString()} views
                      </span>
                      {thesis.panel_score != null && (
                        <span className="font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                          Score: {thesis.panel_score}%
                        </span>
                      )}
                    </div>

                    {/* Admin Actions Bar */}
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => setPreviewThesis(thesis)}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold text-emerald-900 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200/70 transition-colors flex items-center gap-1.5 cursor-pointer"
                      >
                        <span>📄 Review</span>
                      </button>

                      <div className="flex items-center gap-1.5">
                        {isPendingStatus && (
                          <button
                            type="button"
                            onClick={() => handleQuickVerify(thesis.id)}
                            disabled={isPending}
                            className="px-2.5 py-1.5 rounded-lg text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 transition-colors cursor-pointer disabled:opacity-50"
                            title="Approve & Publish Thesis"
                          >
                            ✓ Verify
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => openEditModal(thesis)}
                          className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
                          title="Edit Thesis Details"
                        >
                          ✏ Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(thesis.id, thesis.title)}
                          disabled={isPending}
                          className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1"
                          title="Delete Thesis"
                        >
                          🗑 Delete
                        </button>
                      </div>
                    </div>
                  </div>
                </article>
              </div>
            )
          })}
        </div>
      )}

      {/* Split-Screen Document Preview Modal */}
      {previewThesis && (
        <DocumentPreviewModal
          thesis={previewThesis}
          onClose={() => setPreviewThesis(null)}
          onSuccess={() => {
            showToast('Thesis status updated!')
            router.refresh()
          }}
        />
      )}

      {/* Edit Thesis Modal */}
      {editingThesis && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div
            className="bg-white rounded-2xl max-w-2xl w-full p-6 space-y-4 shadow-2xl border my-8"
            style={{ borderColor: 'rgba(143, 168, 133, 0.4)' }}
          >
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h2 className="font-serif text-lg font-bold text-slate-900">Edit Thesis Manuscript</h2>
                <p className="text-xs text-slate-500">Update metadata, tags, and review status</p>
              </div>
              <button
                type="button"
                onClick={() => setEditingThesis(null)}
                className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs max-h-[70vh] overflow-y-auto pr-2">
              <div>
                <label className="font-bold text-slate-700 uppercase tracking-wider block mb-1">Title</label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={e => setEditTitle(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-emerald-600/30 outline-none"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 uppercase tracking-wider block mb-1">Authors</label>
                <input
                  type="text"
                  value={editAuthors}
                  onChange={e => setEditAuthors(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-emerald-600/30 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 uppercase tracking-wider block mb-1">Program</label>
                  <select
                    value={editProgramId}
                    onChange={e => setEditProgramId(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-emerald-600/30 outline-none"
                  >
                    {programs.map(p => (
                      <option key={p.id} value={p.id}>{p.prog_name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-700 uppercase tracking-wider block mb-1">Year</label>
                  <input
                    type="number"
                    value={editYear}
                    onChange={e => setEditYear(parseInt(e.target.value, 10))}
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-emerald-600/30 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 uppercase tracking-wider block mb-1">Status</label>
                <select
                  value={editStatus}
                  onChange={e => setEditStatus(e.target.value as any)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-emerald-600/30 outline-none"
                >
                  <option value="verified">Verified (Visible in Public Feed)</option>
                  <option value="pending">Pending Review</option>
                  {editingThesis?.status !== 'verified' && (
                    <option value="rejected">Rejected</option>
                  )}
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 uppercase tracking-wider block mb-1">Abstract</label>
                <textarea
                  rows={4}
                  value={editAbstract}
                  onChange={e => setEditAbstract(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-emerald-600/30 outline-none"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 uppercase tracking-wider block mb-1">Subject Tags</label>
                <div className="flex flex-wrap gap-1.5 p-2 bg-slate-50 rounded-xl border border-slate-200 max-h-36 overflow-y-auto">
                  {tags.map(tag => {
                    const isChecked = editTagIds.includes(tag.id)
                    return (
                      <button
                        key={tag.id}
                        type="button"
                        onClick={() => {
                          setEditTagIds(prev =>
                            isChecked ? prev.filter(id => id !== tag.id) : [...prev, tag.id]
                          )
                        }}
                        className={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all cursor-pointer ${
                          isChecked
                            ? 'bg-emerald-800 text-white'
                            : 'bg-white text-slate-700 border border-slate-200'
                        }`}
                      >
                        {tag.name} {isChecked ? '✓' : '+'}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t">
              <button
                type="button"
                onClick={() => setEditingThesis(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveEdit}
                disabled={isPending}
                className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-emerald-800 hover:bg-emerald-900 transition-colors shadow-sm disabled:opacity-50"
              >
                {isPending ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
