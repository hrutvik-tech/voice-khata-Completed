// Mock implementation for development and offline testing

let mockShop = {
  id: 1,
  owner_name: 'Sharma',
  shop_name: 'Sharma Kirana Store',
  phone: '9000000001',
  open_time: '06:00',
  close_time: '02:00',
  timezone: 'Asia/Kolkata',
  language_mode: 'mix',
  setup_complete: true,
}

let mockCustomers = [
  { id: 1, name: 'Ramesh Sharma', area: 'Gandhi Nagar', phone: '9876543210', balance_paise: 50000, last_activity_at: null },
  { id: 2, name: 'Ramesh Gupta', area: 'Station Road', phone: '9876543211', balance_paise: 80000, last_activity_at: null },
  { id: 3, name: 'Suresh', area: null, phone: null, balance_paise: 25000, last_activity_at: null },
  { id: 4, name: 'Amit', area: null, phone: null, balance_paise: 0, last_activity_at: null },
]

export const mockApi = {
  register: async (owner_name, phone, pin) => {
    mockShop = { ...mockShop, owner_name, phone }
    return { token: 'mock-jwt-token', shop: mockShop }
  },

  login: async (phone, pin) => {
    if (phone === '9000000001' && pin === '1234') {
      return { token: 'mock-jwt-token', shop: mockShop }
    }
    const err = new Error('Invalid PIN')
    err.status = 401
    throw err
  },

  changePin: async () => null,

  getShop: async () => mockShop,

  updateShop: async (data) => {
    mockShop = { ...mockShop, ...data, setup_complete: true }
    return mockShop
  },

  deleteShopData: async () => {
    mockCustomers = []
    return null
  },

  getCustomers: async (search = '') => {
    if (!search) return mockCustomers
    const q = search.toLowerCase()
    return mockCustomers.filter((c) => c.name.toLowerCase().includes(q) || (c.area && c.area.toLowerCase().includes(q)))
  },

  getCustomer: async (id) => {
    const cust = mockCustomers.find((c) => c.id === Number(id))
    if (!cust) throw new Error('Customer not found')
    return {
      customer: cust,
      balance_paise: cust.balance_paise,
      entries: [],
    }
  },

  createCustomer: async (name, phone = null, area = null, confirm = false) => {
    const existing = mockCustomers.find((c) => c.name.toLowerCase().includes(name.toLowerCase()))
    if (existing && !confirm) {
      const err = new Error('Similar customer exists')
      err.status = 409
      err.data = { detail: 'similar_exists', similar: [existing] }
      throw err
    }
    const newCust = {
      id: mockCustomers.length + 1,
      name,
      phone,
      area,
      balance_paise: 0,
      last_activity_at: new Date().toISOString(),
    }
    mockCustomers.push(newCust)
    return { customer: newCust }
  },

  getTodaySummary: async () => ({
    business_date: new Date().toISOString().split('T')[0],
    credit_paise: 63000,
    payment_paise: 0,
    top: mockCustomers.filter((c) => c.balance_paise > 0).map((c) => ({
      customer_id: c.id,
      customer_name: c.name,
      balance_paise: c.balance_paise,
    })),
  }),

  syncAudio: async () => ({
    turn_id: 'mock-turn',
    events: [],
  }),

  debugTurn: async (text) => ({
    session_id: 'mock-session',
    turn_id: 'mock-turn',
    events: [
      { type: 'heard', turn_id: 'mock-turn', text, language: 'hi' },
      { type: 'answer', turn_id: 'mock-turn', kind: 'entry_saved', say: 'Entri likh di', data: {} }
    ],
  }),

  debugChoose: async () => ({ events: [] }),
  debugReset: async () => null,
}
