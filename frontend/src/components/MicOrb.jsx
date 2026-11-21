import React from 'react'

export function MicOrb({ state = 'resting', onClick, audioActive = false, wakeMode = 'manual_fallback' }) {
  // 5 states: resting, listening, understanding, asking, speaking
  const stateConfig = {
    resting: {
      label: 'मुंशी तैयार है',
      sublabel: wakeMode === 'porcupine' ? 'बोलिए: "Suno Munshi"' : 'बोलने के लिए माइक दबाएँ',
      bg: 'bg-slate-800 border-slate-600',
      glow: 'shadow-[0_0_20px_rgba(100,116,139,0.3)]',
      iconColor: 'text-slate-300',
      ringAnimation: '',
    },
    listening: {
      label: 'सुन रहा हूँ...',
      sublabel: 'अपनी बात बोलिए',
      bg: 'bg-emerald-600 border-emerald-400',
      glow: 'shadow-[0_0_35px_rgba(16,185,129,0.6)]',
      iconColor: 'text-white',
      ringAnimation: 'animate-ping duration-1000',
    },
    understanding: {
      label: 'समझ रहा हूँ...',
      sublabel: 'हिसाब जोड़ा जा रहा है',
      bg: 'bg-amber-600 border-amber-400',
      glow: 'shadow-[0_0_35px_rgba(245,158,11,0.6)]',
      iconColor: 'text-white',
      ringAnimation: 'animate-pulse duration-700',
    },
    asking: {
      label: 'सवाल पूछ रहा हूँ',
      sublabel: 'जवाब बोलें या बटन दबाएँ',
      bg: 'bg-indigo-600 border-indigo-400',
      glow: 'shadow-[0_0_35px_rgba(99,102,241,0.6)]',
      iconColor: 'text-white',
      ringAnimation: 'animate-bounce duration-1000',
    },
    speaking: {
      label: 'बोल रहा हूँ...',
      sublabel: 'जवाब सुनिए',
      bg: 'bg-cyan-600 border-cyan-400',
      glow: 'shadow-[0_0_35px_rgba(6,182,212,0.6)]',
      iconColor: 'text-white',
      ringAnimation: 'animate-pulse duration-500',
    },
  }

  const current = stateConfig[state] || stateConfig.resting

  return (
    <div className="flex flex-col items-center justify-center my-6">
      <div className="relative flex items-center justify-center">
        {/* Animated outer ring for active states */}
        {state !== 'resting' && (
          <div
            className={`absolute w-36 h-36 rounded-full opacity-40 ${current.bg} ${current.ringAnimation}`}
            aria-hidden="true"
          />
        )}

        {/* Main Microphone Orb Button */}
        <button
          onClick={onClick}
          type="button"
          aria-label={`Microphone Orb: ${current.label}`}
          className={`relative z-10 w-28 h-28 rounded-full border-4 flex items-center justify-center transition-all duration-300 transform active:scale-95 cursor-pointer ${current.bg} ${current.glow}`}
        >
          <svg
            className={`w-12 h-12 ${current.iconColor}`}
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
        </button>
      </div>

      {/* State Text and Instruction */}
      <div className="mt-4 text-center">
        <p className="text-lg font-semibold text-slate-100">{current.label}</p>
        <p className="text-sm text-slate-400 mt-0.5">{current.sublabel}</p>
      </div>
    </div>
  )
}
