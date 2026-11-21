import { useEffect, useRef, useCallback } from 'react'
import { useAppStore } from '../store/appStore'
import { useVoiceStore } from './voiceStore'
import { VoiceSocket } from './voiceSocket'
import { FrameTap } from './frameTap'
import { LocalVad } from './localVad'
import { WakeWordDetector } from './wakeWord'
import { AudioPlayer } from './player'
import { MockVoiceSession } from './mockVoice'
import { enqueueOfflineTurn, syncOfflineQueue } from './offlineQueue'
import { api } from '../api/rest'

export function useVoice() {
  const token = useAppStore((s) => s.token)
  const isOffline = useAppStore((s) => s.isOffline)
  const demoTime = useAppStore((s) => s.demoTime)
  const addCustomer = useAppStore((s) => s.addCustomer)
  const updateCustomerBalance = useAppStore((s) => s.updateCustomerBalance)
  const setSummary = useAppStore((s) => s.setSummary)

  const {
    orbState,
    lastHeard,
    lastResponse,
    pendingQuestion,
    audioActive,
    wakeMode,
    wakeStatusMsg,
    setOrbState,
    setLastHeard,
    setLastResponse,
    setPendingQuestion,
    setAudioActive,
    setWakeMode,
    setIsAudioPlaying,
  } = useVoiceStore()

  const audioContextRef = useRef(null)
  const mediaStreamRef = useRef(null)
  const sourceNodeRef = useRef(null)
  const processorNodeRef = useRef(null)

  const socketRef = useRef(null)
  const frameTapRef = useRef(null)
  const vadRef = useRef(null)
  const wakeDetectorRef = useRef(null)
  const playerRef = useRef(null)
  const mockSessionRef = useRef(null)

  const currentTurnIdRef = useRef(null)
  const isRecordingRef = useRef(false)
  const offlineChunksRef = useRef([])

  // Setup Player
  useEffect(() => {
    playerRef.current = new AudioPlayer({
      onPlaybackStarted: () => {
        setIsAudioPlaying(true)
        setOrbState('speaking')
      },
      onPlaybackEnded: () => {
        setIsAudioPlaying(false)
        // If question is pending, stay in 'asking'
        const q = useVoiceStore.getState().pendingQuestion
        setOrbState(q ? 'asking' : 'resting')
      },
    })

    return () => {
      playerRef.current?.stop()
    }
  }, [setOrbState, setIsAudioPlaying])

  // Process server events
  const handleServerEvent = useCallback((msg) => {
    switch (msg.type) {
      case 'state':
        setOrbState(msg.state)
        break

      case 'heard':
        setLastHeard({ text: msg.text, language: msg.language })
        setOrbState('understanding')
        break

      case 'entry':
        if (msg.entry) {
          updateCustomerBalance(msg.entry.customer_id, msg.balance_paise)
          if (msg.new_customer) {
            addCustomer({
              id: msg.entry.customer_id,
              name: msg.entry.customer_name,
              area: null,
              phone: null,
              balance_paise: msg.balance_paise,
              last_activity_at: msg.entry.recorded_at,
            })
          }
        }
        break

      case 'question':
        setPendingQuestion({
          kind: msg.kind,
          say: msg.say,
          options: msg.options || [],
          turnId: msg.turn_id,
        })
        setOrbState('asking')
        break

      case 'answer':
        setPendingQuestion(null)
        setLastResponse({
          kind: msg.kind,
          say: msg.say,
          data: msg.data,
        })
        if (msg.kind === 'day_summary' && msg.data) {
          setSummary(msg.data)
        }
        setOrbState('speaking')
        break

      case 'not_understood':
      case 'not_saved':
      case 'error':
        setLastResponse({
          kind: msg.type,
          say: msg.say || 'Error occurred',
          data: msg,
        })
        setOrbState('speaking')
        break

      default:
        break
    }
  }, [setOrbState, setLastHeard, setLastResponse, setPendingQuestion, updateCustomerBalance, addCustomer, setSummary])

  // WebSocket Connection
  useEffect(() => {
    if (!token) return

    const wsUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:8000'
    const socket = new VoiceSocket({
      url: wsUrl,
      token,
      onEvent: handleServerEvent,
      onAudioStart: () => playerRef.current?.startStream(),
      onAudioChunk: (chunk) => playerRef.current?.addChunk(chunk),
      onAudioEnd: () => playerRef.current?.finishStream(),
      onError: (e) => console.warn('WebSocket voice error:', e),
    })

    socket.connect()
    socketRef.current = socket

    return () => {
      socket.disconnect()
      socketRef.current = null
    }
  }, [token, handleServerEvent])

  // Start Turn Action
  const startTurn = useCallback(() => {
    if (isRecordingRef.current) return
    isRecordingRef.current = true

    const turnId = `turn-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
    currentTurnIdRef.current = turnId
    offlineChunksRef.current = []

    setOrbState('listening')
    vadRef.current?.start()

    if (!isOffline && socketRef.current?.isConnected) {
      socketRef.current.startTurn(turnId, demoTime)
    }
  }, [isOffline, demoTime, setOrbState])

  // Stop Turn Action
  const commitTurn = useCallback(() => {
    if (!isRecordingRef.current) return
    isRecordingRef.current = false
    const turnId = currentTurnIdRef.current

    vadRef.current?.stop()
    setOrbState('understanding')

    if (!isOffline && socketRef.current?.isConnected) {
      socketRef.current.commitTurn(turnId)
    } else {
      // Offline enqueue
      if (offlineChunksRef.current.length > 0) {
        const audioBlob = new Blob(offlineChunksRef.current, { type: 'audio/wav' })
        enqueueOfflineTurn(audioBlob, new Date().toISOString(), 'Offline audio')
      }
      setOrbState('resting')
    }
  }, [isOffline, setOrbState])

  // Cancel Turn Action
  const cancelTurn = useCallback(() => {
    if (!isRecordingRef.current) return
    isRecordingRef.current = false
    const turnId = currentTurnIdRef.current

    vadRef.current?.stop()
    setOrbState('resting')

    if (!isOffline && socketRef.current?.isConnected) {
      socketRef.current.cancelTurn(turnId)
    }
  }, [isOffline, setOrbState])

  // Setup Wake Detector and VAD
  useEffect(() => {
    vadRef.current = new LocalVad({
      onSpeechStart: () => {},
      onSpeechEnd: () => {
        commitTurn()
      },
      onTimeout: () => {
        cancelTurn()
      },
      onMaxDuration: () => {
        commitTurn()
      },
    })

    wakeDetectorRef.current = new WakeWordDetector({
      onWakeWord: () => {
        startTurn()
      },
      onStatusChange: ({ mode, message }) => {
        setWakeMode(mode, message)
      },
    })

    const porcupineKey = import.meta.env.VITE_PICOVOICE_ACCESS_KEY
    wakeDetectorRef.current.init(porcupineKey)

    return () => {
      vadRef.current?.stop()
      wakeDetectorRef.current?.stop()
    }
  }, [commitTurn, cancelTurn, startTurn, setWakeMode])

  // One-time Microphone & Audio Activation
  const activateAudio = useCallback(async () => {
    if (audioActive) return true

    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext
      const ctx = new AudioCtx({ sampleRate: 16000 })
      await ctx.resume()
      audioContextRef.current = ctx

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      })
      mediaStreamRef.current = stream

      const source = ctx.createMediaStreamSource(stream)
      sourceNodeRef.current = source

      frameTapRef.current = new FrameTap((frameBuffer) => {
        if (isRecordingRef.current) {
          if (!isOffline && socketRef.current?.isConnected) {
            socketRef.current.sendAudioFrame(frameBuffer)
          } else {
            offlineChunksRef.current.push(frameBuffer)
          }
        }
      })

      // ScriptProcessorNode for standard cross-browser support
      const processor = ctx.createScriptProcessor(2048, 1, 1)
      processorNodeRef.current = processor

      processor.onaudioprocess = (e) => {
        const inputData = e.inputBuffer.getChannelData(0)
        if (isRecordingRef.current) {
          vadRef.current?.processAudio(inputData)
          frameTapRef.current?.processFloat32(inputData, ctx.sampleRate)
        }
      }

      source.connect(processor)
      processor.connect(ctx.destination)

      setAudioActive(true)
      return true
    } catch (err) {
      console.warn('Microphone activation failed or rejected:', err)
      return false
    }
  }, [audioActive, isOffline, setAudioActive])

  // Choice Handler (for clarification questions)
  const handleChoice = useCallback((choice) => {
    const q = useVoiceStore.getState().pendingQuestion
    if (!q) return

    setOrbState('understanding')
    if (!isOffline && socketRef.current?.isConnected) {
      socketRef.current.sendChoice(q.turnId, choice)
    } else {
      // Offline mock choice
      api.debugChoose(q.turnId, null, choice).then((res) => {
        res.events?.forEach(handleServerEvent)
      })
    }
  }, [isOffline, setOrbState, handleServerEvent])

  // Trigger manual tap on mic orb
  const handleOrbClick = useCallback(() => {
    if (!audioActive) {
      activateAudio().then((ok) => {
        if (ok) startTurn()
      })
      return
    }

    if (orbState === 'listening') {
      commitTurn()
    } else if (orbState === 'resting' || orbState === 'asking') {
      startTurn()
    }
  }, [audioActive, orbState, activateAudio, startTurn, commitTurn])

  // Replay last spoken response
  const replayAudio = useCallback(() => {
    playerRef.current?.replay()
  }, [])

  // Sync offline items when coming back online
  useEffect(() => {
    if (!isOffline && token) {
      syncOfflineQueue(api, (id, success) => {
        if (success) {
          api.getTodaySummary().then(setSummary).catch(console.warn)
        }
      })
    }
  }, [isOffline, token, setSummary])

  return {
    orbState,
    lastHeard,
    lastResponse,
    pendingQuestion,
    audioActive,
    wakeMode,
    wakeStatusMsg,
    activateAudio,
    startTurn,
    commitTurn,
    cancelTurn,
    handleChoice,
    handleOrbClick,
    replayAudio,
  }
}
