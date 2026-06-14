import { Wifi, WifiOff } from 'lucide-react'
import { SeverityBadge } from './SeverityBadge.jsx'

export function CandidateCard({ candidate, selected, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left rounded-xl border p-4 transition-all hover:shadow-md ${
        selected
          ? 'border-accent bg-white shadow-lg ring-2 ring-accent/20'
          : 'border-slate-200 bg-white hover:border-navy/30'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-navy text-sm font-bold text-white">
            {candidate.avatar}
          </div>
          <div className="min-w-0">
            <p className="truncate font-semibold text-navy text-sm">{candidate.name}</p>
            <p className="truncate text-xs text-slate-500">{candidate.id}</p>
          </div>
        </div>
        {candidate.connected ? (
          <Wifi className="h-4 w-4 shrink-0 text-emerald-500" />
        ) : (
          <WifiOff className="h-4 w-4 shrink-0 text-slate-400" />
        )}
      </div>

      <div className="mt-3 flex items-center justify-between">
        <SeverityBadge severity={candidate.severity} score={candidate.riskScore} size="sm" />
        <span className="text-[10px] text-slate-400">
          {candidate.flags.length} events
        </span>
      </div>

      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${candidate.riskScore}%`,
            backgroundColor:
              candidate.riskScore >= 70 ? '#ef4444' : candidate.riskScore >= 45 ? '#f97316' : candidate.riskScore >= 20 ? '#f59e0b' : '#10b981',
          }}
        />
      </div>
    </button>
  )
}
