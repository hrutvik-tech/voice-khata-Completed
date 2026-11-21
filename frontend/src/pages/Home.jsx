import React, { useEffect, useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useAppStore } from '../store/appStore'
import { useVoice } from '../voice/useVoice'
import { Header } from '../components/Header'
import { Navbar } from '../components/Navbar'
import { MicOrb } from '../components/MicOrb'
import { TransactionEntry } from '../components/TransactionEntry'
import { VoiceQuestion } from '../components/VoiceQuestion'
import { OfflineBanner } from '../components/OfflineBanner'
import { DemoTimeBar } from '../components/DemoTimeBar'
import { api } from '../api/rest'
import { t } from '../i18n/translations'

export function Home() {
  const shop = useAppStore((s) => s.shop)
  const language = useAppStore((s) => s.language)
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

  // Localized sample voice sentences for shopkeepers
  const quickVoiceChips = useMemo(() => {
    if (language === 'kn') {
      return [
        'ರಮೇಶ್ ಶರ್ಮಾ 340 ಸಾಲ',
        'ಸುರೇಶ್ 200 ಜಮಾ',
        'ರಮೇಶ್ ಒಟ್ಟು ಬಾಕಿ ಎಷ್ಟು?',
        'ಇಲ್ಲ, 430',
        'ಹಿಂದಿನದು ತೆಗೆದುಹಾಕು',
        'ಇವತ್ತಿನ ಲೆಕ್ಕ',
      ]
    }
    if (language === 'en') {
      return [
        'Ramesh Sharma 340 credit',
        'Suresh paid 200',
        'How much does Ramesh owe?',
        'No, 430',
        'Undo last',
        "Today's summary",
      ]
    }
    return [
      'रमेश शर्मा का 340 उधार',
      'सुरेश का 200 जमा',
      'रमेश का कुल बाकी?',
      'नहीं, 430',
      'पिछला हटाओ',
      'आज का हिसाब',
    ]
  }, [language])

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
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col pb-24 max-w-md mx-auto relative border-x border-slate-200 shadow-xl">
      {/* Offline & Demo Banners */}
      <OfflineBanner />
      <DemoTimeBar />

      {/* Top Header Bar with QR Code & Language Switcher */}
      <Header />

      {/* Main Content Area */}
      <main className="flex-1 px-4 py-3 flex flex-col space-y-3">
        {/* Prominent BOLTA KHATA Hero Banner */}
        <section className="bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-800 rounded-3xl p-5 text-white shadow-lg shadow-emerald-900/10 relative overflow-hidden">
          <div className="absolute -right-6 -bottom-6 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none" />
          
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/40 text-[10px] font-bold tracking-wider uppercase border border-emerald-300/30">
                Voice AI Khata
              </span>
              <span className="text-emerald-200 text-xs">✨ Kirana Ledger</span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white font-mono">
              {t('brandName', language)}
            </h1>

            <p className="text-xs sm:text-sm font-semibold text-emerald-100 mt-1">
              "{t('brandTagline', language)}"
            </p>

            <p className="text-[11px] text-emerald-100/80 mt-1.5 leading-relaxed max-w-xs">
              {t('heroDesc', language)}
            </p>

            {/* Quick Hero Action Links */}
            <div className="mt-4 flex items-center gap-2 pt-2 border-t border-emerald-500/30">
              <Link
                to="/history"
                className="px-3 py-1.5 bg-white text-emerald-800 hover:bg-emerald-50 rounded-xl text-xs font-bold transition shadow-xs flex items-center gap-1"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{t('navHistory', language)}</span>
              </Link>

              <Link
                to="/customers"
                className="px-3 py-1.5 bg-emerald-800/80 hover:bg-emerald-800 text-white border border-emerald-400/30 rounded-xl text-xs font-bold transition flex items-center gap-1"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <span>{t('khataTitle', language)}</span>
              </Link>
            </div>
          </div>
        </section>

        {/* Audio Activation Banner if Microphone uninitialized */}
        {!audioActive && (
          <div className="p-4 rounded-2xl bg-white border border-emerald-200 text-center shadow-xs">
            <h3 className="text-xs font-bold text-slate-900 mb-1">
              {t('activateVoiceTitle', language)}
            </h3>
            <p className="text-[11px] text-slate-500 mb-2.5">
              {t('activateVoiceDesc', language)}
            </p>
            {micError && (
              <p className="text-[11px] text-amber-800 mb-2 bg-amber-50 p-1.5 rounded-lg border border-amber-200 font-medium">
                {micError}
              </p>
            )}
            <button
              type="button"
              onClick={handleActivateClick}
              disabled={activating}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-2.5 px-3 rounded-xl transition shadow-xs active:scale-98 cursor-pointer disabled:opacity-50"
            >
              {activating ? t('activatingBtn', language) : t('activateVoiceBtn', language)}
            </button>
          </div>
        )}

        {/* Center: Microphone Section */}
        <section className="bg-white border border-slate-200 rounded-3xl p-4 text-center shadow-xs">
          <MicOrb
            state={orbState}
            onClick={handleOrbClick}
            audioActive={audioActive}
            wakeMode={wakeMode}
          />

          <div className="mt-2 text-center">
            <span className="text-[11px] text-slate-500 font-mono bg-slate-50 px-3 py-1 rounded-full border border-slate-200 font-medium inline-block">
              {t('wakeWordHint', language)} <strong className="text-emerald-700 font-bold">"Suno Munshi"</strong>
            </span>
          </div>
        </section>

        {/* Quick Voice Command Chips */}
        <div>
          <span className="text-[11px] font-bold text-slate-600 mb-1.5 block">
            {t('suggestionsTitle', language)}
          </span>
          <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
            {quickVoiceChips.map((chip, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => sendVoiceText(chip)}
                className="shrink-0 px-3 py-1.5 rounded-xl bg-white hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 text-xs text-slate-700 hover:text-emerald-800 font-medium transition cursor-pointer shadow-2xs"
              >
                {chip}
              </button>
            ))}
          </div>
        </div>

        {/* Clarification Question if Munshi asks */}
        {pendingQuestion && (
          <VoiceQuestion
            question={pendingQuestion}
            onChoice={handleChoice}
          />
        )}

        {/* Live Heard Speech Strip */}
        {lastHeard && (
          <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-3 shadow-xs">
            <div className="flex items-center justify-between text-[10px] text-emerald-800 mb-0.5">
              <span className="font-bold">{t('heardText', language)}:</span>
              <span className="uppercase font-mono text-[9px] bg-white px-1.5 py-0.5 rounded border border-emerald-200 text-emerald-800 font-bold">
                {lastHeard.language}
              </span>
            </div>
            <p className="text-xs font-bold text-slate-900">"{lastHeard.text}"</p>
          </div>
        )}

        {/* Munshi's Spoken Response */}
        {lastResponse && (
          <div className="bg-white border border-slate-200 rounded-2xl p-3.5 flex items-start justify-between gap-2 shadow-xs">
            <div className="flex-1">
              <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wide block mb-0.5">
                {t('munshiReply', language)}
              </span>
              <p className="text-xs font-semibold text-slate-800">{lastResponse.say}</p>
            </div>
            <button
              type="button"
              onClick={replayAudio}
              title={t('replayAudio', language)}
              className="p-2 rounded-xl bg-slate-50 hover:bg-emerald-50 border border-slate-200 text-emerald-700 transition cursor-pointer shrink-0"
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
            placeholder={t('typePlaceholder', language)}
            className="w-full bg-white border border-slate-300 rounded-2xl pl-3.5 pr-10 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 shadow-xs"
          />
          <button
            type="submit"
            disabled={!typedCommand.trim()}
            className="absolute right-1.5 p-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-30 transition cursor-pointer shadow-xs"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </button>
        </form>

        {/* Today's Daily Totals Cards */}
        <section className="grid grid-cols-2 gap-2.5">
          <div className="bg-white border border-slate-200 rounded-2xl p-3.5 shadow-xs">
            <span className="text-[10px] font-bold text-rose-600 uppercase tracking-wide block mb-0.5">
              {t('todayCredit', language)}
            </span>
            <span className="text-xl font-black text-slate-900">
              ₹{creditRupees}
            </span>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-3.5 shadow-xs">
            <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wide block mb-0.5">
              {t('todayPayment', language)}
            </span>
            <span className="text-xl font-black text-slate-900">
              ₹{paymentRupees}
            </span>
          </div>
        </section>

        {/* Live Recent Ledger Entries Section */}
        <section className="mt-1 pt-2">
          <div className="flex items-center justify-between mb-1.5">
            <h2 className="text-xs font-bold text-slate-800">
              {t('recentEntries', language)}
            </h2>
            <Link to="/history" className="text-xs font-bold text-emerald-700 hover:underline">
              {t('viewAllHistory', language)}
            </Link>
          </div>

          {recentEntries.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-4 text-center shadow-xs">
              <p className="text-xs text-slate-500 font-medium">
                {t('noRecentEntries', language)}
              </p>
              <p className="text-[11px] text-slate-400 mt-1">
                {t('speakSampleHint', language)}
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              {recentEntries.map((entry) => (
                <TransactionEntry key={`home-recent-${entry.id}`} entry={entry} />
              ))}
            </div>
          )}
        </section>
      </main>

      {/* Reusable Bottom Navigation Bar */}
      <Navbar />
    </div>
  )
}
