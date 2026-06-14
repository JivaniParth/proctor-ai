import { create } from 'zustand'

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
  marksPerQuestion: null, // null means each question has its own marks field
  passingPercent: 40,
  questions: DEFAULT_QUESTIONS,
}

const STORAGE_KEY = 'proctorai_exam_config'

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (parsed && parsed.questions && parsed.questions.length > 0) {
        return { ...DEFAULT_CONFIG, ...parsed }
      }
    }
  } catch {
    // ignore
  }
  return { ...DEFAULT_CONFIG }
}

export const useExamStore = create((set, get) => ({
  examConfig: loadFromStorage(),
  isCustom: !!localStorage.getItem(STORAGE_KEY),

  saveConfig: (config) => {
    const merged = { ...get().examConfig, ...config }
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(merged))
    } catch {
      // ignore
    }
    set({ examConfig: merged, isCustom: true })
  },

  resetConfig: () => {
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch {
      // ignore
    }
    set({ examConfig: { ...DEFAULT_CONFIG }, isCustom: false })
  },

  loadConfig: () => {
    const config = loadFromStorage()
    set({ examConfig: config, isCustom: !!localStorage.getItem(STORAGE_KEY) })
  },
}))
