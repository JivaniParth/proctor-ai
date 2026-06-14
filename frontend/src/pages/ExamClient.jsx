import { useState, useEffect, useRef, useCallback } from 'react'
import { Link } from 'react-router-dom'
import {
  AlertTriangle, Camera, CheckCircle, Clock, Eye, Monitor,
  Shield, Wifi, WifiOff, Clipboard, Keyboard, Download,
  ChevronRight, Activity, BarChart2, AlertCircle,
  Mic, MicOff, Volume2, FileText, XCircle,
} from 'lucide-react'
import { useExamStore } from '../store/examStore.js'
import {
  startGazeTracking, stopGazeTracking,
  getCurrentGaze, getGazeWindow, onUserInteraction,
} from '../lib/gazeTracker.js'
import { startAudioMonitor, stopAudioMonitor } from '../lib/audioMonitor.js'
import { createWsClient, apiPost } from '../lib/wsClient.js'

const CONSENT_VERSION = '1.0'
const RED_FLAG_TAB_THRESHOLD   = 3
const RED_FLAG_PASTE_THRESHOLD = 2

// ─── Canvas overlay: draws question number bottom-right of webcam feed ─────────
function drawQuestionOverlay(canvas, video, qNum) {
  if (!canvas || !video || !video.videoWidth) return
  const ctx = canvas.getContext('2d')
  canvas.width  = video.videoWidth
  canvas.height = video.videoHeight
  ctx.clearRect(0, 0, canvas.width, canvas.height)

  const label    = `Q${qNum}`
  const padding  = 8
  const fontSize = Math.max(14, Math.round(canvas.width * 0.06))
  ctx.font = `bold ${fontSize}px Inter, sans-serif`
  const textW = ctx.measureText(label).width
  const boxW  = textW + padding * 2
  const boxH  = fontSize + padding * 2
  const x     = canvas.width  - boxW - 12
  const y     = canvas.height - boxH - 12

  ctx.fillStyle = 'rgba(0,0,0,0.65)'
  ctx.beginPath()
  ctx.roundRect(x, y, boxW, boxH, 6)
  ctx.fill()

  ctx.fillStyle    = '#ffffff'
  ctx.textBaseline = 'top'
  ctx.fillText(label, x + padding, y + padding)
}

// ─── Capture a JPEG snapshot from the video element ───────────────────────────
function captureSnapshot(video, reason) {
  if (!video || !video.videoWidth) return null
  const canvas = document.createElement('canvas')
  canvas.width  = video.videoWidth
  canvas.height = video.videoHeight
  canvas.getContext('2d').drawImage(video, 0, 0)
  return { ts: Date.now(), dataUrl: canvas.toDataURL('image/jpeg', 0.7), reason }
}

// ─── Keystroke helpers ─────────────────────────────────────────────────────────
const IGNORED_KEYS = new Set([
  'Control','Alt','Meta','Shift','CapsLock','Tab','Escape',
  'Enter','Backspace','Delete','Insert','Home','End',
  'PageUp','PageDown','ArrowUp','ArrowDown','ArrowLeft','ArrowRight',
  'F1','F2','F3','F4','F5','F6','F7','F8','F9','F10','F11','F12',
  'PrintScreen','ScrollLock','Pause','NumLock',
  'ContextMenu','AltGraph',
])

function isPrintable(e) {
  return e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey && !IGNORED_KEYS.has(e.key)
}

