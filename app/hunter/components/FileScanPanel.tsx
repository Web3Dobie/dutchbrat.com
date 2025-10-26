// app/hunter/components/FileScanPanel.tsx
'use client'

import { useState } from 'react'

interface FileScanPanelProps {
  onStatsUpdate: () => void
}

export function FileScanPanel({ onStatsUpdate }: FileScanPanelProps) {
  const [scanning, setScanning] = useState(false)
  const [scanResult, setScanResult] = useState<any>(null)
  const [progress, setProgress] = useState('')

  const handleScan = async () => {
    setScanning(true)
    setScanResult(null)
    setProgress('Starting scan...')

    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 300000) // 5 minutes
      
      setProgress('Scanning files... this may take several minutes for large batches')
      
      const response = await fetch('/api/hunter/media/scan', {
        method: 'POST',
        signal: controller.signal,
        headers: { 'Content-Type': 'application/json' }
      })
      
      clearTimeout(timeoutId)
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      
      const result = await response.json()
      setScanResult(result)
      setProgress('')
      
      if (result.success) {
        onStatsUpdate()
      }
    } catch (error) {
      console.error('Scan error:', error)
      
      if (error instanceof Error && error.name === 'AbortError') {
        setScanResult({ 
          error: 'Scan timeout after 5 minutes',
          note: 'The scan may still be processing in the background. Check your photo count in a few minutes.' 
        })
      } else {
        setScanResult({ error: 'Scan failed', details: error instanceof Error ? error.message : 'Unknown error' })
      }
      setProgress('')
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

        {/* Progress indicator */}
        {progress && (
          <div className="bg-blue-900 border border-blue-700 rounded-lg p-4">
            <div className="text-blue-300 text-sm">
              {progress}
            </div>
          </div>
        )}

        {scanResult && (
          <div className={`rounded-lg p-4 ${
            scanResult.error 
              ? 'bg-red-900 border border-red-700' 
              : 'bg-green-900 border border-green-700'
          }`}>
            {scanResult.error ? (
              <div className="text-red-300">
                <strong>Error:</strong> {scanResult.error}
                {scanResult.details && (
                  <div className="text-sm mt-1">Details: {scanResult.details}</div>
                )}
                {scanResult.note && (
                  <div className="text-sm mt-2 bg-red-800 p-2 rounded">
                    {scanResult.note}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-green-300">
                <strong>Scan completed!</strong>
                <div className="mt-2 text-sm">
                  <div>Found {scanResult.processedCount} new files</div>
                  {scanResult.processingTimeSeconds && (
                    <div>Completed in {Math.round(scanResult.processingTimeSeconds)}s</div>
                  )}
                  {scanResult.processedFiles && scanResult.processedFiles.length > 0 && (
                    <div className="mt-2">
                      <div className="font-medium">New files:</div>
                      <ul className="mt-1 space-y-1 max-h-40 overflow-y-auto">
                        {scanResult.processedFiles.map((file: any) => (
                          <li key={file.id} className="text-xs">
                            * {file.filename} ({file.media_type})
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