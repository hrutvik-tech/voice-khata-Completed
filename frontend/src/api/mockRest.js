// Mock implementation for development, demo and client-side testing

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
  { id: 1, name: 'Ramesh Sharma', area: 'Gandhi Nagar', phone: '9876543210', balance_paise: 34000, last_activity_at: new Date().toISOString() },
  { id: 2, name: 'Ramesh Gupta', area: 'Station Road', phone: '9876543211', balance_paise: 80000, last_activity_at: new Date().toISOString() },
  { id: 3, name: 'Suresh', area: 'Main Market', phone: '9876543212', balance_paise: 0, last_activity_at: new Date().toISOString() },
  { id: 4, name: 'Aayushi', area: 'Civil Lines', phone: '9876543213', balance_paise: 40000, last_activity_at: new Date().toISOString() },
]

let mockEntries = [
  { id: 101, customer_id: 1, customer_name: 'Ramesh Sharma', direction: 'credit', amount_paise: 34000, business_date: new Date().toISOString().split('T')[0], recorded_at: new Date().toISOString(), status: 'active' },
  { id: 102, customer_id: 2, customer_name: 'Ramesh Gupta', direction: 'credit', amount_paise: 80000, business_date: new Date().toISOString().split('T')[0], recorded_at: new Date().toISOString(), status: 'active' },
  { id: 103, customer_id: 4, customer_name: 'Aayushi', direction: 'credit', amount_paise: 40000, business_date: new Date().toISOString().split('T')[0], recorded_at: new Date().toISOString(), status: 'active' },
  { id: 104, customer_id: 3, customer_name: 'Suresh', direction: 'payment', amount_paise: 25000, business_date: new Date().toISOString().split('T')[0], recorded_at: new Date().toISOString(), status: 'active' },
]

export const mockApi = {
  register: async (owner_name, phone, pin) => {
    mockShop = { ...mockShop, owner_name: owner_name || 'Sharma', phone: phone || '9000000001' }
    return { token: 'mock-jwt-token', shop: mockShop }
  },

  login: async (phone, pin) => {
    if (phone === '9000000001' && pin === '1234') {
      return { token: 'mock-jwt-token', shop: mockShop }
    }
    // Allow any 10-digit phone and 4-digit PIN in demo mode for ease of presentation
    if (phone && phone.length === 10 && pin && pin.length === 4) {
      mockShop.phone = phone
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
    mockEntries = []
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
      entries: mockEntries.filter((e) => e.customer_id === Number(id)),
    }
  },

  createCustomer: async (name, phone = null, area = null, confirm = false) => {
    const existing = mockCustomers.find((c) => c.name.toLowerCase() === name.toLowerCase())
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
    credit_paise: 154000,
    payment_paise: 25000,
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

  debugTurn: async (text) => {
    const isCredit = !text.includes('जमा') && !text.includes('jama') && !text.includes('paid')
    const matchNum = text.match(/\d+/)
    const amountRupees = matchNum ? parseInt(matchNum[0], 10) : 340
    const matchedCust = mockCustomers.find((c) => text.toLowerCase().includes(c.name.toLowerCase().split(' ')[0])) || mockCustomers[0]

    const newPaise = amountRupees * 100
    if (isCredit) {
      matchedCust.balance_paise += newPaise
    } else {
      matchedCust.balance_paise = Math.max(0, matchedCust.balance_paise - newPaise)
    }

    const newEntry = {
      id: 200 + Math.floor(Math.random() * 1000),
      customer_id: matchedCust.id,
      customer_name: matchedCust.name,
      direction: isCredit ? 'credit' : 'payment',
      amount_paise: newPaise,
      business_date: new Date().toISOString().split('T')[0],
      recorded_at: new Date().toISOString(),
      status: 'active',
    }
    mockEntries.unshift(newEntry)

    const sayText = isCredit
      ? `${matchedCust.name} का ₹${amountRupees} उधार लिख दिया।`
      : `${matchedCust.name} से ₹${amountRupees} जमा लिख लिया।`

    return {
      session_id: 'mock-session',
      turn_id: `mock-turn-${Date.now()}`,
      events: [
        { type: 'heard', turn_id: 'mock-turn', text, language: 'hi' },
        {
          type: 'entry',
          turn_id: 'mock-turn',
          entry: newEntry,
          customer_balance_paise: matchedCust.balance_paise,
          say: sayText,
        },
      ],
    }
  },

  debugChoose: async () => ({ events: [] }),
  debugReset: async () => null,
}
