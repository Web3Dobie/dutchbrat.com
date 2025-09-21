// app/hunter/components/FileScanPanel.tsx
'use client'

import { useState } from 'react'

interface FileScanPanelProps {
  onStatsUpdate: () => void
}

export function FileScanPanel({ onStatsUpdate }: FileScanPanelProps) {
  const [scanning, setScanning] = useState(false)
  const [scanResult, setScanResult] = useState<any>(null)

  const handleScan = async () => {
    setScanning(true)
    setScanResult(null)

    try {
      const response = await fetch('/api/hunter/media/scan', {
        method: 'POST'
      })
      
      const result = await response.json()
      setScanResult(result)
      
      if (result.success) {
        onStatsUpdate()
      }
    } catch (error) {
      console.error('Scan error:', error)
      setScanResult({ error: 'Scan failed' })
    } finally {
      setScanning(false)
    }
  }

  return (
    <div className="bg-gray-900 rounded-xl p-6 border border-gray-700">
      <h2 className="text-xl font-semibold mb-4">Scan for New Files</h2>
      
      <div className="space-y-4">
        <div className="bg-gray-800 rounded-lg p-4">
          <h3 className="font-medium mb-2">How it works:</h3>
          <ol className="text-sm text-gray-300 space-y-1 list-decimal list-inside">
            <li>Upload photos/videos to <code className="bg-gray-700 px-1 rounded">/home/hunter-dev/hunter-media/originals/2024/</code></li>
            <li>Organize by year folders if you want (e.g., 2023/, 2024/)</li>
            <li>Click "Scan for New Files" below</li>
            <li>The system will automatically extract dates and GPS locations</li>
            <li>Then add keywords and descriptions in "Manage Media"</li>
          </ol>
        </div>

        <button
          onClick={handleScan}
          disabled={scanning}
          className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {scanning ? 'Scanning files...' : 'Scan for New Files'}
        </button>

        {scanResult && (
          <div className={`rounded-lg p-4 ${
            scanResult.error 
              ? 'bg-red-900 border border-red-700' 
              : 'bg-green-900 border border-green-700'
          }`}>
            {scanResult.error ? (
              <div className="text-red-300">
                <strong>Error:</strong> {scanResult.error}
              </div>
            ) : (
              <div className="text-green-300">
                <strong>Scan completed!</strong>
                <div className="mt-2 text-sm">
                  <div>Found {scanResult.processedCount} new files</div>
                  {scanResult.processedFiles && scanResult.processedFiles.length > 0 && (
                    <div className="mt-2">
                      <div className="font-medium">New files:</div>
                      <ul className="mt-1 space-y-1">
                        {scanResult.processedFiles.map((file: any) => (
                          <li key={file.id} className="text-xs">
                            {file.filename} ({file.media_type})
                            {file.taken_at && ` - ${new Date(file.taken_at).toLocaleDateString()}`}
                            {file.has_location && ' 📍'}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}