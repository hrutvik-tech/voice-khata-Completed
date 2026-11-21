import React from 'react'
import { useAppStore } from '../store/appStore'

export function OfflineBanner() {
  const isOffline = useAppStore((s) => s.isOffline)

  if (!isOffline) return null

  return (
    <div className="bg-amber-600/90 text-white px-4 py-2 text-xs font-medium flex items-center justify-between shadow-md">
      <div className="flex items-center gap-2">
        <svg className="w-4 h-4 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 4.243a9 9 0 01-2.828-2.828m0 0l2.828-2.829m-2.828 2.829L3 21m0-18l18 18" />
        </svg>
        <span>आप ऑफलाइन हैं। बोलकर रिकॉर्ड की गई एंट्रियाँ नेटवर्क आने पर सिंक हो जाएँगी।</span>
      </div>
    </div>
  )
}
