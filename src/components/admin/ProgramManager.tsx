'use client'

import { useState, useTransition, useRef } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import type { AdminProgramItem } from '@/lib/admin-data'
import { PRESET_PROGRAM_LOGOS, getProgramLogoUrl } from '@/lib/constants/programs'
import { addProgramAdmin, updateProgramAdmin, deleteProgramAdmin } from '@/app/actions/admin'

interface ProgramManagerProps {
  initialPrograms: AdminProgramItem[]
}

export default function ProgramManager({ initialPrograms }: ProgramManagerProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingProgram, setEditingProgram] = useState<AdminProgramItem | null>(null)
  const [formDataProgName, setFormDataProgName] = useState('')
  const [logoMode, setLogoMode] = useState<'preset' | 'upload' | 'url'>('preset')
  const [selectedPreset, setSelectedPreset] = useState<string>('YBA-LOGO.png')
  const [customLogoUrl, setCustomLogoUrl] = useState('')
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [filePreview, setFilePreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Delete State
  const [deletingProgram, setDeletingProgram] = useState<AdminProgramItem | null>(null)

  const filteredPrograms = initialPrograms.filter(p =>
    p.prog_name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  function openAddModal() {
    setEditingProgram(null)
    setFormDataProgName('')
    setLogoMode('preset')
    setSelectedPreset('YBA-LOGO.png')
    setCustomLogoUrl('')
    setLogoFile(null)
    setFilePreview(null)
    setIsModalOpen(true)
  }

  function openEditModal(program: AdminProgramItem) {
    setEditingProgram(program)
    setFormDataProgName(program.prog_name)
    setLogoFile(null)
    setFilePreview(null)

    const rawLogo = program.logo || ''
    const matchingPreset = PRESET_PROGRAM_LOGOS.find(
      p => p.file.toLowerCase() === rawLogo.toLowerCase() || p.path.toLowerCase() === rawLogo.toLowerCase()
    )

    if (matchingPreset) {
      setLogoMode('preset')
      setSelectedPreset(matchingPreset.file)
      setCustomLogoUrl('')
    } else if (rawLogo.startsWith('http') || rawLogo.startsWith('/')) {
      setLogoMode('url')
      setCustomLogoUrl(rawLogo)
    } else if (rawLogo) {
      setLogoMode('preset')
      setSelectedPreset(rawLogo)
    } else {
      setLogoMode('preset')
      setSelectedPreset('Refero.png')
    }

    setIsModalOpen(true)
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) {
      setLogoFile(file)
      const reader = new FileReader()
      reader.onload = () => {
        setFilePreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  function handleFormSubmit(e: React.FormEvent) {
    e.preventDefault()
    const nameTrimmed = formDataProgName.trim()
    if (!nameTrimmed) {
      setToast({ type: 'error', message: 'Program degree title cannot be empty.' })
      return
    }

    const formData = new FormData()
    if (editingProgram) {
      formData.set('id', editingProgram.id)
    }
    formData.set('prog_name', nameTrimmed)

    if (logoMode === 'upload' && logoFile) {
      formData.set('logo_file', logoFile)
    } else if (logoMode === 'url' && customLogoUrl.trim()) {
      formData.set('logo_preset', customLogoUrl.trim())
    } else {
      formData.set('logo_preset', selectedPreset)
    }

    startTransition(async () => {
      const res = editingProgram
        ? await updateProgramAdmin(formData)
        : await addProgramAdmin(formData)

      if (res.success) {
        setIsModalOpen(false)
        setToast({
          type: 'success',
          message: editingProgram
            ? `Program "${nameTrimmed}" updated successfully!`
            : `Program "${nameTrimmed}" created successfully!`,
        })
        router.refresh()
      } else {
        setToast({ type: 'error', message: res.error || 'Operation failed.' })
      }
    })
  }

  function handleDeleteConfirm() {
    if (!deletingProgram) return

    startTransition(async () => {
      const res = await deleteProgramAdmin(deletingProgram.id)
      if (res.success) {
        setToast({
          type: 'success',
          message: `Program "${deletingProgram.prog_name}" deleted.`,
        })
        setDeletingProgram(null)
        router.refresh()
      } else {
        setToast({
          type: 'error',
          message: res.error || 'Failed to delete program.',
        })
      }
    })
  }

  // Active preview computation for modal
  const currentPreviewUrl =
    logoMode === 'upload' && filePreview
      ? filePreview
      : logoMode === 'url' && customLogoUrl.trim()
        ? customLogoUrl.trim()
        : getProgramLogoUrl(selectedPreset, formDataProgName)

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Toast Notification */}
      {toast && (
        <div
          role="alert"
          className={`p-4 rounded-xl text-xs font-semibold flex items-center justify-between shadow-sm animate-fade-in ${
            toast.type === 'success'
              ? 'bg-emerald-50 border border-emerald-200 text-emerald-900'
              : 'bg-rose-50 border border-rose-200 text-rose-900'
          }`}
        >
          <div className="flex items-center gap-2">
            <span>{toast.type === 'success' ? '✓' : '✕'}</span>
            <span>{toast.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setToast(null)}
            className="hover:opacity-75 cursor-pointer ml-4 font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {/* ── Toolbar & Metrics ──────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="relative flex-1 sm:w-80">
            <input
              type="search"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search programs by name..."
              className="w-full text-xs text-slate-800 pl-8 pr-3 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600/30"
              style={{
                backgroundColor: '#F8FAF9',
                border: '1px solid #D2DDD4',
              }}
            />
            <svg
              className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <span className="text-xs text-slate-400 hidden sm:inline">
            Showing <strong>{filteredPrograms.length}</strong> of {initialPrograms.length}
          </span>
        </div>

        <button
          type="button"
          onClick={openAddModal}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-[#173B28] hover:bg-[#122e1f] transition-all shadow-sm cursor-pointer shrink-0"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
          </svg>
          <span>Add Program</span>
        </button>
      </div>

      {/* ── Programs Master Table ──────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 bg-[#F9FBF9] text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                <th className="py-3.5 px-4 w-16 text-center">Logo</th>
                <th className="py-3.5 px-4">Program Degree Name</th>
                <th className="py-3.5 px-4 hidden md:table-cell">College</th>
                <th className="py-3.5 px-4 text-center">Manuscripts</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredPrograms.length > 0 ? (
                filteredPrograms.map(program => {
                  const logoSrc = getProgramLogoUrl(program.logo, program.prog_name)
                  return (
                    <tr
                      key={program.id}
                      className="hover:bg-slate-50/70 transition-colors group"
                    >
                      {/* Logo Avatar */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="w-11 h-11 rounded-full bg-[#EBF2EA] border border-emerald-200/60 p-1 flex items-center justify-center mx-auto overflow-hidden shadow-2xs">
                          <Image
                            src={logoSrc}
                            alt={program.prog_name}
                            width={36}
                            height={36}
                            className="w-8 h-8 object-contain"
                            unoptimized
                          />
                        </div>
                      </td>

                      {/* Program Name */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900 text-sm">
                          {program.prog_name}
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                          ID: {program.id}
                        </div>
                      </td>

                      {/* College */}
                      <td className="py-3.5 px-4 hidden md:table-cell">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                          {program.college_name || 'College of Sciences'}
                        </span>
                      </td>

                      {/* Manuscripts */}
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`inline-flex items-center gap-1 font-bold px-2 py-0.5 rounded-full text-xs ${
                            program.theses_count > 0
                              ? 'bg-slate-100 text-slate-800'
                              : 'bg-amber-50 text-amber-700'
                          }`}
                        >
                          <span>{program.theses_count}</span>
                          <span className="text-[10px] font-normal text-slate-500">
                            ({program.verified_theses_count} verified)
                          </span>
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => openEditModal(program)}
                            className="px-3 py-1.5 rounded-lg text-xs font-semibold text-emerald-900 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-colors cursor-pointer"
                            title="Edit program degree and logo"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeletingProgram(program)}
                            className="px-3 py-1.5 rounded-lg text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-colors cursor-pointer"
                            title="Delete program"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              ) : (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-slate-400">
                    No programs found matching &ldquo;{searchQuery}&rdquo;.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Modal: Add / Edit Program ──────────────────────────────────────── */}
      {isModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fade-in"
        >
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl border border-slate-200 animate-scale-in max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="font-serif text-lg font-bold text-slate-900">
                {editingProgram ? 'Modify Degree Program' : 'Add New Academic Program'}
              </h2>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer text-lg leading-none"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="space-y-4">
              {/* Program Name */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Program Degree Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formDataProgName}
                  onChange={e => setFormDataProgName(e.target.value)}
                  placeholder="e.g. Bachelor of Science in Data Science"
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600/30 text-slate-900 font-medium"
                  required
                />
              </div>

              {/* Logo Selection Mode Tabs */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Program Logo / Emblem
                </label>
                <div className="flex gap-1.5 p-1 bg-slate-100 rounded-xl mb-3">
                  <button
                    type="button"
                    onClick={() => setLogoMode('preset')}
                    className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                      logoMode === 'preset'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    Preset Association Logos
                  </button>
                  <button
                    type="button"
                    onClick={() => setLogoMode('upload')}
                    className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                      logoMode === 'upload'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    Upload Custom Image
                  </button>
                  <button
                    type="button"
                    onClick={() => setLogoMode('url')}
                    className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                      logoMode === 'url'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    Image URL
                  </button>
                </div>

                {/* Mode 1: Preset Logos Grid */}
                {logoMode === 'preset' && (
                  <div className="grid grid-cols-3 gap-2.5 p-2 bg-slate-50 rounded-xl border border-slate-200">
                    {PRESET_PROGRAM_LOGOS.map(preset => {
                      const isSelected = selectedPreset === preset.file
                      return (
                        <button
                          key={preset.file}
                          type="button"
                          onClick={() => setSelectedPreset(preset.file)}
                          className={`flex flex-col items-center gap-1.5 p-2.5 rounded-xl border transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-emerald-50 border-emerald-600 ring-2 ring-emerald-600/20 shadow-xs'
                              : 'bg-white border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <div className="w-10 h-10 flex items-center justify-center">
                            <Image
                              src={preset.path}
                              alt={preset.name}
                              width={36}
                              height={36}
                              className="w-9 h-9 object-contain"
                              unoptimized
                            />
                          </div>
                          <span className="text-[10px] font-semibold text-slate-700 text-center line-clamp-1">
                            {preset.name}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                )}

                {/* Mode 2: Upload File */}
                {logoMode === 'upload' && (
                  <div className="space-y-2 p-3 bg-slate-50 rounded-xl border border-dashed border-slate-300 text-center">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/svg+xml,image/webp"
                      onChange={handleFileChange}
                      className="hidden"
                      id="program-logo-upload"
                    />
                    <label
                      htmlFor="program-logo-upload"
                      className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer shadow-xs"
                    >
                      <svg className="w-4 h-4 text-emerald-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                      </svg>
                      <span>Choose Logo File...</span>
                    </label>
                    <p className="text-[11px] text-slate-400">
                      Supports PNG, JPG, SVG, WebP (max 5MB)
                    </p>
                    {logoFile && (
                      <p className="text-xs text-emerald-800 font-semibold mt-1">
                        Selected: {logoFile.name} ({(logoFile.size / 1024).toFixed(1)} KB)
                      </p>
                    )}
                  </div>
                )}

                {/* Mode 3: Image URL */}
                {logoMode === 'url' && (
                  <div>
                    <input
                      type="url"
                      value={customLogoUrl}
                      onChange={e => setCustomLogoUrl(e.target.value)}
                      placeholder="https://example.com/logo.png"
                      className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600/30 text-slate-900"
                    />
                  </div>
                )}
              </div>

              {/* Live Preview Display */}
              <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-100 flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-white border border-emerald-200 p-1 flex items-center justify-center shadow-xs overflow-hidden shrink-0">
                  <Image
                    src={currentPreviewUrl}
                    alt="Preview"
                    width={40}
                    height={40}
                    className="w-9 h-9 object-contain"
                    unoptimized
                  />
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase text-emerald-800 tracking-wider">
                    Live Carousel Preview
                  </span>
                  <div className="text-xs font-bold text-slate-900 truncate">
                    {formDataProgName.trim() || 'Program Degree Title'}
                  </div>
                </div>
              </div>

              {/* Modal Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-[#173B28] hover:bg-[#122e1f] transition-all shadow-sm cursor-pointer disabled:opacity-50"
                >
                  {isPending
                    ? 'Saving Program…'
                    : editingProgram
                      ? 'Save Changes'
                      : 'Create Program'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal: Delete Confirmation ──────────────────────────────────────── */}
      {deletingProgram && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fade-in"
        >
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-200 animate-scale-in">
            <div className="flex items-center gap-3 text-rose-700">
              <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center text-lg shrink-0">
                ⚠️
              </div>
              <h2 className="font-serif text-lg font-bold text-slate-900">
                Delete Academic Program?
              </h2>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to delete{' '}
              <strong className="text-slate-900">{deletingProgram.prog_name}</strong>?
            </p>

            {deletingProgram.theses_count > 0 ? (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 space-y-1">
                <div className="font-bold">Cannot delete program with active theses</div>
                <p className="text-[11px] text-amber-800">
                  There are <strong>{deletingProgram.theses_count}</strong> student theses linked to this degree program. Please reassign or delete these manuscripts first before deleting the program.
                </p>
              </div>
            ) : (
              <p className="text-[11px] text-slate-400">
                This program has 0 manuscripts attached and can be safely deleted.
              </p>
            )}

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setDeletingProgram(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                disabled={isPending || deletingProgram.theses_count > 0}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-rose-700 hover:bg-rose-800 transition-all shadow-sm cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isPending ? 'Deleting…' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
