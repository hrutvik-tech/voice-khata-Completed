import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAppStore } from '../store/appStore'
import { QrModal } from './QrModal'
import { t } from '../i18n/translations'

export function Header({ subtitle }) {
  const shop = useAppStore((s) => s.shop)
  const language = useAppStore((s) => s.language)
  const setLanguage = useAppStore((s) => s.setLanguage)

  const [isQrOpen, setIsQrOpen] = useState(false)
  const [isLangMenuOpen, setIsLangMenuOpen] = useState(false)

  const shopName = shop?.shop_name || t('defaultShopName', language)

  const languages = [
    { code: 'hi', label: 'हिंदी', short: 'हिं' },
    { code: 'en', label: 'English', short: 'EN' },
    { code: 'kn', label: 'ಕನ್ನಡ', short: 'ಕನ್ನ' },
  ]

  return (
    <>
      <header className="px-4 py-3 bg-white/95 backdrop-blur-md border-b border-slate-200 sticky top-0 z-30 shadow-xs flex items-center justify-between">
        {/* Brand identity */}
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white text-xl shadow-md shadow-emerald-500/15 group-hover:scale-105 transition-transform">
            🎙️
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-black tracking-wider text-slate-900 font-mono">
                {t('brandName', language)}
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                AI
              </span>
            </div>
            <span className="text-[11px] font-semibold text-slate-500 block truncate max-w-[140px] sm:max-w-[180px]">
              {subtitle || shopName}
            </span>
          </div>
        </Link>

        {/* Right side controls: Language switcher + QR Button */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Language Switcher Dropdown/Pills */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsLangMenuOpen(!isLangMenuOpen)}
              className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-xs font-bold text-slate-700 flex items-center gap-1 transition cursor-pointer"
              title="Change Language / भाषा बदलें"
            >
              <span>🌐</span>
              <span className="uppercase text-[11px] font-bold">{language}</span>
              <svg className="w-3 h-3 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {isLangMenuOpen && (
              <div className="absolute right-0 mt-1.5 w-32 bg-white rounded-2xl border border-slate-200 shadow-xl py-1 z-50 animate-fade-in">
                {languages.map((l) => (
                  <button
                    key={l.code}
                    type="button"
                    onClick={() => {
                      setLanguage(l.code)
                      setIsLangMenuOpen(false)
                    }}
                    className={`w-full text-left px-3 py-2 text-xs font-semibold flex items-center justify-between hover:bg-slate-50 cursor-pointer ${
                      language === l.code ? 'text-emerald-600 bg-emerald-50/50 font-bold' : 'text-slate-700'
                    }`}
                  >
                    <span>{l.label}</span>
                    {language === l.code && <span className="text-emerald-600">✓</span>}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* QR Code Action Button */}
          <button
            type="button"
            onClick={() => setIsQrOpen(true)}
            className="w-9 h-9 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200/80 flex items-center justify-center text-emerald-700 shadow-xs transition cursor-pointer active:scale-95"
            title={t('qrModalTitle', language)}
            aria-label={t('qrModalTitle', language)}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
            </svg>
          </button>
        </div>
      </header>

      {/* QR Code Modal Popup */}
      <QrModal isOpen={isQrOpen} onClose={() => setIsQrOpen(false)} />
    </>
  )
}
