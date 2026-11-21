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
    micError,
    activateAudio,
    handleOrbClick,
    handleChoice,
    replayAudio,
    sendVoiceText,
  } = useVoice()

  const [typedCommand, setTypedCommand] = useState('')
  const [activating, setActivating] = useState(false)

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

  // Sample voice sentences for shopkeepers to test with 1-click
  const quickVoiceChips = [
    { label: 'Ramesh Sharma ka 340 udhaar', icon: '📝' },
    { label: 'Nahi, 430', icon: '✏️' },
    { label: 'Suresh ka 200 udhaar, kal 100 diya tha', icon: '⚡' },
    { label: 'Pichla hatao', icon: '↩️' },
    { label: 'Ramesh ka total?', icon: '🔍' },
    { label: 'Aaj kitna udhaar gaya?', icon: '📊' },
    { label: 'Aaj ka hisaab', icon: '📋' },
    { label: 'Suresh ge nooru roopayi saala', icon: '🇮🇳' },
  ]

  const handleActivateClick = async () => {
    setActivating(true)
    try {
      await activateAudio()
    } finally {
      setActivating(false)
    }
  }

  const handleSendText = (e) => {
    e.preventDefault()
    if (typedCommand.trim()) {
      sendVoiceText(typedCommand.trim())
      setTypedCommand('')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-slate-100 flex flex-col pb-24 max-w-md mx-auto relative shadow-2xl border-x border-slate-900">
      {/* Offline & Demo Time Banners */}
      <OfflineBanner />
      <DemoTimeBar />

      {/* Top Header Bar */}
      <header className="px-5 pt-5 pb-3 flex items-center justify-between border-b border-slate-800/60 bg-slate-950/80 backdrop-blur-xl sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 p-0.5 shadow-lg shadow-emerald-500/20">
            <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
              <span className="text-xl">🎙️</span>
            </div>
          </div>
          <div>
            <span className="text-[10px] font-bold text-emerald-400 tracking-wider uppercase block">
              {shop?.shop_name || 'शर्मा किराना स्टोर'}
            </span>
            <h1 className="text-base font-extrabold text-white flex items-center gap-1.5">
              नमस्ते, {shop?.owner_name || 'शर्मा जी'} 👋
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Shop Profile Button */}
          <Link
            to="/profile"
            aria-label="Shop Profile"
            className="w-10 h-10 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-300 hover:text-white hover:border-slate-700 transition active:scale-95 shadow-md"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </Link>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 px-4 py-3 flex flex-col justify-between">
        {/* Assistant Badge */}
        <div className="flex justify-center mb-1">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-slate-900/90 border border-slate-800 shadow-inner">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="text-xs font-semibold text-slate-300">मुंशी AI सहायक (Munshi AI)</span>
          </div>
        </div>

        {/* Activation Banner if Audio Not Active */}
        {!audioActive && (
          <div className="my-3 p-4 rounded-2xl bg-gradient-to-r from-emerald-950/60 via-slate-900 to-teal-950/60 border border-emerald-500/50 shadow-xl text-center">
            <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto mb-2 text-lg">
              🎙️
            </div>
            <h3 className="text-sm font-bold text-white mb-1">
              माइक और आवाज़ चालू करें (Activate Voice)
            </h3>
            <p className="text-xs text-slate-300 mb-3 leading-relaxed">
              बोलकर लेन-देन दर्ज करने के लिए माइक्रोफ़ोन सक्रिय करें
            </p>
            {micError && (
              <p className="text-xs text-amber-300 mb-2 font-medium bg-amber-950/40 p-2 rounded-lg border border-amber-800/40">
                {micError}
              </p>
            )}
            <button
              type="button"
              onClick={handleActivateClick}
              disabled={activating}
              className="w-full bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white text-xs font-bold py-2.5 px-4 rounded-xl shadow-lg shadow-emerald-600/30 transition transform active:scale-95 cursor-pointer disabled:opacity-50"
            >
              {activating ? 'सक्रिय कर रहे हैं...' : 'माइक चालू करें (Activate Mic)'}
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

          {/* Wake Word Instruction Box */}
          <div className="text-center mt-3">
            <span className="inline-flex items-center gap-2 bg-slate-900/90 border border-slate-800 px-3.5 py-1.5 rounded-full text-xs text-slate-300 font-mono shadow-sm">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              वेक शब्द: <strong className="text-emerald-400">"Suno Munshi"</strong>
            </span>
          </div>
        </div>

        {/* Quick Voice Command Chips Carousel */}
        <div className="my-3">
          <div className="flex items-center justify-between text-[11px] text-slate-400 font-semibold uppercase tracking-wider mb-2 px-1">
            <span>बोलने के उदाहरण (Tap to test voice):</span>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1.5 no-scrollbar scroll-smooth">
            {quickVoiceChips.map((chip, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => sendVoiceText(chip.label)}
                className="shrink-0 px-3 py-1.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-800 hover:border-emerald-500/40 text-xs text-slate-200 font-medium transition active:scale-95 shadow-sm flex items-center gap-1.5 cursor-pointer"
              >
                <span>{chip.icon}</span>
                <span>{chip.label}</span>
              </button>
            ))}
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
          <div className="bg-slate-900/90 border border-slate-800/80 rounded-2xl p-3 my-2 backdrop-blur-md shadow-lg animate-fade-in">
            <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
              <span className="flex items-center gap-1 font-semibold text-emerald-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                सुना गया (Heard):
              </span>
              <span className="uppercase font-mono bg-slate-800 px-1.5 py-0.5 rounded text-[10px] text-slate-300">
                {lastHeard.language}
              </span>
            </div>
            <p className="text-sm font-semibold text-white italic">"{lastHeard.text}"</p>
          </div>
        )}

        {/* Latest Spoken Response & Replay Button */}
        {lastResponse && (
          <div className="bg-gradient-to-r from-emerald-950/40 via-slate-900 to-slate-900 border border-emerald-500/40 rounded-2xl p-3.5 my-2 shadow-xl flex items-start justify-between gap-3 animate-fade-in">
            <div className="flex-1">
              <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block mb-1">
                मुंशी का जवाब (Munshi's Spoken Reply)
              </span>
              <p className="text-sm font-semibold text-white leading-relaxed">{lastResponse.say}</p>
            </div>
            <button
              type="button"
              onClick={replayAudio}
              title="उत्तर दोबारा सुनें (Replay voice)"
              className="p-3 rounded-2xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 transition active:scale-90 cursor-pointer shrink-0"
            >
              <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
              </svg>
            </button>
          </div>
        )}

        {/* Direct Text Prompt Input Bar (Bilingual fallback) */}
        <form onSubmit={handleSendText} className="my-2 relative flex items-center">
          <input
            type="text"
            value={typedCommand}
            onChange={(e) => setTypedCommand(e.target.value)}
            placeholder="या यहाँ बोलें/टाइप करें... (उदा. रमेश का 200 उधार)"
            className="w-full bg-slate-900/90 border border-slate-800 rounded-2xl pl-4 pr-12 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 shadow-inner"
          />
          <button
            type="submit"
            disabled={!typedCommand.trim()}
            className="absolute right-2 p-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white disabled:opacity-30 disabled:hover:bg-emerald-600 transition cursor-pointer"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </button>
        </form>

        {/* Today's Daily Totals Cards */}
        <div className="grid grid-cols-2 gap-3 mt-3">
          <div className="bg-gradient-to-br from-emerald-950/40 to-slate-900 border border-emerald-800/40 rounded-2xl p-4 shadow-lg">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-semibold text-emerald-400">
                आज का उधार (Credit)
              </span>
              <span className="text-xs">📈</span>
            </div>
            <span className="text-2xl font-black text-emerald-300">
              ₹{creditRupees}
            </span>
          </div>

          <div className="bg-gradient-to-br from-blue-950/40 to-slate-900 border border-blue-800/40 rounded-2xl p-4 shadow-lg">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-semibold text-blue-400">
                आज की जमा (Payment)
              </span>
              <span className="text-xs">💵</span>
            </div>
            <span className="text-2xl font-black text-blue-300">
              ₹{paymentRupees}
            </span>
          </div>
        </div>
      </main>

      {/* Bottom Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-slate-950/95 border-t border-slate-800/80 px-6 py-3 flex items-center justify-around z-40 backdrop-blur-xl">
        <Link
          to="/"
          className="flex flex-col items-center gap-1 text-emerald-400"
        >
          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
            <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
          </svg>
          <span className="text-[10px] font-bold">होम (Home)</span>
        </Link>

        <Link
          to="/customers"
          className="flex flex-col items-center gap-1 text-slate-400 hover:text-slate-200 transition"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
          <span className="text-[10px] font-bold">ग्राहक (Ledger)</span>
        </Link>

        <Link
          to="/profile"
          className="flex flex-col items-center gap-1 text-slate-400 hover:text-slate-200 transition"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <span className="text-[10px] font-bold">प्रोफ़ाइल (Profile)</span>
        </Link>
      </nav>
    </div>
  )
}
