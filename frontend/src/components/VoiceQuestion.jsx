import React from 'react'

export function VoiceQuestion({ question, onChoice }) {
  if (!question) return null

  return (
    <div className="bg-indigo-950/40 border border-indigo-500/40 rounded-2xl p-4 my-4 shadow-lg backdrop-blur-sm animate-fade-in">
      <div className="flex items-center gap-2 mb-2">
        <span className="w-2.5 h-2.5 rounded-full bg-indigo-400 animate-ping"></span>
        <span className="text-xs uppercase tracking-wider font-semibold text-indigo-300">
          स्पष्टीकरण आवश्यक (Clarification Needed)
        </span>
      </div>

      <p className="text-base font-medium text-slate-100 mb-3">{question.say}</p>

      {question.options && question.options.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {question.options.map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => {
                // If question is choose_customer, pass customer_id
                if (question.kind === 'choose_customer') {
                  onChoice({ customer_id: Number(opt.id) })
                } else if (question.kind === 'confirm_direction') {
                  onChoice({ answer: opt.id })
                } else {
                  onChoice({ answer: opt.id })
                }
              }}
              className="px-4 py-2.5 bg-indigo-600/80 hover:bg-indigo-500 text-white rounded-xl text-sm font-semibold shadow transition transform active:scale-95 cursor-pointer"
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
