import { create } from 'zustand'

const TOKEN_KEY = 'bk_token'
const SHOP_KEY = 'bk_shop'
const LANG_KEY = 'bk_lang'

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

const getInitialLang = () => {
  try {
    const stored = localStorage.getItem(LANG_KEY)
    if (stored) return stored
    const rawShop = localStorage.getItem(SHOP_KEY)
    if (rawShop) {
      const parsed = JSON.parse(rawShop)
      if (parsed.language_mode && parsed.language_mode !== 'mix') {
        return parsed.language_mode
      }
    }
    return 'hi'
  } catch {
    return 'hi'
  }
}

export const useAppStore = create((set, get) => ({
  token: getInitialToken(),
  shop: getInitialShop(),
  language: getInitialLang(),
  customers: [],
  recentEntries: [],
  summary: {
    business_date: null,
    credit_paise: 0,
    payment_paise: 0,
    top: [],
  },
  isOffline: typeof navigator !== 'undefined' ? !navigator.onLine : false,
  demoTime: null, // ISO string or null

  setLanguage: (language) => {
    try {
      localStorage.setItem(LANG_KEY, language)
    } catch {}
    set({ language })
  },

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
    set({ token: null, shop: null, customers: [], recentEntries: [], summary: { credit_paise: 0, payment_paise: 0, top: [] } })
  },

  setCustomers: (customers) => set({ customers }),

  addCustomer: (customer) => set((state) => ({
    customers: [customer, ...state.customers.filter((c) => c.id !== customer.id)],
  })),

  updateCustomerBalance: (customerId, balancePaise) => set((state) => ({
    customers: state.customers.map((c) => (c.id === customerId ? { ...c, balance_paise: balancePaise } : c)),
  })),

  addRecentEntry: (entry) => set((state) => ({
    recentEntries: [entry, ...state.recentEntries.filter((e) => e.id !== entry.id)].slice(0, 10),
  })),

  setRecentEntries: (recentEntries) => set({ recentEntries }),

  setSummary: (summary) => set({ summary }),

  setOffline: (isOffline) => set({ isOffline }),

  setDemoTime: (demoTime) => set({ demoTime }),
}))
