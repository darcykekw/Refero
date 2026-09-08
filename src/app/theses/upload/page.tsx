import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { getCurrentUser } from '@/lib/auth'
import { getAllColleges, getAllPrograms, getAvailableTags } from '@/lib/data'
import { uploadThesis } from '@/app/actions/thesis'
import { DEFAULT_COLLEGES, DEFAULT_PROGRAMS, DEFAULT_TAGS } from '@/lib/constants/programs'
import ThesisFormClient from '@/components/ThesisFormClient'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Upload Thesis',
  description: 'Submit a new thesis to the Refero repository.',
}

export default async function UploadPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/login?redirectTo=/theses/upload')

  const [colleges, programs, tags] = await Promise.all([
    getAllColleges().catch(() => DEFAULT_COLLEGES),
    getAllPrograms().catch(() => DEFAULT_PROGRAMS),
    getAvailableTags(100).catch(() => DEFAULT_TAGS),
  ])

  return (
    <div className="max-w-3xl page-gutter py-10 space-y-6">
      {/* Breadcrumb */}
      <nav className="breadcrumb-bar" aria-label="Breadcrumb">
        <Link href="/">Home</Link>
        <span className="divider">/</span>
        <Link href="/theses">Theses</Link>
        <span className="divider">/</span>
        <span className="current">Upload</span>
      </nav>

      {/* Page Header */}
      <div className="page-header-banner">
        <p className="text-xs font-bold uppercase tracking-wider text-emerald-800 mb-1">Refero Repository</p>
        <h1 className="text-3xl font-bold" style={{ fontFamily: "'Playfair Display', Georgia, serif", color: '#112117' }}>Upload Thesis</h1>
        <p className="text-sm mt-1" style={{ color: '#435A4C' }}>Fill in the details below and attach a PDF file.</p>
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
