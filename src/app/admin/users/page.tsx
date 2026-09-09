import { getAdminUsersList } from '@/lib/admin-data'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'User Management | Refero Admin',
}

export default async function AdminUsersPage() {
  const users = await getAdminUsersList()

  return (
    <div className="space-y-6">
      {/* Header Banner Card */}
      <div className="page-header-banner flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl md:text-3xl font-bold text-slate-900">
            User Management
          </h1>
          <p className="text-sm text-slate-600 mt-1 font-medium">
            Registered accounts, roles, and authentication status across the university domain.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-3.5 py-2 rounded-xl bg-white border border-slate-200/80 text-slate-700 text-xs font-semibold shadow-xs">
            Total Enrolled: <strong className="text-emerald-900">{users.length}</strong>
          </span>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Registered Users ({users.length})
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
              <tr>
                <th className="py-3.5 px-4">User</th>
                <th className="py-3.5 px-4">Email</th>
                <th className="py-3.5 px-4">Role</th>
                <th className="py-3.5 px-4">Provider</th>
                <th className="py-3.5 px-4">Joined Date</th>
                <th className="py-3.5 px-4 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map(u => {
                const adminEmails = ['202380256@psu.palawan.edu.ph', 'lawsmagnet6@gmail.com']
                const isAdmin =
                  (u.email && adminEmails.includes(u.email.toLowerCase())) ||
                  u.app_metadata?.role === 'admin' ||
                  u.user_metadata?.role === 'admin'
                const fullName = u.user_metadata?.full_name || u.user_metadata?.name || 'Student'
                const provider = u.app_metadata?.provider || 'email'

                return (
                  <tr key={u.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-emerald-700 text-white flex items-center justify-center font-bold text-xs">
                          {fullName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900">{fullName}</p>
                          <p className="text-[10px] text-slate-400 font-mono">{u.id.slice(0, 13)}…</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-700">
                      {u.email}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {isAdmin ? (
                        <span className="px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800 font-bold text-[10px] border border-purple-200">
                          🛡️ Administrator
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 font-medium text-[10px]">
                          Student User
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-slate-500 uppercase text-[11px] font-mono">
                      {provider}
                    </td>
                    <td className="py-3.5 px-4 text-slate-500 whitespace-nowrap" suppressHydrationWarning>
                      {new Date(u.created_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        Active
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
