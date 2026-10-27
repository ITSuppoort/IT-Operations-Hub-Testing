'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { BarChart3, History } from 'lucide-react'
import MovementHistory from '@/components/reports/StockActivityHistory'
import Reports from '@/components/reports/Reports'

export default function HistoryReportsWorkspace() {
  const pathname = usePathname()
  const showReports = pathname === '/reports' || pathname?.startsWith('/reports/')
  return (
    <div className="w-full min-w-0">
      <div className="mb-2 flex flex-wrap items-center gap-2 rounded-xl border border-indigo-400/30 bg-[#101c36]/80 px-2 py-1.5 shadow-[0_6px_24px_rgba(0,0,0,0.15)]">
        <Link href="/reports" aria-current={showReports ? 'page' : undefined}
          className={`inline-flex items-center gap-2 rounded-xl border border-indigo-400/20 px-5 py-2.5 text-sm font-semibold shadow-sm transition-all hover:border-indigo-400/60 hover:shadow-md ${showReports ? 'bg-violet-600 text-white shadow-md' : 'text-slate-300 hover:bg-white/10 hover:text-white'}`}>
          <BarChart3 size={17} /> Reportes
        </Link>
        <Link href="/history" aria-current={!showReports ? 'page' : undefined}
          className={`inline-flex items-center gap-2 rounded-xl border border-indigo-400/20 px-5 py-2.5 text-sm font-semibold shadow-sm transition-all hover:border-indigo-400/60 hover:shadow-md ${!showReports ? 'bg-violet-600 text-white shadow-md' : 'text-slate-300 hover:bg-white/10 hover:text-white'}`}>
          <History size={17} /> Historial
        </Link>
      </div>
      {showReports ? <Reports /> : <MovementHistory />}
    </div>
  )
}
