const RULES = [
  { signal: 'tab_switch', label: 'tab switch', label_plural: 'tab switches', amber: 1, red: 3, weight: 35 },
  { signal: 'gaze_away', label: 'gaze-away', label_plural: 'gaze-aways', amber: 3, red: 10, weight: 30 },
  { signal: 'face_absent', label: 'face absent', label_plural: 'face absences', amber: 1, red: 3, weight: 20 },
  { signal: 'paste', label: 'paste', label_plural: 'pastes', amber: 1, red: 2, weight: 10 },
  { signal: 'keystroke', label: 'odd keystroke', label_plural: 'odd keystrokes', amber: 5, red: 15, weight: 5 },
]

function severityBand(score) {
  if (score === 0) return 'CLEAN'
  if (score < 20) return 'LOW'
  if (score < 45) return 'AMBER'
  if (score < 70) return 'HIGH'
  return 'RED'
}

function ruleScore(rule, count) {
  if (count < rule.amber) return [0, null]
  if (count >= rule.red) return [rule.weight, 'RED']
  const ratio = (count - rule.amber) / Math.max(rule.red - rule.amber, 1)
  return [Math.round(rule.weight * ratio), 'AMBER']
}

export function evaluate(window) {
  let totalScore = 0
  const hits = []

  for (const rule of RULES) {
    const count = window[rule.signal] ?? 0
    const [points, severity] = ruleScore(rule, count)
    if (severity) {
      hits.push({
        signal: rule.signal,
        label: count > 1 ? rule.label_plural : rule.label,
        count,
        severity,
        score_contribution: points,
      })
      totalScore += points
    }
  }

  totalScore = Math.min(totalScore, 100)
  const sorted = [...hits].sort((a, b) => b.score_contribution - a.score_contribution)
  const reason = sorted.length
    ? `${sorted.map((h) => `${h.count} ${h.label}`).join(' · ')} in 5 min`
    : 'No suspicious activity detected'

  return {
    score: totalScore,
    severity: severityBand(totalScore),
    reason,
    breakdown: hits,
  }
}

export const SEVERITY_COLORS = {
  CLEAN: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  LOW: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  AMBER: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  HIGH: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' },
  RED: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
}
