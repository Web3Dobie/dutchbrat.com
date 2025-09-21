// app/hunter/admin/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { AdminLogin } from '../components/AdminLogin'
import { AdminDashboard } from '../components/AdminDashboard'

export default function HunterAdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)

  useEffect(() => {
    checkAuthStatus()
  }, [])

  const checkAuthStatus = async () => {
    try {
      const response = await fetch('/api/hunter/auth/check')
      const data = await response.json()
      setIsAuthenticated(data.authenticated)
    } catch (error) {
      setIsAuthenticated(false)
    }
  }

  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-950">
      {isAuthenticated ? (
        <AdminDashboard onLogout={() => setIsAuthenticated(false)} />
      ) : (
        <AdminLogin onLogin={() => setIsAuthenticated(true)} />
      )}
    </div>
  )
}
