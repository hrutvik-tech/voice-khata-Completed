import React from 'react'
import { useAppStore } from '../store/appStore'
import { t } from '../i18n/translations'

export function MicOrb({ state = 'resting', onClick, audioActive = false, wakeMode = 'manual_fallback' }) {
  const language = useAppStore((s) => s.language)

  // 5 clear states with light theme styling & localized labels
  const stateConfig = {
    resting: {
      label: t('munshiReady', language),
      sublabel: wakeMode === 'porcupine' ? 'बोलिए: "Suno Munshi" या माइक दबाएँ' : t('tapToSpeak', language),
      bg: 'bg-gradient-to-tr from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 border-4 border-emerald-100 text-white shadow-xl shadow-emerald-500/20',
      badgeBg: 'bg-emerald-50 text-emerald-800 border-emerald-200',
      dotColor: 'bg-emerald-500',
    },
    listening: {
      label: t('recording', language),
      sublabel: t('tapToSpeak', language),
      bg: 'bg-emerald-500 border-4 border-emerald-200 text-white ring-8 ring-emerald-100 scale-105 shadow-2xl shadow-emerald-500/30',
      badgeBg: 'bg-emerald-600 text-white border-emerald-600 animate-pulse',
      dotColor: 'bg-white',
    },
    understanding: {
      label: t('processing', language),
      sublabel: t('processing', language),
      bg: 'bg-amber-500 border-4 border-amber-200 text-white ring-8 ring-amber-100 shadow-2xl shadow-amber-500/30',
      badgeBg: 'bg-amber-50 text-amber-800 border-amber-200',
      dotColor: 'bg-amber-500 animate-spin',
    },
    asking: {
      label: t('askingQuestion', language),
      sublabel: t('askingQuestion', language),
      bg: 'bg-indigo-600 border-4 border-indigo-200 text-white ring-8 ring-indigo-100 shadow-2xl shadow-indigo-500/30',
      badgeBg: 'bg-indigo-50 text-indigo-800 border-indigo-200',
      dotColor: 'bg-indigo-500',
    },
    speaking: {
      label: t('speakingAnswer', language),
      sublabel: t('speakingAnswer', language),
      bg: 'bg-teal-600 border-4 border-teal-200 text-white ring-8 ring-teal-100 shadow-2xl shadow-teal-500/30',
      badgeBg: 'bg-teal-50 text-teal-800 border-teal-200',
      dotColor: 'bg-teal-500',
    },
  }

  const current = stateConfig[state] || stateConfig.resting

  return (
    <div className="flex flex-col items-center justify-center my-2 select-none">
      <div className="relative flex items-center justify-center">
        {/* Gentle pulse animation when listening */}
        {state === 'listening' && (
          <div
            className="absolute w-36 h-36 rounded-full border-2 border-emerald-400 animate-ping opacity-35"
            aria-hidden="true"
          />
        )}

        {/* Main Microphone Button */}
        <button
          onClick={onClick}
          type="button"
          aria-label={`Microphone: ${current.label}`}
          className={`relative z-10 w-24 h-24 rounded-full flex items-center justify-center transition-all duration-200 transform active:scale-95 cursor-pointer ${current.bg}`}
        >
          {state === 'listening' || state === 'speaking' ? (
            <div className="flex items-center gap-1.5 h-8">
              <span className="w-1.5 bg-white rounded-full animate-bounce h-4" style={{ animationDelay: '0ms' }} />
              <span className="w-1.5 bg-white rounded-full animate-bounce h-7" style={{ animationDelay: '150ms' }} />
              <span className="w-1.5 bg-white rounded-full animate-bounce h-5" style={{ animationDelay: '300ms' }} />
              <span className="w-1.5 bg-white rounded-full animate-bounce h-6" style={{ animationDelay: '450ms' }} />
            </div>
          ) : (
            <svg
              className="w-10 h-10 text-white drop-shadow-sm"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2.2}
                d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
              />
            </svg>
          )}
        </button>
      </div>

      {/* State Text and Sublabel */}
      <div className="mt-3 text-center flex flex-col items-center">
        <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-bold transition-all shadow-xs ${current.badgeBg}`}>
          <span className={`w-2 h-2 rounded-full ${current.dotColor}`} />
          <span>{current.label}</span>
        </div>
        <p className="text-xs text-slate-500 mt-1 font-medium">{current.sublabel}</p>
      </div>
    </div>
  )
}
