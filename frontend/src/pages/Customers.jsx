import React, { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAppStore } from '../store/appStore'
import { api } from '../api/rest'
import { OfflineBanner } from '../components/OfflineBanner'

export function Customers() {
  const navigate = useNavigate()
  const customers = useAppStore((s) => s.customers)
  const setCustomers = useAppStore((s) => s.setCustomers)
  const addCustomer = useAppStore((s) => s.addCustomer)
  const isOffline = useAppStore((s) => s.isOffline)

  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const [showAddForm, setShowAddForm] = useState(false)

  // Add form state
  const [newName, setNewName] = useState('')
  const [newPhone, setNewPhone] = useState('')
  const [newArea, setNewArea] = useState('')
  const [formError, setFormError] = useState('')
  const [similarWarning, setSimilarWarning] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  const fetchCustomers = async (query = '') => {
    setLoading(true)
    try {
      const data = await api.getCustomers(query)
      setCustomers(data)
    } catch (err) {
      console.warn('Failed to load customers:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCustomers(search)
  }, [search])

  const handleCreateCustomer = async (confirm = false) => {
    if (!newName.trim()) {
      setFormError('ग्राहक का नाम आवश्यक है')
      return
    }

    setSubmitting(true)
    setFormError('')
    setSimilarWarning(null)

    try {
      const res = await api.createCustomer(
        newName.trim(),
        newPhone.trim() || null,
        newArea.trim() || null,
        confirm
      )
      addCustomer(res.customer)
      setShowAddForm(false)
      setNewName('')
      setNewPhone('')
      setNewArea('')
    } catch (err) {
      if (err.status === 409 && err.data?.detail === 'similar_exists') {
        setSimilarWarning(err.data.similar || [])
      } else {
        setFormError(err.message || 'ग्राहक जोड़ने में विफल')
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col pb-20 max-w-md mx-auto shadow-2xl">
      <OfflineBanner />

      {/* Top Header */}
      <header className="px-5 pt-5 pb-3 border-b border-slate-900 bg-slate-950/80 backdrop-blur-md sticky top-0 z-30">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-xl font-bold text-white">ग्राहक खाता (Ledger)</h1>
          <button
            type="button"
            onClick={() => {
              setShowAddForm(!showAddForm)
              setSimilarWarning(null)
              setFormError('')
            }}
            className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow transition transform active:scale-95 cursor-pointer flex items-center gap-1"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span>नया ग्राहक</span>
          </button>
        </div>

        {/* Search input */}
        <div className="relative">
          <svg className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="नाम, फ़ोन या मोहल्ला खोजें..."
            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          />
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 px-4 py-4">
        {/* Add Customer Modal/Panel */}
        {showAddForm && (
          <div className="mb-6 p-4 rounded-2xl bg-slate-900 border border-emerald-500/30 shadow-xl animate-fade-in">
            <h2 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
              <span>➕ नया ग्राहक जोड़ें</span>
            </h2>

            {formError && (
              <div className="mb-3 p-2.5 rounded-lg bg-rose-950/40 border border-rose-800/60 text-rose-300 text-xs">
                {formError}
              </div>
            )}

            {/* Similar Name Warning Banner */}
            {similarWarning && (
              <div className="mb-4 p-3 rounded-xl bg-amber-950/40 border border-amber-500/40 text-amber-200 text-xs">
                <p className="font-bold mb-1.5 text-amber-300">
                  ⚠️ मिलता-जुलता नाम मौजूद है (Similar Customer Found):
                </p>
                <div className="space-y-1 mb-3">
                  {similarWarning.map((sim) => (
                    <div key={sim.id} className="p-2 rounded bg-slate-950/60 flex items-center justify-between">
                      <span className="font-semibold text-white">{sim.name}</span>
                      <span className="text-[10px] text-slate-400">{sim.area || 'No Area'}</span>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleCreateCustomer(true)}
                    disabled={submitting}
                    className="flex-1 bg-amber-600 hover:bg-amber-500 text-white font-bold py-1.5 rounded-lg text-xs"
                  >
                    हाँ, नया ही बनाएँ (Confirm Add)
                  </button>
                  <button
                    type="button"
                    onClick={() => setSimilarWarning(null)}
                    className="px-3 bg-slate-800 text-slate-300 rounded-lg text-xs"
                  >
                    रद्द करें
                  </button>
                </div>
              </div>
            )}

            {!similarWarning && (
              <div className="space-y-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">नाम *</label>
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="उदा. रमेश शर्मा"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">फ़ोन (वैकल्पिक)</label>
                    <input
                      type="tel"
                      value={newPhone}
                      onChange={(e) => setNewPhone(e.target.value)}
                      placeholder="9876543210"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">मोहल्ला / क्षेत्र (Area)</label>
                    <input
                      type="text"
                      value={newArea}
                      onChange={(e) => setNewArea(e.target.value)}
                      placeholder="गांधी नगर"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => handleCreateCustomer(false)}
                    disabled={submitting}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2 rounded-xl text-xs transition transform active:scale-95 disabled:opacity-50"
                  >
                    {submitting ? 'सहेज रहे हैं...' : 'ग्राहक जोड़ें'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddForm(false)}
                    className="px-4 bg-slate-800 text-slate-300 rounded-xl text-xs hover:bg-slate-700"
                  >
                    रद्द
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Customer List */}
        {loading && customers.length === 0 ? (
          <div className="text-center py-10 text-xs text-slate-500">लोड हो रहा है...</div>
        ) : customers.length === 0 ? (
          <div className="text-center py-12 bg-slate-900/40 rounded-2xl border border-slate-800">
            <span className="text-4xl block mb-2">👥</span>
            <p className="text-sm font-semibold text-slate-300">कोई ग्राहक नहीं मिला</p>
            <p className="text-xs text-slate-500 mt-1">ऊपर दिए बटन से नया ग्राहक जोड़ें या बोलकर खाता बनाएँ</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {customers.map((c) => {
              const balanceRupees = (c.balance_paise / 100).toLocaleString('en-IN')
              const owesMoney = c.balance_paise > 0

              return (
                <Link
                  key={c.id}
                  to={`/customers/${c.id}`}
                  className="p-3.5 rounded-2xl bg-slate-900/70 border border-slate-800/80 hover:border-slate-700 flex items-center justify-between transition active:scale-[0.99] block"
                >
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                      {c.name}
                    </h3>
                    <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-400">
                      {c.area && <span>📍 {c.area}</span>}
                      {c.phone && <span>📞 {c.phone}</span>}
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] uppercase font-semibold text-slate-400 block">
                      {owesMoney ? 'बाकी (Due)' : 'शून्य (Clear)'}
                    </span>
                    <span
                      className={`text-base font-extrabold ${
                        owesMoney ? 'text-emerald-400' : 'text-slate-400'
                      }`}
                    >
                      ₹{balanceRupees}
                    </span>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-slate-950/95 border-t border-slate-900 px-6 py-2.5 flex items-center justify-around z-40 backdrop-blur-md">
        <Link to="/" className="flex flex-col items-center gap-1 text-slate-400 hover:text-slate-200 transition">
          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
            <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
          </svg>
          <span className="text-[10px] font-semibold">होम</span>
        </Link>

        <Link to="/customers" className="flex flex-col items-center gap-1 text-emerald-400">
          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
          <span className="text-[10px] font-semibold">ग्राहक खाता</span>
        </Link>

        <Link to="/profile" className="flex flex-col items-center gap-1 text-slate-400 hover:text-slate-200 transition">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <span className="text-[10px] font-semibold">प्रोफ़ाइल</span>
        </Link>
      </nav>
    </div>
  )
}
