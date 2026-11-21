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
    <div className="bg-slate-800/80 border-b border-slate-700/60 px-3 py-1.5 text-xs text-slate-300 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-purple-400"></span>
        <span className="font-mono text-purple-300 font-semibold">Demo Mode:</span>
        <span className="font-mono">{demoTime ? new Date(demoTime).toLocaleString('en-IN') : 'Live Clock'}</span>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="px-2 py-0.5 rounded bg-purple-600/40 hover:bg-purple-600/60 text-purple-200 text-[11px] cursor-pointer"
        >
          {isOpen ? 'Close Time Controls' : 'Change Demo Time'}
        </button>
      </div>

      {isOpen && (
        <div className="absolute top-10 right-4 z-50 bg-slate-900 border border-purple-500/40 rounded-xl p-3 shadow-2xl w-72 text-slate-200">
          <p className="font-semibold text-xs text-purple-300 mb-2">Select Virtual Test Time:</p>
          <div className="space-y-1 mb-3">
            {presets.map((p, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  setDemoTime(p.value)
                  setIsOpen(false)
                }}
                className={`w-full text-left px-2.5 py-1.5 rounded text-xs transition ${
                  demoTime === p.value
                    ? 'bg-purple-600 text-white font-medium'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          <div className="pt-2 border-t border-slate-800">
            <input
              type="datetime-local"
              value={customTime}
              onChange={(e) => setCustomTime(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200 mb-2"
            />
            <button
              type="button"
              onClick={() => {
                if (customTime) {
                  setDemoTime(new Date(customTime).toISOString())
                  setIsOpen(false)
                }
              }}
              className="w-full bg-purple-600 hover:bg-purple-500 text-white py-1 rounded text-xs font-semibold"
            >
              Apply Custom Time
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
