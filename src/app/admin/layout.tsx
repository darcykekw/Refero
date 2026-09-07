import { redirect } from 'next/navigation'
import { getCurrentUser, isAdminUser } from '@/lib/auth'
import { getAdminStats } from '@/lib/admin-data'
import AdminSidebar from '@/components/admin/AdminSidebar'
import AdminTopNav from '@/components/admin/AdminTopNav'

export const metadata = {
  title: 'Admin Dashboard | Refero',
  description: 'Refero Thesis Hub Administrative Dashboard and Verification Queue',
}

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getCurrentUser()

  if (!user || !isAdminUser(user)) {
    redirect('/login?redirectTo=/admin')
  }

  const stats = await getAdminStats()

  return (
    <div
      className="min-h-screen flex text-slate-800 antialiased p-3 sm:p-4 md:p-5"
      style={{
        backgroundColor: '#F3F6F3',
        backgroundImage: "url('/referoback.png')",
        backgroundAttachment: 'fixed',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      {/* Elevated Floating Left Sidebar */}
      <AdminSidebar pendingCount={stats.pendingTheses} />

      {/* Main Content Area */}
      <div className="flex-1 md:ml-72 flex flex-col min-w-0 space-y-5">
        <AdminTopNav
          userEmail={user.email ?? '202380256@psu.palawan.edu.ph'}
          userName={user.user_metadata?.full_name || 'Admin'}
        />

        <main className="flex-1 w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
