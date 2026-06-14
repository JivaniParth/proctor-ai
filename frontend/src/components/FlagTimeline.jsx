import { AlertTriangle, Eye, EyeOff, Clipboard, Keyboard, Monitor } from 'lucide-react'

const ICONS = {
  tab_switch: Monitor,
  gaze_away: EyeOff,
  face_absent: Eye,
  face_present: Eye,
  paste: Clipboard,
  keystroke: Keyboard,
}

export function FlagTimeline({ flags }) {
  if (flags.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-slate-400">
        <AlertTriangle className="h-8 w-8 mb-2 opacity-40" />
        <p className="text-sm">No flags recorded</p>
      </div>
    )
  }

  return (
    <div className="space-y-0">
      {flags.map((flag, i) => {
        const Icon = ICONS[flag.type] ?? AlertTriangle
        const isHigh = flag.severity === 'HIGH' || flag.severity === 'RED'

        return (
          <div key={flag.id} className="flex gap-3 relative">
            {i < flags.length - 1 && (
              <div className="absolute left-[15px] top-8 bottom-0 w-px bg-slate-200" />
            )}
            <div className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${isHigh ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'}`}>
              <Icon className="h-4 w-4" />
            </div>
            <div className="flex-1 pb-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-navy">{flag.label}</p>
                <span className="text-xs text-slate-400">
                  {new Date(flag.ts).toLocaleTimeString()}
                </span>
              </div>
              <span className={`inline-block mt-1 text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded ${isHigh ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-600'}`}>
                {flag.severity}
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}
