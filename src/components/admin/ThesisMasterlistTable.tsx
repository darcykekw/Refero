'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import type { AdminThesisItem } from '@/lib/admin-data'
import type { Program, Tag } from '@/types/database'
import { deleteThesisAdmin, updateThesisAdmin, verifyThesis, rejectThesis } from '@/app/actions/admin'

interface ThesisMasterlistTableProps {
  theses: AdminThesisItem[]
  programs: Program[]
  allTags: Tag[]
  initialProgramId?: string
  initialQuery?: string
}

export default function ThesisMasterlistTable({
  theses,
  programs,
  allTags,
  initialProgramId = '',
  initialQuery = '',
}: ThesisMasterlistTableProps) {
  const router = useRouter()
  const [selectedProgram, setSelectedProgram] = useState(initialProgramId)
  const [selectedStatus, setSelectedStatus] = useState<string>('all')
  const [searchTerm, setSearchTerm] = useState(initialQuery)
  const [editingThesis, setEditingThesis] = useState<AdminThesisItem | null>(null)
  const [isPending, startTransition] = useTransition()
  const [toast, setToast] = useState<string | null>(null)

  // Edit form state
  const [editTitle, setEditTitle] = useState('')
  const [editAuthors, setEditAuthors] = useState('')
  const [editAbstract, setEditAbstract] = useState('')
  const [editAdviser, setEditAdviser] = useState('')
  const [editYear, setEditYear] = useState(2024)
  const [editProgramId, setEditProgramId] = useState('')
  const [editStatus, setEditStatus] = useState<'pending' | 'verified' | 'rejected'>('verified')
  const [editTagIds, setEditTagIds] = useState<string[]>([])
  const [newTagInput, setNewTagInput] = useState('')

  // Client-side filtering
  const filteredTheses = theses.filter(t => {
    if (selectedProgram && t.program_id !== selectedProgram) return false
    if (selectedStatus !== 'all') {
      const currentStatus = t.status || 'verified'
      if (currentStatus !== selectedStatus) return false
    }
    if (searchTerm) {
      const q = searchTerm.toLowerCase()
      const matchesTitle = t.title.toLowerCase().includes(q)
      const matchesAuthor = t.authors.toLowerCase().includes(q)
      const matchesId = t.id.toLowerCase().includes(q)
      if (!matchesTitle && !matchesAuthor && !matchesId) return false
    }
    return true
  })

  function openEditModal(t: AdminThesisItem) {
    setEditingThesis(t)
    setEditTitle(t.title)
    setEditAuthors(t.authors)
    setEditAbstract(t.abstract)
    setEditAdviser(t.adviser || '')
    setEditYear(t.year_submitted)
    setEditProgramId(t.program_id)
    setEditStatus(t.status || 'verified')
    setEditTagIds((t.tags || []).map(tag => tag.id))
  }

  function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault()
    if (!editingThesis) return

    startTransition(async () => {
      const res = await updateThesisAdmin(editingThesis.id, {
        title: editTitle,
        authors: editAuthors,
        abstract: editAbstract,
        adviser: editAdviser || undefined,
        year_submitted: Number(editYear),
        program_id: editProgramId,
        status: editStatus,
        tagIds: editTagIds,
      })

      if (res.success) {
        setEditingThesis(null)
        setToast('Thesis updated successfully!')
        router.refresh()
      } else {
        alert('Update error: ' + res.error)
      }
    })
  }

  function handleDelete(id: string, title: string) {
    if (!confirm(`Are you sure you want to permanently delete "${title}"? This cannot be undone.`)) return

    startTransition(async () => {
      const res = await deleteThesisAdmin(id)
      if (res.success) {
        setToast('Thesis deleted.')
        router.refresh()
      } else {
        alert('Delete error: ' + res.error)
      }
    })
  }

  function toggleTag(tagId: string) {
    if (editTagIds.includes(tagId)) {
      setEditTagIds(editTagIds.filter(id => id !== tagId))
    } else {
      setEditTagIds([...editTagIds, tagId])
    }
  }

  return (
    <div className="space-y-5">
      {/* Toast */}
      {toast && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center justify-between">
          <span>✓ {toast}</span>
          <button type="button" onClick={() => setToast(null)} className="text-emerald-600 hover:text-emerald-950">✕</button>
        </div>
      )}

      {/* Filter Bar */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3.5">
        {/* Search Input */}
        <div className="w-full md:w-80">
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Filter by title, author, or ID..."
            className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600/30 text-slate-800"
          />
        </div>

        {/* Program and Status Dropdowns */}
        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          <select
            value={selectedProgram}
            onChange={e => setSelectedProgram(e.target.value)}
            className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none text-slate-800 font-medium cursor-pointer"
          >
            <option value="">All Programs</option>
            {programs.map(p => (
              <option key={p.id} value={p.id}>{p.prog_name}</option>
            ))}
          </select>

          <select
            value={selectedStatus}
            onChange={e => setSelectedStatus(e.target.value)}
            className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none text-slate-800 font-medium cursor-pointer"
          >
            <option value="all">All Statuses</option>
            <option value="verified">Verified Only</option>
            <option value="pending">Pending Review</option>
            <option value="rejected">Rejected</option>
          </select>

          <span className="text-xs text-slate-400 font-mono">
            {filteredTheses.length} results
          </span>
        </div>
      </div>

      {/* Theses Masterlist Table */}
      <div
        className="bg-white rounded-2xl border shadow-sm overflow-hidden"
        style={{
          borderColor: 'rgba(143, 168, 133, 0.35)',
          boxShadow: '0 4px 16px -4px rgba(17, 33, 23, 0.06)',
        }}
      >
        <div style={{ height: 3, background: 'linear-gradient(90deg, #173B28, #8FA885)' }} />
        {filteredTheses.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            No theses found matching current filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
                <tr>
                  <th className="py-3.5 px-4">Title & Authors</th>
                  <th className="py-3.5 px-4">Program</th>
                  <th className="py-3.5 px-4">Year</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Tags</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredTheses.map(thesis => {
                  const status = thesis.status || 'verified'
                  return (
                    <tr key={thesis.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-4 max-w-sm">
                        <Link
                          href={`/theses/${thesis.id}`}
                          target="_blank"
                          className="font-serif font-bold text-[13px] text-slate-900 hover:text-emerald-700 block truncate"
                        >
                          {thesis.title}
                        </Link>
                        <p className="text-[11px] text-slate-500 truncate mt-0.5">
                          {thesis.authors} {thesis.adviser ? `· Adviser: ${thesis.adviser}` : ''}
                        </p>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 font-semibold text-[11px] border border-emerald-100">
                          {thesis.program?.prog_name || 'Program'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-600 whitespace-nowrap">
                        {thesis.year_submitted}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {status === 'verified' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                            <img src="/verify.png" alt="" className="w-3 h-3" />
                            Verified
                          </span>
                        ) : status === 'pending' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold text-[10px]">
                            ⏳ Pending
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 font-bold text-[10px]">
                            ✕ Rejected
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 max-w-[160px]">
                        <div className="flex flex-wrap gap-1 truncate">
                          {(thesis.tags || []).slice(0, 3).map(tag => (
                            <span key={tag.id} className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-600">
                              #{tag.name}
                            </span>
                          ))}
                          {(thesis.tags || []).length > 3 && (
                            <span className="text-[10px] text-slate-400">+{thesis.tags.length - 3}</span>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => openEditModal(thesis)}
                            className="px-2.5 py-1 rounded-lg text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-all cursor-pointer flex items-center gap-1"
                          >
                            ✏ Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(thesis.id, thesis.title)}
                            disabled={isPending}
                            className="px-2.5 py-1 rounded-lg text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-all cursor-pointer flex items-center gap-1"
                          >
                            🗑 Delete
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

      {/* Edit Thesis Modal */}
      {editingThesis && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
              <div>
                <h3 className="font-serif text-lg font-bold text-slate-900">Edit Thesis Metadata</h3>
                <p className="text-xs text-slate-500">ID: {editingThesis.id}</p>
              </div>
              <button
                type="button"
                onClick={() => setEditingThesis(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Title</label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={e => setEditTitle(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-600/30 text-slate-900"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Author(s)</label>
                  <input
                    type="text"
                    value={editAuthors}
                    onChange={e => setEditAuthors(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-600/30 text-slate-900"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Adviser</label>
                  <input
                    type="text"
                    value={editAdviser}
                    onChange={e => setEditAdviser(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-600/30 text-slate-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Year</label>
                  <input
                    type="number"
                    value={editYear}
                    onChange={e => setEditYear(Number(e.target.value))}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-600/30 text-slate-900"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Program</label>
                  <select
                    value={editProgramId}
                    onChange={e => setEditProgramId(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-600/30 text-slate-900 font-medium"
                    required
                  >
                    {programs.map(p => (
                      <option key={p.id} value={p.id}>{p.prog_name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Verification Status</label>
                  <select
                    value={editStatus}
                    onChange={e => setEditStatus(e.target.value as any)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-600/30 text-slate-900 font-bold"
                  >
                    <option value="verified">Verified</option>
                    <option value="pending">Pending</option>
                    {editingThesis?.status !== 'verified' && (
                      <option value="rejected">Rejected</option>
                    )}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Abstract</label>
                <textarea
                  value={editAbstract}
                  onChange={e => setEditAbstract(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-600/30 text-slate-900"
                  rows={4}
                  required
                />
              </div>

              {/* Tags Selector */}
              <div>
                <label className="block font-bold text-slate-700 mb-1.5">Tags (Click to add/remove)</label>
                <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-2 bg-slate-50 border border-slate-200 rounded-xl">
                  {allTags.map(tag => {
                    const isSelected = editTagIds.includes(tag.id)
                    return (
                      <button
                        key={tag.id}
                        type="button"
                        onClick={() => toggleTag(tag.id)}
                        className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-emerald-700 text-white shadow-sm'
                            : 'bg-white border border-slate-200 text-slate-600 hover:border-emerald-500'
                        }`}
                      >
                        {isSelected ? '✓ ' : '+ '}#{tag.name}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setEditingThesis(null)}
                  disabled={isPending}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 transition-all shadow-md shadow-emerald-900/15"
                >
                  {isPending ? 'Saving…' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
