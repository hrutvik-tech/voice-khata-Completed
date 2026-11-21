import '@testing-library/jest-dom'

// Mock localStorage if not provided or undefined
const storageMock = (() => {
  let store = {}
  return {
    getItem: (key) => store[key] || null,
    setItem: (key, value) => {
      store[key] = value.toString()
    },
    removeItem: (key) => {
      delete store[key]
    },
    clear: () => {
      store = {}
    },
  }
})()

Object.defineProperty(window, 'localStorage', {
  value: storageMock,
  writable: true,
})
Object.defineProperty(globalThis, 'localStorage', {
  value: storageMock,
  writable: true,
})

// Mock indexeddb / idb-keyval in tests if needed
const mockStore = new Map()
export const idbMock = {
  get: async (key) => mockStore.get(key),
  set: async (key, val) => mockStore.set(key, val),
  del: async (key) => mockStore.delete(key),
  clear: async () => mockStore.clear(),
  entries: async () => Array.from(mockStore.entries()),
  values: async () => Array.from(mockStore.values()),
}
