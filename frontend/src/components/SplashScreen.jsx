import React from 'react'

export function SplashScreen() {
  return (
    <div className="fixed inset-0 z-50 bg-[#f8fbf9] text-[#1a1a2e] font-['Poppins',sans-serif] flex items-center justify-center overflow-hidden select-none">
      <style>{`
        @keyframes pulse-dot {
          0%, 100% {
            transform: scale(1);
            box-shadow: 0 0 0 0 rgba(13, 159, 79, 0.6);
          }
          50% {
            transform: scale(1.35);
            box-shadow: 0 0 0 5px rgba(13, 159, 79, 0);
          }
        }

        @keyframes ring-pulse {
          0% {
            transform: scale(0.95);
            opacity: 0.8;
          }
          100% {
            transform: scale(1.75);
            opacity: 0;
          }
        }

        @keyframes mic-pulse {
          0%, 100% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.06);
          }
        }

        @keyframes wave-oscillate {
          0% {
            height: 8px;
          }
          100% {
            height: var(--target-h);
          }
        }

        @keyframes shimmer-slide {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(300%);
          }
        }
      `}</style>

      {/* Top-Left Corner Decoration */}
      <svg
        className="absolute top-0 left-0 w-44 h-44 sm:w-56 sm:h-56 pointer-events-none z-1"
        viewBox="0 0 240 240"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <polygon points="0,0 230,0 0,230" fill="#e8f5e9" opacity="0.8" />
        <polygon points="0,0 170,0 0,170" fill="#c8e6c9" opacity="0.6" />
        <polygon points="0,0 115,0 0,115" fill="#12B85E" opacity="0.85" />
        <polygon points="0,0 70,0 0,70" fill="#0D9F4F" />

        <line x1="25" y1="25" x2="60" y2="35" stroke="#27C76D" strokeWidth="1.2" opacity="0.75" />
        <line x1="60" y1="35" x2="110" y2="25" stroke="#27C76D" strokeWidth="1" opacity="0.6" />
        <line x1="60" y1="35" x2="75" y2="75" stroke="#27C76D" strokeWidth="1.2" opacity="0.75" />
        <line x1="25" y1="25" x2="35" y2="70" stroke="#27C76D" strokeWidth="1" opacity="0.6" />
        <line x1="35" y1="70" x2="75" y2="75" stroke="#27C76D" strokeWidth="1.2" opacity="0.75" />
        <line x1="75" y1="75" x2="140" y2="45" stroke="#27C76D" strokeWidth="1" opacity="0.5" />
        <line x1="75" y1="75" x2="45" y2="125" stroke="#27C76D" strokeWidth="1" opacity="0.6" />
        <line x1="35" y1="70" x2="25" y2="115" stroke="#27C76D" strokeWidth="1" opacity="0.6" />

        <circle cx="25" cy="25" r="3.5" fill="#ffffff" stroke="#0D9F4F" strokeWidth="1.5" />
        <circle cx="60" cy="35" r="3" fill="#ffffff" stroke="#12B85E" strokeWidth="1.5" />
        <circle cx="110" cy="25" r="2.5" fill="#27C76D" />
        <circle cx="35" cy="70" r="3" fill="#ffffff" stroke="#0D9F4F" strokeWidth="1.5" />
        <circle cx="75" cy="75" r="3.5" fill="#ffffff" stroke="#0D9F4F" strokeWidth="1.5" />
        <circle cx="140" cy="45" r="2.5" fill="#27C76D" />
        <circle cx="25" cy="115" r="2.5" fill="#27C76D" />
        <circle cx="45" cy="125" r="3" fill="#ffffff" stroke="#12B85E" strokeWidth="1.5" />
      </svg>

      {/* Bottom-Right Corner Decoration (Mirrored) */}
      <svg
        className="absolute bottom-0 right-0 w-44 h-44 sm:w-56 sm:h-56 pointer-events-none z-1 rotate-180"
        viewBox="0 0 240 240"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <polygon points="0,0 230,0 0,230" fill="#e8f5e9" opacity="0.8" />
        <polygon points="0,0 170,0 0,170" fill="#c8e6c9" opacity="0.6" />
        <polygon points="0,0 115,0 0,115" fill="#12B85E" opacity="0.85" />
        <polygon points="0,0 70,0 0,70" fill="#0D9F4F" />

        <line x1="25" y1="25" x2="60" y2="35" stroke="#27C76D" strokeWidth="1.2" opacity="0.75" />
        <line x1="60" y1="35" x2="110" y2="25" stroke="#27C76D" strokeWidth="1" opacity="0.6" />
        <line x1="60" y1="35" x2="75" y2="75" stroke="#27C76D" strokeWidth="1.2" opacity="0.75" />
        <line x1="25" y1="25" x2="35" y2="70" stroke="#27C76D" strokeWidth="1" opacity="0.6" />
        <line x1="35" y1="70" x2="75" y2="75" stroke="#27C76D" strokeWidth="1.2" opacity="0.75" />
        <line x1="75" y1="75" x2="140" y2="45" stroke="#27C76D" strokeWidth="1" opacity="0.5" />
        <line x1="75" y1="75" x2="45" y2="125" stroke="#27C76D" strokeWidth="1" opacity="0.6" />
        <line x1="35" y1="70" x2="25" y2="115" stroke="#27C76D" strokeWidth="1" opacity="0.6" />

        <circle cx="25" cy="25" r="3.5" fill="#ffffff" stroke="#0D9F4F" strokeWidth="1.5" />
        <circle cx="60" cy="35" r="3" fill="#ffffff" stroke="#12B85E" strokeWidth="1.5" />
        <circle cx="110" cy="25" r="2.5" fill="#27C76D" />
        <circle cx="35" cy="70" r="3" fill="#ffffff" stroke="#0D9F4F" strokeWidth="1.5" />
        <circle cx="75" cy="75" r="3.5" fill="#ffffff" stroke="#0D9F4F" strokeWidth="1.5" />
        <circle cx="140" cy="45" r="2.5" fill="#27C76D" />
        <circle cx="25" cy="115" r="2.5" fill="#27C76D" />
        <circle cx="45" cy="125" r="3" fill="#ffffff" stroke="#12B85E" strokeWidth="1.5" />
      </svg>

      {/* Center Content */}
      <main className="relative z-10 flex flex-col items-center text-center px-5 py-6 w-full max-w-sm sm:max-w-md animate-fade-in">
        {/* 1. Pill Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[rgba(13,159,79,0.08)] border border-[rgba(13,159,79,0.35)] text-[#0D9F4F] text-[11px] font-bold tracking-[2.5px] uppercase mb-6 shadow-xs">
          <span
            className="w-[7px] h-[7px] rounded-full bg-[#0D9F4F]"
            style={{ animation: 'pulse-dot 1.5s ease-in-out infinite' }}
          ></span>
          <span>VOICE AI KHATA</span>
        </div>

        {/* 2. Large Mic Icon with Pulsing Rings */}
        <div className="relative w-[88px] h-[88px] flex items-center justify-center mb-5">
          <div
            className="absolute w-[88px] h-[88px] rounded-full border-2 border-[#0D9F4F] pointer-events-none"
            style={{ animation: 'ring-pulse 2.2s cubic-bezier(0.215, 0.61, 0.355, 1) infinite' }}
          ></div>
          <div
            className="absolute w-[88px] h-[88px] rounded-full border-2 border-[#0D9F4F] pointer-events-none"
            style={{ animation: 'ring-pulse 2.2s cubic-bezier(0.215, 0.61, 0.355, 1) infinite', animationDelay: '1.1s' }}
          ></div>

          <div
            className="w-[84px] h-[84px] rounded-full bg-white border-[3px] border-[#0D9F4F] flex items-center justify-center shadow-[0_10px_30px_rgba(13,159,79,0.2)] z-10"
            style={{ animation: 'mic-pulse 2s ease-in-out infinite' }}
          >
            <svg className="w-9 h-9 fill-[#0D9F4F]" viewBox="0 0 24 24">
              <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
              <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
            </svg>
          </div>
        </div>

        {/* 3. Hindi Title */}
        <h1
          className="text-4xl sm:text-[44px] font-black text-[#1a1a2e] leading-tight mb-1 tracking-tight"
          style={{ fontFamily: "'Noto Sans Devanagari', sans-serif" }}
        >
          बोलता खाता
        </h1>

        {/* 4. English Title */}
        <h2 className="text-lg sm:text-[20px] font-black text-[#0D9F4F] tracking-[8px] uppercase mb-2">
          BOLTA KHATA
        </h2>

        {/* 5. Tagline */}
        <p className="text-[13px] font-bold text-[#666666] mb-5">
          Your Voice. Your Khata. Your Business.
        </p>

        {/* 6. 13-Bar Animated Waveform */}
        <div className="flex items-center justify-center gap-1.5 h-14 mb-5">
          {[
            { h: '22px', dur: '0.85s', del: '0.1s' },
            { h: '36px', dur: '0.72s', del: '0.25s' },
            { h: '48px', dur: '0.95s', del: '0.05s' },
            { h: '32px', dur: '0.68s', del: '0.3s' },
            { h: '54px', dur: '1.05s', del: '0.15s' },
            { h: '42px', dur: '0.78s', del: '0.4s' },
            { h: '55px', dur: '0.88s', del: '0.0s' },
            { h: '38px', dur: '0.92s', del: '0.35s' },
            { h: '50px', dur: '0.75s', del: '0.2s' },
            { h: '30px', dur: '1.02s', del: '0.45s' },
            { h: '45px', dur: '0.82s', del: '0.12s' },
            { h: '34px', dur: '0.70s', del: '0.28s' },
            { h: '20px', dur: '0.90s', del: '0.18s' },
          ].map((bar, idx) => (
            <div
              key={idx}
              className="w-1 rounded-full bg-gradient-to-b from-[#27C76D] to-[#0D9F4F]"
              style={{
                '--target-h': bar.h,
                animation: `wave-oscillate ${bar.dur} ease-in-out infinite alternate`,
                animationDelay: bar.del,
              }}
            ></div>
          ))}
        </div>

        {/* 7. Language Pills */}
        <div className="flex items-center justify-center gap-2 mb-5">
          <span className="text-[11px] font-bold px-3.5 py-1 rounded-full bg-[#0D9F4F] text-white border border-[#0D9F4F] shadow-xs">
            HINDI
          </span>
          <span className="text-[11px] font-bold px-3.5 py-1 rounded-full bg-white text-[#0D9F4F] border border-[#0D9F4F]">
            ENGLISH
          </span>
          <span className="text-[11px] font-bold px-3.5 py-1 rounded-full bg-white text-[#0D9F4F] border border-[#0D9F4F]">
            KANNADA
          </span>
        </div>

        {/* 8. Bottom Tagline with Decorative Lines */}
        <div className="flex items-center justify-center gap-3 w-full max-w-[300px] mb-5">
          <div className="flex-1 h-[1.5px] bg-gradient-to-r from-transparent to-[#0D9F4F]"></div>
          <span className="text-xs font-bold text-[#0D9F4F] whitespace-nowrap">
            आवाज़ से हिसाब • Voice Ledger
          </span>
          <div className="flex-1 h-[1.5px] bg-gradient-to-l from-transparent to-[#0D9F4F]"></div>
        </div>

        {/* 9. Shimmer Loading Bar */}
        <div className="w-36 h-1 bg-[#e8f5e9] rounded-full overflow-hidden relative mb-5">
          <div
            className="absolute top-0 left-0 w-1/2 h-full bg-gradient-to-r from-transparent via-[#0D9F4F] to-transparent"
            style={{ animation: 'shimmer-slide 1.25s infinite' }}
          ></div>
        </div>

        {/* 10. Powered by Gnani AI */}
        <div className="text-[10px] font-semibold text-[#0D9F4F]/70 tracking-[1.5px] uppercase">
          Powered by Gnani AI
        </div>
      </main>
    </div>
  )
}
