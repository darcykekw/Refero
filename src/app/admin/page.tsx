import Image from 'next/image'
import { getAdminStats, getVerificationQueue, getAuditLogsList } from '@/lib/admin-data'
import DashboardRecentQueue from '@/components/admin/DashboardRecentQueue'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function AdminDashboardPage() {
  const [stats, pendingQueue, auditLogs] = await Promise.all([
    getAdminStats(),
    getVerificationQueue(5),
    getAuditLogsList(6),
  ])

  const verifyRate = stats.totalTheses > 0
    ? Math.round((stats.verifiedTheses / stats.totalTheses) * 100)
    : 100

  return (
    <div className="space-y-6">
      {/* ── Top Metric Cards (DealDeck 4-card row with Emerald Hero Card) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
        
        {/* Card 1: Vibrant Hero Card (Total Theses) */}
        <div
          className="rounded-[26px] p-6 text-white relative overflow-hidden flex flex-col justify-between transition-all duration-300 hover:-translate-y-1"
          style={{
            background: 'linear-gradient(135deg, #173B28 0%, #22563A 50%, #2E6A47 100%)',
            boxShadow: '0 12px 28px -6px rgba(23, 59, 40, 0.4), 0 2px 8px rgba(0,0,0,0.06)',
            border: '1px solid rgba(143, 168, 133, 0.3)',
          }}
        >
          {/* Ambient subtle glow ring */}
          <div className="absolute -right-8 -bottom-8 w-32 h-32 rounded-full bg-emerald-400/10 pointer-events-none" />
          <div className="absolute -left-6 -top-6 w-24 h-24 rounded-full bg-white/5 pointer-events-none" />

          <div className="relative z-10">
            <p className="text-xs sm:text-sm uppercase tracking-wider text-emerald-200/90 font-bold">
              Total Manuscripts
            </p>
            <p className="font-serif text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white mt-3 leading-none">
              {stats.totalTheses.toLocaleString()}
            </p>
          </div>

          <div className="relative z-10 pt-5 border-t border-white/10 flex items-center justify-between text-xs text-emerald-200/90 font-medium mt-4">
            <span>All Academic Programs</span>
            <span className="font-mono text-emerald-300 font-bold">PSU COS</span>
          </div>
        </div>

        {/* Card 2: Pending Verification Card */}
        <div
          className="rounded-[26px] p-6 bg-white border flex flex-col justify-between transition-all duration-300 hover:-translate-y-1"
          style={{
            borderColor: stats.pendingTheses > 0 ? 'rgba(245, 158, 11, 0.5)' : 'rgba(143, 168, 133, 0.25)',
            boxShadow: '0 10px 26px -6px rgba(23, 59, 40, 0.05), 0 2px 6px rgba(0,0,0,0.02)',
            background: stats.pendingTheses > 0 ? 'linear-gradient(145deg, #FFFDF7 0%, #FFFFFF 100%)' : '#FFFFFF',
          }}
        >
          <div>
            <p className="text-xs sm:text-sm uppercase tracking-wider text-slate-500 font-bold">
              Pending Verification
            </p>
            <p className="font-serif text-4xl sm:text-5xl lg:text-6xl font-extrabold text-amber-600 mt-3 leading-none">
              {stats.pendingTheses.toLocaleString()}
            </p>
          </div>

          <div className="pt-5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400 font-medium mt-4">
            <span>Awaiting Admin Action</span>
            <Link
              href="/admin/verification"
              className="text-amber-700 hover:text-amber-900 font-bold hover:underline"
            >
              Review Now →
            </Link>
          </div>
        </div>

        {/* Card 3: Registered Users Card */}
        <div
          className="rounded-[26px] p-6 bg-white border flex flex-col justify-between transition-all duration-300 hover:-translate-y-1"
          style={{
            borderColor: 'rgba(143, 168, 133, 0.25)',
            boxShadow: '0 10px 26px -6px rgba(23, 59, 40, 0.05), 0 2px 6px rgba(0,0,0,0.02)',
          }}
        >
          <div>
            <p className="text-xs sm:text-sm uppercase tracking-wider text-slate-500 font-bold">
              Registered Accounts
            </p>
            <p className="font-serif text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 mt-3 leading-none">
              {stats.totalUsers.toLocaleString()}
            </p>
          </div>

          <div className="pt-5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400 font-medium mt-4">
            <span>Students & Faculty</span>
            <Link
              href="/admin/users"
              className="text-emerald-800 hover:text-emerald-950 font-bold hover:underline"
            >
              View Roster →
            </Link>
          </div>
        </div>

        {/* Card 4: Verified & Published Card */}
        <div
          className="rounded-[26px] p-6 bg-white border flex flex-col justify-between transition-all duration-300 hover:-translate-y-1"
          style={{
            borderColor: 'rgba(143, 168, 133, 0.25)',
            boxShadow: '0 10px 26px -6px rgba(23, 59, 40, 0.05), 0 2px 8px rgba(0,0,0,0.02)',
          }}
        >
          <div>
            <p className="text-xs sm:text-sm uppercase tracking-wider text-slate-500 font-bold">
              Verified Manuscripts
            </p>
            <p className="font-serif text-4xl sm:text-5xl lg:text-6xl font-extrabold text-emerald-800 mt-3 leading-none">
              {stats.verifiedTheses.toLocaleString()}
            </p>
          </div>

          <div className="pt-5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400 font-medium mt-4">
            <span>Publicly Searchable</span>
            <Link
              href="/admin/feed"
              className="text-emerald-800 hover:text-emerald-950 font-bold hover:underline"
            >
              Open Feed →
            </Link>
          </div>
        </div>

      </div>

      {/* ── Main 2-Column Section (DealDeck Grid Layout) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 md:gap-6 items-start">
        
        {/* ── LEFT COLUMN (2 Cols): Activity Bar Chart + Recent Queue ── */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Card: Research Activity by Program (Sided Graph with Logos, Names & Counts) */}
          <div
            className="rounded-[26px] p-6 bg-white border shadow-sm"
            style={{
              borderColor: 'rgba(143, 168, 133, 0.28)',
              boxShadow: '0 10px 28px -6px rgba(23, 59, 40, 0.05), 0 2px 8px rgba(0,0,0,0.02)',
            }}
          >
            {/* Header with Title and Dropdown Filter */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 pb-4 border-b border-slate-100">
              <div>
                <h2 className="font-serif text-lg md:text-xl font-bold text-slate-900">
                  Research Volume by Program
                </h2>
                <p className="text-xs text-slate-400 font-medium mt-0.5">
                  Academic discipline manuscript contributions and verification status
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                {/* Legend matching DealDeck */}
                <div className="flex items-center gap-3 text-xs font-semibold text-slate-600 mr-1">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-slate-300" />
                    <span className="text-slate-500">Submitted</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-700" />
                    <span className="text-emerald-900 font-bold">Verified</span>
                  </span>
                </div>

                <div className="px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700">
                  Academic Year 2024–2025
                </div>
              </div>
            </div>

            {/* Program Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 sm:gap-4">
              {stats.programDistribution.map((p) => {
                return (
                  <div
                    key={p.programId}
                    className="flex flex-col items-center text-center p-4 rounded-[22px] transition-all duration-200 hover:-translate-y-1 hover:shadow-md hover:border-emerald-500/50 group"
                    style={{
                      background: 'linear-gradient(180deg, #FBFDFB 0%, #EFF6F1 100%)',
                      border: '1px solid rgba(143, 168, 133, 0.32)',
                      boxShadow: '0 4px 14px -2px rgba(23, 59, 40, 0.04)',
                    }}
                  >
                    {/* 1. Logo of each program */}
                    <div className="w-14 h-14 rounded-2xl bg-white p-2 shadow-xs border border-emerald-100/90 flex items-center justify-center mb-3 group-hover:scale-105 group-hover:border-emerald-300 transition-all duration-200">
                      {p.logo ? (
                        <Image
                          src={p.logo}
                          alt={p.programName}
                          width={42}
                          height={42}
                          className="object-contain w-full h-full select-none"
                        />
                      ) : (
                        <span className="text-2xl">🎓</span>
                      )}
                    </div>

                    {/* 2. Under of it is name of program */}
                    <h3 className="font-serif font-bold text-slate-800 text-xs sm:text-[13px] leading-snug min-h-[2.5rem] flex items-center justify-center group-hover:text-emerald-800 transition-colors px-0.5">
                      {p.programName.replace('Bachelor of Science in ', 'BS ').replace('Bachelor of Science in', 'BS')}
                    </h3>

                    {/* 3. Under of it: How many total in the program each submitted and verified */}
                    <div className="mt-3 w-full pt-2.5 border-t border-emerald-900/10 space-y-1.5 text-xs">
                      <div className="flex items-center justify-between text-[11px] font-medium text-slate-500">
                        <span>Total:</span>
                        <span className="font-mono font-extrabold text-emerald-900 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200/60">
                          {p.count}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-500 flex items-center gap-1.5 font-medium">
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                          Submitted:
                        </span>
                        <span className="font-mono font-bold text-slate-700">
                          {p.submittedCount}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-emerald-800 font-bold flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                          Verified:
                        </span>
                        <span className="font-mono font-extrabold text-emerald-800 bg-emerald-50/70 border border-emerald-200/60 px-1.5 py-0.2 rounded">
                          {p.verifiedCount}
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Card: Recent Verification Queue Table */}
          <div
            className="rounded-[26px] bg-white border shadow-sm overflow-hidden"
            style={{
              borderColor: 'rgba(143, 168, 133, 0.28)',
              boxShadow: '0 10px 28px -6px rgba(23, 59, 40, 0.05), 0 2px 8px rgba(0,0,0,0.02)',
            }}
          >
            <DashboardRecentQueue pendingTheses={pendingQueue} />
          </div>

        </div>

        {/* ── RIGHT COLUMN (1 Col): Academic Growth ── */}
        <div className="space-y-6">
          {/* Academic Output Widget */}
          <div
            className="rounded-[26px] p-6 bg-white border shadow-sm"
            style={{
              borderColor: 'rgba(143, 168, 133, 0.28)',
              boxShadow: '0 10px 28px -6px rgba(23, 59, 40, 0.05), 0 2px 8px rgba(0,0,0,0.02)',
            }}
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-serif text-base font-bold text-slate-900">Academic Output</h3>
                <p className="text-xs text-slate-400">Research manuscript volume</p>
              </div>
              <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-lg border border-emerald-100">
                A.Y. 2024–2025
              </span>
            </div>

            {/* Overlapping Circles/Bubbles Graphic (DealDeck style) */}
            <div className="py-4 flex items-center justify-center">
              <div className="relative w-44 h-28 flex items-center justify-center">
                {/* Main Large Bubble */}
                <div
                  className="w-24 h-24 rounded-full flex flex-col items-center justify-center text-white font-bold shadow-lg absolute -left-2 z-10"
                  style={{
                    background: 'linear-gradient(135deg, #173B28 0%, #2E6A47 100%)',
                    boxShadow: '0 8px 20px -3px rgba(23, 59, 40, 0.35)',
                  }}
                >
                  <span className="font-serif text-xl">{stats.totalTheses}</span>
                  <span className="text-[9px] uppercase tracking-wider text-emerald-200 font-sans">Total</span>
                </div>

                {/* Secondary Bubble */}
                <div
                  className="w-18 h-18 rounded-full flex flex-col items-center justify-center text-white font-bold shadow-md absolute right-4 top-1 z-20"
                  style={{
                    background: 'linear-gradient(135deg, #2E6A47 0%, #598567 100%)',
                  }}
                >
                  <span className="font-serif text-base">{stats.verifiedTheses}</span>
                  <span className="text-[8px] uppercase tracking-wider text-emerald-100 font-sans">Verified</span>
                </div>

                {/* Third Bubble */}
                <div
                  className="w-14 h-14 rounded-full flex flex-col items-center justify-center text-amber-950 font-bold shadow-xs absolute right-10 bottom-0 z-30 bg-amber-400 border border-amber-300"
                >
                  <span className="font-serif text-sm">{stats.pendingTheses}</span>
                  <span className="text-[8px] uppercase tracking-wider font-sans">Queue</span>
                </div>
              </div>
            </div>

            {/* Institutional attribution footer */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-center text-xs">
              <span className="font-medium text-slate-600 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-800" />
                College of Sciences
              </span>
            </div>
          </div>

        </div>

      </div>
    </div>
  )
}
