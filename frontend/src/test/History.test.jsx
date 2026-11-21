import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { BrowserRouter } from 'react-router-dom'
import { History } from '../pages/History'
import { QrModal } from '../components/QrModal'
import { api } from '../api/rest'
import { useAppStore } from '../store/appStore'

vi.mock('../api/rest', () => ({
  api: {
    getCustomers: vi.fn(),
    getCustomer: vi.fn(),
  },
}))

describe('Transaction History & QR Code Components', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useAppStore.setState({
      shop: { id: 1, shop_name: 'Sharma Kirana Store', owner_name: 'Sharma', phone: '9000000001' },
      language: 'hi',
      recentEntries: [
        {
          id: 101,
          customer_name: 'Ramesh Sharma',
          amount_paise: 34000,
          direction: 'credit',
          business_date: '2026-11-21',
          recorded_at: '2026-11-21T19:00:00+05:30',
          status: 'new',
        },
        {
          id: 102,
          customer_name: 'Suresh',
          amount_paise: 20000,
          direction: 'payment',
          business_date: '2026-11-21',
          recorded_at: '2026-11-21T19:05:00+05:30',
          status: 'new',
        },
      ],
    })
  })

  it('renders History page with search bar and transaction entries', async () => {
    api.getCustomers.mockResolvedValueOnce([
      { id: 1, name: 'Ramesh Sharma', balance_paise: 34000 },
      { id: 2, name: 'Suresh', balance_paise: -20000 },
    ])
    api.getCustomer.mockImplementation(async (id) => ({
      customer: { id, name: id === 1 ? 'Ramesh Sharma' : 'Suresh' },
      balance_paise: 0,
      entries: [],
    }))

    render(
      <BrowserRouter>
        <History />
      </BrowserRouter>
    )

    // Heading exists
    expect(screen.getByRole('heading', { name: 'लेन-देन इतिहास' })).toBeInTheDocument()

    // Search input exists
    const searchInput = screen.getByPlaceholderText(/ग्राहक के नाम से खोजें/i)
    expect(searchInput).toBeInTheDocument()

    // Recent entries displayed
    await waitFor(() => {
      expect(screen.getByText('Ramesh Sharma')).toBeInTheDocument()
      expect(screen.getByText('Suresh')).toBeInTheDocument()
    })
  })

  it('filters transactions when customer name is searched', async () => {
    api.getCustomers.mockResolvedValueOnce([])

    render(
      <BrowserRouter>
        <History />
      </BrowserRouter>
    )

    const searchInput = screen.getByPlaceholderText(/ग्राहक के नाम से खोजें/i)
    fireEvent.change(searchInput, { target: { value: 'suresh' } })

    await waitFor(() => {
      expect(screen.getByText('Suresh')).toBeInTheDocument()
      expect(screen.queryByText('Ramesh Sharma')).not.toBeInTheDocument()
    })
  })

  it('renders QR Modal with shop details and UPI link', () => {
    render(
      <QrModal isOpen={true} onClose={() => {}} />
    )

    expect(screen.getByText('दुकान का पेमेंट QR कोड')).toBeInTheDocument()
    expect(screen.getByText('Sharma Kirana Store')).toBeInTheDocument()
    expect(screen.getByText(/9000000001@upi/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /QR कोड डाउनलोड करें/i })).toBeInTheDocument()
  })
})
