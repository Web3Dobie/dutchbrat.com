// app/hunter/components/AdminDashboard.tsx
'use client'

import { useState, useEffect } from 'react'
import { MediaManager } from './MediaManager'
import { FileScanPanel } from './FileScanPanel'
import { ThumbnailGeneratorPanel } from './ThumbnailGeneratorPanel'
import Link from 'next/link'

interface AdminDashboardProps {
  onLogout: () => void
}

export function AdminDashboard({ onLogout }: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState<'scan' | 'thumbnails' | 'manage'>('scan')
  const [stats, setStats] = useState({ total: 0, photos: 0, videos: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    try {
      setLoading(true)
      
      // Get total count
      const totalResponse = await fetch('/api/hunter/media?limit=1')
      const totalData = await totalResponse.json()
      
      // Get photo count
      const photoResponse = await fetch('/api/hunter/media?type=image&limit=1')
      const photoData = await photoResponse.json()
      
      // Get video count  
      const videoResponse = await fetch('/api/hunter/media?type=video&limit=1')
      const videoData = await videoResponse.json()
      
      setStats({
        total: totalData.total || 0,
        photos: photoData.total || 0,
        videos: videoData.total || 0
      })
    } catch (error) {
      console.error('Error fetching stats:', error)
      setStats({ total: 0, photos: 0, videos: 0 })
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    try {
      await fetch('/api/hunter/auth/logout', { method: 'POST' })
      onLogout()
    } catch (error) {
      console.error('Logout error:', error)
      onLogout() // Force logout even if request fails
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      
      {/* Header */}
      <div className="bg-gray-900 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-6">
            <div>
              <h1 className="text-3xl font-bold text-white">Hunter's Memory Garden</h1>
              <p className="text-gray-400 mt-1">Family Admin Dashboard</p>
            </div>
            <div className="flex items-center gap-4">
              <Link
                href="/hunter"
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                View Gallery
              </Link>
              <button
                onClick={handleLogout}
                className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-gray-900 rounded-xl p-6 border border-gray-700">
            <div className="text-3xl font-bold text-blue-400">
              {loading ? '...' : stats.total}
            </div>
            <div className="text-gray-400">Total memories</div>
          </div>
          <div className="bg-gray-900 rounded-xl p-6 border border-gray-700">
            <div className="text-3xl font-bold text-green-400">
              {loading ? '...' : stats.photos}
            </div>
            <div className="text-gray-400">Photos</div>
          </div>
          <div className="bg-gray-900 rounded-xl p-6 border border-gray-700">
            <div className="text-3xl font-bold text-purple-400">
              {loading ? '...' : stats.videos}
            </div>
            <div className="text-gray-400">Videos</div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex flex-wrap gap-2 mb-8">
          <button
            onClick={() => setActiveTab('scan')}
            className={`px-6 py-3 rounded-lg font-medium transition-colors ${
              activeTab === 'scan'
                ? 'bg-blue-600 text-white shadow-lg'
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white'
            }`}
          >
            📁 Scan New Files
          </button>
          <button
            onClick={() => setActiveTab('thumbnails')}
            className={`px-6 py-3 rounded-lg font-medium transition-colors ${
              activeTab === 'thumbnails'
                ? 'bg-purple-600 text-white shadow-lg'
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white'
            }`}
          >
            🖼️ Generate Thumbnails
          </button>
          <button
            onClick={() => setActiveTab('manage')}
            className={`px-6 py-3 rounded-lg font-medium transition-colors ${
              activeTab === 'manage'
                ? 'bg-green-600 text-white shadow-lg'
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white'
            }`}
          >
            ⚙️ Manage Media
          </button>
        </div>

        {/* Tab Content */}
        <div className="space-y-8">
          {activeTab === 'scan' && (
            <div className="animate-fadeIn">
              <FileScanPanel onStatsUpdate={fetchStats} />
            </div>
          )}
          
          {activeTab === 'thumbnails' && (
            <div className="animate-fadeIn">
              <ThumbnailGeneratorPanel onStatsUpdate={fetchStats} />
            </div>
          )}
          
          {activeTab === 'manage' && (
            <div className="animate-fadeIn">
              <MediaManager onStatsUpdate={fetchStats} />
            </div>
          )}
        </div>

        {/* Footer Info */}
        <div className="mt-12 pt-8 border-t border-gray-800">
          <div className="text-center text-gray-500 text-sm">
            <p>Hunter's Memory Garden - Preserving precious memories with love</p>
            <p className="mt-1">Admin tools for family photo and video management</p>
          </div>
        </div>
      </div>
    </div>
  )
}