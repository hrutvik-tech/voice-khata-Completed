import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAppStore } from '../store/appStore'
import { useVoice } from '../voice/useVoice'
import { MicOrb } from '../components/MicOrb'
import { TransactionEntry } from '../components/TransactionEntry'
import { VoiceQuestion } from '../components/VoiceQuestion'
import { OfflineBanner } from '../components/OfflineBanner'
import { DemoTimeBar } from '../components/DemoTimeBar'
import { api } from '../api/rest'

export function Home() {
  const shop = useAppStore((s) => s.shop)
  const summary = useAppStore((s) => s.summary)
  const setSummary = useAppStore((s) => s.setSummary)
  const recentEntries = useAppStore((s) => s.recentEntries)
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

  // Practical sample voice sentences for shopkeepers
  const quickVoiceChips = [
    'रमेश शर्मा का 340 उधार',
    'सुरेश का 200 जमा',
    'रमेश का कुल बाकी?',
    'नहीं, 430',
    'पिछला हटाओ',
    'आज कितना उधार गया?',
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
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col pb-24 max-w-md mx-auto relative border-x border-slate-900 shadow-xl">
      {/* Offline & Demo Time Banners */}
      <OfflineBanner />
      <DemoTimeBar />

      {/* Top Header Bar — Realistic Kirana Style */}
      <header className="px-4 pt-4 pb-3 flex items-center justify-between border-b border-slate-800 bg-slate-900 sticky top-0 z-30">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-emerald-600 flex items-center justify-center text-white font-bold text-lg shadow-sm">
            🎙️
          </div>
          <div>
            <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wide block">
              {shop?.shop_name || 'शर्मा किराना स्टोर'}
            </span>
            <h1 className="text-sm font-bold text-white flex items-center gap-1">
              नमस्ते, {shop?.owner_name || 'दुकानदार जी'}
            </h1>
          </div>
        </div>

        <Link
          to="/profile"
          aria-label="Shop Profile"
          className="w-9 h-9 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 hover:text-white transition"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </Link>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 px-4 py-3 flex flex-col space-y-3">
        {/* Activation Banner if Audio Not Active */}
        {!audioActive && (
          <div className="p-3.5 rounded-xl bg-slate-900 border border-emerald-600/40 text-center shadow-md">
            <h3 className="text-xs font-bold text-white mb-1">
              माइक और आवाज़ चालू करें (Activate Voice)
            </h3>
            <p className="text-[11px] text-slate-300 mb-2.5">
              बोलकर लेन-देन जोड़ने के लिए एक बार बटन दबाएँ
            </p>
            {micError && (
              <p className="text-[11px] text-amber-300 mb-2 bg-amber-950/60 p-1.5 rounded border border-amber-800/40">
                {micError}
              </p>
            )}
            <button
              type="button"
              onClick={handleActivateClick}
              disabled={activating}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold py-2 px-3 rounded-lg transition active:scale-98 cursor-pointer disabled:opacity-50"
            >
              {activating ? 'सक्रिय कर रहे हैं...' : 'माइक शुरू करें'}
            </button>
          </div>
        )}

        {/* Center: Microphone Section */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-center">
          <MicOrb
            state={orbState}
            onClick={handleOrbClick}
            audioActive={audioActive}
            wakeMode={wakeMode}
          />

          <div className="mt-2 text-center">
            <span className="text-[11px] text-slate-400 font-mono bg-slate-950 px-2.5 py-1 rounded-full border border-slate-800">
              वेक शब्द: <strong className="text-emerald-400">"Suno Munshi"</strong>
            </span>
          </div>
        </div>

        {/* Quick Voice Command Chips */}
        <div>
          <span className="text-[11px] font-semibold text-slate-400 mb-1.5 block">
            सुझाव (टैप करें या बोलें):
          </span>
          <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
            {quickVoiceChips.map((chip, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => sendVoiceText(chip)}
                className="shrink-0 px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[11px] text-slate-200 font-medium transition cursor-pointer"
              >
                {chip}
              </button>
            ))}
          </div>
        </div>

        {/* Clarification Question (if Munshi asks) */}
        {pendingQuestion && (
          <VoiceQuestion
            question={pendingQuestion}
            onChoice={handleChoice}
          />
        )}

        {/* Live Heard Speech Strip */}
        {lastHeard && (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-2.5">
            <div className="flex items-center justify-between text-[10px] text-slate-400 mb-0.5">
              <span className="font-semibold text-emerald-400">सुना गया (Heard):</span>
              <span className="uppercase font-mono text-[9px] bg-slate-800 px-1 rounded text-slate-300">
                {lastHeard.language}
              </span>
            </div>
            <p className="text-xs font-semibold text-white">"{lastHeard.text}"</p>
          </div>
        )}

        {/* Munshi's Spoken Response */}
        {lastResponse && (
          <div className="bg-slate-900 border border-emerald-900/40 rounded-xl p-3 flex items-start justify-between gap-2">
            <div className="flex-1">
              <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wide block mb-0.5">
                मुंशी का जवाब
              </span>
              <p className="text-xs font-medium text-slate-100">{lastResponse.say}</p>
            </div>
            <button
              type="button"
              onClick={replayAudio}
              title="उत्तर दोबारा सुनें"
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-emerald-400 transition cursor-pointer shrink-0"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
              </svg>
            </button>
          </div>
        )}

        {/* Text Prompt Input Bar */}
        <form onSubmit={handleSendText} className="relative flex items-center">
          <input
            type="text"
            value={typedCommand}
            onChange={(e) => setTypedCommand(e.target.value)}
            placeholder="यहाँ बोलें या टाइप करें... (उदा. रमेश का 200 उधार)"
            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-3 pr-10 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          />
          <button
            type="submit"
            disabled={!typedCommand.trim()}
            className="absolute right-1.5 p-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white disabled:opacity-30 transition cursor-pointer"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </button>
        </form>

        {/* Today's Daily Totals Cards */}
        <div className="grid grid-cols-2 gap-2.5">
          <div className="bg-slate-900 border border-emerald-950 rounded-xl p-3">
            <span className="text-[10px] font-semibold text-emerald-400 block mb-0.5">
              आज का उधार (Credit)
            </span>
            <span className="text-xl font-bold text-white">
              ₹{creditRupees}
            </span>
          </div>

          <div className="bg-slate-900 border border-blue-950 rounded-xl p-3">
            <span className="text-[10px] font-semibold text-blue-400 block mb-0.5">
              आज की जमा (Payment)
            </span>
            <span className="text-xl font-bold text-white">
              ₹{paymentRupees}
            </span>
          </div>
        </div>

        {/* Live Recent Ledger Entries Section */}
        <div className="mt-2 pt-2 border-t border-slate-900">
          <div className="flex items-center justify-between mb-1.5">
            <h2 className="text-xs font-bold text-slate-300">
              हाल के लेन-देन (Recent Entries)
            </h2>
            <Link to="/customers" className="text-[11px] text-emerald-400 hover:underline">
              पूरा खाता देखें →
            </Link>
          </div>

          {recentEntries.length === 0 ? (
            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-3 text-center">
              <p className="text-[11px] text-slate-400">
                अभी तक कोई लेन-देन दर्ज नहीं हुआ है।
              </p>
              <p className="text-[10px] text-slate-500 mt-0.5">
                माइक दबाकर बोलिए: "रमेश शर्मा का 340 उधार"
              </p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {recentEntries.map((entry) => (
                <TransactionEntry key={entry.id} entry={entry} />
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Bottom Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-slate-900 border-t border-slate-800 px-6 py-2.5 flex items-center justify-around z-40">
        <Link
          to="/"
          className="flex flex-col items-center gap-0.5 text-emerald-400"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
          </svg>
          <span className="text-[10px] font-semibold">होम</span>
        </Link>

        <Link
          to="/customers"
          className="flex flex-col items-center gap-0.5 text-slate-400 hover:text-slate-200 transition"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
          <span className="text-[10px] font-semibold">खाता (Ledger)</span>
        </Link>

        <Link
          to="/profile"
          className="flex flex-col items-center gap-0.5 text-slate-400 hover:text-slate-200 transition"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <span className="text-[10px] font-semibold">प्रोफ़ाइल</span>
        </Link>
      </nav>
    </div>
  )
}
