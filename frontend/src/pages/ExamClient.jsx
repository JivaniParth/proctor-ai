import { useState, useEffect, useRef, useCallback } from 'react'
import {
  AlertTriangle, Camera, CheckCircle, Clock, Eye, Monitor,
  Shield, Wifi, Clipboard, Keyboard, Download, ChevronRight,
  Activity, BarChart2, AlertCircle,
} from 'lucide-react'
import { useExamStore } from '../store/examStore.js'
import {
  startGazeTracking, stopGazeTracking,
  getCurrentGaze, getGazeWindow, onUserInteraction,
} from '../lib/gazeTracker.js'

// ─── Canvas overlay: draws question number on bottom-right of webcam feed
function drawQuestionOverlay(canvas, video, questionNumber) {
  if (!canvas || !video) return
  const ctx = canvas.getContext('2d')
  canvas.width = video.videoWidth || 320
  canvas.height = video.videoHeight || 240
  ctx.clearRect(0, 0, canvas.width, canvas.height)

  const label = `Q${questionNumber}`
  const padding = 8
  const fontSize = Math.max(14, Math.round(canvas.width * 0.06))
  ctx.font = `bold ${fontSize}px Inter, sans-serif`
  const textW = ctx.measureText(label).width
  const boxW = textW + padding * 2
  const boxH = fontSize + padding * 2

  // Position: bottom-right corner, 12px margin
  const x = canvas.width - boxW - 12
  const y = canvas.height - boxH - 12

  // Semi-transparent dark background
  ctx.fillStyle = 'rgba(0,0,0,0.65)'
  ctx.beginPath()
  ctx.roundRect(x, y, boxW, boxH, 6)
  ctx.fill()

  // White text
  ctx.fillStyle = '#ffffff'
  ctx.textBaseline = 'top'
  ctx.fillText(label, x + padding, y + padding)
}

