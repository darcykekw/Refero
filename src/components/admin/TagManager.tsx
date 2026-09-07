'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { Tag, AuditLog } from '@/types/database'
import { addTagAdmin, deleteTagAdmin } from '@/app/actions/admin'

interface TagManagerProps {
  initialTags: (Tag & { count: number })[]
  auditLogs: AuditLog[]
}

export default function TagManager({ initialTags, auditLogs }: TagManagerProps) {
  const router = useRouter()
  const [newTagName, setNewTagName] = useState('')
  const [isPending, startTransition] = useTransition()
  const [toast, setToast] = useState<string | null>(null)
  const [tagSearch, setTagSearch] = useState('')

  const filteredTags = initialTags.filter(t =>
    t.name.toLowerCase().includes(tagSearch.toLowerCase())
  )

  function handleAddTag(e: React.FormEvent) {
    e.preventDefault()
    if (!newTagName.trim()) return

    startTransition(async () => {
      const res = await addTagAdmin(newTagName.trim())
      if (res.success) {
        setNewTagName('')
        setToast(`Tag "${newTagName.trim()}" created!`)
        router.refresh()
      } else {
        alert('Error: ' + res.error)
      }
    })
  }

  function handleDeleteTag(id: string, name: string) {
    if (!confirm(`Are you sure you want to delete tag "#${name}"?`)) return

    startTransition(async () => {
      const res = await deleteTagAdmin(id)
      if (res.success) {
        setToast(`Tag "#${name}" deleted.`)
        router.refresh()
      } else {
        alert('Error: ' + res.error)
      }
    })
  }

  return (
    <div className="space-y-8">
      {toast && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center justify-between">
          <span>✓ {toast}</span>
          <button type="button" onClick={() => setToast(null)} className="text-emerald-600 hover:text-emerald-950">✕</button>
        </div>
      )}

      {/* ── Section 1: Tag Management ──────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 space-y-5">
        <div>
          <h2 className="font-serif text-lg font-bold text-slate-900">
            Subject Tag Management
          </h2>
          <p className="text-xs text-slate-500">
            Create, inspect, and remove keyword tags available to students and researchers.
          </p>
        </div>

        {/* Add Tag Form */}
        <form onSubmit={handleAddTag} className="flex gap-2.5 max-w-md">
          <input
            type="text"
            value={newTagName}
            onChange={e => setNewTagName(e.target.value)}
            placeholder="New tag name (e.g. Machine Learning, Agroforestry)..."
            className="flex-1 px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600/30 text-slate-800"
            required
          />
          <button
            type="submit"
            disabled={isPending}
            className="px-4 py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl transition-all shadow-sm cursor-pointer disabled:opacity-50 shrink-0"
          >
            {isPending ? 'Adding…' : '+ Add Tag'}
          </button>
        </form>

        {/* Tag Filter & List */}
        <div className="pt-3 border-t border-slate-100 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Active Tags ({initialTags.length})
            </span>
            <input
              type="text"
              value={tagSearch}
              onChange={e => setTagSearch(e.target.value)}
              placeholder="Search tags..."
              className="px-3 py-1 text-xs bg-slate-50 border border-slate-200 rounded-lg w-48 text-slate-800"
            />
          </div>

          <div className="flex flex-wrap gap-2 max-h-72 overflow-y-auto p-3 bg-slate-50/70 border border-slate-200/70 rounded-xl">
            {filteredTags.map(tag => (
              <div
                key={tag.id}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-full text-xs text-slate-700 shadow-2xs hover:border-emerald-500 transition-colors"
              >
                <span className="font-semibold text-emerald-900">#{tag.name}</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-100 text-slate-500 font-mono">
                  {tag.count}
                </span>
                <button
                  type="button"
                  onClick={() => handleDeleteTag(tag.id, tag.name)}
                  className="ml-1 text-slate-300 hover:text-rose-600 text-xs font-bold cursor-pointer"
                  title="Delete tag"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Section 2: Audit Logs ─────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 space-y-4">
        <div>
          <h2 className="font-serif text-lg font-bold text-slate-900">
            System Audit Trail
          </h2>
          <p className="text-xs text-slate-500">
            Complete history of verification approvals, rejections, thesis updates, and administrative events.
          </p>
        </div>

        <div className="overflow-x-auto border border-slate-100 rounded-xl">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
              <tr>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Admin</th>
                <th className="py-3 px-4">Action</th>
                <th className="py-3 px-4">Target</th>
                <th className="py-3 px-4">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {auditLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400">
                    No audit log records found.
                  </td>
                </tr>
              ) : (
                auditLogs.map(log => (
                  <tr key={log.id} className="hover:bg-slate-50/60">
                    <td className="py-3 px-4 font-mono text-slate-500 whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString(undefined, {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      })}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-800">
                      {log.admin_name || 'Admin'}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-emerald-50 text-emerald-800 border border-emerald-100">
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-600 font-mono">
                      {log.target_type}: {log.target_id.slice(0, 10)}…
                    </td>
                    <td className="py-3 px-4 text-slate-500 max-w-xs truncate font-mono text-[11px]">
                      {JSON.stringify(log.details)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
