import { SEVERITY_COLORS } from '../lib/xai.js'

export function SeverityBadge({ severity, score, size = 'md' }) {
  const colors = SEVERITY_COLORS[severity]
  const sizeClass = size === 'sm' ? 'text-xs px-2 py-0.5' : size === 'lg' ? 'text-sm px-4 py-1.5' : 'text-xs px-2.5 py-1'

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border font-semibold ${colors.bg} ${colors.text} ${colors.border} ${sizeClass}`}>
      {score !== undefined && <span className="font-bold">{score}</span>}
      <span>{severity}</span>
    </span>
  )
}
