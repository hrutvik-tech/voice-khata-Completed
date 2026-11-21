import { useEffect, useRef, useCallback, useState } from 'react'
import { useAppStore } from '../store/appStore'
import { useVoiceStore } from './voiceStore'
import { VoiceSocket } from './voiceSocket'
import { FrameTap } from './frameTap'
import { LocalVad } from './localVad'
import { WakeWordDetector } from './wakeWord'
import { AudioPlayer } from './player'
import { enqueueOfflineTurn, syncOfflineQueue } from './offlineQueue'
import { api } from '../api/rest'

export function useVoice() {
  const token = useAppStore((s) => s.token)
  const shop = useAppStore((s) => s.shop)
  const isOffline = useAppStore((s) => s.isOffline)
  const demoTime = useAppStore((s) => s.demoTime)
  const addCustomer = useAppStore((s) => s.addCustomer)
  const updateCustomerBalance = useAppStore((s) => s.updateCustomerBalance)
  const addRecentEntry = useAppStore((s) => s.addRecentEntry)
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

  const [micError, setMicError] = useState(null)

  const audioContextRef = useRef(null)
  const mediaStreamRef = useRef(null)
  const sourceNodeRef = useRef(null)
  const processorNodeRef = useRef(null)

  const socketRef = useRef(null)
  const frameTapRef = useRef(null)
  const vadRef = useRef(null)
  const wakeDetectorRef = useRef(null)
  const playerRef = useRef(null)
  const recognitionRef = useRef(null)

  const currentTurnIdRef = useRef(null)
  const isRecordingRef = useRef(false)
  const offlineChunksRef = useRef([])
  const latestSpokenTextRef = useRef('')
  const turnCompletedRef = useRef(false)
  const lastProcessedTurnTimeRef = useRef(0)

  // Setup Player
  useEffect(() => {
    playerRef.current = new AudioPlayer({
      onPlaybackStarted: () => {
        setIsAudioPlaying(true)
        setOrbState('speaking')
      },
      onPlaybackEnded: () => {
        setIsAudioPlaying(false)
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
        setLastHeard({ text: msg.text, language: msg.language || 'hi' })
        setOrbState('understanding')
        break

      case 'entry':
        lastProcessedTurnTimeRef.current = Date.now()
        if (msg.entry) {
          addRecentEntry(msg.entry)
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
          api.getTodaySummary().then(setSummary).catch(console.warn)
        }
        break

      case 'question':
        lastProcessedTurnTimeRef.current = Date.now()
        setPendingQuestion({
          kind: msg.kind,
          say: msg.say,
          options: msg.options || [],
          turnId: msg.turn_id,
        })
        setOrbState('asking')
        if ('speechSynthesis' in window && msg.say) {
          try {
            window.speechSynthesis.cancel()
            const utter = new SpeechSynthesisUtterance(msg.say)
            utter.lang = shop?.language_mode === 'kn' ? 'kn-IN' : (shop?.language_mode === 'en' ? 'en-IN' : 'hi-IN')
            window.speechSynthesis.speak(utter)
          } catch {}
        }
        break

      case 'answer':
        lastProcessedTurnTimeRef.current = Date.now()
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
        if ('speechSynthesis' in window && msg.say) {
          try {
            window.speechSynthesis.cancel()
            const utter = new SpeechSynthesisUtterance(msg.say)
            utter.lang = shop?.language_mode === 'kn' ? 'kn-IN' : (shop?.language_mode === 'en' ? 'en-IN' : 'hi-IN')
            utter.onend = () => {
              setOrbState('resting')
            }
            window.speechSynthesis.speak(utter)
          } catch {}
        }
        break

      case 'not_understood':
      case 'not_saved':
      case 'error':
        // If an entry or answer was recently processed in this turn, ignore dangling STT error
        if (Date.now() - lastProcessedTurnTimeRef.current < 2500) {
          return
        }
        setLastResponse({
          kind: msg.type,
          say: msg.say || 'समझ नहीं आया, दोबारा बोलिए।',
          data: msg,
        })
        setOrbState('speaking')
        if ('speechSynthesis' in window && (msg.say || 'समझ नहीं आया')) {
          try {
            window.speechSynthesis.cancel()
            const utter = new SpeechSynthesisUtterance(msg.say || 'समझ नहीं आया')
            utter.lang = 'hi-IN'
            utter.onend = () => setOrbState('resting')
            window.speechSynthesis.speak(utter)
          } catch {}
        }
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

  // Direct Speech / Text Execution (runs full orchestrator on backend)
  const sendVoiceText = useCallback(async (phrase) => {
    if (!phrase || !phrase.trim()) return

    setOrbState('understanding')
    setLastHeard({ text: phrase, language: shop?.language_mode || 'hi' })

    try {
      const res = await api.debugTurn(phrase, demoTime, null)
      if (res && res.events) {
        res.events.forEach(handleServerEvent)
      }
    } catch (err) {
      console.warn('Voice turn error:', err)
      setLastResponse({
        kind: 'error',
        say: 'त्रुटि हुई, कृपया दोबारा बोलिए।',
        data: err,
      })
      setOrbState('speaking')
    }
  }, [demoTime, shop, handleServerEvent, setOrbState, setLastHeard, setLastResponse])

  // Start Turn Action
  const startTurn = useCallback(() => {
    if (isRecordingRef.current) return
    isRecordingRef.current = true

    const turnId = `turn-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
    currentTurnIdRef.current = turnId
    offlineChunksRef.current = []
    latestSpokenTextRef.current = ''
    turnCompletedRef.current = false

    setOrbState('listening')
    vadRef.current?.start()

    // Start Web Speech Recognition if available in the browser
    const SpeechRec = typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition)
    if (SpeechRec) {
      try {
        if (recognitionRef.current) {
          try { recognitionRef.current.abort() } catch {}
        }
        const rec = new SpeechRec()
        rec.continuous = false
        rec.interimResults = true
        rec.lang = shop?.language_mode === 'kn' ? 'kn-IN' : (shop?.language_mode === 'en' ? 'en-IN' : 'hi-IN')

        rec.onresult = (e) => {
          let interimText = ''
          let finalText = ''
          for (let i = 0; i < e.results.length; i++) {
            if (e.results[i].isFinal) {
              finalText += e.results[i][0].transcript
            } else {
              interimText += e.results[i][0].transcript
            }
          }
          const spoken = (finalText || interimText).trim()
          if (spoken) {
            latestSpokenTextRef.current = spoken
            setLastHeard({ text: spoken, language: shop?.language_mode || 'hi' })
          }
          if (finalText.trim()) {
            turnCompletedRef.current = true
            isRecordingRef.current = false
            vadRef.current?.stop()
            try { rec.stop() } catch {}
            // Cancel websocket turn so backend doesn't race with a failing/stub turn
            if (!isOffline && socketRef.current?.isConnected) {
              socketRef.current.cancelTurn(turnId)
            }
            sendVoiceText(finalText.trim())
          }
        }

        rec.onerror = (err) => {
          console.warn('Browser SpeechRecognition notice:', err)
        }

        rec.onend = () => {
          recognitionRef.current = null
          // If recognition ended before finalText was fired, but we heard spoken text:
          if (!turnCompletedRef.current && latestSpokenTextRef.current && isRecordingRef.current) {
            turnCompletedRef.current = true
            isRecordingRef.current = false
            vadRef.current?.stop()
            if (!isOffline && socketRef.current?.isConnected) {
              socketRef.current.cancelTurn(turnId)
            }
            sendVoiceText(latestSpokenTextRef.current)
          }
        }

        rec.start()
        recognitionRef.current = rec
      } catch (recErr) {
        console.warn('SpeechRecognition init notice:', recErr)
      }
    }

    if (!isOffline && socketRef.current?.isConnected) {
      socketRef.current.startTurn(turnId, demoTime)
    }
  }, [isOffline, demoTime, shop, setOrbState, setLastHeard, sendVoiceText])

  // Stop Turn Action
  const commitTurn = useCallback(() => {
    if (!isRecordingRef.current) return
    isRecordingRef.current = false
    const turnId = currentTurnIdRef.current

    if (recognitionRef.current) {
      try { recognitionRef.current.stop() } catch {}
    }

    vadRef.current?.stop()
    setOrbState('understanding')

    // If browser speech recognition captured speech, process that directly!
    if (!turnCompletedRef.current && latestSpokenTextRef.current) {
      turnCompletedRef.current = true
      if (!isOffline && socketRef.current?.isConnected) {
        socketRef.current.cancelTurn(turnId)
      }
      sendVoiceText(latestSpokenTextRef.current)
      return
    }

    if (!isOffline && socketRef.current?.isConnected) {
      socketRef.current.commitTurn(turnId)
    } else {
      if (offlineChunksRef.current.length > 0) {
        const audioBlob = new Blob(offlineChunksRef.current, { type: 'audio/wav' })
        enqueueOfflineTurn(audioBlob, new Date().toISOString(), 'Offline audio')
      }
      setOrbState('resting')
    }
  }, [isOffline, setOrbState, sendVoiceText])

  // Cancel Turn Action
  const cancelTurn = useCallback(() => {
    if (!isRecordingRef.current) return
    isRecordingRef.current = false
    turnCompletedRef.current = true
    latestSpokenTextRef.current = ''
    const turnId = currentTurnIdRef.current

    if (recognitionRef.current) {
      try { recognitionRef.current.abort() } catch {}
    }

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

  // Robust Microphone & Audio Activation
  const activateAudio = useCallback(async () => {
    setMicError(null)

    try {
      // 1. Initialize AudioContext without rigid sample rate constraints
      const AudioCtx = window.AudioContext || window.webkitAudioContext
      if (AudioCtx) {
        try {
          const ctx = new AudioCtx()
          await ctx.resume()
          audioContextRef.current = ctx
        } catch (ctxErr) {
          console.warn('AudioContext creation fallback:', ctxErr)
        }
      }

      // 2. Request microphone stream with graceful fallbacks
      let stream = null
      if (navigator?.mediaDevices?.getUserMedia) {
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true,
            },
          })
        } catch (err1) {
          try {
            stream = await navigator.mediaDevices.getUserMedia({ audio: true })
          } catch (err2) {
            console.warn('Microphone permission not granted or device unavailable:', err2)
            setMicError('माइक अनुमति नहीं मिली। आप टैप करके बोल सकते हैं।')
          }
        }
      } else {
        console.warn('navigator.mediaDevices is not supported in this browser context.')
      }

      // 3. Connect audio pipeline if stream is available
      if (stream && audioContextRef.current) {
        const ctx = audioContextRef.current
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
      }

      // Mark audio active so the button dismisses and the orb is ready
      setAudioActive(true)
      return true
    } catch (err) {
      console.warn('General audio activation warning:', err)
      setAudioActive(true)
      return true
    }
  }, [setAudioActive, isOffline])

  // Choice Handler (for clarification questions)
  const handleChoice = useCallback((choice) => {
    const q = useVoiceStore.getState().pendingQuestion
    if (!q) return

    setOrbState('understanding')
    if (!isOffline && socketRef.current?.isConnected) {
      socketRef.current.sendChoice(q.turnId, choice)
    } else {
      api.debugChoose(q.turnId, null, choice).then((res) => {
        res.events?.forEach(handleServerEvent)
      })
    }
  }, [isOffline, setOrbState, handleServerEvent])

  // Trigger manual tap on mic orb
  const handleOrbClick = useCallback(() => {
    if (!audioActive) {
      activateAudio().then(() => {
        startTurn()
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
    micError,
    activateAudio,
    startTurn,
    commitTurn,
    cancelTurn,
    sendVoiceText,
    handleChoice,
    handleOrbClick,
    replayAudio,
  }
}
