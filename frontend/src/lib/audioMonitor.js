/**
 * audioMonitor.js
 *
 * Detects sustained voice activity using the Web Audio API (AnalyserNode).
 * Does NOT transcribe or record audio — only measures loudness level.
 *
 * Speech is flagged when RMS amplitude exceeds SPEECH_THRESHOLD for at
 * least SPEECH_HOLD_MS milliseconds continuously.
 *
 * After firing, the detector resets and requires another COOLDOWN_MS of
 * silence before it can fire again (prevents rapid repeated events).
 */

const SPEECH_THRESHOLD = 22    // RMS value 0–255; adjust for room noise
const SPEECH_HOLD_MS   = 1500  // must be loud for 1.5s before triggering
const COOLDOWN_MS      = 5000  // wait 5s before next speech event
const POLL_INTERVAL_MS = 250   // sample audio every 250ms

let audioContext   = null
let analyser       = null
let sourceNode     = null
let intervalId     = null
let speechStart    = null
let lastFiredAt    = 0

/**
 * Start monitoring the audio track in the given MediaStream.
 * @param {MediaStream} stream — the stream from getUserMedia (must have audio)
 * @param {() => void} onSpeechDetected — callback fired each time speech is detected
 * @returns {boolean} true if monitoring started successfully
 */
export function startAudioMonitor(stream, onSpeechDetected) {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext
    if (!AudioCtx) return false

    audioContext = new AudioCtx()
    analyser     = audioContext.createAnalyser()
    analyser.fftSize     = 256
    analyser.smoothingTimeConstant = 0.4
    sourceNode   = audioContext.createMediaStreamSource(stream)
    sourceNode.connect(analyser)

    const dataArray = new Uint8Array(analyser.frequencyBinCount)

    intervalId = setInterval(() => {
      if (!analyser) return
      analyser.getByteFrequencyData(dataArray)

      // Root-Mean-Square of frequency magnitudes
      const sum = dataArray.reduce((acc, v) => acc + v * v, 0)
      const rms = Math.sqrt(sum / dataArray.length)

      const now = Date.now()

      if (rms > SPEECH_THRESHOLD) {
        if (!speechStart) {
          speechStart = now
        } else if (now - speechStart >= SPEECH_HOLD_MS) {
          if (now - lastFiredAt >= COOLDOWN_MS) {
            lastFiredAt = now
            speechStart = null
            onSpeechDetected()
          }
        }
      } else {
        speechStart = null
      }
    }, POLL_INTERVAL_MS)

    return true
  } catch {
    return false
  }
}

/**
 * Stop audio monitoring and release AudioContext resources.
 */
export function stopAudioMonitor() {
  if (intervalId) { clearInterval(intervalId); intervalId = null }
  if (sourceNode) { try { sourceNode.disconnect() } catch { /* ignore */ } sourceNode = null }
  if (audioContext) { try { audioContext.close() } catch { /* ignore */ } audioContext = null }
  analyser   = null
  speechStart = null
  lastFiredAt = 0
}

/**
 * Returns true if audio monitoring is currently active.
 */
export function isAudioMonitorActive() {
  return intervalId !== null
}
