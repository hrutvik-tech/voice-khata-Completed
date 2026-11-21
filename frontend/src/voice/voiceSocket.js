/**
 * Voice WebSocket Client managing `/ws?token=<JWT>` connection.
 */

export class VoiceSocket {
  constructor({ url, token, onEvent, onAudioChunk, onAudioStart, onAudioEnd, onOpen, onClose, onError }) {
    this.baseUrl = url
    this.token = token
    this.onEvent = onEvent
    this.onAudioChunk = onAudioChunk
    this.onAudioStart = onAudioStart
    this.onAudioEnd = onAudioEnd
    this.onOpen = onOpen
    this.onClose = onClose
    this.onError = onError

    this.ws = null
    this.isConnected = false
    this.pingInterval = null
  }

  connect() {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return
    }

    const wsUrl = `${this.baseUrl}/ws?token=${encodeURIComponent(this.token || '')}`
    this.ws = new WebSocket(wsUrl)
    this.ws.binaryType = 'arraybuffer'

    this.ws.onopen = () => {
      this.isConnected = true
      this._startPing()
      if (this.onOpen) this.onOpen()
    }

    this.ws.onclose = (event) => {
      this.isConnected = false
      this._stopPing()
      if (this.onClose) this.onClose(event)
    }

    this.ws.onerror = (err) => {
      if (this.onError) this.onError(err)
    }

    this.ws.onmessage = (event) => {
      if (event.data instanceof ArrayBuffer) {
        if (this.onAudioChunk) {
          this.onAudioChunk(event.data)
        }
      } else if (typeof event.data === 'string') {
        try {
          const msg = JSON.parse(event.data)
          if (msg.type === 'audio_start') {
            if (this.onAudioStart) this.onAudioStart(msg)
          } else if (msg.type === 'audio_end') {
            if (this.onAudioEnd) this.onAudioEnd(msg)
          }
          if (this.onEvent) {
            this.onEvent(msg)
          }
        } catch (e) {
          console.warn('Failed to parse WS JSON message:', e)
        }
      }
    }
  }

  _startPing() {
    this._stopPing()
    this.pingInterval = setInterval(() => {
      if (this.isConnected && this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'ping' }))
      }
    }, 25000)
  }

  _stopPing() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval)
      this.pingInterval = null
    }
  }

  startTurn(turnId, nowOverride = null) {
    this._sendJson({
      type: 'turn_start',
      turn_id: turnId,
      now_override: nowOverride,
    })
  }

  sendAudioFrame(frameArrayBuffer) {
    if (this.isConnected && this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(frameArrayBuffer)
    }
  }

  commitTurn(turnId) {
    this._sendJson({
      type: 'commit',
      turn_id: turnId,
    })
  }

  cancelTurn(turnId) {
    this._sendJson({
      type: 'cancel',
      turn_id: turnId,
    })
  }

  sendChoice(turnId, choice) {
    this._sendJson({
      type: 'choose',
      turn_id: turnId,
      choice,
    })
  }

  _sendJson(obj) {
    if (this.isConnected && this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(obj))
    }
  }

  disconnect() {
    this._stopPing()
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
    this.isConnected = false
  }
}
