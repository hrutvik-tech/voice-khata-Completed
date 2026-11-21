import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppStore } from '../store/appStore'
import { api } from '../api/rest'

export function Login() {
  const navigate = useNavigate()
  const setToken = useAppStore((s) => s.setToken)
  const setShop = useAppStore((s) => s.setShop)

  const [isRegister, setIsRegister] = useState(false)
  const [phone, setPhone] = useState('9000000001')
  const [pin, setPin] = useState('1234')
  const [ownerName, setOwnerName] = useState('Sharma')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

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
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center px-4 py-8 max-w-md mx-auto">
      {/* Brand Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-400 shadow-xl shadow-emerald-500/20 mb-3">
          <span className="text-3xl">🎙️</span>
        </div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight">बोलता खाता</h1>
        <p className="text-sm text-slate-400 mt-1">किराना दुकानों का आधुनिक बोलता बहीखाता</p>
      </div>

      {/* Login Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl backdrop-blur-md">
        <div className="flex border-b border-slate-800 mb-6">
          <button
            type="button"
            onClick={() => { setIsRegister(false); setError(''); }}
            className={`flex-1 pb-3 text-sm font-semibold transition border-b-2 cursor-pointer ${
              !isRegister
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-300'
            }`}
          >
            लॉगिन (Login)
          </button>
          <button
            type="button"
            onClick={() => { setIsRegister(true); setError(''); }}
            className={`flex-1 pb-3 text-sm font-semibold transition border-b-2 cursor-pointer ${
              isRegister
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-300'
            }`}
          >
            नया खाता (Register)
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-950/40 border border-rose-800/60 text-rose-300 text-xs font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {isRegister && (
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                दुकानदार का नाम (Owner Name)
              </label>
              <input
                type="text"
                required
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
                placeholder="उदा. रमेश शर्मा"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              फ़ोन नंबर (Phone Number)
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-2.5 text-sm text-slate-500">+91</span>
              <input
                type="tel"
                required
                maxLength={10}
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                placeholder="9000000001"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-12 pr-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              सुरक्षा पिन (4–6 Digit PIN)
            </label>
            <input
              type="password"
              required
              maxLength={6}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
              placeholder="••••"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white tracking-widest focus:outline-none focus:border-emerald-500"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold py-3 px-4 rounded-xl shadow-lg shadow-emerald-700/30 transition transform active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            {loading ? 'प्रतीक्षा करें...' : isRegister ? 'खाता बनाएँ' : 'खाता खोलें (Login)'}
          </button>
        </form>

        {/* Demo login quick button */}
        <div className="mt-6 pt-4 border-t border-slate-800 text-center">
          <button
            type="button"
            onClick={fillDemoCreds}
            className="text-xs text-slate-400 hover:text-emerald-400 font-mono underline cursor-pointer"
          >
            डेमो दुकान के क्रेडेंशियल भरें (Demo: 9000000001 / 1234)
          </button>
        </div>
      </div>
    </div>
  )
}
