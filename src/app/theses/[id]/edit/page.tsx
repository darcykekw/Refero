import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { Suspense } from 'react'
import { getCurrentUser } from '@/lib/auth'
import { getThesisById, getAllColleges, getAllPrograms, getAvailableTags } from '@/lib/data'
import { getThesisPdfUrl } from '@/lib/storage'
import { updateThesis, deleteThesis } from '@/app/actions/thesis'
import ThesisFormClient from '@/components/ThesisFormClient'
import DeleteThesisButton from '@/components/DeleteThesisButton'

export const metadata: Metadata = { title: 'Edit Thesis' }

interface PageProps {
  params: Promise<{ id: string }>
  searchParams: Promise<{ delete?: string }>
}

export default async function EditThesisPage({ params, searchParams }: PageProps) {
  const { id } = await params
  const { delete: deleteParam } = await searchParams

  // The thesis is needed for the ownership check, so it loads with the user.
  const [user, thesis] = await Promise.all([
    getCurrentUser(),
    getThesisById(id),
  ])

  if (!user) redirect(`/login?redirectTo=/theses/${id}/edit`)
  if (!thesis) notFound()

  // Ownership check — redirect if not the uploader
  if (thesis.uploaded_by !== user.id) redirect(`/theses/${id}`)

  const [colleges, programs, tags, pdfUrl] = await Promise.all([
    getAllColleges(),
    getAllPrograms(),
    getAvailableTags(100),
    getThesisPdfUrl(thesis.pdf_file),
  ])

  const deleteAction = deleteThesis.bind(null, thesis.id)

  return (
    <div className="max-w-3xl page-gutter py-10 space-y-8">
      <div className="mb-2">
        <p className="text-sm text-slate-500 mb-1">Editing thesis</p>
        <h1 className="text-2xl font-bold text-slate-900 leading-snug">{thesis.title}</h1>
      </div>

      {/* Edit form */}
      <div className="card p-6 sm:p-8">
        <Suspense>
          <ThesisFormClient
            colleges={colleges}
            programs={programs}
            tags={tags}
            action={updateThesis}
            initialData={thesis}
            mode="edit"
            pdfPublicUrl={pdfUrl ?? undefined}
          />
        </Suspense>
      </div>

      {/* Delete zone */}
      <div id="delete" className="card p-6 border-red-200 bg-red-50 scroll-mt-24">
        <h2 className="text-base font-semibold text-red-700 mb-1">Delete this thesis</h2>
        <p className="text-sm text-red-500 mb-4">
          This will permanently delete the thesis and its PDF from the repository.
          This action cannot be undone.
        </p>
        <DeleteThesisButton action={deleteAction} defaultOpen={deleteParam === '1'} />
      </div>
    </div>
  )
}
