import { AlertOctagon, Bell, CheckCircle, Download, Flag } from 'lucide-react'
import { exportCandidateReport } from '../lib/exportPdf.js'

export function ActionBar({ candidate, onWarn, onFlag, onDismiss }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={onWarn}
        className="inline-flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-700 hover:bg-amber-100 transition-colors"
      >
        <Bell className="h-4 w-4" />
        Send Warning
      </button>
      <button
        type="button"
        onClick={onFlag}
        className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-100 transition-colors"
      >
        <Flag className="h-4 w-4" />
        Flag for Review
      </button>
      <button
        type="button"
        onClick={onDismiss}
        className="inline-flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-100 transition-colors"
      >
        <CheckCircle className="h-4 w-4" />
        Dismiss Flags
      </button>
      <button
        type="button"
        onClick={() => exportCandidateReport(candidate)}
        className="inline-flex items-center gap-2 rounded-lg bg-navy px-4 py-2 text-sm font-medium text-white hover:bg-navy-light transition-colors"
      >
        <Download className="h-4 w-4" />
        Export PDF
      </button>
      {candidate.severity === 'RED' && (
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-light transition-colors ml-auto"
        >
          <AlertOctagon className="h-4 w-4" />
          Terminate Session
        </button>
      )}
    </div>
  )
}
