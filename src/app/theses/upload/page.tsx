import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { getCurrentUser } from '@/lib/auth'
import { getAllColleges, getAllPrograms, getAvailableTags } from '@/lib/data'
import { uploadThesis } from '@/app/actions/thesis'
import ThesisFormClient from '@/components/ThesisFormClient'

export const metadata: Metadata = {
  title: 'Upload Thesis',
  description: 'Submit a new thesis to the Refero repository.',
}

export default async function UploadPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/login?redirectTo=/theses/upload')

  const [colleges, programs, tags] = await Promise.all([
    getAllColleges(),
    getAllPrograms(),
    getAvailableTags(100),
  ])

  return (
    <div className="max-w-3xl page-gutter py-10">
      <div className="mb-8">
        <p className="text-sm text-slate-500 mb-1">Refero Repository</p>
        <h1 className="text-3xl font-bold text-slate-900">Upload Thesis</h1>
        <p className="text-slate-500 mt-1">Fill in the details below and attach a PDF file.</p>
      </div>

      <div className="card p-6 sm:p-8">
        <Suspense>
          <ThesisFormClient
            colleges={colleges}
            programs={programs}
            tags={tags}
            action={uploadThesis}
            mode="upload"
          />
        </Suspense>
      </div>
    </div>
  )
}
