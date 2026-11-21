import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAppStore } from '../store/appStore'
import { api } from '../api/rest'
import { OfflineBanner } from '../components/OfflineBanner'

export function ShopProfile() {
  const navigate = useNavigate()
  const shop = useAppStore((s) => s.shop)
  const setShop = useAppStore((s) => s.setShop)
  const logout = useAppStore((s) => s.logout)

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
      setSaveMsg('सेटिंग्स सफलतापूर्वक सहेजी गईं')
      setTimeout(() => setSaveMsg(''), 3000)
    } catch (err) {
      setSaveMsg(err.message || 'सहेजने में त्रुटि')
    }
  }

  const handleChangePin = async (e) => {
    e.preventDefault()
    setPinMsg('')
    setPinError('')

    if (newPin.length < 4 || newPin.length > 6) {
      setPinError('नया पिन 4 से 6 अंकों का होना चाहिए')
      return
    }

    try {
      await api.changePin(oldPin, newPin)
      setPinMsg('पिन सफलतापूर्वक बदल दिया गया')
      setOldPin('')
      setNewPin('')
      setTimeout(() => setPinMsg(''), 3000)
    } catch (err) {
      if (err.status === 401) {
        setPinError('पुराना पिन गलत है')
      } else {
        setPinError(err.message || 'पिन बदलने में त्रुटि')
      }
    }
  }

  const handleDeleteShopData = async () => {
    setDeleteLoading(true)
    try {
      await api.deleteShopData()
      logout()
      navigate('/login')
    } catch (err) {
      alert(err.message || 'डेटा हटाने में त्रुटि')
      setDeleteLoading(false)
    }
  }

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col pb-20 max-w-md mx-auto shadow-2xl">
      <OfflineBanner />

      {/* Top Header */}
      <header className="px-5 pt-5 pb-3 border-b border-slate-900 bg-slate-950/80 backdrop-blur-md sticky top-0 z-30 flex items-center justify-between">
        <h1 className="text-xl font-bold text-white">दुकान प्रोफ़ाइल</h1>
        <button
          type="button"
          onClick={handleLogout}
          className="text-xs px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-rose-300 font-semibold transition"
        >
          लॉगआउट (Logout)
        </button>
      </header>

      {/* Main Content */}
      <main className="flex-1 px-4 py-4 space-y-6">
        {/* Owner Details Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-lg">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-xl font-bold text-white shadow-md">
              {shop?.owner_name ? shop.owner_name[0] : 'S'}
            </div>
            <div>
              <h2 className="text-base font-bold text-white">{shop?.owner_name || 'Sharma'}</h2>
              <p className="text-xs text-slate-400 font-mono">फ़ोन: +91 {shop?.phone || '9000000001'}</p>
            </div>
          </div>
        </div>

        {/* Edit Shop Settings Form */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-lg">
          <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
            <span>⚙️ दुकान विवरण व समय</span>
          </h3>

          {saveMsg && (
            <div className="mb-3 p-2.5 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 text-xs font-medium">
              {saveMsg}
            </div>
          )}

          <form onSubmit={handleUpdateShop} className="space-y-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">दुकान का नाम</label>
              <input
                type="text"
                value={shopName}
                onChange={(e) => setShopName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">खुलने का समय</label>
                <input
                  type="time"
                  value={openTime}
                  onChange={(e) => setOpenTime(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">बंद होने का समय</label>
                <input
                  type="time"
                  value={closeTime}
                  onChange={(e) => setCloseTime(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">भाषा मोड (Language)</label>
              <select
                value={languageMode}
                onChange={(e) => setLanguageMode(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="mix">मिश्रित (Mix / Hinglish / Kanglish)</option>
                <option value="hi">हिंदी (Hindi)</option>
                <option value="kn">ಕನ್ನಡ (Kannada)</option>
                <option value="en">English</option>
              </select>
            </div>

            <button
              type="submit"
              className="w-full mt-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2 rounded-xl text-xs transition transform active:scale-95 cursor-pointer"
            >
              सेटिंग्स सहेजें
            </button>
          </form>
        </div>

        {/* Change PIN Form */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-lg">
          <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
            <span>🔒 सुरक्षा पिन बदलें</span>
          </h3>

          {pinMsg && (
            <div className="mb-3 p-2.5 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 text-xs font-medium">
              {pinMsg}
            </div>
          )}
          {pinError && (
            <div className="mb-3 p-2.5 rounded-xl bg-rose-950/40 border border-rose-800/60 text-rose-300 text-xs font-medium">
              {pinError}
            </div>
          )}

          <form onSubmit={handleChangePin} className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">पुराना पिन</label>
                <input
                  type="password"
                  maxLength={6}
                  required
                  value={oldPin}
                  onChange={(e) => setOldPin(e.target.value.replace(/\D/g, ''))}
                  placeholder="••••"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white tracking-widest focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">नया पिन</label>
                <input
                  type="password"
                  maxLength={6}
                  required
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
                  placeholder="••••"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white tracking-widest focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold py-2 rounded-xl text-xs transition transform active:scale-95 cursor-pointer"
            >
              पिन अपडेट करें
            </button>
          </form>
        </div>

        {/* Danger Zone: Delete All Shop Data */}
        <div className="bg-rose-950/20 border border-rose-900/40 rounded-3xl p-5 shadow-lg">
          <h3 className="text-sm font-bold text-rose-400 mb-1 flex items-center gap-2">
            <span>⚠️ ख़तरनाक क्षेत्र (Danger Zone)</span>
          </h3>
          <p className="text-xs text-slate-400 mb-3">
            दुकान का पूरा खाता, सभी ग्राहक और लेन-देन इतिहास स्थायी रूप से हटाएँ।
          </p>

          {!showDeleteConfirm ? (
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              className="w-full bg-rose-900/40 hover:bg-rose-900/60 border border-rose-800 text-rose-200 font-bold py-2 rounded-xl text-xs transition cursor-pointer"
            >
              दुकान का सारा डेटा हटाएँ (Delete All Data)
            </button>
          ) : (
            <div className="p-3 bg-rose-950/60 border border-rose-800 rounded-xl text-center space-y-2">
              <p className="text-xs font-bold text-rose-200">
                क्या आप वाकई सारा डेटा हटाना चाहते हैं? यह क्रिया वापस नहीं ली जा सकती!
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleDeleteShopData}
                  disabled={deleteLoading}
                  className="flex-1 bg-rose-600 hover:bg-rose-500 text-white font-bold py-1.5 rounded-lg text-xs cursor-pointer"
                >
                  {deleteLoading ? 'हटा रहे हैं...' : 'हाँ, सब कुछ हटाएँ'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-3 bg-slate-800 text-slate-300 rounded-lg text-xs cursor-pointer"
                >
                  रद्द करें
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-slate-950/95 border-t border-slate-900 px-6 py-2.5 flex items-center justify-around z-40 backdrop-blur-md">
        <Link to="/" className="flex flex-col items-center gap-1 text-slate-400 hover:text-slate-200 transition">
          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
            <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
          </svg>
          <span className="text-[10px] font-semibold">होम</span>
        </Link>

        <Link to="/customers" className="flex flex-col items-center gap-1 text-slate-400 hover:text-slate-200 transition">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
          <span className="text-[10px] font-semibold">ग्राहक खाता</span>
        </Link>

        <Link to="/profile" className="flex flex-col items-center gap-1 text-emerald-400">
          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
            <path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <span className="text-[10px] font-semibold">प्रोफ़ाइल</span>
        </Link>
      </nav>
    </div>
  )
}
