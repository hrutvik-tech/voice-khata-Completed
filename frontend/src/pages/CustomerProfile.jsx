import React, { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { api } from '../api/rest'
import { TransactionEntry } from '../components/TransactionEntry'
import { OfflineBanner } from '../components/OfflineBanner'

export function CustomerProfile() {
  const { id } = useParams()
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
        setError(err.message || 'ग्राहक का डेटा लोड करने में त्रुटि')
        setLoading(false)
      })
  }, [id])

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center max-w-md mx-auto">
        <span className="text-xs text-slate-400">लोड हो रहा है...</span>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center px-4 max-w-md mx-auto">
        <p className="text-sm text-rose-400 mb-4">{error || 'ग्राहक नहीं मिला'}</p>
        <Link to="/customers" className="text-xs text-emerald-400 underline">
          ग्राहक सूची पर वापस जाएँ
        </Link>
      </div>
    )
  }

  const { customer, balance_paise, entries } = data
  const balanceRupees = (balance_paise / 100).toLocaleString('en-IN')
  const owesMoney = balance_paise > 0

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col pb-20 max-w-md mx-auto shadow-xl border-x border-slate-900">
      <OfflineBanner />

      {/* Top Header */}
      <header className="px-4 pt-4 pb-3 border-b border-slate-800 bg-slate-900 sticky top-0 z-30 flex items-center justify-between">
        <Link to="/customers" className="p-1 -ml-1 text-slate-400 hover:text-white transition">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <h1 className="text-sm font-bold text-white truncate max-w-[200px]">{customer.name}</h1>
        <div className="w-5"></div>
      </header>

      {/* Main Content */}
      <main className="flex-1 px-4 py-3">
        {/* Customer Info Card & Balance */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 mb-4">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-base font-bold text-white">{customer.name}</h2>
              <div className="mt-1 space-y-0.5 text-xs text-slate-400">
                {customer.area && <p>📍 {customer.area}</p>}
                {customer.phone && <p>📞 {customer.phone}</p>}
              </div>
            </div>

            <div className="text-right">
              <span className="text-[10px] uppercase font-semibold text-slate-400 block mb-0.5">
                {owesMoney ? 'कुल बाकी' : 'खाता बराबर'}
              </span>
              <span
                className={`text-xl font-bold ${
                  owesMoney ? 'text-emerald-400' : 'text-slate-400'
                }`}
              >
                ₹{balanceRupees}
              </span>
            </div>
          </div>
        </div>

        {/* Transaction History Section */}
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-300">
            लेन-देन इतिहास ({entries ? entries.length : 0})
          </h3>
        </div>

        {!entries || entries.length === 0 ? (
          <div className="text-center py-8 rounded-xl bg-slate-900 border border-slate-800">
            <p className="text-xs text-slate-400">अभी तक कोई लेन-देन नहीं हुआ है</p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {entries.map((entry) => (
              <TransactionEntry key={entry.id} entry={entry} />
            ))}
          </div>
        )}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-slate-900 border-t border-slate-800 px-6 py-2.5 flex items-center justify-around z-40">
        <Link to="/" className="flex flex-col items-center gap-0.5 text-slate-400 hover:text-slate-200 transition">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
          </svg>
          <span className="text-[10px] font-semibold">होम</span>
        </Link>

        <Link to="/customers" className="flex flex-col items-center gap-0.5 text-emerald-400">
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
          <span className="text-[10px] font-semibold">खाता (Ledger)</span>
        </Link>

        <Link to="/profile" className="flex flex-col items-center gap-0.5 text-slate-400 hover:text-slate-200 transition">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <span className="text-[10px] font-semibold">प्रोफ़ाइल</span>
        </Link>
      </nav>
    </div>
  )
}
