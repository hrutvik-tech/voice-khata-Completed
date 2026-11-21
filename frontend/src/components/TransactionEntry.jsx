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
      className={`p-3.5 my-2 rounded-xl border flex items-center justify-between transition-all ${
        isUndone
          ? 'bg-slate-900/40 border-slate-800 opacity-60'
          : isCredit
          ? 'bg-emerald-950/20 border-emerald-800/40'
          : 'bg-blue-950/20 border-blue-800/40'
      }`}
    >
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span
            className={`text-xs px-2 py-0.5 rounded font-medium ${
              isCredit
                ? 'bg-emerald-500/20 text-emerald-300'
                : 'bg-blue-500/20 text-blue-300'
            }`}
          >
            {isCredit ? 'उधार (Credit)' : 'जमा (Payment)'}
          </span>

          {entry.language && (
            <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
              {entry.language}
            </span>
          )}

          {isOffline && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
              Offline
            </span>
          )}

          {isAmended && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300">
              संशोधित (Amended)
            </span>
          )}

          {isUndone && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300">
              रद्द (Undone)
            </span>
          )}
        </div>

        <div className="mt-1 text-xs text-slate-400">
          <span>{entry.business_date || 'आज'}</span>
          {timeStr && <span className="ml-2">• {timeStr}</span>}
        </div>
      </div>

      <div className="text-right">
        {oldAmountRupees && (
          <div className="text-xs text-slate-500 line-through">
            ₹{oldAmountRupees}
          </div>
        )}
        <div
          className={`text-lg font-bold ${
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
