import { evaluate } from './xai.js'

const NAMES = [
  'Aarav Sharma', 'Priya Patel', 'Rahul Verma', 'Sneha Reddy',
  'Arjun Mehta', 'Kavya Nair', 'Vikram Singh', 'Ananya Iyer',
  'Rohan Gupta', 'Ishita Joshi', 'Dev Malhotra', 'Meera Krishnan',
]

const AVATARS = ['AS', 'PP', 'RV', 'SR', 'AM', 'KN', 'VS', 'AI', 'RG', 'IJ', 'DM', 'MK']

function makeFlags(counts) {
  const flags = []
  let id = 0
  const now = Date.now()

  const types = [
    { type: 'tab_switch', count: counts.tab_switch ?? 0, label: 'Tab switched' },
    { type: 'gaze_away', count: counts.gaze_away ?? 0, label: 'Gaze away from screen' },
    { type: 'face_absent', count: counts.face_absent ?? 0, label: 'Face not detected' },
    { type: 'paste', count: counts.paste ?? 0, label: 'Clipboard paste detected' },
    { type: 'keystroke', count: counts.keystroke ?? 0, label: 'Unusual keystroke pattern' },
  ]

  for (const t of types) {
    for (let i = 0; i < Math.min(t.count, 5); i++) {
      flags.push({
        id: `flag-${id++}`,
        type: t.type,
        ts: now - (id * 45000 + Math.random() * 30000),
        label: t.label,
        severity: i > 2 ? 'HIGH' : 'AMBER',
      })
    }
  }

  return flags.sort((a, b) => b.ts - a.ts)
}

function makeSnapshots(count, flagged) {
  const colors = ['4A90D9', '6B8E23', '8B4513', '2E8B57', 'CD853F', '4682B4']
  return Array.from({ length: count }, (_, i) => ({
    id: `snap-${i}`,
    ts: Date.now() - i * 30000,
    url: `https://placehold.co/320x240/${colors[i % colors.length]}/FFFFFF?text=Snapshot+${i + 1}`,
    flagged: flagged && i < 2,
  }))
}

function buildCandidate(index, counts) {
  const result = evaluate({
    tab_switch: counts.tab_switch ?? 0,
    gaze_away: counts.gaze_away ?? 0,
    face_absent: counts.face_absent ?? 0,
    paste: counts.paste ?? 0,
    keystroke: counts.keystroke ?? 0,
  })

  const id = `CAND-${String(index + 1).padStart(3, '0')}`
  const name = NAMES[index % NAMES.length]

  return {
    id,
    name,
    email: `${name.toLowerCase().replace(' ', '.')}@exam.edu`,
    avatar: AVATARS[index % AVATARS.length],
    connected: index !== 7,
    riskScore: result.score,
    severity: result.severity,
    reason: result.reason,
    breakdown: result.breakdown,
    flags: makeFlags(counts),
    snapshots: makeSnapshots(4, result.score > 40),
    tabSwitches: counts.tab_switch ?? 0,
    gazeAways: counts.gaze_away ?? 0,
    faceAbsences: counts.face_absent ?? 0,
    pastes: counts.paste ?? 0,
    lastActivity: Date.now() - Math.random() * 120000,
  }
}

export const INITIAL_CANDIDATES = [
  buildCandidate(0, { tab_switch: 0, gaze_away: 1, face_absent: 0, paste: 0 }),
  buildCandidate(1, { tab_switch: 1, gaze_away: 4, face_absent: 0, paste: 0 }),
  buildCandidate(2, { tab_switch: 3, gaze_away: 12, face_absent: 1, paste: 1 }),
  buildCandidate(3, { tab_switch: 0, gaze_away: 0, face_absent: 0, paste: 0 }),
  buildCandidate(4, { tab_switch: 2, gaze_away: 8, face_absent: 2, paste: 0 }),
  buildCandidate(5, { tab_switch: 0, gaze_away: 2, face_absent: 0, paste: 0 }),
  buildCandidate(6, { tab_switch: 4, gaze_away: 15, face_absent: 3, paste: 2 }),
  buildCandidate(7, { tab_switch: 1, gaze_away: 3, face_absent: 1, paste: 0 }),
  buildCandidate(8, { tab_switch: 0, gaze_away: 0, face_absent: 0, paste: 0 }),
  buildCandidate(9, { tab_switch: 2, gaze_away: 6, face_absent: 0, paste: 1 }),
  buildCandidate(10, { tab_switch: 0, gaze_away: 1, face_absent: 0, paste: 0 }),
  buildCandidate(11, { tab_switch: 5, gaze_away: 18, face_absent: 2, paste: 3 }),
]
