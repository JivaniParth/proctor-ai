/**
 * wsClient.js
 *
 * Offline-first WebSocket client for ProctorAI exam event streaming.
 *
 * Strategy:
 *  1. Connect directly to backend (no Vite proxy dependency).
 *  2. If backend is down → buffer events in localStorage.
 *  3. On reconnect → flush buffer to server → clear localStorage.
 *  4. Exponential backoff on reconnect: 1s → 2s → 4s … max 30s.
 */

const BACKEND_WS  = 'ws://localhost:8000'
const BACKEND_API = 'http://localhost:8000'
const BUFFER_KEY  = 'proctorai_ws_buffer'
const MAX_BUFFER  = 1000  // max events stored offline

/**
 * Create a WebSocket client instance.
 * @param {string} examId
 * @param {string} candidateId
 * @param {(status: 'connected'|'disconnected'|'syncing') => void} onStatusChange
 */
export function createWsClient(examId, candidateId, onStatusChange) {
  let ws = null
  let reconnectTimer = null
  let reconnectDelay = 1000
  let destroyed = false

  function connect() {
    if (destroyed) return
    try {
      ws = new WebSocket(`${BACKEND_WS}/ws/${examId}/${candidateId}`)

      ws.onopen = () => {
        reconnectDelay = 1000
        onStatusChange('syncing')
        flushOfflineBuffer()
      }

      ws.onclose = () => {
        if (!destroyed) {
          onStatusChange('disconnected')
          scheduleReconnect()
        }
      }

      ws.onerror = () => {
        // onclose fires after onerror, so just let that handle reconnect
      }
    } catch {
      onStatusChange('disconnected')
      scheduleReconnect()
    }
  }

  function scheduleReconnect() {
    if (destroyed) return
    reconnectTimer = setTimeout(() => {
      reconnectDelay = Math.min(reconnectDelay * 2, 30_000)
      connect()
    }, reconnectDelay)
  }

  /** Send a single event object. Falls back to buffer if not connected. */
  function sendEvent(event) {
    if (ws && ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(JSON.stringify({ events: [event] }))
        return
      } catch {
        // fall through to buffer
      }
    }
    bufferEvent(event)
  }

  /** Send a batch of events. */
  function sendBatch(events) {
    if (!events.length) return
    if (ws && ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(JSON.stringify({ events }))
        return
      } catch { /* fall through */ }
    }
    events.forEach(bufferEvent)
  }

  function bufferEvent(event) {
    try {
      const raw = localStorage.getItem(BUFFER_KEY)
      const buf = raw ? JSON.parse(raw) : []
      buf.push(event)
      // Keep only the most recent MAX_BUFFER events
      localStorage.setItem(BUFFER_KEY, JSON.stringify(buf.slice(-MAX_BUFFER)))
    } catch { /* storage full or unavailable */ }
  }

  async function flushOfflineBuffer() {
    try {
      const raw = localStorage.getItem(BUFFER_KEY)
      if (!raw) { onStatusChange('connected'); return }
      const buf = JSON.parse(raw)
      if (!buf.length) { onStatusChange('connected'); return }

      // Send in chunks of 50 to avoid oversized frames
      for (let i = 0; i < buf.length; i += 50) {
        if (ws?.readyState !== WebSocket.OPEN) break
        ws.send(JSON.stringify({ events: buf.slice(i, i + 50) }))
        await new Promise((r) => setTimeout(r, 50))
      }
      localStorage.removeItem(BUFFER_KEY)
      onStatusChange('connected')
    } catch {
      onStatusChange('connected')
    }
  }

  function disconnect() {
    destroyed = true
    if (reconnectTimer) clearTimeout(reconnectTimer)
    if (ws) {
      ws.onclose = null  // prevent reconnect loop
      ws.close()
    }
  }

  return { connect, disconnect, sendEvent, sendBatch }
}


/**
 * Generic HTTP helpers — try backend, report offline if unreachable.
 * Never throw; always return { ok, data?, offline? }.
 */
export async function apiPost(path, body) {
  try {
    const res = await fetch(`${BACKEND_API}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const data = await res.json()
    return { ok: res.ok, data }
  } catch {
    return { ok: false, offline: true }
  }
}

export async function apiGet(path) {
  try {
    const res = await fetch(`${BACKEND_API}${path}`)
    if (!res.ok) return { ok: false, status: res.status }
    const data = await res.json()
    return { ok: true, data }
  } catch {
    return { ok: false, offline: true }
  }
}
