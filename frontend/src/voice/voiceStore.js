import { create } from 'zustand'

export const useVoiceStore = create((set) => ({
  orbState: 'resting', // 'resting' | 'listening' | 'understanding' | 'asking' | 'speaking'
  lastHeard: null, // { text: string, language: string }
  lastResponse: null, // { kind: string, say: string, data: any }
  pendingQuestion: null, // { kind: string, say: string, options: Array<{id: string, label: string}>, turnId: string }
  audioActive: false,
  wakeMode: 'manual_fallback', // 'porcupine' | 'manual_fallback'
  wakeStatusMsg: 'Mic not activated',
  isAudioPlaying: false,

  setOrbState: (orbState) => set({ orbState }),
  setLastHeard: (lastHeard) => set({ lastHeard }),
  setLastResponse: (lastResponse) => set({ lastResponse }),
  setPendingQuestion: (pendingQuestion) => set({ pendingQuestion }),
  setAudioActive: (audioActive) => set({ audioActive }),
  setWakeMode: (wakeMode, wakeStatusMsg) => set({ wakeMode, wakeStatusMsg }),
  setIsAudioPlaying: (isAudioPlaying) => set({ isAudioPlaying }),

  resetTurn: () => set({
    orbState: 'resting',
    pendingQuestion: null,
  }),
}))
