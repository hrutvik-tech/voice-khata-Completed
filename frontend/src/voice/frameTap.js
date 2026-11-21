/**
 * Converts audio input to 16 kHz mono 16-bit PCM frames.
 * Emits exactly 1,024 bytes (512 samples) per frame.
 */

export class FrameTap {
  constructor(onFrame) {
    this.onFrame = onFrame
    this.buffer = new Int16Array(0)
    this.targetSampleRate = 16000
    this.frameSamples = 512 // 512 samples * 2 bytes = 1024 bytes
  }

  processFloat32(float32Array, inputSampleRate) {
    // 1. Resample to 16 kHz
    const resampled = this._resample(float32Array, inputSampleRate, this.targetSampleRate)
    
    // 2. Convert to Int16
    const int16 = new Int16Array(resampled.length)
    for (let i = 0; i < resampled.length; i++) {
      const s = Math.max(-1, Math.min(1, resampled[i]))
      int16[i] = s < 0 ? s * 0x8000 : s * 0x7fff
    }

    // 3. Append to internal buffer
    const newBuffer = new Int16Array(this.buffer.length + int16.length)
    newBuffer.set(this.buffer)
    newBuffer.set(int16, this.buffer.length)
    this.buffer = newBuffer

    // 4. Emit complete 512-sample frames
    while (this.buffer.length >= this.frameSamples) {
      const frame = this.buffer.slice(0, this.frameSamples)
      this.buffer = this.buffer.slice(this.frameSamples)
      // frame.buffer is 1024 bytes
      if (this.onFrame) {
        this.onFrame(frame.buffer)
      }
    }
  }

  _resample(input, fromRate, toRate) {
    if (fromRate === toRate) return input
    const ratio = fromRate / toRate
    const outputLength = Math.round(input.length / ratio)
    const result = new Float32Array(outputLength)
    for (let i = 0; i < outputLength; i++) {
      const pos = i * ratio
      const index = Math.floor(pos)
      const frac = pos - index
      const a = input[index] || 0
      const b = input[index + 1] || a
      result[i] = a + frac * (b - a)
    }
    return result
  }

  flush() {
    this.buffer = new Int16Array(0)
  }
}
