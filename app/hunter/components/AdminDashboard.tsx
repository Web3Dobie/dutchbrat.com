// app/hunter/components/AdminDashboard.tsx
'use client'

import { useState, useEffect } from 'react'
import { MediaFile } from '../../../lib/hunterMedia'
import { MediaManager } from './MediaManager'
import { FileScanPanel } from './FileScanPanel'
import Link from 'next/link'

interface AdminDashboardProps {
  onLogout: () => void
}

export function AdminDashboard({ onLogout }: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState<'scan' | 'manage'>('scan')
  const [stats, setStats] = useState({ total: 0, images: 0, videos: 0 })

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/hunter/media?limit=0')
      const data = await response.json()
      
      // Get counts by type
      const imageResponse = await fetch('/api/hunter/media?type=image&limit=0')
      const imageData = await imageResponse.json()
      
      const videoResponse = await fetch('/api/hunter/media?type=video&limit=0')
      const videoData = await videoResponse.json()
      
      setStats({
        total: data.total,
        images: imageData.total,
        videos: videoData.total
      })
    } catch (error) {
      console.error('Error fetching stats:', error)
    }
  }

  const handleLogout = async () => {
    try {
      await fetch('/api/hunter/auth/logout', { method: 'POST' })
      onLogout()
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      
      {/* Header */}
      <div className="bg-gray-900 border-b border-gray-700">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Hunter's Memory Garden</h1>
              <p className="text-gray-400">Family Admin Dashboard</p>
            </div>
            <div className="flex items-center gap-4">
              <Link
                href="/hunter"
                className="text-blue-400 hover:text-blue-300 transition-colors"
              >
                View Gallery
              </Link>
              <button
                onClick={handleLogout}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-gray-900 rounded-lg p-4 border border-gray-700">
            <div className="text-2xl font-bold text-blue-400">{stats.total}</div>
            <div className="text-gray-400">Total memories</div>
          </div>
          <div className="bg-gray-900 rounded-lg p-4 border border-gray-700">
            <div className="text-2xl font-bold text-green-400">{stats.images}</div>
            <div className="text-gray-400">Photos</div>
          </div>
          <div className="bg-gray-900 rounded-lg p-4 border border-gray-700">
            <div className="text-2xl font-bold text-purple-400">{stats.videos}</div>
            <div className="text-gray-400">Videos</div>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab('scan')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              activeTab === 'scan'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
          >
            Scan New Files
          </button>
          <button
            onClick={() => setActiveTab('manage')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              activeTab === 'manage'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
          >
            Manage Media
          </button>
        </div>

        {/* Content */}
        {activeTab === 'scan' ? (
          <FileScanPanel onStatsUpdate={fetchStats} />
        ) : (
          <MediaManager onStatsUpdate={fetchStats} />
        )}
      </div>
    </div>
  )
}