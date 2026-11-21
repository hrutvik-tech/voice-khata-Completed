import React, { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useAppStore } from '../store/appStore'
import { api } from '../api/rest'
import { Header } from '../components/Header'
import { Navbar } from '../components/Navbar'
import { TransactionEntry } from '../components/TransactionEntry'
import { OfflineBanner } from '../components/OfflineBanner'
import { DemoTimeBar } from '../components/DemoTimeBar'
import { t } from '../i18n/translations'
import { getInitial } from '../utils/initials'

export function CustomerProfile() {
  const { id } = useParams()
  const language = useAppStore((s) => s.language)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    setLoading(true)
    api.getCustomer(id)
      .then((res) => {
        setData(res)
        setLoading(false)
      })
      .catch((err) => {
        setError(err.message || t('errorOccurred', language))
        setLoading(false)
      })
  }, [id, language])

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900 flex items-center justify-center max-w-md mx-auto">
        <span className="text-xs text-slate-500 font-medium animate-pulse">{t('loading', language)}</span>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col items-center justify-center px-4 max-w-md mx-auto">
        <p className="text-sm font-bold text-rose-600 mb-4">{error || t('noCustomersFound', language)}</p>
        <Link to="/customers" className="text-xs font-bold text-emerald-700 underline">
          ← {t('khataTitle', language)}
        </Link>
      </div>
    )
  }

  const { customer, balance_paise, entries } = data
  const balanceRupees = (Math.abs(balance_paise) / 100).toLocaleString('en-IN')
  const owesMoney = balance_paise > 0
  const isZero = balance_paise === 0

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col pb-24 max-w-md mx-auto relative border-x border-slate-200 shadow-xl">
      <OfflineBanner />
      <DemoTimeBar />
      <Header subtitle={customer.name} />

      {/* Main Content */}
      <main className="flex-1 px-4 py-3 flex flex-col space-y-3">
        {/* Navigation Breadcrumb / Back button */}
        <div className="flex items-center justify-between">
          <Link
            to="/customers"
            className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 hover:text-emerald-800 transition"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
            </svg>
            <span>{t('khataTitle', language)}</span>
          </Link>

          <span className="text-[11px] font-bold text-slate-400">ID: #{customer.id}</span>
        </div>

        {/* Customer Statement Hero Card */}
        <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs">
          <div className="flex items-start justify-between">
            <div>
              <div
                className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-base font-black text-emerald-700 mb-2 overflow-hidden notranslate select-none"
                translate="no"
              >
                {getInitial(customer.name)}
              </div>
              <h1 className="text-base font-bold text-slate-900">{customer.name}</h1>
              <div className="mt-1 space-y-0.5 text-xs text-slate-500">
                {customer.area && <p>📍 {customer.area}</p>}
                {customer.phone && <p>📞 {customer.phone}</p>}
              </div>
            </div>

            <div className="text-right">
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">
                {owesMoney ? t('owesYou', language) : isZero ? t('settled', language) : t('advancePaid', language)}
              </span>
              <span
                className={`text-2xl font-black ${
                  owesMoney ? 'text-rose-600' : isZero ? 'text-slate-400' : 'text-emerald-600'
                }`}
              >
                ₹{balanceRupees}
              </span>
            </div>
          </div>
        </div>

        {/* Transaction History Section */}
        <div className="mt-2">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-xs font-bold text-slate-800">
              {t('transactionTimeline', language)} ({entries ? entries.length : 0})
            </h2>
          </div>

          {!entries || entries.length === 0 ? (
            <div className="text-center py-10 rounded-2xl bg-white border border-slate-200 shadow-xs">
              <p className="text-xs text-slate-500 font-medium">
                {t('noTransactionsForCustomer', language)}
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              {entries.map((entry) => (
                <TransactionEntry key={`profile-entry-${entry.id}`} entry={entry} />
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Bottom Navigation */}
      <Navbar />
    </div>
  )
}
