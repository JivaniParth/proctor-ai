import { Brain, Shield } from 'lucide-react'
import { SEVERITY_COLORS } from '../lib/xai.js'

export function XAIPanel({ candidate }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
      <div className="flex items-center gap-2 border-b border-slate-100 bg-navy px-4 py-3">
        <Brain className="h-5 w-5 text-white" />
        <h3 className="font-semibold text-white">XAI Reasoning Engine</h3>
        <span className="ml-auto rounded-full bg-white/10 px-2 py-0.5 text-xs text-white/80">
          5-min window
        </span>
      </div>

      <div className="p-4">
        <div className="rounded-lg bg-surface p-4 border border-slate-100">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500 mb-1">
            Autonomous Assessment
          </p>
          <p className="text-base font-medium text-navy leading-relaxed">
            {candidate.reason}
          </p>
        </div>

        {candidate.breakdown.length > 0 ? (
          <div className="mt-4 space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Signal Breakdown
            </p>
            {candidate.breakdown.map((hit) => (
              <div
                key={hit.signal}
                className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2.5"
              >
                <div className="flex items-center gap-2">
                  <Shield className={`h-4 w-4 ${hit.severity === 'RED' ? 'text-red-500' : 'text-amber-500'}`} />
                  <span className="text-sm text-slate-700">
                    <span className="font-semibold">{hit.count}</span> {hit.label}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded ${SEVERITY_COLORS[hit.severity === 'RED' ? 'RED' : 'AMBER'].bg} ${SEVERITY_COLORS[hit.severity === 'RED' ? 'RED' : 'AMBER'].text}`}>
                    {hit.severity}
                  </span>
                  <span className="text-sm font-bold text-navy">+{hit.score_contribution}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-4 flex items-center gap-2 rounded-lg bg-emerald-50 border border-emerald-100 px-4 py-3">
            <Shield className="h-5 w-5 text-emerald-600" />
            <p className="text-sm text-emerald-700">All signals within normal parameters</p>
          </div>
        )}

        <div className="mt-4 grid grid-cols-4 gap-2">
          {[
            { label: 'Tab Switches', value: candidate.tabSwitches },
            { label: 'Gaze Aways', value: candidate.gazeAways },
            { label: 'Face Absent', value: candidate.faceAbsences },
            { label: 'Pastes', value: candidate.pastes },
          ].map((s) => (
            <div key={s.label} className="rounded-lg bg-surface border border-slate-100 p-2 text-center">
              <p className="text-lg font-bold text-navy">{s.value}</p>
              <p className="text-[10px] text-slate-500">{s.label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
