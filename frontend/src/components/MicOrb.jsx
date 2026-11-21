import React from 'react'

export function MicOrb({ state = 'resting', onClick, audioActive = false, wakeMode = 'manual_fallback' }) {
  // 5 clear states: resting, listening, understanding, asking, speaking
  const stateConfig = {
    resting: {
      label: 'मुंशी तैयार है',
      sublabel: wakeMode === 'porcupine' ? 'बोलिए: "Suno Munshi" या माइक दबाएँ' : 'दबाकर बोलें (Tap mic to speak)',
      bg: 'bg-emerald-600 hover:bg-emerald-500 border-emerald-400/40 text-white shadow-lg shadow-emerald-900/30',
      iconColor: 'text-white',
      badgeBg: 'bg-emerald-950/60 text-emerald-300 border-emerald-800/80',
      dotColor: 'bg-emerald-400',
    },
    listening: {
      label: 'सुन रहा हूँ... बोलिए',
      sublabel: 'अपनी बात बोलें (Recording...)',
      bg: 'bg-emerald-500 border-white text-white ring-4 ring-emerald-400/30 scale-105',
      iconColor: 'text-white',
      badgeBg: 'bg-emerald-500 text-white border-emerald-400 animate-pulse',
      dotColor: 'bg-white',
    },
    understanding: {
      label: 'समझ रहा हूँ...',
      sublabel: 'खाता अपडेट हो रहा है (Saving...)',
      bg: 'bg-amber-600 border-amber-300 text-white ring-4 ring-amber-400/30',
      iconColor: 'text-white',
      badgeBg: 'bg-amber-500 text-white border-amber-400',
      dotColor: 'bg-white animate-spin',
    },
    asking: {
      label: 'सवाल पूछ रहा हूँ',
      sublabel: 'उत्तर बोलें या विकल्प चुनें',
      bg: 'bg-indigo-600 border-indigo-300 text-white ring-4 ring-indigo-400/30',
      iconColor: 'text-white',
      badgeBg: 'bg-indigo-500 text-white border-indigo-400',
      dotColor: 'bg-white',
    },
    speaking: {
      label: 'जवाब सुनिए...',
      sublabel: 'मुंशी बोल रहा है (Playing audio)',
      bg: 'bg-teal-600 border-teal-300 text-white ring-4 ring-teal-400/30',
      iconColor: 'text-white',
      badgeBg: 'bg-teal-500 text-white border-teal-400',
      dotColor: 'bg-white',
    },
  }

  const current = stateConfig[state] || stateConfig.resting

  return (
    <div className="flex flex-col items-center justify-center my-3 select-none">
      <div className="relative flex items-center justify-center">
        {/* Simple gentle pulse ring when listening */}
        {state === 'listening' && (
          <div
            className="absolute w-32 h-32 rounded-full border-2 border-emerald-400 animate-ping opacity-40"
            aria-hidden="true"
          />
        )}

        {/* Main Microphone Button */}
        <button
          onClick={onClick}
          type="button"
          aria-label={`Microphone: ${current.label}`}
          className={`relative z-10 w-24 h-24 rounded-full border-2 flex items-center justify-center transition-all duration-200 transform active:scale-95 cursor-pointer ${current.bg}`}
        >
          {state === 'listening' || state === 'speaking' ? (
            <div className="flex items-center gap-1 h-8">
              <span className="w-1.5 bg-white rounded-full animate-bounce h-4" style={{ animationDelay: '0ms' }} />
              <span className="w-1.5 bg-white rounded-full animate-bounce h-7" style={{ animationDelay: '150ms' }} />
              <span className="w-1.5 bg-white rounded-full animate-bounce h-5" style={{ animationDelay: '300ms' }} />
              <span className="w-1.5 bg-white rounded-full animate-bounce h-6" style={{ animationDelay: '450ms' }} />
            </div>
          ) : (
            <svg
              className="w-10 h-10 text-white"
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
      <div className="mt-3.5 text-center flex flex-col items-center">
        <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-bold transition-all shadow-sm ${current.badgeBg}`}>
          <span className={`w-2 h-2 rounded-full ${current.dotColor}`} />
          <span>{current.label}</span>
        </div>
        <p className="text-xs text-slate-400 mt-1 font-medium">{current.sublabel}</p>
      </div>
    </div>
  )
}
