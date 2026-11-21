import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppStore } from '../store/appStore'
import { api } from '../api/rest'

export function Setup() {
  const navigate = useNavigate()
  const shop = useAppStore((s) => s.shop)
  const setShop = useAppStore((s) => s.setShop)

  const [shopName, setShopName] = useState(shop?.shop_name || 'शर्मा किराना स्टोर')
  const [openTime, setOpenTime] = useState(shop?.open_time || '06:00')
  const [closeTime, setCloseTime] = useState(shop?.close_time || '02:00')
  const [languageMode, setLanguageMode] = useState(shop?.language_mode || 'mix')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSave = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const updated = await api.updateShop({
        shop_name: shopName.trim(),
        open_time: openTime,
        close_time: closeTime,
        language_mode: languageMode,
      })
      setShop(updated)
      navigate('/')
    } catch (err) {
      setError(err.message || 'सेटिंग्स सेव करने में त्रुटि')
    } finally {
      setLoading(false)
    }
  }

  const languages = [
    { id: 'mix', name: 'मिश्रित (Mix / Hinglish / Kanglish)', desc: 'हिंदी, कन्नड़ और अंग्रेज़ी' },
    { id: 'hi', name: 'हिंदी (Hindi)', desc: 'शुद्ध हिंदी' },
    { id: 'kn', name: 'ಕನ್ನಡ (Kannada)', desc: 'ಕನ್ನಡ ಧ್ವನಿ' },
    { id: 'en', name: 'English', desc: 'Indian English' },
  ]

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center px-4 py-8 max-w-md mx-auto">
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold text-white">दुकान सेटअप</h1>
        <p className="text-xs text-slate-400 mt-1">अपने किराना स्टोर की जानकारी और भाषा चुनें</p>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl">
        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-950/40 border border-rose-800/60 text-rose-300 text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              दुकान का नाम (Shop Name)
            </label>
            <input
              type="text"
              required
              value={shopName}
              onChange={(e) => setShopName(e.target.value)}
              placeholder="उदा. शर्मा किराना स्टोर"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                दुकान खुलने का समय
              </label>
              <input
                type="time"
                required
                value={openTime}
                onChange={(e) => setOpenTime(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 font-mono"
              />
              <span className="text-[10px] text-slate-500 mt-0.5 block">डिफ़ॉल्ट: 06:00 AM</span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                दुकान बंद होने का समय
              </label>
              <input
                type="time"
                required
                value={closeTime}
                onChange={(e) => setCloseTime(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 font-mono"
              />
              <span className="text-[10px] text-slate-500 mt-0.5 block">डिफ़ॉल्ट: 02:00 AM</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2">
              बातचीत की भाषा (Language Mode)
            </label>
            <div className="space-y-2">
              {languages.map((l) => (
                <label
                  key={l.id}
                  className={`flex items-start p-3 rounded-xl border cursor-pointer transition ${
                    languageMode === l.id
                      ? 'bg-emerald-950/30 border-emerald-500 text-white'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <input
                    type="radio"
                    name="language"
                    value={l.id}
                    checked={languageMode === l.id}
                    onChange={() => setLanguageMode(l.id)}
                    className="mt-0.5 text-emerald-600 focus:ring-emerald-500 mr-2.5"
                  />
                  <div>
                    <span className="text-xs font-bold block">{l.name}</span>
                    <span className="text-[10px] text-slate-500">{l.desc}</span>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold py-3 px-4 rounded-xl shadow-lg transition transform active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            {loading ? 'सहेज रहे हैं...' : 'सेटिंग्स सहेजें और आगे बढ़ें'}
          </button>
        </form>
      </div>
    </div>
  )
}
