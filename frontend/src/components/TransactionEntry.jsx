import React from 'react'
import { Link } from 'react-router-dom'
import { useAppStore } from '../store/appStore'
import { t } from '../i18n/translations'

export function TransactionEntry({ entry }) {
  const language = useAppStore((s) => s.language)

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
      className={`p-3 my-2 rounded-2xl border transition-all ${
        isUndone
          ? 'bg-slate-50 border-slate-200 opacity-60'
          : isCredit
          ? 'bg-white border-slate-200 hover:border-rose-200 shadow-xs'
          : 'bg-white border-slate-200 hover:border-emerald-200 shadow-xs'
      } flex items-center justify-between`}
    >
      <div className="flex-1 min-w-0 pr-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          {entry.customer_name && (
            entry.customer_id ? (
              <Link
                to={`/customers/${entry.customer_id}`}
                className="text-xs font-bold text-slate-900 hover:text-emerald-700 hover:underline mr-1 truncate max-w-[130px]"
              >
                {entry.customer_name}
              </Link>
            ) : (
              <span className="text-xs font-bold text-slate-900 mr-1 truncate max-w-[130px]">
                {entry.customer_name}
              </span>
            )
          )}

          <span
            className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
              isCredit
                ? 'bg-rose-50 text-rose-700 border border-rose-200'
                : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
            }`}
          >
            {isCredit ? t('creditBadge', language) : t('paymentBadge', language)}
          </span>

          {entry.language && (
            <span className="text-[9px] uppercase font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
              {entry.language}
            </span>
          )}

          {isOffline && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 font-semibold">
              {t('statusOffline', language)}
            </span>
          )}

          {isAmended && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200 font-semibold">
              {t('statusAmended', language)}
            </span>
          )}

          {isUndone && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-200 text-slate-600 font-semibold">
              {t('statusUndone', language)}
            </span>
          )}
        </div>

        <div className="mt-1 text-[11px] text-slate-500 flex items-center gap-1">
          <span>{entry.business_date || t('todayOnly', language)}</span>
          {timeStr && <span>• {timeStr}</span>}
        </div>
      </div>

      <div className="text-right shrink-0">
        {oldAmountRupees && (
          <div className="text-[11px] text-slate-400 line-through">
            ₹{oldAmountRupees}
          </div>
        )}
        <div
          className={`text-sm sm:text-base font-extrabold ${
            isUndone
              ? 'text-slate-400 line-through'
              : isCredit
              ? 'text-rose-600'
              : 'text-emerald-600'
          }`}
        >
          {isCredit ? '+' : '-'}₹{amountRupees}
        </div>
      </div>
    </div>
  )
}
