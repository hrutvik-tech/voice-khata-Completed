import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAppStore } from '../store/appStore'
import { useVoice } from '../voice/useVoice'
import { MicOrb } from '../components/MicOrb'
import { VoiceQuestion } from '../components/VoiceQuestion'
import { OfflineBanner } from '../components/OfflineBanner'
import { DemoTimeBar } from '../components/DemoTimeBar'
import { api } from '../api/rest'

export function Home() {
  const shop = useAppStore((s) => s.shop)
  const summary = useAppStore((s) => s.summary)
  const setSummary = useAppStore((s) => s.setSummary)
  const isOffline = useAppStore((s) => s.isOffline)

  const {
    orbState,
    lastHeard,
    lastResponse,
    pendingQuestion,
    audioActive,
    wakeMode,
    activateAudio,
    handleOrbClick,
    handleChoice,
    replayAudio,
  } = useVoice()

  // Fetch today summary on load
  useEffect(() => {
    if (!isOffline) {
      api.getTodaySummary()
        .then(setSummary)
        .catch(console.warn)
    }
  }, [isOffline, setSummary])

  const creditRupees = ((summary.credit_paise || 0) / 100).toLocaleString('en-IN')
  const paymentRupees = ((summary.payment_paise || 0) / 100).toLocaleString('en-IN')

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col pb-20 max-w-md mx-auto relative shadow-2xl">
      {/* Offline Banner & Demo Time Bar */}
      <OfflineBanner />
      <DemoTimeBar />

      {/* Top Header Bar */}
      <header className="px-5 pt-5 pb-3 flex items-center justify-between border-b border-slate-900 bg-slate-950/80 backdrop-blur-md sticky top-0 z-30">
        <div>
          <span className="text-[11px] font-semibold text-emerald-400 tracking-wider uppercase block">
            {shop?.shop_name || 'शर्मा किराना स्टोर'}
          </span>
          <h1 className="text-lg font-bold text-white flex items-center gap-1.5">
            नमस्ते, {shop?.owner_name || 'शर्मा जी'} 👋
          </h1>
        </div>

        <div className="flex items-center gap-2">
          {/* Shopkeeper Profile Navigation */}
          <Link
            to="/profile"
            aria-label="Shop Profile"
            className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 hover:text-white hover:bg-slate-700 transition"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </Link>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 px-4 py-4 flex flex-col justify-between">
        {/* Assistant Status Badge */}
        <div className="flex justify-center mb-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900 border border-slate-800 shadow-inner">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="text-xs font-semibold text-slate-300">मुंशी AI सहायक (Munshi AI)</span>
          </div>
        </div>

        {/* Activation Banner if Audio Not Active */}
        {!audioActive && (
          <div className="my-3 p-3.5 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 text-center animate-pulse">
            <p className="text-xs text-emerald-200 font-medium mb-2">
              🎙️ आवाज़ से खाता चलाने के लिए माइक्रोफ़ोन चालू करें
            </p>
            <button
              type="button"
              onClick={activateAudio}
              className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold py-2 px-5 rounded-xl shadow-md transition transform active:scale-95 cursor-pointer"
            >
              माइक चालू करें (Activate Mic)
            </button>
          </div>
        )}

        {/* Center: Large Animated Microphone Orb */}
        <div className="my-auto py-2">
          <MicOrb
            state={orbState}
            onClick={handleOrbClick}
            audioActive={audioActive}
            wakeMode={wakeMode}
          />

          {/* Wake Word Instruction */}
          <div className="text-center mt-2">
            <span className="inline-block bg-slate-900 border border-slate-800 text-slate-400 text-xs px-3 py-1 rounded-full font-mono">
              वेक फ़्रेज़: <strong className="text-emerald-400">"Suno Munshi"</strong>
            </span>
          </div>
        </div>

        {/* Clarification Question (if pending) */}
        {pendingQuestion && (
          <VoiceQuestion
            question={pendingQuestion}
            onChoice={handleChoice}
          />
        )}

        {/* Last Heard Speech Strip */}
        {lastHeard && (
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-3 my-2 backdrop-blur-sm">
            <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
              <span>सुना गया (Heard):</span>
              <span className="uppercase font-mono bg-slate-800 px-1 rounded">{lastHeard.language}</span>
            </div>
            <p className="text-sm font-medium text-slate-200 italic">"{lastHeard.text}"</p>
          </div>
        )}

        {/* Latest Spoken Response & Replay Button */}
        {lastResponse && (
          <div className="bg-gradient-to-r from-slate-900 to-slate-850 border border-emerald-500/30 rounded-2xl p-3.5 my-2 shadow-md flex items-start justify-between gap-3">
            <div className="flex-1">
              <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block mb-0.5">
                मुंशी का उत्तर (Munshi's Reply)
              </span>
              <p className="text-sm font-semibold text-white leading-relaxed">{lastResponse.say}</p>
            </div>
            <button
              type="button"
              onClick={replayAudio}
              title="उत्तर दोबारा सुनें (Replay voice)"
              className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 transition active:scale-95 cursor-pointer shrink-0"
            >
              <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
              </svg>
            </button>
          </div>
        )}

        {/* Today's Daily Totals Cards */}
        <div className="grid grid-cols-2 gap-3 mt-4">
          <div className="bg-emerald-950/30 border border-emerald-800/40 rounded-2xl p-3.5 shadow-sm">
            <span className="text-[11px] font-medium text-emerald-400 block mb-1">
              आज का उधार (Credit)
            </span>
            <span className="text-xl font-bold text-emerald-300">
              ₹{creditRupees}
            </span>
          </div>

          <div className="bg-blue-950/30 border border-blue-800/40 rounded-2xl p-3.5 shadow-sm">
            <span className="text-[11px] font-medium text-blue-400 block mb-1">
              आज की जमा (Payment)
            </span>
            <span className="text-xl font-bold text-blue-300">
              ₹{paymentRupees}
            </span>
          </div>
        </div>
      </main>

      {/* Bottom Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-slate-950/95 border-t border-slate-900 px-6 py-2.5 flex items-center justify-around z-40 backdrop-blur-md">
        <Link
          to="/"
          className="flex flex-col items-center gap-1 text-emerald-400"
        >
          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
            <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
          </svg>
          <span className="text-[10px] font-semibold">होम</span>
        </Link>

        <Link
          to="/customers"
          className="flex flex-col items-center gap-1 text-slate-400 hover:text-slate-200 transition"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
          <span className="text-[10px] font-semibold">ग्राहक खाता</span>
        </Link>

        <Link
          to="/profile"
          className="flex flex-col items-center gap-1 text-slate-400 hover:text-slate-200 transition"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <span className="text-[10px] font-semibold">प्रोफ़ाइल</span>
        </Link>
      </nav>
    </div>
  )
}