// ══════════════════════════════════════════════════════════════════════════════
export function ExamClient() {
  const { examConfig, isCustom, configSource, loadConfig } = useExamStore()

  useEffect(() => { loadConfig() }, [loadConfig])

  const questions   = examConfig.questions
  const totalSeconds = (examConfig.timeLimitMinutes || 90) * 60
  const totalMarks  = questions.reduce((s, q) => s + (q.marks || examConfig.marksPerQuestion || 1), 0)

  // ── Core state ──────────────────────────────────────────────────────────────
  const [phase, setPhase]           = useState('pre')     // 'pre' | 'denied' | 'exam' | 'submitted'
  const [consentChecked, setConsent] = useState(false)
  const [studentInfo, setStudentInfo] = useState({ name: '', studentId: '' })
  const [infoErrors, setInfoErrors]   = useState({})
  const [currentQ, setCurrentQ]     = useState(0)
  const [answers, setAnswers]       = useState({})
  const [timeLeft, setTimeLeft]     = useState(totalSeconds)
  const [events, setEvents]         = useState([])
  const [behaviorLog, setBehaviorLog] = useState([])
  const [keystrokeLog, setKeystrokeLog] = useState([])  // { key, ts, qNum }
  const [redFlagSnaps, setRedFlagSnaps] = useState([])
  const [downloadUrl, setDownloadUrl]   = useState(null)
  const [showBehavior, setShowBehavior] = useState(false)

  // ── Monitoring status ───────────────────────────────────────────────────────
  const [status, setStatus] = useState({
    webcam: false,
    mic: false,
    gaze: 'center',
    face: true,
    tabSwitches: 0,
    pastes: 0,
    keystrokes: 0,
    speechEvents: 0,
    ws: 'disconnected',   // 'connected' | 'disconnected' | 'syncing'
  })

  // ── Refs ────────────────────────────────────────────────────────────────────
  const videoRef    = useRef(null)
  const canvasRef   = useRef(null)
  const animRef     = useRef(null)
  const recorderRef = useRef(null)
  const chunksRef   = useRef([])
  const streamRef   = useRef(null)
  const wsRef       = useRef(null)
  const currentQRef = useRef(0)

  // Keep currentQRef in sync (used in event handlers to avoid stale closures)
  useEffect(() => { currentQRef.current = currentQ }, [currentQ])

  // ── Countdown timer ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'exam') return
    const id = setInterval(() => setTimeLeft((t) => Math.max(0, t - 1)), 1000)
    return () => clearInterval(id)
  }, [phase])

  useEffect(() => {
    if (phase === 'exam' && timeLeft === 0) handleSubmit()
  }, [timeLeft, phase])

  // ── Gaze status update ──────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'exam') return
    const id = setInterval(() => {
      setStatus((s) => ({ ...s, gaze: getCurrentGaze() }))
    }, 500)
    return () => clearInterval(id)
  }, [phase])

  // ── Canvas overlay RAF loop ─────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'exam') return
    let running = true
    const loop = () => {
      if (!running) return
      drawQuestionOverlay(canvasRef.current, videoRef.current, currentQRef.current + 1)
      animRef.current = requestAnimationFrame(loop)
    }
    animRef.current = requestAnimationFrame(loop)
    return () => {
      running = false
      if (animRef.current) cancelAnimationFrame(animRef.current)
    }
  }, [phase])

  // ── Red-flag snapshot: capture when crossing RED threshold ─────────────────
  useEffect(() => {
    if (phase !== 'exam') return
    const isRed = status.tabSwitches >= RED_FLAG_TAB_THRESHOLD || status.pastes >= RED_FLAG_PASTE_THRESHOLD
    if (isRed && redFlagSnaps.length === 0) {
      const snap = captureSnapshot(videoRef.current, 'Multiple integrity violations — auto-escalated to RED')
      if (snap) {
        setRedFlagSnaps([snap])
        wsRef.current?.sendEvent({ type: 'snapshot', ts: Date.now(), data: { reason: snap.reason } })
        addEvent('redFlag', '🚨 RED flag triggered — face snapshot captured', 'alert')
      }
    }
  }, [status.tabSwitches, status.pastes, phase])

  // ── Browser monitoring ──────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'exam') return

    const onVisibility = () => {
      if (document.hidden) {
        setStatus((s) => ({ ...s, tabSwitches: s.tabSwitches + 1 }))
        addEvent('tab_switch', 'Tab/window switch detected', 'alert')
        wsRef.current?.sendEvent({ type: 'tab_switch', ts: Date.now(), data: {} })
      }
    }
    const onPaste = () => {
      setStatus((s) => ({ ...s, pastes: s.pastes + 1 }))
      addEvent('paste', 'Clipboard paste detected', 'alert')
      wsRef.current?.sendEvent({ type: 'paste', ts: Date.now(), data: {} })
    }
    const onKeydown = (e) => {
      onUserInteraction()
      setStatus((s) => ({ ...s, keystrokes: s.keystrokes + 1 }))
      wsRef.current?.sendEvent({ type: 'keystroke', ts: Date.now(), data: {} })
      if (isPrintable(e)) {
        setKeystrokeLog((prev) => [...prev, { key: e.key, ts: Date.now(), qNum: currentQRef.current + 1 }])
      }
    }

    document.addEventListener('visibilitychange', onVisibility)
    document.addEventListener('paste', onPaste)
    document.addEventListener('keydown', onKeydown)
    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      document.removeEventListener('paste', onPaste)
      document.removeEventListener('keydown', onKeydown)
    }
  }, [phase])

  // ── Periodic snapshot event log ─────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'exam') return
    const id = setInterval(() => {
      addEvent('snapshot', 'Evidence snapshot captured', 'ok')
      wsRef.current?.sendEvent({ type: 'snapshot', ts: Date.now(), data: {} })
    }, 20_000)
    return () => clearInterval(id)
  }, [phase])

  // ── Helpers ─────────────────────────────────────────────────────────────────
  const addEvent = useCallback((type, label, sev) => {
    setEvents((prev) => [
      { id: `${Date.now()}-${Math.random()}`, type, label, ts: Date.now(), sev },
      ...prev.slice(0, 19),
    ])
  }, [])

  const stopRecording = useCallback(() => new Promise((resolve) => {
    const rec = recorderRef.current
    if (!rec || rec.state === 'inactive') { resolve(null); return }
    rec.onstop = () => {
      const mime = rec.mimeType || 'video/webm'
      resolve(URL.createObjectURL(new Blob(chunksRef.current, { type: mime })))
    }
    rec.stop()
  }), [])

  const captureQuestionBehavior = useCallback((qIdx, selectedOpt) => {
    onUserInteraction()
    const win = getGazeWindow()
    const q   = questions[qIdx]
    setBehaviorLog((prev) => {
      const entry = {
        questionId: q.id, questionNum: qIdx + 1,
        questionText: q.question.slice(0, 60) + (q.question.length > 60 ? '…' : ''),
        selectedOption: selectedOpt !== undefined ? q.options[selectedOpt] : '—',
        ...win,
        capturedAt: new Date().toLocaleTimeString(),
      }
      const i = prev.findIndex((e) => e.questionId === q.id)
      if (i >= 0) { const u = [...prev]; u[i] = entry; return u }
      return [...prev, entry]
    })
  }, [questions])

  // ── Validate student info form ─────────────────────────────────────────────
  const validateInfo = () => {
    const errors = {}
    if (!studentInfo.name.trim()) errors.name = 'Full name is required'
    if (!studentInfo.studentId.trim()) errors.studentId = 'Student ID / Roll number is required'
    else if (!/^[a-zA-Z0-9/_-]{3,30}$/.test(studentInfo.studentId.trim()))
      errors.studentId = 'Use 3–30 alphanumeric characters (hyphens/underscores allowed)'
    setInfoErrors(errors)
    return Object.keys(errors).length === 0
  }

  // ── Exam start ──────────────────────────────────────────────────────────────
  const handleStart = async () => {
    if (!consentChecked) return
    if (!validateInfo()) return

    const candidateId = studentInfo.studentId.trim().toUpperCase()
    const candidateName = studentInfo.name.trim()

    // Save consent audit trail — include student identity
    const consentRecord = {
      agreedAt:       new Date().toISOString(),
      examId:         examConfig.examId,
      examName:       examConfig.examName,
      candidateId,
      candidateName,
      userAgent:      navigator.userAgent,
      language:       navigator.language,
      timezone:       Intl.DateTimeFormat().resolvedOptions().timeZone,
      screenRes:      `${screen.width}x${screen.height}`,
      consentVersion: CONSENT_VERSION,
    }
    try { localStorage.setItem(`proctorai_consent_${examConfig.examId}_${candidateId}`, JSON.stringify(consentRecord)) } catch { /* ignore */ }
    apiPost('/api/consent', consentRecord)  // fire-and-forget, offline-safe

    // Request camera + microphone — BOTH required
    let stream
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
    } catch {
      setPhase('denied')
      return
    }

    streamRef.current = stream

    // Attach to video element
    if (videoRef.current) {
      videoRef.current.srcObject = stream
      await videoRef.current.play().catch(() => {})
    }

    // Start MediaRecorder (audio + video)
    const mimes = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm', 'video/mp4']
    const mime  = mimes.find((m) => MediaRecorder.isTypeSupported(m)) || ''
    const recorder = new MediaRecorder(stream, mime ? { mimeType: mime } : {})
    chunksRef.current = []
    recorder.ondataavailable = (e) => { if (e.data?.size > 0) chunksRef.current.push(e.data) }
    recorder.start(1000)
    recorderRef.current = recorder

    // Audio speech detection
    const micOk = startAudioMonitor(stream, () => {
      setStatus((s) => ({ ...s, speechEvents: s.speechEvents + 1 }))
      addEvent('speech', 'Voice activity detected — possible verbal communication', 'alert')
      wsRef.current?.sendEvent({ type: 'speech', ts: Date.now(), data: { candidateId } })
    })

    setStatus((s) => ({ ...s, webcam: true, mic: micOk }))

    // WebSocket — use real candidateId, not a hardcoded placeholder
    const ws = createWsClient(examConfig.examId, candidateId, (st) =>
      setStatus((s) => ({ ...s, ws: st }))
    )
    ws.connect()
    wsRef.current = ws

    startGazeTracking()
    setPhase('exam')
  }

  // ── Submit ──────────────────────────────────────────────────────────────────
  const handleSubmit = useCallback(async () => {
    onUserInteraction()
    captureQuestionBehavior(currentQ, answers[questions[currentQ]?.id])
    stopGazeTracking()
    stopAudioMonitor()

    const url = await stopRecording()
    if (url) setDownloadUrl(url)

    streamRef.current?.getTracks().forEach((t) => t.stop())
    wsRef.current?.disconnect()

    setPhase('submitted')
  }, [currentQ, answers, questions, captureQuestionBehavior, stopRecording])

  // ── Navigation ──────────────────────────────────────────────────────────────
  const handleAnswer = (qId, i) => {
    onUserInteraction()
    setAnswers((prev) => ({ ...prev, [qId]: i }))
    captureQuestionBehavior(currentQ, i)
  }
  const handleNext = () => {
    onUserInteraction()
    captureQuestionBehavior(currentQ, answers[questions[currentQ].id])
    setCurrentQ((q) => q + 1)
  }
  const handlePrev = () => { onUserInteraction(); setCurrentQ((q) => q - 1) }

  const formatTime = (s) => `${String(Math.floor(s / 60)).padStart(2,'0')}:${String(s % 60).padStart(2,'0')}`

  const answeredCount = Object.keys(answers).length

  // ══════════ PERMISSION DENIED SCREEN ══════════
  if (phase === 'denied') {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center p-4">
        <div className="w-full max-w-md rounded-2xl bg-white border border-red-200 shadow-xl overflow-hidden">
          <div className="bg-red-600 px-6 py-8 text-white text-center">
            <XCircle className="h-14 w-14 mx-auto mb-4 opacity-90" />
            <h1 className="text-2xl font-bold">Camera & Microphone Required</h1>
          </div>
          <div className="p-6 space-y-4">
            <p className="text-sm text-slate-600 leading-relaxed">
              ProctorAI requires access to both your <strong>camera</strong> and <strong>microphone</strong> to
              conduct this exam. You denied permission or your device does not have these devices available.
            </p>
            <div className="rounded-lg bg-slate-50 border border-slate-200 p-4 space-y-2 text-sm text-slate-700">
              <p className="font-semibold">How to grant access:</p>
              <ol className="list-decimal list-inside space-y-1 text-xs text-slate-600">
                <li>Click the 🔒 lock icon in your browser's address bar</li>
                <li>Set Camera and Microphone to <strong>Allow</strong></li>
                <li>Reload this page and try again</li>
              </ol>
            </div>
            <p className="text-xs text-red-600 font-medium text-center">
              The examination cannot proceed without these permissions.
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="w-full rounded-xl bg-navy py-3 text-sm font-semibold text-white hover:bg-navy-light transition-colors"
            >
              Reload Page & Try Again
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ══════════ SUBMITTED SCREEN ══════════
  if (phase === 'submitted') {
    const suspicious = behaviorLog.filter((e) => e.suspicious)
    const consentRec = (() => { try { return JSON.parse(localStorage.getItem(`proctorai_consent_${examConfig.examId}`) || 'null') } catch { return null } })()

    // Keystroke transcript grouped by question
    const ksByQ = keystrokeLog.reduce((acc, k) => {
      if (!acc[k.qNum]) acc[k.qNum] = []
      acc[k.qNum].push(k.key)
      return acc
    }, {})

    return (
      <div className="min-h-screen bg-surface py-8 px-4">
        <div className="mx-auto max-w-2xl space-y-6">
          {/* Header */}
          <div className="rounded-2xl bg-white border border-slate-200 shadow-xl overflow-hidden">
            <div className="bg-navy px-6 py-8 text-white text-center">
              <CheckCircle className="h-12 w-12 mx-auto mb-4 text-emerald-400" />
              <h1 className="text-2xl font-bold">Exam Submitted</h1>
              <p className="text-white/70 text-sm mt-2">{examConfig.examName}</p>
            </div>
            <div className="p-6 grid grid-cols-3 gap-4 text-center">
              <div className="rounded-xl bg-surface border border-slate-100 p-4">
                <p className="text-2xl font-bold text-navy">{answeredCount}/{questions.length}</p>
                <p className="text-xs text-slate-500 mt-1">Answered</p>
              </div>
              <div className={`rounded-xl border p-4 ${suspicious.length > 0 ? 'bg-red-50 border-red-200' : 'bg-emerald-50 border-emerald-200'}`}>
                <p className={`text-2xl font-bold ${suspicious.length > 0 ? 'text-red-600' : 'text-emerald-600'}`}>{suspicious.length}</p>
                <p className={`text-xs mt-1 ${suspicious.length > 0 ? 'text-red-500' : 'text-emerald-500'}`}>Suspicious Gaze</p>
              </div>
              <div className={`rounded-xl border p-4 ${status.tabSwitches > 0 ? 'bg-red-50 border-red-200' : 'bg-surface border-slate-100'}`}>
                <p className={`text-2xl font-bold ${status.tabSwitches > 0 ? 'text-red-600' : 'text-navy'}`}>{status.tabSwitches}</p>
                <p className="text-xs text-slate-500 mt-1">Tab Switches</p>
              </div>
            </div>
          </div>

          {/* Consent Audit Trail */}
          {consentRec && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="h-4 w-4 text-emerald-600" />
                <p className="text-sm font-semibold text-emerald-800">Consent Audit Trail</p>
              </div>
              <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs text-emerald-700">
                <span>Agreed at:</span><span className="font-mono">{new Date(consentRec.agreedAt).toLocaleString()}</span>
                <span>Policy version:</span><span>{consentRec.consentVersion}</span>
                <span>Timezone:</span><span>{consentRec.timezone}</span>
                <span>Screen:</span><span>{consentRec.screenRes}</span>
              </div>
            </div>
          )}

          {/* Red Flag Snapshots */}
          {redFlagSnaps.length > 0 && (
            <div className="rounded-xl border border-red-200 bg-white overflow-hidden">
              <div className="flex items-center gap-2 bg-red-600 px-4 py-3">
                <AlertCircle className="h-4 w-4 text-white" />
                <h3 className="text-sm font-semibold text-white">Red Flag Evidence — Face Snapshots</h3>
              </div>
              <div className="p-4 grid grid-cols-2 gap-3">
                {redFlagSnaps.map((snap) => (
                  <div key={snap.ts} className="space-y-1">
                    <img src={snap.dataUrl} alt="Red flag snapshot" className="w-full rounded-lg border border-red-200" />
                    <p className="text-[10px] text-red-600 font-medium">{snap.reason}</p>
                    <p className="text-[10px] text-slate-400">{new Date(snap.ts).toLocaleTimeString()}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Download footage */}
          {downloadUrl && (
            <a
              href={downloadUrl}
              download="ProctorAI_Session.webm"
              className="flex items-center justify-center gap-2 w-full rounded-xl bg-navy py-3 text-sm font-semibold text-white hover:bg-navy-light transition-colors"
            >
              <Download className="h-4 w-4" />
              Download Combined Audio+Video Footage (.webm)
            </a>
          )}

          {/* Gaze Analysis Table */}
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
                      {['Q#','Question','Center%','Left%','Right%','Samples','Status'].map((h) => (
                        <th key={h} className="px-3 py-2 text-left font-semibold text-slate-600">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[...behaviorLog].sort((a,b) => a.questionNum - b.questionNum).map((e) => (
                      <tr key={e.questionId} className={`border-b border-slate-100 ${e.suspicious ? 'bg-red-50' : ''}`}>
                        <td className="px-3 py-2 font-bold text-navy">Q{e.questionNum}</td>
                        <td className="px-3 py-2 text-slate-600 max-w-[140px] truncate">{e.questionText}</td>
                        <td className="px-3 py-2 text-center font-semibold text-emerald-600">{e.centerPct}%</td>
                        <td className="px-3 py-2 text-center font-semibold text-amber-600">{e.leftPct}%</td>
                        <td className="px-3 py-2 text-center font-semibold text-amber-600">{e.rightPct}%</td>
                        <td className="px-3 py-2 text-center text-slate-500">{e.sampleCount}</td>
                        <td className="px-3 py-2">
                          {e.suspicious
                            ? <span className="inline-flex items-center gap-1 rounded-full bg-red-100 text-red-700 px-2 py-0.5 font-semibold"><AlertCircle className="h-3 w-3" />Suspicious</span>
                            : <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 text-emerald-700 px-2 py-0.5 font-semibold"><CheckCircle className="h-3 w-3" />Clean</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Keystroke Transcript */}
          {Object.keys(ksByQ).length > 0 && (
            <div className="rounded-xl border border-slate-200 overflow-hidden">
              <div className="flex items-center gap-2 bg-navy px-4 py-3">
                <Keyboard className="h-4 w-4 text-white" />
                <h3 className="text-sm font-semibold text-white">Keystroke Transcript (per question)</h3>
              </div>
              <div className="p-4 space-y-3">
                {Object.entries(ksByQ).sort(([a],[b]) => Number(a)-Number(b)).map(([qNum, keys]) => (
                  <div key={qNum} className="flex gap-3 items-start">
                    <span className="shrink-0 rounded-lg bg-navy/10 text-navy text-xs font-bold px-2 py-1">Q{qNum}</span>
                    <code className="text-xs text-slate-700 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 break-all leading-relaxed font-mono">
                      {keys.join('')}
                    </code>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  // ══════════ PRE-EXAM SCREEN ══════════
  if (phase === 'pre') {
    const sourceLabel = configSource === 'server' ? '✓ Loaded from server' : configSource === 'local' ? '⚠ Loaded from device (offline)' : null

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
            {/* Config source banner */}
            {sourceLabel && (
              <div className={`rounded-lg p-3 text-xs flex items-center gap-2 ${configSource === 'server' ? 'bg-blue-50 border border-blue-200 text-blue-700' : 'bg-amber-50 border border-amber-200 text-amber-700'}`}>
                <CheckCircle className="h-4 w-4 shrink-0" />
                {sourceLabel} · {questions.length} questions · {examConfig.timeLimitMinutes} min · {totalMarks} marks
              </div>
            )}
            {!isCustom && (
              <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-xs text-amber-700 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                No examiner config found — using default questions.
                <Link to="/setup" className="underline font-semibold">Set up exam →</Link>
              </div>
            )}

            {/* Exam stats */}
            <div className="grid grid-cols-3 gap-3 text-center">
              {[
                [questions.length, 'Questions'],
                [`${examConfig.timeLimitMinutes}m`, 'Duration'],
                [totalMarks, 'Total Marks'],
              ].map(([val, label]) => (
                <div key={label} className="rounded-lg bg-surface border border-slate-100 p-3">
                  <p className="text-lg font-bold text-navy">{val}</p>
                  <p className="text-[10px] text-slate-500">{label}</p>
                </div>
              ))}
            </div>

            {/* Proctoring notice */}
            <div className="rounded-lg bg-amber-50 border border-amber-200 p-4">
              <div className="flex gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-amber-800">Active Proctoring Notice</p>
                  <p className="text-xs text-amber-700 mt-1 leading-relaxed">
                    This exam is fully monitored. Your camera, microphone, gaze direction, keystrokes,
                    and browser activity will be recorded and analysed in real-time by ProctorAI.
                  </p>
                </div>
              </div>
            </div>

            {/* Monitoring list */}
            <ul className="space-y-2 text-sm text-slate-600">
              {[
                [Camera,    'Webcam + video recording (required)'],
                [Mic,       'Microphone + audio recording (required)'],
                [Eye,       'Gaze direction tracking (center / left / right)'],
                [Keyboard,  'Keystroke content capture (all printable characters)'],
                [Monitor,   'Tab switching and browser focus monitoring'],
                [Clipboard, 'Clipboard paste event detection'],
                [Volume2,   'Voice activity detection (speech flagging)'],
              ].map(([Icon, text]) => (
                <li key={text} className="flex items-center gap-2">
                  <Icon className="h-4 w-4 text-navy shrink-0" />
                  {text}
                </li>
              ))}
            </ul>

            {/* ── Student Identity ── */}
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-navy text-white text-[10px] font-bold">1</span>
                Your Identity
              </p>
              <div className="space-y-2">
                <div>
                  <label className="text-xs font-medium text-slate-600 block mb-1">Full Name *</label>
                  <input
                    type="text"
                    placeholder="e.g. Parth Sharma"
                    value={studentInfo.name}
                    onChange={(e) => { setStudentInfo((s) => ({ ...s, name: e.target.value })); setInfoErrors((er) => ({ ...er, name: null })) }}
                    className={`w-full rounded-lg border px-3 py-2 text-sm text-slate-800 bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-navy/30 transition-all ${infoErrors.name ? 'border-red-400 bg-red-50' : 'border-slate-200'}`}
                  />
                  {infoErrors.name && <p className="text-xs text-red-600 mt-1">{infoErrors.name}</p>}
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600 block mb-1">Student ID / Roll Number *</label>
                  <input
                    type="text"
                    placeholder="e.g. CS2024-042 or ROLL001"
                    value={studentInfo.studentId}
                    onChange={(e) => { setStudentInfo((s) => ({ ...s, studentId: e.target.value })); setInfoErrors((er) => ({ ...er, studentId: null })) }}
                    className={`w-full rounded-lg border px-3 py-2 text-sm text-slate-800 bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-navy/30 transition-all font-mono ${infoErrors.studentId ? 'border-red-400 bg-red-50' : 'border-slate-200'}`}
                  />
                  {infoErrors.studentId && <p className="text-xs text-red-600 mt-1">{infoErrors.studentId}</p>}
                  <p className="text-[10px] text-slate-400 mt-1">This is used to identify your session on the invigilator dashboard.</p>
                </div>
              </div>
            </div>

            {/* ── Consent ── */}
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-navy text-white text-[10px] font-bold">2</span>
                Consent & Monitoring Agreement
              </p>

            {/* Consent checkbox */}
            <label className="flex items-start gap-3 cursor-pointer rounded-xl border-2 border-navy/20 bg-navy/5 p-4 hover:border-navy/40 transition-colors">
              <input
                type="checkbox"
                checked={consentChecked}
                onChange={(e) => setConsent(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded accent-navy shrink-0"
              />
              <span className="text-xs text-slate-700 leading-relaxed">
                I have read and agree to the{' '}
                <Link to="/privacy" target="_blank" className="text-accent font-semibold underline">
                  Privacy Policy
                </Link>
                {' '}(opens in new tab) and give my <strong>informed consent</strong> to all monitoring
                described above. I understand that this session will be recorded.
              </span>
            </label>
            </div>

            <button
              type="button"
              onClick={handleStart}
              disabled={!consentChecked || !studentInfo.name.trim() || !studentInfo.studentId.trim()}
              className="w-full rounded-xl bg-navy py-3 text-sm font-semibold text-white hover:bg-navy-light transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {!studentInfo.name.trim() || !studentInfo.studentId.trim()
                ? 'Enter Your Details to Continue'
                : !consentChecked
                  ? 'Agree to Privacy Policy to Continue'
                  : 'Begin Examination'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ══════════ ACTIVE EXAM ══════════
  const q      = questions[currentQ]
  const qMarks = q.marks || examConfig.marksPerQuestion || 1
  const gazeOk = status.gaze === 'center'

  const wsIcon = status.ws === 'connected' ? <Wifi className="h-3 w-3 text-emerald-500" /> :
                 status.ws === 'syncing'   ? <Wifi className="h-3 w-3 text-amber-500 animate-pulse" /> :
                                             <WifiOff className="h-3 w-3 text-red-500" />
  const wsLabel = status.ws === 'connected' ? 'Connected' : status.ws === 'syncing' ? 'Syncing…' : 'Offline (buffering)'

  return (
    <div className="min-h-screen bg-surface">
      {/* Exam top bar */}
      <div className="sticky top-16 z-40 border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <Shield className="h-5 w-5 text-navy" />
            <span className="font-semibold text-navy text-sm hidden sm:inline">ProctorAI Monitoring</span>
            <span className="flex items-center gap-1 text-xs">{wsIcon} <span className="hidden sm:inline text-slate-500">{wsLabel}</span></span>
          </div>
          <div className="flex items-center gap-4">
            <span className={`flex items-center gap-1 text-xs font-medium ${gazeOk ? 'text-emerald-600' : 'text-amber-600'}`}>
              <Eye className="h-3 w-3" /> {status.gaze}
            </span>
            <span className={`flex items-center gap-2 text-sm font-mono font-semibold ${timeLeft < 300 ? 'text-red-600' : 'text-navy'}`}>
              <Clock className="h-4 w-4" />{formatTime(timeLeft)}
            </span>
          </div>
          <span className="text-xs text-slate-500">Q{currentQ + 1}/{questions.length} · {answeredCount} answered</span>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left — Question */}
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Question {currentQ + 1}</p>
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
                  <span className="font-mono text-xs text-slate-400 mr-3">{String.fromCharCode(65 + i)}.</span>
                  {opt}
                </button>
              ))}
            </div>
          </div>

          {/* Navigator */}
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-semibold text-slate-500 mb-3 uppercase tracking-wider">Question Navigator</p>
            <div className="flex flex-wrap gap-2">
              {questions.map((ques, i) => (
                <button
                  key={ques.id}
                  type="button"
                  onClick={() => { onUserInteraction(); setCurrentQ(i) }}
                  className={`h-8 w-8 rounded-lg text-xs font-semibold transition-all ${
                    i === currentQ
                      ? 'bg-navy text-white'
                      : answers[ques.id] !== undefined
                        ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >{i + 1}</button>
              ))}
            </div>
          </div>

          <div className="flex justify-between">
            <button
              type="button"
              disabled={currentQ === 0}
              onClick={handlePrev}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-white disabled:opacity-40"
            >Previous</button>
            {currentQ < questions.length - 1 ? (
              <button
                type="button"
                onClick={handleNext}
                className="inline-flex items-center gap-2 rounded-lg bg-navy px-4 py-2 text-sm font-medium text-white hover:bg-navy-light"
              >Next <ChevronRight className="h-4 w-4" /></button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                className="rounded-lg bg-emerald-600 px-6 py-2 text-sm font-medium text-white hover:bg-emerald-700"
              >Submit Exam</button>
            )}
          </div>
        </div>

        {/* Right — Monitoring Sidebar */}
        <div className="space-y-4">
          {/* Webcam + overlay */}
          <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2">
              <span className="text-xs font-semibold text-navy flex items-center gap-1.5">
                <Camera className="h-3.5 w-3.5" /> Live Feed
              </span>
              <span className="flex items-center gap-1 text-[10px] text-red-600 font-semibold">
                <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" /> REC
              </span>
            </div>
            <div className="relative aspect-[4/3] bg-slate-900">
              <video ref={videoRef} autoPlay muted playsInline className="absolute inset-0 w-full h-full object-cover" />
              <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />
              {/* Gaze label */}
              <div className={`absolute bottom-2 left-2 flex items-center gap-1 rounded bg-black/60 px-2 py-0.5 text-[10px] text-white`}>
                <Eye className="h-3 w-3" />
                <span className={gazeOk ? 'text-emerald-400' : 'text-amber-400'}>{status.gaze}</span>
              </div>
              {/* Mic indicator */}
              <div className="absolute top-2 right-2 flex items-center gap-1 rounded bg-black/60 px-2 py-0.5 text-[10px] text-white">
                {status.mic ? <Mic className="h-3 w-3 text-emerald-400" /> : <MicOff className="h-3 w-3 text-red-400" />}
              </div>
            </div>
          </div>

          {/* System Status Panel */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-2.5">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">System Status</p>
            {[
              { Icon: Camera,  label: 'Webcam',       ok: status.webcam,             note: null },
              { Icon: Mic,     label: 'Microphone',   ok: status.mic,                note: null },
              { Icon: Eye,     label: 'Gaze Tracking',ok: gazeOk,                    note: gazeOk ? null : status.gaze },
              { Icon: Activity,label: 'Face Detection',ok: status.face,              note: null },
              { Icon: Wifi,    label: 'WebSocket',    ok: status.ws === 'connected',  note: status.ws !== 'connected' ? wsLabel : null },
              { Icon: Monitor, label: 'Tab Switches', ok: status.tabSwitches === 0,  count: status.tabSwitches },
              { Icon: Clipboard,label:'Paste Events', ok: status.pastes === 0,       count: status.pastes },
              { Icon: Keyboard,label: 'Keystrokes',   ok: true,                      count: status.keystrokes },
              { Icon: Volume2, label: 'Speech Events',ok: status.speechEvents === 0, count: status.speechEvents },
            ].map(({ Icon, label, ok, note, count }) => (
              <div key={label} className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <Icon className="h-4 w-4" />{label}
                </div>
                {count !== undefined
                  ? <span className={`text-xs font-semibold ${ok ? 'text-emerald-600' : 'text-red-600'}`}>{count}</span>
                  : note
                    ? <span className="text-xs font-semibold text-amber-600">{note}</span>
                    : <CheckCircle className={`h-4 w-4 ${ok ? 'text-emerald-500' : 'text-red-500'}`} />}
              </div>
            ))}
          </div>

          {/* Event Buffer */}
          <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
            <div className="border-b border-slate-100 px-4 py-2">
              <p className="text-xs font-semibold text-navy">Event Buffer</p>
            </div>
            <div className="p-3 space-y-1.5 max-h-48 overflow-y-auto">
              {events.length === 0
                ? <p className="text-xs text-slate-400 text-center py-4">Monitoring active…</p>
                : events.map((e) => (
                  <div key={e.id} className={`flex items-center justify-between rounded px-2 py-1.5 text-[11px] ${
                    e.sev === 'alert' ? 'bg-red-50 text-red-700' : e.sev === 'warn' ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'
                  }`}>
                    <span>{e.label}</span>
                    <span className="text-[10px] opacity-60">{new Date(e.ts).toLocaleTimeString()}</span>
                  </div>
                ))}
            </div>
          </div>

          {/* Live Gaze Analysis (collapsible) */}
          {behaviorLog.length > 0 && (
            <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
              <button
                type="button"
                onClick={() => setShowBehavior((v) => !v)}
                className="w-full flex items-center justify-between px-4 py-3 border-b border-slate-100 hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-navy" />
                  <span className="text-xs font-semibold text-navy">Gaze Log ({behaviorLog.length})</span>
                </div>
                <span className="text-[10px] text-slate-400">{showBehavior ? '▲' : '▼'}</span>
              </button>
              {showBehavior && (
                <table className="w-full text-[10px]">
                  <thead className="bg-slate-50">
                    <tr>
                      {['Q','Ctr','L','R','⚑'].map((h) => (
                        <th key={h} className="px-2 py-1.5 text-center text-slate-500">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {behaviorLog.map((e) => (
                      <tr key={e.questionId} className={`border-t border-slate-100 ${e.suspicious ? 'bg-red-50' : ''}`}>
                        <td className="px-2 py-1 font-bold text-navy text-center">Q{e.questionNum}</td>
                        <td className="px-2 py-1 text-center text-emerald-600">{e.centerPct}%</td>
                        <td className="px-2 py-1 text-center text-amber-600">{e.leftPct}%</td>
                        <td className="px-2 py-1 text-center text-amber-600">{e.rightPct}%</td>
                        <td className="px-2 py-1 text-center">{e.suspicious ? '⚠' : '✓'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
