import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAppStore } from './store/appStore'
import { Login } from './pages/Login'
import { Setup } from './pages/Setup'
import { Home } from './pages/Home'
import { History } from './pages/History'
import { Customers } from './pages/Customers'
import { CustomerProfile } from './pages/CustomerProfile'
import { ShopProfile } from './pages/ShopProfile'

function ProtectedRoute({ children }) {
  const token = useAppStore((s) => s.token)
  const shop = useAppStore((s) => s.shop)

  if (!token) {
    return <Navigate to="/login" replace />
  }

  if (shop && !shop.setup_complete && window.location.pathname !== '/setup') {
    return <Navigate to="/setup" replace />
  }

  return children
}

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/setup"
          element={
            <ProtectedRoute>
              <Setup />
            </ProtectedRoute>
          }
        />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Home />
            </ProtectedRoute>
          }
        />
        <Route
          path="/history"
          element={
            <ProtectedRoute>
              <History />
            </ProtectedRoute>
          }
        />
        <Route
          path="/customers"
          element={
            <ProtectedRoute>
              <Customers />
            </ProtectedRoute>
          }
        />
        <Route
          path="/customers/:id"
          element={
            <ProtectedRoute>
              <CustomerProfile />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <ShopProfile />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
