import React, { useEffect, useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useAppStore } from '../store/appStore'
import { api } from '../api/rest'
import { Header } from '../components/Header'
import { Navbar } from '../components/Navbar'
import { TransactionEntry } from '../components/TransactionEntry'
import { OfflineBanner } from '../components/OfflineBanner'
import { DemoTimeBar } from '../components/DemoTimeBar'
import { t } from '../i18n/translations'

export function History() {
  const language = useAppStore((s) => s.language)
  const isOffline = useAppStore((s) => s.isOffline)
  const recentEntries = useAppStore((s) => s.recentEntries)

  const [loading, setLoading] = useState(true)
  const [transactions, setTransactions] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState('all') // 'all' | 'credit' | 'payment'
  const [dateFilter, setDateFilter] = useState('all') // 'all' | 'today' | 'week'

  // Fetch all transactions from customer histories
  useEffect(() => {
    let isMounted = true

    async function loadAllTransactions() {
      if (isOffline) {
        setTransactions(recentEntries)
        setLoading(false)
        return
      }

      setLoading(true)
      try {
        const customers = await api.getCustomers()
        if (!isMounted) return

        // Fetch each customer's transaction entries
        const entryPromises = customers.map(async (c) => {
          try {
            const detail = await api.getCustomer(c.id)
            return (detail.entries || []).map((e) => ({
              ...e,
              customer_name: e.customer_name || c.name,
              customer_id: c.id,
            }))
          } catch {
            return []
          }
        })

        const results = await Promise.all(entryPromises)
        const allFetchedEntries = results.flat()

        // Merge with recentEntries from app store to catch freshly added live transactions
        const mergedMap = new Map()

        allFetchedEntries.forEach((e) => {
          if (e && e.id) mergedMap.set(`entry-${e.id}`, e)
        })

        recentEntries.forEach((e) => {
          if (e && e.id) mergedMap.set(`entry-${e.id}`, e)
        })

        const combined = Array.from(mergedMap.values())

        // Sort descending: newest first
        combined.sort((a, b) => {
          const dateA = a.recorded_at ? new Date(a.recorded_at).getTime() : 0
          const dateB = b.recorded_at ? new Date(b.recorded_at).getTime() : 0
          return dateB - dateA
        })

        if (isMounted) {
          setTransactions(combined)
          setLoading(false)
        }
      } catch (err) {
        console.warn('Failed to load transaction history:', err)
        if (isMounted) {
          setTransactions(recentEntries)
          setLoading(false)
        }
      }
    }

    loadAllTransactions()

    return () => {
      isMounted = false
    }
  }, [isOffline, recentEntries])

  // Filtered transactions
  const filteredTransactions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    const now = new Date()
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
    const sevenDaysAgo = startOfToday - 7 * 24 * 60 * 60 * 1000

    return transactions.filter((entry) => {
      // 1. Customer Name Search (case-insensitive partial matching)
      if (q) {
        const custName = (entry.customer_name || '').toLowerCase()
        if (!custName.includes(q)) return false
      }

      // 2. Type Filter (Credit / Payment)
      if (typeFilter === 'credit' && entry.direction !== 'credit') return false
      if (typeFilter === 'payment' && entry.direction !== 'payment') return false

      // 3. Date Filter
      if (dateFilter !== 'all' && entry.recorded_at) {
        const entryTime = new Date(entry.recorded_at).getTime()
        if (dateFilter === 'today' && entryTime < startOfToday) return false
        if (dateFilter === 'week' && entryTime < sevenDaysAgo) return false
      }

      return true
    })
  }, [transactions, searchQuery, typeFilter, dateFilter])

  // Aggregate totals of filtered list
  const totals = useMemo(() => {
    let creditPaise = 0
    let paymentPaise = 0
    filteredTransactions.forEach((e) => {
      if (e.status !== 'undone') {
        if (e.direction === 'credit') creditPaise += e.amount_paise || 0
        if (e.direction === 'payment') paymentPaise += e.amount_paise || 0
      }
    })
    return {
      credit: (creditPaise / 100).toLocaleString('en-IN'),
      payment: (paymentPaise / 100).toLocaleString('en-IN'),
    }
  }, [filteredTransactions])

  const handleResetFilters = () => {
    setSearchQuery('')
    setTypeFilter('all')
    setDateFilter('all')
  }

  const isFiltered = searchQuery.trim() !== '' || typeFilter !== 'all' || dateFilter !== 'all'

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col pb-24 max-w-md mx-auto relative border-x border-slate-200 shadow-xl">
      <OfflineBanner />
      <DemoTimeBar />
      <Header subtitle={t('historyTitle', language)} />

      <main className="flex-1 px-4 py-3 flex flex-col space-y-3">
        {/* Page Title & Subtitle */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-base font-extrabold text-slate-900 tracking-tight">
              {t('historyTitle', language)}
            </h1>
            <p className="text-xs text-slate-500 font-medium">
              {t('historySub', language)}
            </p>
          </div>
          <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-slate-200/80 text-slate-700">
            {filteredTransactions.length}
          </span>
        </div>

        {/* 1. Customer Search Bar */}
        <div className="relative flex items-center">
          <span className="absolute left-3 text-slate-400">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('searchCustomerPlaceholder', language)}
            className="w-full bg-white border border-slate-300 rounded-2xl pl-9 pr-9 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 shadow-xs"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 w-5 h-5 rounded-full bg-slate-200 text-slate-600 hover:bg-slate-300 flex items-center justify-center text-[10px] cursor-pointer"
            >
              ✕
            </button>
          )}
        </div>

        {/* 2. Type & Date Filter Pills */}
        <div className="space-y-2">
          {/* Direction Filter */}
          <div className="flex gap-1.5 overflow-x-auto pb-0.5 no-scrollbar">
            <button
              type="button"
              onClick={() => setTypeFilter('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer shrink-0 ${
                typeFilter === 'all'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              {t('allTransactions', language)}
            </button>
            <button
              type="button"
              onClick={() => setTypeFilter('credit')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer shrink-0 ${
                typeFilter === 'credit'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'bg-white border border-slate-200 text-rose-600 hover:bg-rose-50'
              }`}
            >
              {t('creditsOnly', language)}
            </button>
            <button
              type="button"
              onClick={() => setTypeFilter('payment')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer shrink-0 ${
                typeFilter === 'payment'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-white border border-slate-200 text-emerald-700 hover:bg-emerald-50'
              }`}
            >
              {t('paymentsOnly', language)}
            </button>
          </div>

          {/* Date Filter & Reset */}
          <div className="flex items-center justify-between gap-1 text-[11px]">
            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => setDateFilter('all')}
                className={`px-2.5 py-1 rounded-lg font-semibold transition cursor-pointer ${
                  dateFilter === 'all'
                    ? 'bg-slate-800 text-white'
                    : 'bg-white border border-slate-200 text-slate-500 hover:bg-slate-100'
                }`}
              >
                {t('allTime', language)}
              </button>
              <button
                type="button"
                onClick={() => setDateFilter('today')}
                className={`px-2.5 py-1 rounded-lg font-semibold transition cursor-pointer ${
                  dateFilter === 'today'
                    ? 'bg-slate-800 text-white'
                    : 'bg-white border border-slate-200 text-slate-500 hover:bg-slate-100'
                }`}
              >
                {t('todayOnly', language)}
              </button>
              <button
                type="button"
                onClick={() => setDateFilter('week')}
                className={`px-2.5 py-1 rounded-lg font-semibold transition cursor-pointer ${
                  dateFilter === 'week'
                    ? 'bg-slate-800 text-white'
                    : 'bg-white border border-slate-200 text-slate-500 hover:bg-slate-100'
                }`}
              >
                {t('thisWeek', language)}
              </button>
            </div>

            {isFiltered && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="text-xs font-bold text-emerald-600 hover:underline cursor-pointer"
              >
                {t('resetFilters', language)}
              </button>
            )}
          </div>
        </div>

        {/* 3. Filtered Totals Summary Card */}
        <div className="grid grid-cols-2 gap-2 p-3 bg-white rounded-2xl border border-slate-200 shadow-xs">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600 block mb-0.5">
              {t('creditsOnly', language)}
            </span>
            <span className="text-base font-extrabold text-slate-900">
              ₹{totals.credit}
            </span>
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 block mb-0.5">
              {t('paymentsOnly', language)}
            </span>
            <span className="text-base font-extrabold text-slate-900">
              ₹{totals.payment}
            </span>
          </div>
        </div>

        {/* 4. Transactions List */}
        <div className="space-y-2 mt-1">
          {loading ? (
            <div className="py-12 text-center text-xs text-slate-500 animate-pulse font-medium">
              {t('loading', language)}
            </div>
          ) : filteredTransactions.length === 0 ? (
            <div className="py-12 px-4 text-center bg-white rounded-3xl border border-slate-200 shadow-xs">
              <span className="text-3xl block mb-2">📋</span>
              <h3 className="text-sm font-bold text-slate-800">{t('noTransactionsFound', language)}</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
                {t('noTransactionsDesc', language)}
              </p>
              {isFiltered && (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="mt-3 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer"
                >
                  {t('resetFilters', language)}
                </button>
              )}
            </div>
          ) : (
            <div>
              {filteredTransactions.map((entry) => (
                <TransactionEntry key={`history-${entry.id}`} entry={entry} />
              ))}
            </div>
          )}
        </div>
      </main>

      <Navbar />
    </div>
  )
}
