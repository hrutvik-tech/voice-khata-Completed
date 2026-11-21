import React from 'react'
import ReactDOM from 'react-dom/client'
import { App } from './App'
import { useAppStore } from './store/appStore'
import './index.css'

// Listen for network online / offline events
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    useAppStore.getState().setOffline(false)
  })
  window.addEventListener('offline', () => {
    useAppStore.getState().setOffline(true)
  })
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
