import { useEffect } from 'react'
import {
  Activity, Download, Filter, Radio, Search, Users,
} from 'lucide-react'
import { useDashboardStore } from '../store/dashboardStore.js'
import { CandidateCard } from '../components/CandidateCard.jsx'
import { RiskMeter } from '../components/RiskMeter.jsx'
import { SeverityBadge } from '../components/SeverityBadge.jsx'
import { XAIPanel } from '../components/XAIPanel.jsx'
import { FlagTimeline } from '../components/FlagTimeline.jsx'
import { SnapshotReview } from '../components/SnapshotReview.jsx'
import { ActionBar } from '../components/ActionBar.jsx'
import { exportExamSummary } from '../lib/exportPdf.js'

export function Dashboard() {
  const {
    candidates, selectedId, examId, examName, isLive,
    selectCandidate, flagCandidate, dismissCandidate, warnCandidate,
    simulateLiveUpdate, getStats,
  } = useDashboardStore()

  const selected = candidates.find((c) => c.id === selectedId) ?? null
  const stats = getStats()

  useEffect(() => {
    if (!isLive) return
    const interval = setInterval(simulateLiveUpdate, 4000)
    return () => clearInterval(interval)
  }, [isLive, simulateLiveUpdate])

  const sorted = [...candidates].sort((a, b) => b.riskScore - a.riskScore)

  return (
    <div className="min-h-screen bg-surface">
      {/* Header */}
      <div className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-[1600px] px-4 py-4 sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-navy">Invigilator Dashboard</h1>
                {isLive && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 border border-red-200 px-2.5 py-0.5 text-xs font-semibold text-red-600">
                    <Radio className="h-3 w-3 animate-pulse" />
                    LIVE
                  </span>
                )}
              </div>
              <p className="text-sm text-slate-500 mt-0.5">
                {examName} · <span className="font-mono text-xs">{examId}</span>
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-4 rounded-xl bg-surface border border-slate-200 px-4 py-2">
                <div className="text-center">
                  <p className="text-lg font-bold text-navy">{stats.total}</p>
                  <p className="text-[10px] text-slate-500 uppercase">Total</p>
                </div>
                <div className="h-8 w-px bg-slate-200" />
                <div className="text-center">
                  <p className="text-lg font-bold text-emerald-600">{stats.connected}</p>
                  <p className="text-[10px] text-slate-500 uppercase">Online</p>
                </div>
                <div className="h-8 w-px bg-slate-200" />
                <div className="text-center">
                  <p className="text-lg font-bold text-amber-600">{stats.flagged}</p>
                  <p className="text-[10px] text-slate-500 uppercase">Flagged</p>
                </div>
                <div className="h-8 w-px bg-slate-200" />
                <div className="text-center">
                  <p className="text-lg font-bold text-blue-600">{stats.clean}</p>
                  <p className="text-[10px] text-slate-500 uppercase">Clean</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => exportExamSummary(candidates)}
                className="inline-flex items-center gap-2 rounded-lg bg-navy px-4 py-2 text-sm font-medium text-white hover:bg-navy-light transition-colors"
              >
                <Download className="h-4 w-4" />
                Export All
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Candidate Grid */}
          <div className="lg:col-span-4 xl:col-span-3">
            <div className="rounded-xl border border-slate-200 bg-white overflow-hidden sticky top-20">
              <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-navy" />
                  <h2 className="font-semibold text-navy text-sm">Candidate Grid</h2>
                </div>
                <span className="text-xs text-slate-400">{candidates.length} total</span>
              </div>

              <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-2">
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search candidates..."
                    className="w-full rounded-lg border border-slate-200 bg-surface py-1.5 pl-8 pr-3 text-xs focus:outline-none focus:ring-2 focus:ring-navy/20"
                  />
                </div>
                <button type="button" className="rounded-lg border border-slate-200 p-1.5 text-slate-500 hover:bg-surface">
                  <Filter className="h-3.5 w-3.5" />
                </button>
              </div>

              <div className="max-h-[calc(100vh-280px)] overflow-y-auto p-3 space-y-2">
                {sorted.map((c) => (
                  <CandidateCard
                    key={c.id}
                    candidate={c}
                    selected={c.id === selectedId}
                    onClick={() => selectCandidate(c.id)}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Detail Panel */}
          <div className="lg:col-span-8 xl:col-span-9">
            {selected ? (
              <div className="space-y-6 animate-slide-up">
                {/* Candidate header */}
                <div className="rounded-xl border border-slate-200 bg-white p-6">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-navy text-lg font-bold text-white">
                        {selected.avatar}
                      </div>
                      <div>
                        <h2 className="text-xl font-bold text-navy">{selected.name}</h2>
                        <p className="text-sm text-slate-500">{selected.email}</p>
                        <p className="text-xs font-mono text-slate-400 mt-0.5">{selected.id}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <RiskMeter score={selected.riskScore} />
                      <div className="text-right">
                        <SeverityBadge severity={selected.severity} size="lg" />
                        <p className="mt-2 flex items-center gap-1 text-xs text-slate-500 justify-end">
                          <Activity className="h-3 w-3" />
                          Last active {new Date(selected.lastActivity).toLocaleTimeString()}
                        </p>
                        <p className="text-xs text-slate-400">
                          {selected.connected ? '● Connected' : '○ Disconnected'}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6">
                    <ActionBar
                      candidate={selected}
                      onWarn={() => warnCandidate(selected.id)}
                      onFlag={() => flagCandidate(selected.id)}
                      onDismiss={() => dismissCandidate(selected.id)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                  <XAIPanel candidate={selected} />

                  <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
                    <div className="border-b border-slate-100 px-4 py-3">
                      <h3 className="font-semibold text-navy text-sm">Flag Timeline</h3>
                    </div>
                    <div className="p-4 max-h-[400px] overflow-y-auto">
                      <FlagTimeline flags={selected.flags} />
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
                  <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                    <h3 className="font-semibold text-navy text-sm">Snapshot Review</h3>
                    <span className="text-xs text-slate-400">Captured every 30s</span>
                  </div>
                  <div className="p-4">
                    <SnapshotReview snapshots={selected.snapshots} />
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white py-24 text-slate-400">
                <Users className="h-12 w-12 mb-4 opacity-30" />
                <p className="text-lg font-medium">Select a candidate to review</p>
                <p className="text-sm mt-1">Click any card in the grid to view live status and XAI reasoning</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
