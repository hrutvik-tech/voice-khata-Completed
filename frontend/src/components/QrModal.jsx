import React, { useMemo, useState } from 'react'
import { useAppStore } from '../store/appStore'
import { generateQrSvg } from '../utils/qrCode'
import { t } from '../i18n/translations'

export function QrModal({ isOpen, onClose }) {
  const shop = useAppStore((s) => s.shop)
  const language = useAppStore((s) => s.language)
  const [copied, setCopied] = useState(false)

  const shopName = shop?.shop_name || t('defaultShopName', language)
  const ownerName = shop?.owner_name || t('defaultOwner', language)
  const phone = shop?.phone || '9000000001'
  const upiId = `${phone}@upi`

  // Standard UPI URI for Bharat QR / Indian merchant payments
  const upiUri = useMemo(() => {
    return `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(shopName)}&cu=INR`
  }, [upiId, shopName])

  const qrSvg = useMemo(() => {
    return generateQrSvg(upiUri, { size: 220, color: '#0f172a', bg: '#ffffff' })
  }, [upiUri])

  if (!isOpen) return null

  const handleDownload = () => {
    if (!qrSvg) return
    const blob = new Blob([qrSvg], { type: 'image/svg+xml;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${shopName.replace(/\s+/g, '_')}_QR.svg`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const handleCopyUpi = () => {
    try {
      navigator.clipboard.writeText(upiId)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch {}
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-fade-in">
      <div className="relative w-full max-w-sm bg-white rounded-3xl border border-slate-200 shadow-2xl p-6 text-center transform transition-all">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          aria-label={t('qrCloseBtn', language)}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition cursor-pointer"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Modal Header */}
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100 mb-3">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
          </svg>
        </div>

        <h3 className="text-base font-bold text-slate-900">{t('qrModalTitle', language)}</h3>
        <p className="text-xs text-slate-500 mt-1 mb-4">{t('qrModalSub', language)}</p>

        {/* QR Code Canvas / Container */}
        <div className="relative mx-auto w-[220px] h-[220px] p-2 bg-white rounded-2xl border-2 border-slate-200/90 shadow-inner flex items-center justify-center">
          {qrSvg ? (
            <div
              className="w-full h-full flex items-center justify-center"
              dangerouslySetInnerHTML={{ __html: qrSvg }}
            />
          ) : (
            <div className="text-center p-4">
              <span className="text-2xl block mb-1">📱</span>
              <p className="text-xs font-semibold text-slate-600">{t('qrPlaceholderNotice', language)}</p>
            </div>
          )}
        </div>

        {/* Shop Info Card */}
        <div className="mt-4 p-3 bg-slate-50 rounded-2xl border border-slate-200/80 text-left">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wide block">
                {shopName}
              </span>
              <p className="text-xs font-semibold text-slate-800">{ownerName}</p>
            </div>
            <button
              type="button"
              onClick={handleCopyUpi}
              className="px-2 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-[10px] font-semibold text-slate-700 transition cursor-pointer"
            >
              {copied ? '✓ Copied' : 'Copy UPI'}
            </button>
          </div>
          <p className="text-[11px] font-mono text-slate-500 mt-1 truncate">UPI: {upiId}</p>
        </div>

        {/* Actions */}
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={handleDownload}
            className="flex-1 py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-sm cursor-pointer flex items-center justify-center gap-1.5"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            <span>{t('qrDownloadBtn', language)}</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition cursor-pointer"
          >
            {t('qrCloseBtn', language)}
          </button>
        </div>
      </div>
    </div>
  )
}
