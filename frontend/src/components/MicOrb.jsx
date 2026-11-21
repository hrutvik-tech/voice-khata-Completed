import React from 'react'

export function MicOrb({ state = 'resting', onClick, audioActive = false, wakeMode = 'manual_fallback' }) {
  // 5 states: resting, listening, understanding, asking, speaking
  const stateConfig = {
    resting: {
      label: 'मुंशी तैयार है (Munshi Ready)',
      sublabel: wakeMode === 'porcupine' ? 'बोलिए: "Suno Munshi"' : 'बोलने के लिए माइक दबाएँ (Tap to speak)',
      bg: 'bg-gradient-to-tr from-slate-900 via-slate-800 to-emerald-950/70 border-emerald-500/30',
      glow: 'shadow-[0_0_35px_rgba(16,185,129,0.25)]',
      iconColor: 'text-emerald-400',
      pulseColor: 'bg-emerald-500/20',
      badgeBg: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20',
      dotColor: 'bg-emerald-400',
    },
    listening: {
      label: 'सुन रहा हूँ... (Listening)',
      sublabel: 'अपनी बात बोलिए (Speak your transaction)',
      bg: 'bg-gradient-to-tr from-emerald-700 via-emerald-600 to-teal-500 border-emerald-300',
      glow: 'shadow-[0_0_50px_rgba(16,185,129,0.7)]',
      iconColor: 'text-white',
      pulseColor: 'bg-emerald-400/40',
      badgeBg: 'bg-emerald-500 text-white border-emerald-400 animate-pulse',
      dotColor: 'bg-white animate-ping',
    },
    understanding: {
      label: 'समझ रहा हूँ... (Understanding)',
      sublabel: 'हिसाब जोड़ा जा रहा है (Processing ledger)',
      bg: 'bg-gradient-to-tr from-amber-700 via-amber-600 to-yellow-500 border-amber-300',
      glow: 'shadow-[0_0_50px_rgba(245,158,11,0.7)]',
      iconColor: 'text-white',
      pulseColor: 'bg-amber-400/40',
      badgeBg: 'bg-amber-500 text-white border-amber-400',
      dotColor: 'bg-white animate-spin',
    },
    asking: {
      label: 'सवाल पूछ रहा हूँ (Clarification)',
      sublabel: 'जवाब बोलें या बटन दबाएँ (Answer or tap)',
      bg: 'bg-gradient-to-tr from-indigo-700 via-indigo-600 to-purple-500 border-indigo-300',
      glow: 'shadow-[0_0_50px_rgba(99,102,241,0.7)]',
      iconColor: 'text-white',
      pulseColor: 'bg-indigo-400/40',
      badgeBg: 'bg-indigo-500 text-white border-indigo-400',
      dotColor: 'bg-white animate-bounce',
    },
    speaking: {
      label: 'बोल रहा हूँ... (Speaking)',
      sublabel: 'उत्तर सुनिए (Playing reply)',
      bg: 'bg-gradient-to-tr from-cyan-700 via-cyan-600 to-blue-500 border-cyan-300',
      glow: 'shadow-[0_0_50px_rgba(6,182,212,0.7)]',
      iconColor: 'text-white',
      pulseColor: 'bg-cyan-400/40',
      badgeBg: 'bg-cyan-500 text-white border-cyan-400',
      dotColor: 'bg-white animate-ping',
    },
  }

  const current = stateConfig[state] || stateConfig.resting

  return (
    <div className="flex flex-col items-center justify-center my-4 select-none">
      <div className="relative flex items-center justify-center">
        {/* Animated outer sound ripples */}
        {state !== 'resting' && (
          <>
            <div
              className={`absolute w-44 h-44 rounded-full opacity-30 ${current.pulseColor} animate-ping duration-1000`}
              aria-hidden="true"
            />
            <div
              className={`absolute w-36 h-36 rounded-full opacity-40 ${current.pulseColor} animate-pulse duration-700`}
              aria-hidden="true"
            />
          </>
        )}

        {/* Ambient subtle glow ring in resting */}
        {state === 'resting' && (
          <div
            className="absolute w-36 h-36 rounded-full opacity-20 bg-emerald-500/30 animate-pulse duration-2000"
            aria-hidden="true"
          />
        )}

        {/* Main Microphone Orb Button */}
        <button
          onClick={onClick}
          type="button"
          aria-label={`Microphone: ${current.label}`}
          className={`relative z-10 w-28 h-28 rounded-full border-4 flex flex-col items-center justify-center transition-all duration-300 transform active:scale-90 hover:scale-105 cursor-pointer shadow-2xl ${current.bg} ${current.glow}`}
        >
          {/* Animated sound wave bars for speaking & listening */}
          {(state === 'listening' || state === 'speaking') ? (
            <div className="flex items-center gap-1.5 h-10">
              <span className="w-1.5 bg-white rounded-full animate-bounce h-5" style={{ animationDelay: '0ms' }} />
              <span className="w-1.5 bg-white rounded-full animate-bounce h-8" style={{ animationDelay: '150ms' }} />
              <span className="w-1.5 bg-white rounded-full animate-bounce h-10" style={{ animationDelay: '300ms' }} />
              <span className="w-1.5 bg-white rounded-full animate-bounce h-7" style={{ animationDelay: '450ms' }} />
              <span className="w-1.5 bg-white rounded-full animate-bounce h-4" style={{ animationDelay: '600ms' }} />
            </div>
          ) : (
            <svg
              className={`w-12 h-12 transition-transform duration-200 ${current.iconColor}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
              />
            </svg>
          )}
        </button>
      </div>

      {/* State Text and Sublabel */}
      <div className="mt-5 text-center flex flex-col items-center">
        <div className={`inline-flex items-center gap-2 px-3.5 py-1 rounded-full border text-xs font-bold transition-all shadow-sm ${current.badgeBg}`}>
          <span className={`w-2 h-2 rounded-full ${current.dotColor}`} />
          <span>{current.label}</span>
        </div>
        <p className="text-xs text-slate-400 mt-1.5 font-medium">{current.sublabel}</p>
      </div>
    </div>
  )
}
