// app/hunter/components/ThumbnailGeneratorPanel.tsx
'use client'

import { useState } from 'react'

interface ThumbnailGeneratorPanelProps {
  onStatsUpdate: () => void
}

export function ThumbnailGeneratorPanel({ onStatsUpdate }: ThumbnailGeneratorPanelProps) {
  const [generating, setGenerating] = useState(false)
  const [result, setResult] = useState<any>(null)

  const handleGenerateThumbnails = async () => {
    setGenerating(true)
    setResult(null)

    try {
      const response = await fetch('/api/hunter/media/generate-thumbnails', {
        method: 'POST'
      })
      
      const data = await response.json()
      setResult(data)
      
      if (data.success && data.processedCount > 0) {
        onStatsUpdate()
      }
    } catch (error) {
      console.error('Thumbnail generation error:', error)
      setResult({ error: 'Failed to generate thumbnails' })
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="bg-gray-900 rounded-xl p-6 border border-gray-700">
      <h2 className="text-xl font-semibold mb-4">Generate Missing Thumbnails</h2>
      
      <div className="space-y-4">
        <div className="bg-gray-800 rounded-lg p-4">
          <h3 className="font-medium mb-2">For existing files without thumbnails:</h3>
          <p className="text-sm text-gray-300 mb-3">
            This will generate 150px, 500px, and 1200px thumbnails for any existing photos 
            that don't have them yet. Useful for files uploaded before thumbnail generation was implemented.
          </p>
          <ul className="text-sm text-gray-400 space-y-1">
            <li>• Only processes image files (JPG, PNG, etc.)</li>
            <li>• Skips files that already have all thumbnails</li>
            <li>• Safe to run multiple times</li>
          </ul>
        </div>

        <button
          onClick={handleGenerateThumbnails}
          disabled={generating}
          className="w-full bg-purple-600 text-white py-3 px-4 rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors"
        >
          {generating ? 'Generating thumbnails...' : 'Generate Missing Thumbnails'}
        </button>

        {result && (
          <div className={`rounded-lg p-4 ${
            result.error 
              ? 'bg-red-900 border border-red-700' 
              : 'bg-green-900 border border-green-700'
          }`}>
            {result.error ? (
              <div>
                <div className="font-medium text-red-300">Error:</div>
                <div className="text-red-200">{result.error}</div>
                {result.details && (
                  <div className="text-sm text-red-300 mt-1">{result.details}</div>
                )}
              </div>
            ) : (
              <div>
                <div className="font-medium text-green-300 mb-2">
                  Thumbnail Generation Complete!
                </div>
                
                <div className="text-green-200 space-y-1 text-sm">
                  <div>📊 <strong>Found:</strong> {result.totalFound} files without thumbnails</div>
                  <div>✅ <strong>Processed:</strong> {result.processedCount} files</div>
                  {result.skippedCount > 0 && (
                    <div>⚠️ <strong>Skipped:</strong> {result.skippedCount} files (unsupported/errors)</div>
                  )}
                  <div>⏱️ <strong>Time:</strong> {result.processingTimeSeconds?.toFixed(1)}s</div>
                </div>

                {result.results && result.results.length > 0 && (
                  <details className="mt-3">
                    <summary className="cursor-pointer text-green-300 hover:text-green-200">
                      View processed files ({result.results.length})
                    </summary>
                    <div className="mt-2 max-h-32 overflow-y-auto">
                      {result.results.map((file: any, index: number) => (
                        <div key={index} className="text-xs text-green-200 py-1">
                          {file.filename} - {file.thumbnails_generated} thumbnails
                        </div>
                      ))}
                    </div>
                  </details>
                )}

                {result.processedCount === 0 && (
                  <div className="text-green-200 mt-2">
                    🎉 All your files already have thumbnails!
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}