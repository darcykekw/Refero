import { getMasterlistTheses, getAllTagsWithUsage } from '@/lib/admin-data'
import { getAllPrograms } from '@/lib/data'
import AdminThesisFeedClient from '@/components/admin/AdminThesisFeedClient'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Thesis Feed | Refero Admin',
  description: 'Browse, review, and manage student theses across College of Sciences disciplines',
}

export default async function AdminFeedPage() {
  const [theses, programs, tags] = await Promise.all([
    getMasterlistTheses(),
    getAllPrograms(),
    getAllTagsWithUsage(),
  ])

  return (
    <AdminThesisFeedClient
      theses={theses}
      programs={programs}
      tags={tags}
    />
  )
}
