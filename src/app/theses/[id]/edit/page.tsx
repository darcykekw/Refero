import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getThesisById, getAllPrograms, getAvailableTags } from '@/lib/data'
import { updateThesis, deleteThesis } from '@/app/actions/thesis'
import ThesisFormClient from '@/components/ThesisFormClient'

export const metadata: Metadata = { title: 'Edit Thesis' }

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function EditThesisPage({ params }: PageProps) {
  const { id } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/login?redirectTo=/theses/${id}/edit`)

  const thesis = await getThesisById(id)
  if (!thesis) notFound()

  // Ownership check — redirect if not the uploader
  if (thesis.uploaded_by !== user.id) redirect(`/theses/${id}`)

  const [colleges, programs, tags] = await Promise.all([
    supabase.from('colleges').select('*').order('college_name').then(r => r.data ?? []),
    getAllPrograms(),
    getAvailableTags(100),
  ])

  // Public URL for existing PDF preview
  const admin = createAdminClient()
  const { data: { publicUrl } } = admin.storage
    .from('thesis-pdfs')
    .getPublicUrl(thesis.pdf_file)

  const deleteAction = deleteThesis.bind(null, thesis.id)

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div className="mb-2">
        <p className="text-sm text-slate-500 mb-1">Editing thesis</p>
        <h1 className="text-2xl font-bold text-slate-900 leading-snug">{thesis.title}</h1>
      </div>

      {/* Edit form */}
      <div className="card p-6 sm:p-8">
        <Suspense>
          <ThesisFormClient
            colleges={colleges as Parameters<typeof ThesisFormClient>[0]['colleges']}
            programs={programs}
            tags={tags}
            action={updateThesis}
            initialData={thesis}
            mode="edit"
            pdfPublicUrl={publicUrl}
          />
        </Suspense>
      </div>

      {/* Delete zone */}
      <div className="card p-6 border-red-200 bg-red-50">
        <h2 className="text-base font-semibold text-red-700 mb-1">Delete this thesis</h2>
        <p className="text-sm text-red-500 mb-4">
          This will permanently delete the thesis and its PDF from the repository.
          This action cannot be undone.
        </p>
        <form action={deleteAction}>
          <button
            id="thesis-delete-btn"
            type="submit"
            className="btn text-white bg-red-600 hover:bg-red-700 border-red-700 btn-sm"
            onClick={e => {
              if (!confirm('Are you sure you want to delete this thesis? This cannot be undone.')) {
                e.preventDefault()
              }
            }}
          >
            Delete thesis permanently
          </button>
        </form>
      </div>
    </div>
  )
}
