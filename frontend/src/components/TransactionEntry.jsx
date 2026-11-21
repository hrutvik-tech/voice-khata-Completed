import React from 'react'

export function TransactionEntry({ entry }) {
  if (!entry) return null

  const isCredit = entry.direction === 'credit'
  const isUndone = entry.status === 'undone'
  const isAmended = entry.status === 'amended'
  const isOffline = entry.source === 'offline'

  const amountRupees = (entry.amount_paise / 100).toLocaleString('en-IN')
  const oldAmountRupees = entry.old_amount_paise
    ? (entry.old_amount_paise / 100).toLocaleString('en-IN')
    : null

  // Format recorded time
  let timeStr = ''
  if (entry.recorded_at) {
    try {
      const dt = new Date(entry.recorded_at)
      timeStr = dt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
    } catch {
      timeStr = entry.recorded_at
    }
  }

  return (
    <div
      className={`p-3 my-2 rounded-xl border flex items-center justify-between transition-all ${
        isUndone
          ? 'bg-slate-900/60 border-slate-800 opacity-60'
          : isCredit
          ? 'bg-slate-900/90 border-emerald-900/40'
          : 'bg-slate-900/90 border-blue-900/40'
      }`}
    >
      <div className="flex-1">
        <div className="flex items-center gap-1.5 flex-wrap">
          {entry.customer_name && (
            <span className="text-xs font-bold text-white mr-1">
              {entry.customer_name}
            </span>
          )}

          <span
            className={`text-[11px] px-2 py-0.5 rounded font-semibold ${
              isCredit
                ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/60'
                : 'bg-blue-950 text-blue-400 border border-blue-800/60'
            }`}
          >
            {isCredit ? 'उधार (Credit)' : 'जमा (Payment)'}
          </span>

          {entry.language && (
            <span className="text-[10px] uppercase font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-400">
              {entry.language}
            </span>
          )}

          {isOffline && (
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-950 text-amber-300 border border-amber-800/40">
              Offline
            </span>
          )}

          {isAmended && (
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-purple-950 text-purple-300 border border-purple-800/40">
              संशोधित
            </span>
          )}

          {isUndone && (
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-rose-950 text-rose-300 border border-rose-800/40">
              रद्द
            </span>
          )}
        </div>

        <div className="mt-1 text-[11px] text-slate-400">
          <span>{entry.business_date || 'आज'}</span>
          {timeStr && <span className="ml-1.5">• {timeStr}</span>}
        </div>
      </div>

      <div className="text-right ml-2">
        {oldAmountRupees && (
          <div className="text-[11px] text-slate-500 line-through">
            ₹{oldAmountRupees}
          </div>
        )}
        <div
          className={`text-base font-extrabold ${
            isUndone
              ? 'text-slate-500 line-through'
              : isCredit
              ? 'text-emerald-400'
              : 'text-blue-400'
          }`}
        >
          {isCredit ? '+' : '-'}₹{amountRupees}
        </div>
      </div>
    </div>
  )
}
