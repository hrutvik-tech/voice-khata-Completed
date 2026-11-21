import { describe, it, expect, vi } from 'vitest'
import { FrameTap } from './frameTap'
import { LocalVad } from './localVad'
import { AudioPlayer } from './player'

describe('Voice Audio Processing Components', () => {
  it('FrameTap downsamples and outputs exact 1024-byte frames', () => {
    const frames = []
    const tap = new FrameTap((frameBuffer) => {
      frames.push(frameBuffer)
    })

    // Feed 16000 samples at 16000Hz (1 second of audio)
    const float32 = new Float32Array(16000)
    for (let i = 0; i < float32.length; i++) {
      float32[i] = Math.sin((2 * Math.PI * 440 * i) / 16000)
    }

    tap.processFloat32(float32, 16000)

    // 16000 samples / 512 samples per frame = 31 full frames
    expect(frames.length).toBe(31)
    frames.forEach((buf) => {
      expect(buf.byteLength).toBe(1024)
    })
  })

  it('LocalVad detects energy and speech events', () => {
    const onStart = vi.fn()
    const onEnd = vi.fn()
    const vad = new LocalVad({
      onSpeechStart: onStart,
      onSpeechEnd: onEnd,
    })

    vad.start()

    // Loud audio
    const loudAudio = new Float32Array(1024).fill(0.1)
    vad.processAudio(loudAudio)

    expect(onStart).toHaveBeenCalled()
    vad.stop()
  })

  it('AudioPlayer manages stream chunks and lifecycle', () => {
    const onStart = vi.fn()
    const onEnd = vi.fn()
    const player = new AudioPlayer({
      onPlaybackStarted: onStart,
      onPlaybackEnded: onEnd,
    })

    player.startStream()
    expect(player.audioChunks.length).toBe(0)

    const chunk = new ArrayBuffer(512)
    player.addChunk(chunk)
    expect(player.audioChunks.length).toBe(1)
  })
})
