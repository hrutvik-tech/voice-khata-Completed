import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppStore } from '../store/appStore'
import { api } from '../api/rest'
import { t } from '../i18n/translations'

export function Login() {
  const navigate = useNavigate()
  const language = useAppStore((s) => s.language)
  const setLanguage = useAppStore((s) => s.setLanguage)
  const setToken = useAppStore((s) => s.setToken)
  const setShop = useAppStore((s) => s.setShop)

  const [isRegister, setIsRegister] = useState(false)
  const [phone, setPhone] = useState('9000000001')
  const [pin, setPin] = useState('1234')
  const [ownerName, setOwnerName] = useState('Sharma')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const languages = [
    { code: 'hi', label: 'हिंदी' },
    { code: 'en', label: 'English' },
    { code: 'kn', label: 'ಕನ್ನಡ' },
  ]

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!phone || phone.length !== 10) {
      setError('कृपया 10 अंकों का मान्य फ़ोन नंबर दर्ज करें (10-digit phone required)')
      return
    }

    if (!pin || pin.length < 4 || pin.length > 6) {
      setError('पिन 4 से 6 अंकों का होना चाहिए (PIN must be 4 to 6 digits)')
      return
    }

    setLoading(true)
    try {
      let res
      if (isRegister) {
        if (!ownerName.trim()) {
          setError('दुकानदार का नाम आवश्यक है')
          setLoading(false)
          return
        }
        res = await api.register(ownerName.trim(), phone, pin)
      } else {
        res = await api.login(phone, pin)
      }

      setToken(res.token)
      setShop(res.shop)

      if (res.shop && !res.shop.setup_complete) {
        navigate('/setup')
      } else {
        navigate('/')
      }
    } catch (err) {
      if (err.status === 401) {
        setError('गलत पिन (Incorrect PIN)')
      } else if (err.status === 409) {
        setError('यह फ़ोन नंबर पहले से पंजीकृत है (Phone number already registered)')
      } else {
        setError(err.message || 'लॉगिन विफल रहा')
      }
    } finally {
      setLoading(false)
    }
  }

  const fillDemoCreds = () => {
    setPhone('9000000001')
    setPin('1234')
    setIsRegister(false)
    setError('')
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center px-4 py-8 max-w-md mx-auto relative">
      {/* Language Switcher in top corner */}
      <div className="absolute top-4 right-4 flex gap-1 bg-white border border-slate-200 rounded-full p-1 shadow-xs">
        {languages.map((l) => (
          <button
            key={l.code}
            type="button"
            onClick={() => setLanguage(l.code)}
            className={`px-2.5 py-1 rounded-full text-[11px] font-bold transition cursor-pointer ${
              language === l.code
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {l.label}
          </button>
        ))}
      </div>

      {/* Brand Header */}
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-3xl bg-gradient-to-tr from-emerald-600 to-teal-500 shadow-xl shadow-emerald-600/20 mb-3 transform hover:rotate-6 transition">
          <span className="text-3xl">🎙️</span>
        </div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight font-mono">
          बोलता खाता
        </h1>
        <p className="text-xs font-bold text-emerald-700 uppercase tracking-widest mt-1">
          BOLTA KHATA AI
        </p>
        <p className="text-xs text-slate-500 mt-0.5">
          {t('brandTagline', language)}
        </p>
      </div>

      {/* Login Card */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xl">
        <div className="flex border-b border-slate-200 mb-6">
          <button
            type="button"
            onClick={() => { setIsRegister(false); setError(''); }}
            className={`flex-1 pb-3 text-xs font-bold transition border-b-2 cursor-pointer ${
              !isRegister
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            लॉगिन (Login)
          </button>
          <button
            type="button"
            onClick={() => { setIsRegister(true); setError(''); }}
            className={`flex-1 pb-3 text-xs font-bold transition border-b-2 cursor-pointer ${
              isRegister
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            नया खाता (Register)
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {isRegister && (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                दुकानदार का नाम (Owner Name)
              </label>
              <input
                type="text"
                required
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
                placeholder="उदा. रमेश शर्मा"
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              फ़ोन नंबर (Phone Number)
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-2.5 text-sm text-slate-500 font-semibold">+91</span>
              <input
                type="tel"
                required
                maxLength={10}
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                placeholder="9000000001"
                className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-12 pr-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              सुरक्षा पिन (4–6 Digit PIN)
            </label>
            <input
              type="password"
              required
              maxLength={6}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
              placeholder="••••"
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 tracking-widest focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 font-mono"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold py-3 px-4 rounded-xl shadow-md shadow-emerald-600/20 transition transform active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            {loading ? 'प्रतीक्षा करें...' : isRegister ? 'नया खाता बनाएँ' : 'खाता खोलें (Login)'}
          </button>
        </form>

        {/* Demo login quick button */}
        <div className="mt-6 pt-4 border-t border-slate-200 text-center">
          <button
            type="button"
            onClick={fillDemoCreds}
            className="text-xs text-emerald-700 hover:text-emerald-800 font-bold transition cursor-pointer hover:underline"
          >
            ⚡ {t('demoHintBtn', language)}
          </button>
        </div>
      </div>
    </div>
  )
}
