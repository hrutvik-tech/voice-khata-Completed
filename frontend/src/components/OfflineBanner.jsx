import React from 'react'
import { useAppStore } from '../store/appStore'

export function OfflineBanner() {
  const isOffline = useAppStore((s) => s.isOffline)
  const language = useAppStore((s) => s.language)

  if (!isOffline) return null

  const text =
    language === 'kn'
      ? 'ನೀವು ಆಫ್‌ಲೈನ್‌ನಲ್ಲಿದ್ದೀರಿ. ಧ್ವನಿಯ ಮೂಲಕ ದಾಖಲಿಸಿದ ನಮೂದುಗಳು ನೆಟ್‌ವರ್ಕ್ ಬಂದಾಗ ಸಿಂಕ್ ಆಗುತ್ತವೆ.'
      : language === 'en'
      ? 'You are offline. Entries recorded by voice will sync when network is restored.'
      : 'आप ऑफलाइन हैं। बोलकर रिकॉर्ड की गई एंट्रियाँ नेटवर्क आने पर सिंक हो जाएँगी।'

  return (
    <div className="bg-amber-500 text-white px-4 py-2 text-xs font-semibold flex items-center justify-between shadow-xs">
      <div className="flex items-center gap-2">
        <svg className="w-4 h-4 animate-pulse shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 4.243a9 9 0 01-2.828-2.828m0 0l2.828-2.829m-2.828 2.829L3 21m0-18l18 18" />
        </svg>
        <span>{text}</span>
      </div>
    </div>
  )
}
