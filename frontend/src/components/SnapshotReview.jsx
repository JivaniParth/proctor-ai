import { Camera, Flag } from 'lucide-react'

export function SnapshotReview({ snapshots }) {
  if (snapshots.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-slate-400">
        <Camera className="h-8 w-8 mb-2 opacity-40" />
        <p className="text-sm">No snapshots captured yet</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 gap-3">
      {snapshots.map((snap) => (
        <div
          key={snap.id}
          className={`relative rounded-lg overflow-hidden border ${snap.flagged ? 'border-red-300 ring-2 ring-red-100' : 'border-slate-200'}`}
        >
          <img src={snap.url} alt={`Snapshot at ${new Date(snap.ts).toLocaleTimeString()}`} className="w-full aspect-[4/3] object-cover" />
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-2 py-2">
            <p className="text-[10px] text-white font-medium">
              {new Date(snap.ts).toLocaleTimeString()}
            </p>
          </div>
          {snap.flagged && (
            <div className="absolute top-2 right-2 flex items-center gap-1 rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-semibold text-white">
              <Flag className="h-3 w-3" />
              Flagged
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
