import React from 'react'
import { useAppStore } from '../store/appStore'
import { t } from '../i18n/translations'

export function VoiceQuestion({ question, onChoice }) {
  const language = useAppStore((s) => s.language)

  if (!question) return null

  return (
    <div className="bg-indigo-50 border-2 border-indigo-200 rounded-2xl p-4 my-3 shadow-md animate-fade-in">
      <div className="flex items-center gap-2 mb-2">
        <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 animate-ping"></span>
        <span className="text-xs uppercase tracking-wider font-bold text-indigo-700">
          {t('askingQuestion', language)}
        </span>
      </div>

      <p className="text-sm font-semibold text-slate-900 mb-3">{question.say}</p>

      {question.options && question.options.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {question.options.map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => {
                if (question.kind === 'choose_customer') {
                  onChoice({ customer_id: Number(opt.id) })
                } else if (question.kind === 'confirm_direction') {
                  onChoice({ answer: opt.id })
                } else {
                  onChoice({ answer: opt.id })
                }
              }}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs transition transform active:scale-95 cursor-pointer"
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
