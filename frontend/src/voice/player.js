/**
 * Plays streamed or chunked audio responses from backend.
 */

export class AudioPlayer {
  constructor({ onPlaybackStarted, onPlaybackEnded }) {
    this.onPlaybackStarted = onPlaybackStarted
    this.onPlaybackEnded = onPlaybackEnded
    this.audioChunks = []
    this.currentAudio = null
    this.isPlaying = false
    this.lastAudioUrl = null
  }

  startStream() {
    this.audioChunks = []
  }

  addChunk(chunk) {
    this.audioChunks.push(chunk)
  }

  async finishStream() {
    if (this.audioChunks.length === 0) {
      if (this.onPlaybackEnded) this.onPlaybackEnded()
      return
    }

    const blob = new Blob(this.audioChunks, { type: 'audio/mp3' })
    this.audioChunks = []
    await this.playBlob(blob)
  }

  async playBlob(blob) {
    if (this.currentAudio) {
      this.currentAudio.pause()
      this.currentAudio = null
    }

    if (this.lastAudioUrl) {
      URL.revokeObjectURL(this.lastAudioUrl)
    }

    this.lastAudioUrl = URL.createObjectURL(blob)
    this.currentAudio = new Audio(this.lastAudioUrl)

    this.currentAudio.onplay = () => {
      this.isPlaying = true
      if (this.onPlaybackStarted) this.onPlaybackStarted()
    }

    this.currentAudio.onended = () => {
      this.isPlaying = false
      if (this.onPlaybackEnded) this.onPlaybackEnded()
    }

    this.currentAudio.onerror = (e) => {
      console.warn('Audio playback error:', e)
      this.isPlaying = false
      if (this.onPlaybackEnded) this.onPlaybackEnded()
    }

    try {
      await this.currentAudio.play()
    } catch (err) {
      console.warn('Autoplay prevented or audio playback failed:', err)
      this.isPlaying = false
      if (this.onPlaybackEnded) this.onPlaybackEnded()
    }
  }

  replay() {
    if (this.lastAudioUrl) {
      this.currentAudio = new Audio(this.lastAudioUrl)
      if (this.onPlaybackStarted) this.onPlaybackStarted()
      this.currentAudio.onended = () => {
        if (this.onPlaybackEnded) this.onPlaybackEnded()
      }
      this.currentAudio.play().catch(console.warn)
    }
  }

  stop() {
    if (this.currentAudio) {
      this.currentAudio.pause()
      this.currentAudio = null
    }
    this.isPlaying = false
  }
}