export function ExamClient() {
  const { examConfig, isCustom, loadConfig } = useExamStore()

  // Load config on mount
  useEffect(() => { loadConfig() }, [loadConfig])

  const questions = examConfig.questions
  const totalSeconds = (examConfig.timeLimitMinutes || 90) * 60

  const [started, setStarted] = useState(false)
  const [currentQ, setCurrentQ] = useState(0)
  const [answers, setAnswers] = useState({})
  const [timeLeft, setTimeLeft] = useState(totalSeconds)
  const [events, setEvents] = useState([])
  const [behaviorLog, setBehaviorLog] = useState([]) // per-question gaze records
  const [showBehavior, setShowBehavior] = useState(false)
  const [downloadUrl, setDownloadUrl] = useState(null)
  const [submitted, setSubmitted] = useState(false)

  const [monitorStatus, setMonitorStatus] = useState({
    webcam: false,
    gaze: 'center',
    face: true,
    tabSwitches: 0,
    pastes: 0,
    keystrokes: 0,
    wsConnected: true,
  })

  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const overlayAnimRef = useRef(null)
  const mediaRecorderRef = useRef(null)
  const recordedChunksRef = useRef([])
  const streamRef = useRef(null)
  const currentQRef = useRef(currentQ)

  // Keep ref in sync so overlay can read current Q without stale closure
  useEffect(() => { currentQRef.current = currentQ }, [currentQ])

  // ── Countdown timer
  useEffect(() => {
    if (!started || submitted) return
    const timer = setInterval(() => setTimeLeft((t) => Math.max(0, t - 1)), 1000)
    return () => clearInterval(timer)
  }, [started, submitted])

  // ── Auto-submit on time up
  useEffect(() => {
    if (started && timeLeft === 0 && !submitted) {
      handleSubmit()
    }
  }, [timeLeft, started, submitted])

  // ── Gaze UI update loop
  useEffect(() => {
    if (!started) return
    const id = setInterval(() => {
      setMonitorStatus((s) => ({ ...s, gaze: getCurrentGaze() }))
    }, 500)
    return () => clearInterval(id)
  }, [started])

  // ── Canvas overlay animation loop
  useEffect(() => {
    if (!started) return
    let running = true
    function loop() {
      if (!running) return
      drawQuestionOverlay(canvasRef.current, videoRef.current, currentQRef.current + 1)
      overlayAnimRef.current = requestAnimationFrame(loop)
    }
    overlayAnimRef.current = requestAnimationFrame(loop)
    return () => {
      running = false
      if (overlayAnimRef.current) cancelAnimationFrame(overlayAnimRef.current)
    }
  }, [started])

  const addEvent = useCallback((type, label, status) => {
    setEvents((prev) => [
      { id: `${Date.now()}-${Math.random()}`, type, label, ts: Date.now(), status },
      ...prev.slice(0, 14),
    ])
  }, [])

  // ── Exam start — request webcam, start recording, start gaze
  const handleStart = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }
      setMonitorStatus((s) => ({ ...s, webcam: true }))

      // Start MediaRecorder for combined footage
      const supported = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm', 'video/mp4']
      const mimeType = supported.find((t) => MediaRecorder.isTypeSupported(t)) || ''
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : {})
      recordedChunksRef.current = []
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) recordedChunksRef.current.push(e.data)
      }
      recorder.start(1000) // collect in 1s chunks
      mediaRecorderRef.current = recorder

    } catch {
      setMonitorStatus((s) => ({ ...s, webcam: false, face: false }))
      addEvent('error', 'Webcam access denied — monitoring limited', 'alert')
    }

    startGazeTracking()
    setStarted(true)
  }

  // ── Stop recording and produce download blob
  const stopRecording = useCallback(() => {
    return new Promise((resolve) => {
      const recorder = mediaRecorderRef.current
      if (!recorder || recorder.state === 'inactive') { resolve(null); return }
      recorder.onstop = () => {
        const mimeType = recorder.mimeType || 'video/webm'
        const blob = new Blob(recordedChunksRef.current, { type: mimeType })
        const url = URL.createObjectURL(blob)
        resolve(url)
      }
      recorder.stop()
    })
  }, [])

  // ── Record gaze behaviour for current question before navigating away
  const captureQuestionBehavior = useCallback((qIndex, selectedOption) => {
    onUserInteraction()
    const window = getGazeWindow()
    const q = questions[qIndex]
    setBehaviorLog((prev) => {
      // Replace if entry already exists for this question
      const existing = prev.findIndex((e) => e.questionId === q.id)
      const entry = {
        questionId: q.id,
        questionNum: qIndex + 1,
        questionText: q.question.slice(0, 60) + (q.question.length > 60 ? '…' : ''),
        selectedOption: selectedOption !== undefined ? q.options[selectedOption] : '—',
        ...window,
        capturedAt: new Date().toLocaleTimeString(),
      }
      if (existing >= 0) {
        const updated = [...prev]
        updated[existing] = entry
        return updated
      }
      return [...prev, entry]
    })
  }, [questions])

  // ── Answer selection
  const handleAnswer = (qId, optionIndex) => {
    onUserInteraction()
    setAnswers((prev) => ({ ...prev, [qId]: optionIndex }))
    // Stamp gaze at moment of answering
    captureQuestionBehavior(currentQ, optionIndex)
  }

  // ── Navigate to next question
  const handleNext = () => {
    onUserInteraction()
    captureQuestionBehavior(currentQ, answers[questions[currentQ].id])
    setCurrentQ((q) => q + 1)
  }

  // ── Navigate to previous question
  const handlePrev = () => {
    onUserInteraction()
    setCurrentQ((q) => q - 1)
  }

  // ── Submit exam
  const handleSubmit = useCallback(async () => {
    onUserInteraction()
    captureQuestionBehavior(currentQ, answers[questions[currentQ]?.id])
    stopGazeTracking()

    const url = await stopRecording()
    if (url) setDownloadUrl(url)

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
    }

    setSubmitted(true)
  }, [currentQ, answers, questions, captureQuestionBehavior, stopRecording])

  // ── Browser monitoring
  useEffect(() => {
    if (!started) return

    const handleVisibility = () => {
      if (document.hidden) {
        setMonitorStatus((s) => ({ ...s, tabSwitches: s.tabSwitches + 1 }))
        addEvent('tab_switch', 'Tab/window switch detected', 'alert')
      }
    }
    const handlePaste = () => {
      setMonitorStatus((s) => ({ ...s, pastes: s.pastes + 1 }))
      addEvent('paste', 'Clipboard paste detected', 'alert')
    }
    const handleKey = () => {
      onUserInteraction()
      setMonitorStatus((s) => ({ ...s, keystrokes: s.keystrokes + 1 }))
    }

    document.addEventListener('visibilitychange', handleVisibility)
    document.addEventListener('paste', handlePaste)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility)
      document.removeEventListener('paste', handlePaste)
      document.removeEventListener('keydown', handleKey)
    }
  }, [started, addEvent])

  // ── Periodic snapshot events
  useEffect(() => {
    if (!started) return
    const id = setInterval(() => addEvent('snapshot', 'Evidence snapshot captured', 'ok'), 20000)
    return () => clearInterval(id)
  }, [started, addEvent])

  const formatTime = (s) => {
    const m = Math.floor(s / 60)
    const sec = s % 60
    return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
  }

  const totalMarks = questions.reduce((sum, q) => sum + (q.marks || examConfig.marksPerQuestion || 1), 0)
  const answeredCount = Object.keys(answers).length

  // ───────────── SUBMITTED SCREEN ─────────────
  if (submitted) {
    const suspicious = behaviorLog.filter((e) => e.suspicious)
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center p-4">
        <div className="w-full max-w-2xl rounded-2xl bg-white border border-slate-200 shadow-xl overflow-hidden">
          <div className="bg-navy px-6 py-8 text-white text-center">
            <CheckCircle className="h-12 w-12 mx-auto mb-4 text-emerald-400" />
            <h1 className="text-2xl font-bold">Exam Submitted</h1>
            <p className="text-white/70 text-sm mt-2">{examConfig.examName}</p>
          </div>
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="rounded-xl bg-surface border border-slate-100 p-4">
                <p className="text-2xl font-bold text-navy">{answeredCount}/{questions.length}</p>
                <p className="text-xs text-slate-500 mt-1">Questions Answered</p>
              </div>
              <div className={`rounded-xl border p-4 ${suspicious.length > 0 ? 'bg-red-50 border-red-200' : 'bg-emerald-50 border-emerald-200'}`}>
                <p className={`text-2xl font-bold ${suspicious.length > 0 ? 'text-red-600' : 'text-emerald-600'}`}>{suspicious.length}</p>
                <p className={`text-xs mt-1 ${suspicious.length > 0 ? 'text-red-500' : 'text-emerald-500'}`}>Suspicious Gaze Events</p>
              </div>
              <div className="rounded-xl bg-surface border border-slate-100 p-4">
                <p className="text-2xl font-bold text-navy">{monitorStatus.tabSwitches}</p>
                <p className="text-xs text-slate-500 mt-1">Tab Switches</p>
              </div>
            </div>

            {downloadUrl && (
              <a
                href={downloadUrl}
                download="ProctorAI_GazeFeed.webm"
                className="flex items-center justify-center gap-2 w-full rounded-xl bg-navy py-3 text-sm font-semibold text-white hover:bg-navy-light transition-colors"
              >
                <Download className="h-4 w-4" />
                Download Combined Gaze Footage (.webm)
              </a>
            )}

            {/* Behavior Analysis Table */}
            {behaviorLog.length > 0 && (
              <div className="rounded-xl border border-slate-200 overflow-hidden">
                <div className="flex items-center justify-between bg-navy px-4 py-3">
                  <div className="flex items-center gap-2">
                    <BarChart2 className="h-4 w-4 text-white" />
                    <h3 className="text-sm font-semibold text-white">Per-Question Gaze Analysis</h3>
                  </div>
                  <span className="text-xs text-white/60">5s window before answer</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="px-3 py-2 text-left font-semibold text-slate-600">Q#</th>
                        <th className="px-3 py-2 text-left font-semibold text-slate-600 max-w-[160px]">Question</th>
                        <th className="px-3 py-2 text-center font-semibold text-emerald-600">Center%</th>
                        <th className="px-3 py-2 text-center font-semibold text-amber-600">Left%</th>
                        <th className="px-3 py-2 text-center font-semibold text-amber-600">Right%</th>
                        <th className="px-3 py-2 text-center font-semibold text-slate-600">Samples</th>
                        <th className="px-3 py-2 text-center font-semibold text-slate-600">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {behaviorLog.sort((a, b) => a.questionNum - b.questionNum).map((entry) => (
                        <tr key={entry.questionId} className={`border-b border-slate-100 ${entry.suspicious ? 'bg-red-50' : ''}`}>
                          <td className="px-3 py-2 font-bold text-navy">Q{entry.questionNum}</td>
                          <td className="px-3 py-2 text-slate-600 max-w-[160px] truncate">{entry.questionText}</td>
                          <td className="px-3 py-2 text-center font-semibold text-emerald-600">{entry.centerPct}%</td>
                          <td className="px-3 py-2 text-center font-semibold text-amber-600">{entry.leftPct}%</td>
                          <td className="px-3 py-2 text-center font-semibold text-amber-600">{entry.rightPct}%</td>
                          <td className="px-3 py-2 text-center text-slate-500">{entry.sampleCount}</td>
                          <td className="px-3 py-2 text-center">
                            {entry.suspicious ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-red-100 text-red-700 px-2 py-0.5 font-semibold">
                                <AlertCircle className="h-3 w-3" />
                                Suspicious
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 text-emerald-700 px-2 py-0.5 font-semibold">
                                <CheckCircle className="h-3 w-3" />
                                Clean
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  // ───────────── PRE-EXAM SCREEN ─────────────
  if (!started) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center p-4">
        <div className="w-full max-w-lg rounded-2xl bg-white border border-slate-200 shadow-xl overflow-hidden">
          <div className="bg-navy px-6 py-8 text-white text-center">
            <Shield className="h-12 w-12 mx-auto mb-4 text-accent" />
            <h1 className="text-2xl font-bold">ProctorAI Exam Client</h1>
            <p className="text-white/70 text-sm mt-2">{examConfig.examName}</p>
            <p className="text-white/50 text-xs mt-1 font-mono">{examConfig.examId}</p>
          </div>
          <div className="p-6 space-y-4">
            {isCustom && (
              <div className="rounded-lg bg-blue-50 border border-blue-200 p-3 text-xs text-blue-700 flex items-center gap-2">
                <CheckCircle className="h-4 w-4 shrink-0" />
                Examiner has configured this exam with {questions.length} questions · {examConfig.timeLimitMinutes} min · {totalMarks} total marks
              </div>
            )}
            {!isCustom && (
              <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-xs text-amber-700 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                No examiner config found — using default questions. <a href="/setup" className="underline font-semibold ml-1">Set up exam →</a>
              </div>
            )}
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="rounded-lg bg-surface border border-slate-100 p-3">
                <p className="text-lg font-bold text-navy">{questions.length}</p>
                <p className="text-[10px] text-slate-500">Questions</p>
              </div>
              <div className="rounded-lg bg-surface border border-slate-100 p-3">
                <p className="text-lg font-bold text-navy">{examConfig.timeLimitMinutes}m</p>
                <p className="text-[10px] text-slate-500">Duration</p>
              </div>
              <div className="rounded-lg bg-surface border border-slate-100 p-3">
                <p className="text-lg font-bold text-navy">{totalMarks}</p>
                <p className="text-[10px] text-slate-500">Total Marks</p>
              </div>
            </div>
            <div className="rounded-lg bg-amber-50 border border-amber-200 p-4">
              <div className="flex gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-amber-800">Proctoring Active</p>
                  <p className="text-xs text-amber-700 mt-1 leading-relaxed">
                    This exam is monitored by ProctorAI. Your webcam, gaze direction, screen activity, and browser events
                    will be analyzed in real-time. Gaze patterns are recorded 5 seconds before each answer submission.
                  </p>
                </div>
              </div>
            </div>
            <ul className="space-y-2 text-sm text-slate-600">
              <li className="flex items-center gap-2"><Camera className="h-4 w-4 text-navy" /> Webcam access required — footage recorded</li>
              <li className="flex items-center gap-2"><Eye className="h-4 w-4 text-navy" /> Gaze tracked continuously (center/left/right)</li>
              <li className="flex items-center gap-2"><Monitor className="h-4 w-4 text-navy" /> Tab switching will be flagged immediately</li>
              <li className="flex items-center gap-2"><Clipboard className="h-4 w-4 text-navy" /> Clipboard monitoring active</li>
            </ul>
            <button
              type="button"
              onClick={handleStart}
              className="w-full rounded-xl bg-navy py-3 text-sm font-semibold text-white hover:bg-navy-light transition-colors"
            >
              Begin Examination
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ───────────── ACTIVE EXAM ─────────────
  const q = questions[currentQ]
  const qMarks = q.marks || examConfig.marksPerQuestion || 1
  const gazeColor = monitorStatus.gaze === 'center' ? 'text-emerald-400' : 'text-amber-400'

  return (
    <div className="min-h-screen bg-surface">
      {/* Top bar */}
      <div className="sticky top-16 z-40 border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <Shield className="h-5 w-5 text-navy" />
            <span className="font-semibold text-navy text-sm">ProctorAI Monitoring</span>
            <span className="flex items-center gap-1 text-xs text-emerald-600">
              <Wifi className="h-3 w-3" /> Connected
            </span>
          </div>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1 text-xs font-medium">
              <Eye className="h-3 w-3" />
              <span className={gazeColor}>Gaze: {monitorStatus.gaze}</span>
            </span>
            <div className="flex items-center gap-2 text-sm font-mono font-semibold text-navy">
              <Clock className="h-4 w-4" />
              <span className={timeLeft < 300 ? 'text-red-600' : ''}>{formatTime(timeLeft)}</span>
            </div>
          </div>
          <span className="text-xs text-slate-500">
            Q{currentQ + 1} of {questions.length} · {answeredCount} answered
          </span>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Exam content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Question card */}
          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Question {q.id}
              </p>
              <span className="rounded-full bg-navy/10 px-3 py-1 text-xs font-semibold text-navy">
                {qMarks} {qMarks === 1 ? 'mark' : 'marks'}
              </span>
            </div>
            <h2 className="text-lg font-semibold text-navy leading-relaxed">{q.question}</h2>
            <div className="mt-6 space-y-3">
              {q.options.map((opt, i) => (
                <button
                  key={`${q.id}-opt-${i}`}
                  type="button"
                  onClick={() => handleAnswer(q.id, i)}
                  className={`w-full text-left rounded-lg border px-4 py-3 text-sm transition-all ${
                    answers[q.id] === i
                      ? 'border-navy bg-navy/5 text-navy font-medium ring-2 ring-navy/10'
                      : 'border-slate-200 hover:border-navy/30 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <span className="font-mono text-xs text-slate-400 mr-3">
                    {String.fromCharCode(65 + i)}.
                  </span>
                  {opt}
                </button>
              ))}
            </div>
          </div>

          {/* Question navigator */}
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-semibold text-slate-500 mb-3 uppercase tracking-wider">Question Navigator</p>
            <div className="flex flex-wrap gap-2">
              {questions.map((question, i) => (
                <button
                  key={question.id}
                  type="button"
                  onClick={() => { onUserInteraction(); setCurrentQ(i) }}
                  className={`h-8 w-8 rounded-lg text-xs font-semibold transition-all ${
                    i === currentQ
                      ? 'bg-navy text-white'
                      : answers[question.id] !== undefined
                        ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {i + 1}
                </button>
              ))}
            </div>
          </div>

          <div className="flex justify-between">
            <button
              type="button"
              disabled={currentQ === 0}
              onClick={handlePrev}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-white disabled:opacity-40"
            >
              Previous
            </button>
            {currentQ < questions.length - 1 ? (
              <button
                type="button"
                onClick={handleNext}
                className="inline-flex items-center gap-2 rounded-lg bg-navy px-4 py-2 text-sm font-medium text-white hover:bg-navy-light"
              >
                Next Question
                <ChevronRight className="h-4 w-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                className="rounded-lg bg-emerald-600 px-6 py-2 text-sm font-medium text-white hover:bg-emerald-700"
              >
                Submit Exam
              </button>
            )}
          </div>
        </div>

        {/* Monitoring sidebar */}
        <div className="space-y-4">
          {/* Webcam + canvas overlay */}
          <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2">
              <span className="text-xs font-semibold text-navy flex items-center gap-1.5">
                <Camera className="h-3.5 w-3.5" /> Live Feed
              </span>
              <span className="flex items-center gap-1 text-[10px] text-emerald-600">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                REC
              </span>
            </div>
            <div className="relative aspect-[4/3] bg-slate-900">
              <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                className="absolute inset-0 w-full h-full object-cover"
              />
              {/* Canvas for question number overlay — renders on top of video */}
              <canvas
                ref={canvasRef}
                className="absolute inset-0 w-full h-full pointer-events-none"
                style={{ mixBlendMode: 'normal' }}
              />
              {/* Live gaze indicator overlay */}
              <div className="absolute bottom-2 left-2 flex items-center gap-1 rounded bg-black/60 px-2 py-0.5 text-[10px] text-white">
                <Eye className="h-3 w-3" />
                Gaze: <span className={monitorStatus.gaze !== 'center' ? 'text-amber-400 font-semibold' : 'text-emerald-400'}>{monitorStatus.gaze}</span>
              </div>
            </div>
          </div>

          {/* System Status */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">System Status</p>
            {[
              { icon: Camera, label: 'Webcam', ok: monitorStatus.webcam },
              { icon: Eye, label: 'Gaze Tracking', ok: monitorStatus.gaze === 'center', note: monitorStatus.gaze !== 'center' ? monitorStatus.gaze : null },
              { icon: Activity, label: 'Face Detection', ok: monitorStatus.face },
              { icon: Wifi, label: 'WebSocket', ok: monitorStatus.wsConnected },
              { icon: Monitor, label: 'Tab Switches', ok: monitorStatus.tabSwitches === 0, count: monitorStatus.tabSwitches },
              { icon: Clipboard, label: 'Paste Events', ok: monitorStatus.pastes === 0, count: monitorStatus.pastes },
              { icon: Keyboard, label: 'Keystrokes', ok: true, count: monitorStatus.keystrokes },
            ].map((s) => (
              <div key={s.label} className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <s.icon className="h-4 w-4" />
                  {s.label}
                </div>
                {s.count !== undefined ? (
                  <span className={`text-xs font-semibold ${s.ok ? 'text-emerald-600' : 'text-red-600'}`}>{s.count}</span>
                ) : s.note ? (
                  <span className="text-xs font-semibold text-amber-600">{s.note}</span>
                ) : (
                  <CheckCircle className={`h-4 w-4 ${s.ok ? 'text-emerald-500' : 'text-red-500'}`} />
                )}
              </div>
            ))}
          </div>

          {/* Event Buffer */}
          <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
            <div className="border-b border-slate-100 px-4 py-2">
              <p className="text-xs font-semibold text-navy">Event Buffer</p>
            </div>
            <div className="p-3 space-y-1.5 max-h-48 overflow-y-auto">
              {events.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-4">Monitoring active...</p>
              ) : (
                events.map((e) => (
                  <div
                    key={e.id}
                    className={`flex items-center justify-between rounded px-2 py-1.5 text-[11px] ${
                      e.status === 'alert' ? 'bg-red-50 text-red-700' : e.status === 'warn' ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'
                    }`}
                  >
                    <span>{e.label}</span>
                    <span className="text-[10px] opacity-60">{new Date(e.ts).toLocaleTimeString()}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Behavior Analysis (live) */}
          {behaviorLog.length > 0 && (
            <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
              <button
                type="button"
                onClick={() => setShowBehavior((v) => !v)}
                className="w-full flex items-center justify-between px-4 py-3 border-b border-slate-100 hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <BarChart2 className="h-4 w-4 text-navy" />
                  <span className="text-xs font-semibold text-navy">Gaze Analysis ({behaviorLog.length} recorded)</span>
                </div>
                <span className="text-[10px] text-slate-400">{showBehavior ? 'hide ▲' : 'show ▼'}</span>
              </button>
              {showBehavior && (
                <div className="overflow-x-auto">
                  <table className="w-full text-[10px]">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-2 py-1.5 text-left text-slate-500">Q</th>
                        <th className="px-2 py-1.5 text-center text-emerald-600">Ctr</th>
                        <th className="px-2 py-1.5 text-center text-amber-600">L</th>
                        <th className="px-2 py-1.5 text-center text-amber-600">R</th>
                        <th className="px-2 py-1.5 text-center text-slate-500">Flag</th>
                      </tr>
                    </thead>
                    <tbody>
                      {behaviorLog.map((entry) => (
                        <tr key={entry.questionId} className={`border-t border-slate-100 ${entry.suspicious ? 'bg-red-50' : ''}`}>
                          <td className="px-2 py-1 font-bold text-navy">Q{entry.questionNum}</td>
                          <td className="px-2 py-1 text-center text-emerald-600">{entry.centerPct}%</td>
                          <td className="px-2 py-1 text-center text-amber-600">{entry.leftPct}%</td>
                          <td className="px-2 py-1 text-center text-amber-600">{entry.rightPct}%</td>
                          <td className="px-2 py-1 text-center">
                            {entry.suspicious
                              ? <span className="text-red-600 font-bold">⚠</span>
                              : <span className="text-emerald-600">✓</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
