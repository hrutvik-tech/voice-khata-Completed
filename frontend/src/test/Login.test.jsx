import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { BrowserRouter } from 'react-router-dom'
import { Login } from '../pages/Login'
import { api } from '../api/rest'

vi.mock('../api/rest', () => ({
  api: {
    login: vi.fn(),
    register: vi.fn(),
  },
}))

describe('Login Page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  it('renders login form with phone and PIN inputs', () => {
    render(
      <BrowserRouter>
        <Login />
      </BrowserRouter>
    )

    expect(screen.getByText('बोलता खाता')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('9000000001')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('••••')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /खाता खोलें/i })).toBeInTheDocument()
  })

  it('validates 10-digit phone number', async () => {
    render(
      <BrowserRouter>
        <Login />
      </BrowserRouter>
    )

    const phoneInput = screen.getByPlaceholderText('9000000001')
    fireEvent.change(phoneInput, { target: { value: '123' } })

    const submitBtn = screen.getByRole('button', { name: /खाता खोलें/i })
    fireEvent.click(submitBtn)

    await waitFor(() => {
      expect(screen.getByText(/10 अंकों का मान्य फ़ोन नंबर/i)).toBeInTheDocument()
    })
  })

  it('successfully logs in with valid phone and PIN', async () => {
    api.login.mockResolvedValueOnce({
      token: 'jwt-token-123',
      shop: { id: 1, owner_name: 'Sharma', setup_complete: true },
    })

    render(
      <BrowserRouter>
        <Login />
      </BrowserRouter>
    )

    const phoneInput = screen.getByPlaceholderText('9000000001')
    const pinInput = screen.getByPlaceholderText('••••')
    fireEvent.change(phoneInput, { target: { value: '9000000001' } })
    fireEvent.change(pinInput, { target: { value: '1234' } })

    const submitBtn = screen.getByRole('button', { name: /खाता खोलें/i })
    fireEvent.click(submitBtn)

    await waitFor(() => {
      expect(api.login).toHaveBeenCalledWith('9000000001', '1234')
    })
  })
})
