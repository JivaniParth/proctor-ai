import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Plus, Trash2, ChevronUp, ChevronDown, Save,
  RotateCcw, CheckCircle, AlertTriangle, Settings,
  BookOpen, Clock, Award, GraduationCap, ArrowRight,
} from 'lucide-react'
import { useExamStore, DEFAULT_QUESTIONS } from '../store/examStore.js'

let nextId = 100

function createBlankQuestion() {
  return {
    id: nextId++,
    question: '',
    options: ['', '', '', ''],
    correctIndex: 0,
    marks: 2,
  }
}

export function ExamSetup() {
  const navigate = useNavigate()
  const { examConfig, isCustom, saveConfig, resetConfig, loadConfig } = useExamStore()

  useEffect(() => { loadConfig() }, [loadConfig])

  // Local form state
  const [examName, setExamName] = useState(examConfig.examName)
  const [examId, setExamId] = useState(examConfig.examId)
  const [timeLimitMinutes, setTimeLimitMinutes] = useState(examConfig.timeLimitMinutes)
  const [passingPercent, setPassingPercent] = useState(examConfig.passingPercent)
  const [questions, setQuestions] = useState(
    examConfig.questions.map((q) => ({ ...q, options: [...q.options] }))
  )
  const [saved, setSaved] = useState(false)
  const [errors, setErrors] = useState([])

  // Sync from store if it changes externally
  useEffect(() => {
    setExamName(examConfig.examName)
    setExamId(examConfig.examId)
    setTimeLimitMinutes(examConfig.timeLimitMinutes)
    setPassingPercent(examConfig.passingPercent)
    setQuestions(examConfig.questions.map((q) => ({ ...q, options: [...q.options] })))
  }, [examConfig])

  const totalMarks = questions.reduce((sum, q) => sum + Number(q.marks || 0), 0)

  function validate() {
    const errs = []
    if (!examName.trim()) errs.push('Exam name is required')
    if (!examId.trim()) errs.push('Exam ID is required')
    if (!timeLimitMinutes || timeLimitMinutes < 1) errs.push('Time limit must be at least 1 minute')
    if (questions.length === 0) errs.push('Add at least one question')
    questions.forEach((q, i) => {
      if (!q.question.trim()) errs.push(`Question ${i + 1}: question text is required`)
      const filledOptions = q.options.filter((o) => o.trim())
      if (filledOptions.length < 2) errs.push(`Question ${i + 1}: at least 2 options required`)
      if (!q.options[q.correctIndex]?.trim()) errs.push(`Question ${i + 1}: correct answer option is empty`)
    })
    return errs
  }

  function handleSave() {
    const errs = validate()
    if (errs.length > 0) { setErrors(errs); return }
    setErrors([])
    saveConfig({ examName, examId, timeLimitMinutes: Number(timeLimitMinutes), passingPercent: Number(passingPercent), questions })
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  function handleReset() {
    if (!window.confirm('Reset to default questions? This will clear your custom exam config.')) return
    resetConfig()
    loadConfig()
  }

  // Question mutations
  function addQuestion() {
    setQuestions((prev) => [...prev, createBlankQuestion()])
  }

  function removeQuestion(idx) {
    setQuestions((prev) => prev.filter((_, i) => i !== idx))
  }

  function moveQuestion(idx, dir) {
    setQuestions((prev) => {
      const arr = [...prev]
      const target = idx + dir
      if (target < 0 || target >= arr.length) return arr;
      [arr[idx], arr[target]] = [arr[target], arr[idx]]
      return arr
    })
  }

  function updateQuestion(idx, field, value) {
    setQuestions((prev) => prev.map((q, i) => i === idx ? { ...q, [field]: value } : q))
  }

  function updateOption(qIdx, optIdx, value) {
    setQuestions((prev) => prev.map((q, i) => {
      if (i !== qIdx) return q
      const options = [...q.options]
      options[optIdx] = value
      return { ...q, options }
    }))
  }

  return (
    <div className="min-h-screen bg-surface">
      {/* Header */}
      <div className="border-b border-slate-200 bg-white sticky top-16 z-30">
        <div className="mx-auto max-w-4xl px-4 py-4 sm:px-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-navy">
              <Settings className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-navy">Exam Setup</h1>
              <p className="text-xs text-slate-500">Configure questions, time, and marks for the exam</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isCustom && (
              <button
                type="button"
                onClick={handleReset}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Reset to Defaults
              </button>
            )}
            <button
              type="button"
              onClick={handleSave}
              className="inline-flex items-center gap-1.5 rounded-lg bg-navy px-4 py-2 text-sm font-semibold text-white hover:bg-navy-light transition-colors"
            >
              <Save className="h-4 w-4" />
              Save Config
            </button>
            <button
              type="button"
              onClick={() => navigate('/exam')}
              className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-light transition-colors"
            >
              Launch Exam
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 space-y-6">

        {/* Save feedback */}
        {saved && (
          <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4 flex items-center gap-3 animate-slide-up">
            <CheckCircle className="h-5 w-5 text-emerald-600 shrink-0" />
            <p className="text-sm text-emerald-700 font-medium">Exam configuration saved! The Exam Client will now use these settings.</p>
          </div>
        )}

        {/* Validation errors */}
        {errors.length > 0 && (
          <div className="rounded-xl bg-red-50 border border-red-200 p-4 space-y-1">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-5 w-5 text-red-600 shrink-0" />
              <p className="text-sm font-semibold text-red-700">Please fix the following errors:</p>
            </div>
            {errors.map((e, i) => (
              <p key={i} className="text-xs text-red-600 pl-7">• {e}</p>
            ))}
          </div>
        )}

        {/* Exam Metadata */}
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
          <div className="flex items-center gap-2 border-b border-slate-100 bg-navy/5 px-6 py-4">
            <BookOpen className="h-5 w-5 text-navy" />
            <h2 className="font-semibold text-navy">Exam Details</h2>
          </div>
          <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Exam Name *</label>
              <input
                type="text"
                value={examName}
                onChange={(e) => setExamName(e.target.value)}
                placeholder="e.g. Advanced Algorithms — Final Examination"
                className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy/40"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Exam ID / Code *</label>
              <input
                type="text"
                value={examId}
                onChange={(e) => setExamId(e.target.value)}
                placeholder="e.g. CS501-FINAL-2026"
                className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy/40"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> Time Limit (minutes) *</span>
              </label>
              <input
                type="number"
                min="1"
                max="360"
                value={timeLimitMinutes}
                onChange={(e) => setTimeLimitMinutes(e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy/40"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                <span className="flex items-center gap-1"><GraduationCap className="h-3.5 w-3.5" /> Passing Percentage (%)</span>
              </label>
              <input
                type="number"
                min="1"
                max="100"
                value={passingPercent}
                onChange={(e) => setPassingPercent(e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy/40"
              />
            </div>

            {/* Summary */}
            <div className="sm:col-span-2 rounded-xl bg-navy/5 border border-navy/10 p-4 grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-navy">{questions.length}</p>
                <p className="text-xs text-slate-500">Questions</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-navy">{totalMarks}</p>
                <p className="text-xs text-slate-500">Total Marks</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-navy">{timeLimitMinutes}m</p>
                <p className="text-xs text-slate-500">Duration</p>
              </div>
            </div>
          </div>
        </div>

        {/* Questions Builder */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Award className="h-5 w-5 text-navy" />
              <h2 className="font-semibold text-navy">Questions ({questions.length})</h2>
            </div>
            <button
              type="button"
              onClick={addQuestion}
              className="inline-flex items-center gap-1.5 rounded-lg bg-navy px-3 py-2 text-xs font-semibold text-white hover:bg-navy-light transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Question
            </button>
          </div>

          {questions.length === 0 && (
            <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center text-slate-400">
              <BookOpen className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="font-medium">No questions yet</p>
              <p className="text-sm mt-1">Click "Add Question" to start building your exam</p>
            </div>
          )}

          {questions.map((q, qIdx) => (
            <div key={q.id} className="rounded-xl border border-slate-200 bg-white overflow-hidden">
              {/* Question header */}
              <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 bg-slate-50">
                <span className="text-sm font-semibold text-navy">Question {qIdx + 1}</span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => moveQuestion(qIdx, -1)}
                    disabled={qIdx === 0}
                    className="rounded p-1 text-slate-400 hover:text-navy hover:bg-slate-100 disabled:opacity-30 transition-colors"
                    title="Move up"
                  >
                    <ChevronUp className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveQuestion(qIdx, 1)}
                    disabled={qIdx === questions.length - 1}
                    className="rounded p-1 text-slate-400 hover:text-navy hover:bg-slate-100 disabled:opacity-30 transition-colors"
                    title="Move down"
                  >
                    <ChevronDown className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => removeQuestion(qIdx)}
                    className="rounded p-1 text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                    title="Delete question"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="p-5 space-y-4">
                {/* Question text */}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Question Text *</label>
                  <textarea
                    rows={2}
                    value={q.question}
                    onChange={(e) => updateQuestion(qIdx, 'question', e.target.value)}
                    placeholder="Enter the question here..."
                    className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-navy/20 resize-none"
                  />
                </div>

                {/* Options */}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-2">
                    Answer Options <span className="font-normal text-slate-400">(mark correct one)</span>
                  </label>
                  <div className="space-y-2">
                    {q.options.map((opt, optIdx) => (
                      <div key={optIdx} className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => updateQuestion(qIdx, 'correctIndex', optIdx)}
                          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold transition-all ${
                            q.correctIndex === optIdx
                              ? 'border-emerald-500 bg-emerald-500 text-white'
                              : 'border-slate-300 text-slate-400 hover:border-navy'
                          }`}
                          title="Mark as correct answer"
                        >
                          {String.fromCharCode(65 + optIdx)}
                        </button>
                        <input
                          type="text"
                          value={opt}
                          onChange={(e) => updateOption(qIdx, optIdx, e.target.value)}
                          placeholder={`Option ${String.fromCharCode(65 + optIdx)}`}
                          className={`flex-1 rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 transition-colors ${
                            q.correctIndex === optIdx
                              ? 'border-emerald-300 bg-emerald-50 focus:ring-emerald-100'
                              : 'border-slate-200 focus:ring-navy/20'
                          }`}
                        />
                        {q.correctIndex === optIdx && (
                          <span className="text-[10px] font-semibold text-emerald-600 whitespace-nowrap">✓ Correct</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Marks */}
                <div className="flex items-center gap-4">
                  <label className="text-xs font-semibold text-slate-600">Marks for this question:</label>
                  <input
                    type="number"
                    min="0.5"
                    step="0.5"
                    value={q.marks}
                    onChange={(e) => updateQuestion(qIdx, 'marks', Number(e.target.value))}
                    className="w-20 rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-navy/20"
                  />
                </div>
              </div>
            </div>
          ))}

          {questions.length > 0 && (
            <button
              type="button"
              onClick={addQuestion}
              className="w-full rounded-xl border-2 border-dashed border-slate-300 py-4 text-sm font-medium text-slate-400 hover:border-navy hover:text-navy transition-colors"
            >
              <Plus className="h-4 w-4 inline mr-2" />
              Add Another Question
            </button>
          )}
        </div>

        {/* Default Questions Reference */}
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
          <button
            type="button"
            className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-slate-50 transition-colors"
            onClick={(e) => {
              const panel = e.currentTarget.nextElementSibling
              panel.classList.toggle('hidden')
            }}
          >
            <span className="text-sm font-semibold text-slate-600">📋 View Default Questions (reference)</span>
            <span className="text-xs text-slate-400">click to expand</span>
          </button>
          <div className="hidden border-t border-slate-100 p-6 space-y-3">
            {DEFAULT_QUESTIONS.map((q, i) => (
              <div key={q.id} className="rounded-lg bg-slate-50 border border-slate-100 p-4">
                <p className="text-xs font-semibold text-slate-500 mb-1">Q{i + 1} · {q.marks} marks</p>
                <p className="text-sm text-navy font-medium mb-2">{q.question}</p>
                <div className="space-y-1">
                  {q.options.map((opt, oi) => (
                    <p key={oi} className={`text-xs ${oi === q.correctIndex ? 'text-emerald-600 font-semibold' : 'text-slate-500'}`}>
                      {String.fromCharCode(65 + oi)}. {opt} {oi === q.correctIndex ? '✓' : ''}
                    </p>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom action bar */}
        <div className="sticky bottom-4">
          <div className="rounded-2xl border border-slate-200 bg-white shadow-lg px-6 py-4 flex items-center justify-between">
            <div className="text-sm text-slate-500">
              <span className="font-semibold text-navy">{questions.length}</span> questions ·{' '}
              <span className="font-semibold text-navy">{totalMarks}</span> marks ·{' '}
              <span className="font-semibold text-navy">{timeLimitMinutes}m</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSave}
                className="inline-flex items-center gap-1.5 rounded-lg bg-navy px-5 py-2.5 text-sm font-semibold text-white hover:bg-navy-light transition-colors"
              >
                <Save className="h-4 w-4" />
                Save & Apply
              </button>
              <button
                type="button"
                onClick={() => { handleSave(); setTimeout(() => navigate('/exam'), 200) }}
                className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-white hover:bg-accent-light transition-colors"
              >
                Save & Launch
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
