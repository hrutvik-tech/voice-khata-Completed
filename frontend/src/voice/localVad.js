/**
 * Energy-based Local Voice Activity Detector.
 * Constants:
 * - Silence duration to end speech: 600ms
 * - Turn cancelled if no speech within 5s of start
 * - Maximum turn length: 12s
 */

export class LocalVad {
  constructor({ onSpeechStart, onSpeechEnd, onTimeout, onMaxDuration }) {
    this.onSpeechStart = onSpeechStart
    this.onSpeechEnd = onSpeechEnd
    this.onTimeout = onTimeout
    this.onMaxDuration = onMaxDuration

    this.isSpeaking = false
    this.hasSpoken = false
    this.silenceStart = null
    this.turnStart = null
    this.energyThreshold = 0.015

    this.silenceDurationMs = 600
    this.noSpeechTimeoutMs = 5000
    this.maxDurationMs = 12000

    this.timeoutTimer = null
    this.maxDurationTimer = null
  }

  start() {
    this.isSpeaking = false
    this.hasSpoken = false
    this.silenceStart = null
    this.turnStart = Date.now()

    if (this.timeoutTimer) clearTimeout(this.timeoutTimer)
    if (this.maxDurationTimer) clearTimeout(this.maxDurationTimer)

    // No speech within 5s timeout
    this.timeoutTimer = setTimeout(() => {
      if (!this.hasSpoken && this.onTimeout) {
        this.onTimeout()
      }
    }, this.noSpeechTimeoutMs)

    // Max 12s duration
    this.maxDurationTimer = setTimeout(() => {
      if (this.onMaxDuration) {
        this.onMaxDuration()
      }
    }, this.maxDurationMs)
  }

  processAudio(float32Array) {
    let sum = 0
    for (let i = 0; i < float32Array.length; i++) {
      sum += float32Array[i] * float32Array[i]
    }
    const rms = Math.sqrt(sum / float32Array.length)

    const now = Date.now()

    if (rms > this.energyThreshold) {
      if (!this.hasSpoken) {
        this.hasSpoken = true
        if (this.timeoutTimer) {
          clearTimeout(this.timeoutTimer)
          this.timeoutTimer = null
        }
      }

      if (!this.isSpeaking) {
        this.isSpeaking = true
        this.silenceStart = null
        if (this.onSpeechStart) this.onSpeechStart()
      } else {
        this.silenceStart = null
      }
    } else {
      if (this.isSpeaking) {
        if (!this.silenceStart) {
          this.silenceStart = now
        } else if (now - this.silenceStart >= this.silenceDurationMs) {
          this.isSpeaking = false
          this.silenceStart = null
          if (this.onSpeechEnd) this.onSpeechEnd()
        }
      }
    }
  }

  stop() {
    if (this.timeoutTimer) {
      clearTimeout(this.timeoutTimer)
      this.timeoutTimer = null
    }
    if (this.maxDurationTimer) {
      clearTimeout(this.maxDurationTimer)
      this.maxDurationTimer = null
    }
    this.isSpeaking = false
    this.hasSpoken = false
    this.silenceStart = null
  }
}
