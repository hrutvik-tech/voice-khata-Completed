import React, { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAppStore } from '../store/appStore'
import { api } from '../api/rest'
import { Header } from '../components/Header'
import { Navbar } from '../components/Navbar'
import { OfflineBanner } from '../components/OfflineBanner'
import { DemoTimeBar } from '../components/DemoTimeBar'
import { t } from '../i18n/translations'
import { getInitial } from '../utils/initials'

export function Customers() {
  const navigate = useNavigate()
  const language = useAppStore((s) => s.language)
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
      setFormError(t('customerNameLabel', language))
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
        setFormError(err.message || t('errorOccurred', language))
      }
    } finally {
      setSubmitting(false)
    }
  }

  // Calculate total ledger receivables
  const totalReceivablePaise = customers.reduce((sum, c) => sum + (c.balance_paise > 0 ? c.balance_paise : 0), 0)
  const totalReceivableRupees = (totalReceivablePaise / 100).toLocaleString('en-IN')

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col pb-24 max-w-md mx-auto relative border-x border-slate-200 shadow-xl">
      <OfflineBanner />
      <DemoTimeBar />
      <Header subtitle={t('khataTitle', language)} />

      <main className="flex-1 px-4 py-3 flex flex-col space-y-3">
        {/* Top Header Card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-3.5 shadow-xs flex items-center justify-between">
          <div>
            <h1 className="text-sm font-bold text-slate-900">{t('khataTitle', language)}</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              {t('totalDues', language)}:{' '}
              <span className="text-emerald-700 font-extrabold">₹{totalReceivableRupees}</span>
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setShowAddForm(!showAddForm)
              setSimilarWarning(null)
              setFormError('')
            }}
            className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition active:scale-95 cursor-pointer flex items-center gap-1 shadow-xs"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M12 4v16m8-8H4" />
            </svg>
            <span>{t('newCustomerBtn', language)}</span>
          </button>
        </div>

        {/* Search input */}
        <div className="relative">
          <svg className="w-4 h-4 text-slate-400 absolute left-3 top-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('searchCustomerKhata', language)}
            className="w-full bg-white border border-slate-300 rounded-2xl pl-9 pr-3.5 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 shadow-xs"
          />
        </div>

        {/* Add Customer Modal/Panel */}
        {showAddForm && (
          <div className="p-4 rounded-3xl bg-white border-2 border-emerald-500/40 shadow-xl animate-fade-in">
            <h2 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-600"></span>
              <span>{t('addCustomerTitle', language)}</span>
            </h2>

            {formError && (
              <div className="mb-3 p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
                {formError}
              </div>
            )}

            {/* Similar Name Warning Banner */}
            {similarWarning && (
              <div className="mb-4 p-3.5 rounded-2xl bg-amber-50 border border-amber-300 text-amber-900 text-xs">
                <p className="font-bold mb-1.5 text-amber-800">
                  ⚠️ {t('similarFoundTitle', language)}:
                </p>
                <div className="space-y-1 mb-3">
                  {similarWarning.map((sim) => (
                    <div key={sim.id} className="p-2 rounded-xl bg-white border border-amber-200 flex items-center justify-between">
                      <span className="font-bold text-slate-900">{sim.name}</span>
                      <span className="text-[10px] text-slate-500">{sim.area || 'No Area'}</span>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleCreateCustomer(true)}
                    className="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition cursor-pointer"
                  >
                    {t('confirmAddAnyway', language)}
                  </button>
                  <button
                    type="button"
                    onClick={() => setSimilarWarning(null)}
                    className="px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer"
                  >
                    {t('cancelBtn', language)}
                  </button>
                </div>
              </div>
            )}

            {!similarWarning && (
              <div className="space-y-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    {t('customerNameLabel', language)}
                  </label>
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="उदा. रमेश शर्मा"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      {t('customerPhoneLabel', language)}
                    </label>
                    <input
                      type="tel"
                      value={newPhone}
                      onChange={(e) => setNewPhone(e.target.value)}
                      placeholder="9876543210"
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      {t('customerAreaLabel', language)}
                    </label>
                    <input
                      type="text"
                      value={newArea}
                      onChange={(e) => setNewArea(e.target.value)}
                      placeholder="गांधी नगर"
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => handleCreateCustomer(false)}
                    disabled={submitting}
                    className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer disabled:opacity-50"
                  >
                    {submitting ? t('savingBtn', language) : t('saveCustomerBtn', language)}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddForm(false)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer"
                  >
                    {t('cancelBtn', language)}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Customer List */}
        {loading && customers.length === 0 ? (
          <div className="text-center py-10 text-xs text-slate-500 animate-pulse font-medium">
            {t('loading', language)}
          </div>
        ) : customers.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-3xl border border-slate-200 p-6 shadow-xs">
            <span className="text-4xl block mb-2">👥</span>
            <p className="text-sm font-bold text-slate-800">{t('noCustomersFound', language)}</p>
            <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
              {t('noCustomersDesc', language)}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {customers.map((c) => {
              const balanceRupees = (Math.abs(c.balance_paise) / 100).toLocaleString('en-IN')
              const owesMoney = c.balance_paise > 0
              const isZero = c.balance_paise === 0

              return (
                <Link
                  key={c.id}
                  to={`/customers/${c.id}`}
                  className="p-3.5 rounded-2xl bg-white border border-slate-200 hover:border-emerald-300 flex items-center justify-between transition shadow-xs active:scale-98 block group"
                >
                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-xs font-black text-emerald-700 overflow-hidden notranslate select-none"
                      translate="no"
                    >
                      {getInitial(c.name)}
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-slate-900 group-hover:text-emerald-700 transition flex items-center gap-1">
                        {c.name}
                      </h3>
                      <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-500">
                        {c.area && <span>📍 {c.area}</span>}
                        {c.phone && <span>📞 {c.phone}</span>}
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">
                      {owesMoney ? t('balanceDues', language) : isZero ? t('balanceZero', language) : t('balanceAdvance', language)}
                    </span>
                    <span
                      className={`text-sm font-black ${
                        owesMoney ? 'text-rose-600' : isZero ? 'text-slate-400' : 'text-emerald-600'
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
      <Navbar />
    </div>
  )
}
