/**
 * gazeTracker.js
 *
 * Manages a continuous 5-second circular buffer of gaze direction samples
 * (sampled every 200ms = 25 readings per window).
 *
 * Since MediaPipe is not bundled, gaze is simulated realistically:
 *  - Baseline: 85% center (student focused on screen)
 *  - On interaction (click/keypress): variance increases for 2s (student thinking / looking around)
 *  - Gaze changes are seeded by real user interactions so they reflect plausible behavior
 */

const SAMPLE_INTERVAL_MS = 200
const WINDOW_SIZE = 25 // 5s at 200ms intervals

let gazeBuffer = []       // circular buffer of { dir: 'center'|'left'|'right', ts: number }
let intervalId = null
let stressLevel = 0       // 0-1, elevated by interactions
let stressDecayTimer = null

/** Call when user interacts (click, keydown) — temporarily increases gaze variance */
export function onUserInteraction() {
  stressLevel = Math.min(stressLevel + 0.4, 1.0)
  if (stressDecayTimer) clearTimeout(stressDecayTimer)
  stressDecayTimer = setTimeout(() => {
    stressLevel = Math.max(0, stressLevel - 0.3)
  }, 2000)
}

function sampleGaze() {
  // At stressLevel=0: 85% center, 7.5% left, 7.5% right
  // At stressLevel=1: 50% center, 25% left, 25% right
  const centerProb = 0.85 - stressLevel * 0.35
  const r = Math.random()
  let dir
  if (r < centerProb) {
    dir = 'center'
  } else if (r < centerProb + (1 - centerProb) / 2) {
    dir = 'left'
  } else {
    dir = 'right'
  }

  gazeBuffer.push({ dir, ts: Date.now() })
  if (gazeBuffer.length > WINDOW_SIZE) gazeBuffer.shift()
}

/** Start continuous gaze sampling */
export function startGazeTracking() {
  if (intervalId) return
  gazeBuffer = []
  intervalId = setInterval(sampleGaze, SAMPLE_INTERVAL_MS)
}

/** Stop continuous gaze sampling */
export function stopGazeTracking() {
  if (intervalId) {
    clearInterval(intervalId)
    intervalId = null
  }
}

/** Get the current (most recent) gaze direction */
export function getCurrentGaze() {
  if (gazeBuffer.length === 0) return 'center'
  return gazeBuffer[gazeBuffer.length - 1].dir
}

/**
 * Get a snapshot of the last 5 seconds of gaze readings without clearing.
 * Returns { readings, centerPct, leftPct, rightPct, suspicious }
 */
export function getGazeWindow() {
  const now = Date.now()
  const window5s = gazeBuffer.filter((s) => now - s.ts <= 5000)
  const total = window5s.length || 1
  const centerCount = window5s.filter((s) => s.dir === 'center').length
  const leftCount = window5s.filter((s) => s.dir === 'left').length
  const rightCount = window5s.filter((s) => s.dir === 'right').length

  const centerPct = Math.round((centerCount / total) * 100)
  const leftPct = Math.round((leftCount / total) * 100)
  const rightPct = Math.round((rightCount / total) * 100)
  // Suspicious: >30% non-center gaze in last 5s
  const suspicious = (leftPct + rightPct) > 30

  return {
    readings: [...window5s],
    centerPct,
    leftPct,
    rightPct,
    suspicious,
    sampleCount: window5s.length,
  }
}
