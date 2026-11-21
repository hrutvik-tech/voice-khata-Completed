import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAppStore } from '../store/appStore'
import { api } from '../api/rest'
import { Header } from '../components/Header'
import { Navbar } from '../components/Navbar'
import { OfflineBanner } from '../components/OfflineBanner'
import { DemoTimeBar } from '../components/DemoTimeBar'
import { t } from '../i18n/translations'
import { getInitial } from '../utils/initials'

export function ShopProfile() {
  const navigate = useNavigate()
  const shop = useAppStore((s) => s.shop)
  const setShop = useAppStore((s) => s.setShop)
  const logout = useAppStore((s) => s.logout)
  const language = useAppStore((s) => s.language)
  const setLanguage = useAppStore((s) => s.setLanguage)

  const [shopName, setShopName] = useState(shop?.shop_name || '')
  const [openTime, setOpenTime] = useState(shop?.open_time || '06:00')
  const [closeTime, setCloseTime] = useState(shop?.close_time || '02:00')
  const [languageMode, setLanguageMode] = useState(shop?.language_mode || 'mix')
  const [saveMsg, setSaveMsg] = useState('')

  // PIN change state
  const [oldPin, setOldPin] = useState('')
  const [newPin, setNewPin] = useState('')
  const [pinMsg, setPinMsg] = useState('')
  const [pinError, setPinError] = useState('')

  // Delete data state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)

  const handleUpdateShop = async (e) => {
    e.preventDefault()
    setSaveMsg('')
    try {
      const updated = await api.updateShop({
        shop_name: shopName.trim(),
        open_time: openTime,
        close_time: closeTime,
        language_mode: languageMode,
      })
      setShop(updated)
      if (languageMode && languageMode !== 'mix') {
        setLanguage(languageMode)
      }
      setSaveMsg(t('savedSuccess', language))
      setTimeout(() => setSaveMsg(''), 3000)
    } catch (err) {
      setSaveMsg(err.message || t('errorOccurred', language))
    }
  }

  const handleChangePin = async (e) => {
    e.preventDefault()
    setPinMsg('')
    setPinError('')

    if (newPin.length < 4 || newPin.length > 6) {
      setPinError(t('newPinLabel', language))
      return
    }

    try {
      await api.changePin(oldPin, newPin)
      setPinMsg(t('pinChangedSuccess', language))
      setOldPin('')
      setNewPin('')
      setTimeout(() => setPinMsg(''), 3000)
    } catch (err) {
      if (err.status === 401) {
        setPinError('पुराना पिन गलत है (Incorrect old PIN)')
      } else {
        setPinError(err.message || t('errorOccurred', language))
      }
    }
  }

  const handleDeleteData = async () => {
    setDeleteLoading(true)
    try {
      await api.deleteShopData()
      logout()
      navigate('/login')
    } catch (err) {
      alert(err.message || 'त्रुटि हुई')
    } finally {
      setDeleteLoading(false)
    }
  }

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col pb-24 max-w-md mx-auto relative border-x border-slate-200 shadow-xl">
      <OfflineBanner />
      <DemoTimeBar />
      <Header subtitle={t('shopProfileTitle', language)} />

      {/* Main Content */}
      <main className="flex-1 px-4 py-3 space-y-4">
        {/* Owner Details Card */}
        <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-xl font-black text-emerald-700 shadow-xs overflow-hidden notranslate select-none"
                translate="no"
              >
                {getInitial(shop?.owner_name, 'S')}
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">{shop?.owner_name || t('defaultOwner', language)}</h2>
                <p className="text-xs text-slate-500 font-mono">📞 +91 {shop?.phone || '9000000001'}</p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              className="text-xs px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold transition cursor-pointer"
            >
              {t('logoutBtn', language)}
            </button>
          </div>
        </div>

        {/* Edit Shop Settings Form */}
        <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs">
          <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
            <span>⚙️ {t('shopInfoSection', language)}</span>
          </h3>

          {saveMsg && (
            <div className="mb-3 p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold">
              {saveMsg}
            </div>
          )}

          <form onSubmit={handleUpdateShop} className="space-y-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                {t('shopNameLabel', language)}
              </label>
              <input
                type="text"
                value={shopName}
                onChange={(e) => setShopName(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  {t('openTimeLabel', language)}
                </label>
                <input
                  type="time"
                  value={openTime}
                  onChange={(e) => setOpenTime(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  {t('closeTimeLabel', language)}
                </label>
                <input
                  type="time"
                  value={closeTime}
                  onChange={(e) => setCloseTime(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                {t('languageModeLabel', language)}
              </label>
              <select
                value={languageMode}
                onChange={(e) => setLanguageMode(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
              >
                <option value="mix">मिश्रित (Mix / Hinglish / Kanglish)</option>
                <option value="hi">हिंदी (Hindi)</option>
                <option value="kn">ಕನ್ನಡ (Kannada)</option>
                <option value="en">English (Indian English)</option>
              </select>
            </div>

            <button
              type="submit"
              className="w-full mt-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 rounded-xl text-xs transition transform active:scale-95 cursor-pointer shadow-xs"
            >
              {t('saveSettingsBtn', language)}
            </button>
          </form>
        </div>

        {/* Change PIN Form */}
        <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs">
          <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
            <span>🔒 {t('securitySection', language)}</span>
          </h3>

          {pinMsg && (
            <div className="mb-3 p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold">
              {pinMsg}
            </div>
          )}
          {pinError && (
            <div className="mb-3 p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold">
              {pinError}
            </div>
          )}

          <form onSubmit={handleChangePin} className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  {t('oldPinLabel', language)}
                </label>
                <input
                  type="password"
                  maxLength={6}
                  value={oldPin}
                  onChange={(e) => setOldPin(e.target.value)}
                  placeholder="••••"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  {t('newPinLabel', language)}
                </label>
                <input
                  type="password"
                  maxLength={6}
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value)}
                  placeholder="••••"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-slate-800 hover:bg-slate-900 text-white font-bold py-2 rounded-xl text-xs transition cursor-pointer shadow-xs"
            >
              {t('changePinBtn', language)}
            </button>
          </form>
        </div>

        {/* Danger Zone: Delete Data */}
        <div className="bg-rose-50/70 border border-rose-200 rounded-3xl p-5 shadow-xs">
          <h3 className="text-sm font-bold text-rose-800 mb-1 flex items-center gap-2">
            <span>⚠️ {t('dangerSection', language)}</span>
          </h3>
          <p className="text-[11px] text-rose-600 mb-3">
            {t('deleteConfirmDesc', language)}
          </p>

          {!showDeleteConfirm ? (
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              className="w-full py-2 bg-white border border-rose-300 text-rose-700 hover:bg-rose-100 rounded-xl text-xs font-bold transition cursor-pointer"
            >
              {t('deleteDataBtn', language)}
            </button>
          ) : (
            <div className="space-y-2">
              <p className="text-xs font-bold text-rose-800">
                {t('deleteConfirmTitle', language)}
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleDeleteData}
                  disabled={deleteLoading}
                  className="flex-1 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition cursor-pointer disabled:opacity-50"
                >
                  {deleteLoading ? t('loading', language) : t('confirmDeleteBtn', language)}
                </button>
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  {t('cancelBtn', language)}
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Bottom Navigation */}
      <Navbar />
    </div>
  )
}
