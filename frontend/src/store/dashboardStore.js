import { create } from 'zustand'
import { INITIAL_CANDIDATES } from '../lib/mockData.js'
import { evaluate } from '../lib/xai.js'

function recalcCandidate(c) {
  const result = evaluate({
    tab_switch: c.tabSwitches,
    gaze_away: c.gazeAways,
    face_absent: c.faceAbsences,
    paste: c.pastes,
    keystroke: 0,
  })
  return { ...c, riskScore: result.score, severity: result.severity, reason: result.reason, breakdown: result.breakdown }
}

export const useDashboardStore = create((set, get) => ({
  candidates: INITIAL_CANDIDATES,
  selectedId: INITIAL_CANDIDATES[2]?.id ?? null,
  examId: 'EXAM-2026-001',
  examName: 'Advanced Algorithms — Final Examination',
  isLive: true,

  selectCandidate: (id) => set({ selectedId: id }),

  flagCandidate: (id) =>
    set((s) => ({
      candidates: s.candidates.map((c) =>
        c.id === id ? recalcCandidate({ ...c, tabSwitches: c.tabSwitches + 2, gazeAways: c.gazeAways + 3 }) : c,
      ),
    })),

  dismissCandidate: (id) =>
    set((s) => ({
      candidates: s.candidates.map((c) =>
        c.id === id
          ? recalcCandidate({ ...c, tabSwitches: 0, gazeAways: 0, faceAbsences: 0, pastes: 0, flags: [] })
          : c,
      ),
    })),

  warnCandidate: (id) =>
    set((s) => ({
      candidates: s.candidates.map((c) =>
        c.id === id
          ? {
              ...c,
              flags: [
                {
                  id: `warn-${Date.now()}`,
                  type: 'keystroke',
                  ts: Date.now(),
                  label: 'Warning sent to candidate',
                  severity: 'AMBER',
                },
                ...c.flags,
              ],
            }
          : c,
      ),
    })),

  simulateLiveUpdate: () =>
    set((s) => {
      const idx = Math.floor(Math.random() * s.candidates.length)
      const events = ['tab_switch', 'gaze_away', 'face_absent', 'paste']
      const event = events[Math.floor(Math.random() * events.length)]

      return {
        candidates: s.candidates.map((c, i) => {
          if (i !== idx || !c.connected) return c
          const updated = { ...c, lastActivity: Date.now() }
          if (event === 'tab_switch') updated.tabSwitches += 1
          if (event === 'gaze_away') updated.gazeAways += 1
          if (event === 'face_absent') updated.faceAbsences += 1
          if (event === 'paste') updated.pastes += 1

          updated.flags = [
            {
              id: `live-${Date.now()}`,
              type: event,
              ts: Date.now(),
              label: event === 'tab_switch' ? 'Tab switched' : event === 'gaze_away' ? 'Gaze away' : event === 'face_absent' ? 'Face absent' : 'Paste detected',
              severity: updated.riskScore > 45 ? 'HIGH' : 'AMBER',
            },
            ...updated.flags.slice(0, 19),
          ]

          return recalcCandidate(updated)
        }),
      }
    }),

  getStats: () => {
    const { candidates } = get()
    return {
      total: candidates.length,
      connected: candidates.filter((c) => c.connected).length,
      flagged: candidates.filter((c) => c.riskScore >= 45).length,
      clean: candidates.filter((c) => c.severity === 'CLEAN' || c.severity === 'LOW').length,
    }
  },
}))
