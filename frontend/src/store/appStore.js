import { create } from 'zustand'

const TOKEN_KEY = 'bk_token'
const SHOP_KEY = 'bk_shop'

const getInitialToken = () => {
  try {
    return localStorage.getItem(TOKEN_KEY) || null
  } catch {
    return null
  }
}

const getInitialShop = () => {
  try {
    const raw = localStorage.getItem(SHOP_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export const useAppStore = create((set, get) => ({
  token: getInitialToken(),
  shop: getInitialShop(),
  customers: [],
  summary: {
    business_date: null,
    credit_paise: 0,
    payment_paise: 0,
    top: [],
  },
  isOffline: typeof navigator !== 'undefined' ? !navigator.onLine : false,
  demoTime: null, // ISO string or null

  setToken: (token) => {
    if (token) {
      try { localStorage.setItem(TOKEN_KEY, token) } catch {}
    } else {
      try { localStorage.removeItem(TOKEN_KEY) } catch {}
    }
    set({ token })
  },

  setShop: (shop) => {
    if (shop) {
      try { localStorage.setItem(SHOP_KEY, JSON.stringify(shop)) } catch {}
    } else {
      try { localStorage.removeItem(SHOP_KEY) } catch {}
    }
    set({ shop })
  },

  logout: () => {
    try {
      localStorage.removeItem(TOKEN_KEY)
      localStorage.removeItem(SHOP_KEY)
    } catch {}
    set({ token: null, shop: null, customers: [], summary: { credit_paise: 0, payment_paise: 0, top: [] } })
  },

  setCustomers: (customers) => set({ customers }),

  addCustomer: (customer) => set((state) => ({
    customers: [customer, ...state.customers.filter((c) => c.id !== customer.id)],
  })),

  updateCustomerBalance: (customerId, balancePaise) => set((state) => ({
    customers: state.customers.map((c) => (c.id === customerId ? { ...c, balance_paise: balancePaise } : c)),
  })),

  setSummary: (summary) => set({ summary }),

  setOffline: (isOffline) => set({ isOffline }),

  setDemoTime: (demoTime) => set({ demoTime }),
}))
