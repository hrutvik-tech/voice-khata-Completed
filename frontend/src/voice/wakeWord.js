/**
 * Wake Word manager for "Suno Munshi".
 * Integrates Picovoice Porcupine when available, or provides a development fallback.
 */

export class WakeWordDetector {
  constructor({ onWakeWord, onStatusChange }) {
    this.onWakeWord = onWakeWord
    this.onStatusChange = onStatusChange
    this.isListening = false
    this.isPorcupineActive = false
    this.porcupine = null
  }

  async init(accessKey) {
    if (!accessKey) {
      if (this.onStatusChange) {
        this.onStatusChange({
          available: false,
          mode: 'manual_fallback',
          message: 'Picovoice key missing — using Tap to Speak fallback',
        })
      }
      return false
    }

    // Check if porcupine assets exist in /porcupine/
    try {
      const hasAssets = await this._checkAssets()
      if (!hasAssets) {
        if (this.onStatusChange) {
          this.onStatusChange({
            available: false,
            mode: 'manual_fallback',
            message: 'Porcupine assets not present — using Tap to Speak fallback',
          })
        }
        return false
      }

      // Porcupine initialization if @picovoice/porcupine-web is loaded
      if (typeof window !== 'undefined' && window.Porcupine) {
        this.porcupine = await window.Porcupine.create(
          accessKey,
          { publicPath: '/porcupine/suno_munshi.ppn' },
          () => {
            if (this.onWakeWord) this.onWakeWord()
          },
          { publicPath: '/porcupine/porcupine_params.pv', sensitivity: 0.65 }
        )
        this.isPorcupineActive = true
        if (this.onStatusChange) {
          this.onStatusChange({
            available: true,
            mode: 'porcupine',
            message: 'Say "Suno Munshi" to activate',
          })
        }
        return true
      }
    } catch (err) {
      console.warn('Porcupine init failed, using fallback:', err)
    }

    if (this.onStatusChange) {
      this.onStatusChange({
        available: false,
        mode: 'manual_fallback',
        message: 'Wake word fallback active (Tap mic to speak)',
      })
    }
    return false
  }

  async _checkAssets() {
    try {
      const res = await fetch('/porcupine/suno_munshi.ppn', { method: 'HEAD' })
      return res.ok
    } catch {
      return false
    }
  }

  processFrame(int16Frame) {
    if (this.isPorcupineActive && this.porcupine) {
      this.porcupine.process(int16Frame)
    }
  }

  triggerManualWake() {
    if (this.onWakeWord) {
      this.onWakeWord()
    }
  }

  stop() {
    if (this.porcupine) {
      try {
        this.porcupine.release()
      } catch {}
      this.porcupine = null
    }
    this.isPorcupineActive = false
    this.isListening = false
  }
}
