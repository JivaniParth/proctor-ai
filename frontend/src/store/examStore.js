import { create } from 'zustand'
import { apiGet, apiPost } from '../lib/wsClient.js'

// Default questions used when examiner hasn't configured any
export const DEFAULT_QUESTIONS = [
  {
    id: 1,
    question: "What is the time complexity of Dijkstra's algorithm using a binary heap?",
    options: ['O(V)', 'O(V²)', 'O((V+E) log V)', 'O(E log E)'],
    correctIndex: 2,
    marks: 2,
  },
  {
    id: 2,
    question: 'Which data structure is best suited for implementing a LRU cache?',
    options: ['Stack', 'Hash Map + Doubly Linked List', 'Binary Search Tree', 'Queue'],
    correctIndex: 1,
    marks: 2,
  },
  {
    id: 3,
    question: 'In a distributed system, what does the CAP theorem state?',
    options: [
      'You can only guarantee 2 of: Consistency, Availability, Partition tolerance',
      'All three properties can always be achieved',
      'Consistency is always sacrificed for availability',
      'Partition tolerance is optional',
    ],
    correctIndex: 0,
    marks: 3,
  },
]

const DEFAULT_CONFIG = {
  examName: 'Advanced Algorithms — Final Examination',
  examId: 'EXAM-2026-001',
  timeLimitMinutes: 90,
  marksPerQuestion: null,
  passingPercent: 40,
  questions: DEFAULT_QUESTIONS,
}

const STORAGE_KEY = 'proctorai_exam_config'

function readLocalStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (parsed?.questions?.length > 0) return parsed
    }
  } catch { /* ignore */ }
  return null
}

function writeLocalStorage(config) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(config)) } catch { /* ignore */ }
}

function clearLocalStorage() {
  try { localStorage.removeItem(STORAGE_KEY) } catch { /* ignore */ }
}

export const useExamStore = create((set, get) => ({
  examConfig: { ...DEFAULT_CONFIG },
  isCustom: false,
  configSource: 'default',   // 'server' | 'local' | 'default'
  saveStatus: 'idle',        // 'idle' | 'saving' | 'saved-server' | 'saved-local' | 'error'

  /**
   * Load config:
   * 1. Try GET /api/exam-config/{examId} from backend
   * 2. Fall back to localStorage
   * 3. Fall back to defaults
   */
  loadConfig: async () => {
    const examId = get().examConfig.examId

    // Try backend first
    const res = await apiGet(`/api/exam-config/${examId}`)
    if (res.ok && res.data?.config) {
      const config = { ...DEFAULT_CONFIG, ...res.data.config }
      writeLocalStorage(config)  // keep local copy in sync
      set({ examConfig: config, isCustom: true, configSource: 'server' })
      return
    }

    // Fall back to localStorage
    const local = readLocalStorage()
    if (local) {
      set({ examConfig: { ...DEFAULT_CONFIG, ...local }, isCustom: true, configSource: 'local' })
      return
    }

    // Use defaults
    set({ examConfig: { ...DEFAULT_CONFIG }, isCustom: false, configSource: 'default' })
  },

  /**
   * Save config:
   * 1. Always write to localStorage immediately
   * 2. Try POST /api/exam-config to backend
   * 3. Report whether it was persisted server-side
   */
  saveConfig: async (config) => {
    const merged = { ...get().examConfig, ...config }
    set({ saveStatus: 'saving' })

    // Always save locally first (instant, no network needed)
    writeLocalStorage(merged)
    set({ examConfig: merged, isCustom: true })

    // Try backend
    const res = await apiPost('/api/exam-config', { exam_id: merged.examId, config: merged })
    if (res.ok) {
      set({ saveStatus: 'saved-server', configSource: 'server' })
    } else {
      set({ saveStatus: 'saved-local', configSource: 'local' })
    }

    // Reset status after 3s
    setTimeout(() => set({ saveStatus: 'idle' }), 3000)
  },

  resetConfig: () => {
    clearLocalStorage()
    set({ examConfig: { ...DEFAULT_CONFIG }, isCustom: false, configSource: 'default', saveStatus: 'idle' })
  },
}))
