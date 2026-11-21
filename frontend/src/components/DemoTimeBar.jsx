import React, { useState } from 'react'
import { useAppStore } from '../store/appStore'

export function DemoTimeBar() {
  const isDemo = import.meta.env.VITE_DEMO_MODE === 'true'
  const demoTime = useAppStore((s) => s.demoTime)
  const setDemoTime = useAppStore((s) => s.setDemoTime)

  const [isOpen, setIsOpen] = useState(false)
  const [customTime, setCustomTime] = useState('')

  if (!isDemo) return null

  const presets = [
    { label: 'Now (Real Time)', value: null },
    { label: 'Step 1-11: 21 Nov 19:00', value: '2026-11-21T19:00:00+05:30' },
    { label: 'Step 12: 22 Nov 01:05 (Prev Day)', value: '2026-11-22T01:05:00+05:30' },
    { label: 'Step 13: 22 Nov 01:10', value: '2026-11-22T01:10:00+05:30' },
    { label: 'Step 15: 22 Nov 01:14', value: '2026-11-22T01:14:00+05:30' },
  ]

  return (
    <div className="bg-purple-50 border-b border-purple-200 px-3 py-1.5 text-xs text-purple-900 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-purple-600"></span>
        <span className="font-mono text-purple-700 font-bold">Demo Mode:</span>
        <span className="font-mono text-slate-700">{demoTime ? new Date(demoTime).toLocaleString('en-IN') : 'Live Clock'}</span>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="px-2 py-0.5 rounded-lg bg-purple-100 hover:bg-purple-200 text-purple-800 text-[11px] font-semibold cursor-pointer border border-purple-300"
        >
          {isOpen ? 'Close' : 'Change Demo Time'}
        </button>
      </div>

      {isOpen && (
        <div className="absolute top-10 right-4 z-50 bg-white border border-purple-200 rounded-2xl p-3 shadow-xl w-72 text-slate-800 animate-fade-in">
          <p className="font-bold text-xs text-purple-900 mb-2">Select Virtual Test Time:</p>
          <div className="space-y-1 mb-3">
            {presets.map((p, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  setDemoTime(p.value)
                  setIsOpen(false)
                }}
                className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs transition cursor-pointer ${
                  demoTime === p.value
                    ? 'bg-purple-600 text-white font-bold'
                    : 'bg-slate-50 hover:bg-purple-50 text-slate-700 border border-slate-200/60'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault()
              if (customTime) {
                setDemoTime(customTime)
                setIsOpen(false)
              }
            }}
            className="flex gap-1"
          >
            <input
              type="text"
              placeholder="ISO (YYYY-MM-DDTHH:MM:SS+05:30)"
              value={customTime}
              onChange={(e) => setCustomTime(e.target.value)}
              className="flex-1 bg-slate-50 border border-slate-300 rounded-lg px-2 py-1 text-[11px] text-slate-900 focus:outline-none focus:border-purple-500"
            />
            <button
              type="submit"
              className="px-2 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-semibold cursor-pointer"
            >
              Set
            </button>
          </form>
        </div>
      )}
    </div>
  )
}
