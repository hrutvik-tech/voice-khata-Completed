import { useAppStore } from '../store/appStore'
import { mockApi } from './mockRest'

const getBaseUrl = () => {
  if (import.meta.env.VITE_API_URL !== undefined && import.meta.env.VITE_API_URL !== '') {
    return import.meta.env.VITE_API_URL
  }
  if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
    return 'http://localhost:8000'
  }
  return ''
}

const BASE_URL = getBaseUrl()

// Auto-detect if deployed on a static host (like Vercel) without a live backend URL configured
const IS_STATIC_DEPLOYMENT = typeof window !== 'undefined' &&
  window.location.hostname !== 'localhost' &&
  window.location.hostname !== '127.0.0.1' &&
  (!import.meta.env.VITE_API_URL || import.meta.env.VITE_API_URL === '')

async function request(path, options = {}) {
  const token = useAppStore.getState().token
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
  })

  if (res.status === 204) {
    return null
  }

  const data = await res.json().catch(() => null)

  if (!res.ok) {
    const error = new Error(data?.detail || res.statusText || 'API Request Failed')
    error.status = res.status
    error.data = data
    throw error
  }

  return data
}

export const api = {
  // Auth
  register: async (owner_name, phone, pin) => {
    if (IS_STATIC_DEPLOYMENT) return mockApi.register(owner_name, phone, pin)
    try {
      return await request('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ owner_name, phone, pin }),
      })
    } catch (e) {
      if (IS_STATIC_DEPLOYMENT || !BASE_URL) return mockApi.register(owner_name, phone, pin)
      throw e
    }
  },

  login: async (phone, pin) => {
    if (IS_STATIC_DEPLOYMENT) return mockApi.login(phone, pin)
    try {
      return await request('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ phone, pin }),
      })
    } catch (e) {
      if (IS_STATIC_DEPLOYMENT || !BASE_URL) return mockApi.login(phone, pin)
      throw e
    }
  },

  changePin: async (old_pin, new_pin) => {
    if (IS_STATIC_DEPLOYMENT) return mockApi.changePin(old_pin, new_pin)
    try {
      return await request('/auth/pin', {
        method: 'PUT',
        body: JSON.stringify({ old_pin, new_pin }),
      })
    } catch (e) {
      if (IS_STATIC_DEPLOYMENT || !BASE_URL) return mockApi.changePin(old_pin, new_pin)
      throw e
    }
  },

  // Shop
  getShop: async () => {
    if (IS_STATIC_DEPLOYMENT) return mockApi.getShop()
    try {
      return await request('/shop')
    } catch (e) {
      if (IS_STATIC_DEPLOYMENT || !BASE_URL) return mockApi.getShop()
      throw e
    }
  },

  updateShop: async (data) => {
    if (IS_STATIC_DEPLOYMENT) return mockApi.updateShop(data)
    try {
      return await request('/shop', {
        method: 'PUT',
        body: JSON.stringify(data),
      })
    } catch (e) {
      if (IS_STATIC_DEPLOYMENT || !BASE_URL) return mockApi.updateShop(data)
      throw e
    }
  },

  deleteShopData: async () => {
    if (IS_STATIC_DEPLOYMENT) return mockApi.deleteShopData()
    try {
      return await request('/me', { method: 'DELETE' })
    } catch (e) {
      if (IS_STATIC_DEPLOYMENT || !BASE_URL) return mockApi.deleteShopData()
      throw e
    }
  },

  // Customers
  getCustomers: async (search = '') => {
    if (IS_STATIC_DEPLOYMENT) return mockApi.getCustomers(search)
    try {
      const query = search ? `?search=${encodeURIComponent(search)}` : ''
      return await request(`/customers${query}`)
    } catch (e) {
      if (IS_STATIC_DEPLOYMENT || !BASE_URL) return mockApi.getCustomers(search)
      throw e
    }
  },

  getCustomer: async (id) => {
    if (IS_STATIC_DEPLOYMENT) return mockApi.getCustomer(id)
    try {
      return await request(`/customers/${id}`)
    } catch (e) {
      if (IS_STATIC_DEPLOYMENT || !BASE_URL) return mockApi.getCustomer(id)
      throw e
    }
  },

  createCustomer: async (name, phone = null, area = null, confirm = false) => {
    if (IS_STATIC_DEPLOYMENT) return mockApi.createCustomer(name, phone, area, confirm)
    try {
      return await request('/customers', {
        method: 'POST',
        body: JSON.stringify({ name, phone, area, confirm }),
      })
    } catch (e) {
      if (IS_STATIC_DEPLOYMENT || !BASE_URL) return mockApi.createCustomer(name, phone, area, confirm)
      throw e
    }
  },

  // Summary
  getTodaySummary: async () => {
    if (IS_STATIC_DEPLOYMENT) return mockApi.getTodaySummary()
    try {
      return await request('/summary/today')
    } catch (e) {
      if (IS_STATIC_DEPLOYMENT || !BASE_URL) return mockApi.getTodaySummary()
      throw e
    }
  },

  // Offline audio sync
  syncAudio: async (audioBlob, idempotencyKey, recordedAtIso) => {
    if (IS_STATIC_DEPLOYMENT) return mockApi.syncAudio(audioBlob, idempotencyKey, recordedAtIso)
    try {
      const token = useAppStore.getState().token
      const formData = new FormData()
      formData.append('audio', audioBlob, 'offline.wav')
      formData.append('idempotency_key', idempotencyKey)
      formData.append('recorded_at', recordedAtIso)

      const headers = {}
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }

      const res = await fetch(`${BASE_URL}/sync/audio`, {
        method: 'POST',
        headers,
        body: formData,
      })

      if (!res.ok) {
        const data = await res.json().catch(() => null)
        const error = new Error(data?.detail || 'Sync failed')
        error.status = res.status
        throw error
      }

      return res.json()
    } catch (e) {
      if (IS_STATIC_DEPLOYMENT || !BASE_URL) return mockApi.syncAudio(audioBlob, idempotencyKey, recordedAtIso)
      throw e
    }
  },

  // Debug endpoints
  debugTurn: async (text, now = null, session_id = null) => {
    if (IS_STATIC_DEPLOYMENT) return mockApi.debugTurn(text)
    try {
      return await request('/debug/turn', {
        method: 'POST',
        body: JSON.stringify({ text, now, session_id }),
      })
    } catch (e) {
      if (IS_STATIC_DEPLOYMENT || !BASE_URL) return mockApi.debugTurn(text)
      throw e
    }
  },

  debugChoose: async (turn_id, session_id, choice, now = null) => {
    if (IS_STATIC_DEPLOYMENT) return mockApi.debugChoose()
    try {
      return await request('/debug/choose', {
        method: 'POST',
        body: JSON.stringify({ turn_id, session_id, choice, now }),
      })
    } catch (e) {
      if (IS_STATIC_DEPLOYMENT || !BASE_URL) return mockApi.debugChoose()
      throw e
    }
  },

  debugReset: async (now = null) => {
    if (IS_STATIC_DEPLOYMENT) return mockApi.debugReset()
    try {
      return await request('/debug/reset', {
        method: 'POST',
        body: JSON.stringify({ now }),
      })
    } catch (e) {
      if (IS_STATIC_DEPLOYMENT || !BASE_URL) return mockApi.debugReset()
      throw e
    }
  },
}
