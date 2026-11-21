import { useAppStore } from '../store/appStore'

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

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
  register: (owner_name, phone, pin) =>
    request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ owner_name, phone, pin }),
    }),

  login: (phone, pin) =>
    request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ phone, pin }),
    }),

  changePin: (old_pin, new_pin) =>
    request('/auth/pin', {
      method: 'PUT',
      body: JSON.stringify({ old_pin, new_pin }),
    }),

  // Shop
  getShop: () => request('/shop'),

  updateShop: (data) =>
    request('/shop', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  deleteShopData: () =>
    request('/me', {
      method: 'DELETE',
    }),

  // Customers
  getCustomers: (search = '') => {
    const query = search ? `?search=${encodeURIComponent(search)}` : ''
    return request(`/customers${query}`)
  },

  getCustomer: (id) => request(`/customers/${id}`),

  createCustomer: (name, phone = null, area = null, confirm = false) =>
    request('/customers', {
      method: 'POST',
      body: JSON.stringify({ name, phone, area, confirm }),
    }),

  // Summary
  getTodaySummary: () => request('/summary/today'),

  // Offline audio sync
  syncAudio: async (audioBlob, idempotencyKey, recordedAtIso) => {
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
  },

  // Debug endpoints
  debugTurn: (text, now = null, session_id = null) =>
    request('/debug/turn', {
      method: 'POST',
      body: JSON.stringify({ text, now, session_id }),
    }),

  debugChoose: (turn_id, session_id, choice, now = null) =>
    request('/debug/choose', {
      method: 'POST',
      body: JSON.stringify({ turn_id, session_id, choice, now }),
    }),

  debugReset: (now = null) =>
    request('/debug/reset', {
      method: 'POST',
      body: JSON.stringify({ now }),
    }),
}
