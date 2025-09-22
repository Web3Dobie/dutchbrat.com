// app/hunter/components/DeleteConfirmationModal.tsx
'use client'

import { useState, useEffect } from 'react'
import { MediaFile } from '../../../lib/hunterMedia'

interface DeleteConfirmationModalProps {
  media: MediaFile
  isOpen: boolean
  onClose: () => void
  onConfirm: () => Promise<void>
  isDeleting: boolean
}

export function DeleteConfirmationModal({ 
  media, 
  isOpen, 
  onClose, 
  onConfirm, 
  isDeleting 
}: DeleteConfirmationModalProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [confirmationPhrase, setConfirmationPhrase] = useState('')
  const [countdown, setCountdown] = useState<number | null>(null)
  const [finalConfirmed, setFinalConfirmed] = useState(false)

  const REQUIRED_PHRASE = 'DELETE HUNTER PHOTO PERMANENTLY'

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setStep(1)
      setConfirmationPhrase('')
      setCountdown(null)
      setFinalConfirmed(false)
    }
  }, [isOpen])

  // Countdown effect for final step
  useEffect(() => {
    if (countdown !== null && countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [countdown])

  const handleStep1Continue = () => {
    setStep(2)
  }

  const handleStep2Continue = () => {
    if (confirmationPhrase === REQUIRED_PHRASE) {
      setStep(3)
      setCountdown(10) // 10 second countdown
    }
  }

  const handleFinalDelete = async () => {
    if (finalConfirmed && countdown === 0) {
      await onConfirm()
      onClose()
    }
  }

  const canProceedStep2 = confirmationPhrase === REQUIRED_PHRASE
  const canProceedStep3 = finalConfirmed && countdown === 0

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 rounded-xl max-w-md w-full border-2 border-red-500">
        
        {/* Header */}
        <div className="p-6 border-b border-gray-700">
          <div className="flex items-center gap-3">
            <div className="text-red-500 text-2xl">⚠️</div>
            <div>
              <h2 className="text-xl font-bold text-red-400">Permanent Deletion Warning</h2>
              <p className="text-gray-400 text-sm">This action cannot be undone</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          
          {/* Step 1: Initial Warning */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="bg-red-900/50 border border-red-700 rounded-lg p-4">
                <p className="text-red-200 font-semibold mb-2">You are about to permanently delete:</p>
                <div className="text-white">
                  <p className="font-medium">{media.filename}</p>
                  {media.description && (
                    <p className="text-gray-300 text-sm mt-1">"{media.description}"</p>
                  )}
                  {media.location_name && (
                    <p className="text-gray-300 text-sm">📍 {media.location_name}</p>
                  )}
                  {media.taken_at && (
                    <p className="text-gray-300 text-sm">📅 {new Date(media.taken_at).toLocaleDateString()}</p>
                  )}
                </div>
              </div>

              <div className="text-red-200 space-y-2 text-sm">
                <p>⚠️ This will permanently delete:</p>
                <ul className="ml-4 space-y-1">
                  <li>• Original photo file</li>
                  <li>• All thumbnail versions</li>
                  <li>• Database record and metadata</li>
                  <li>• All associated tags</li>
                </ul>
                <p className="font-semibold text-red-400 mt-3">
                  This action is IRREVERSIBLE and cannot be undone!
                </p>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={onClose}
                  className="flex-1 px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleStep1Continue}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  I Understand - Continue
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Type Confirmation */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="text-red-200">
                <p className="font-semibold mb-2">Type the following phrase exactly to confirm:</p>
                <div className="bg-gray-800 p-3 rounded border border-gray-600">
                  <code className="text-red-400 font-mono text-sm select-all">
                    {REQUIRED_PHRASE}
                  </code>
                </div>
              </div>

              <div>
                <input
                  type="text"
                  value={confirmationPhrase}
                  onChange={(e) => setConfirmationPhrase(e.target.value)}
                  placeholder="Type the confirmation phrase..."
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                  autoComplete="off"
                  spellCheck="false"
                />
                {confirmationPhrase && !canProceedStep2 && (
                  <p className="text-red-400 text-sm mt-1">Phrase does not match exactly</p>
                )}
                {canProceedStep2 && (
                  <p className="text-green-400 text-sm mt-1">✓ Phrase confirmed</p>
                )}
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={onClose}
                  className="flex-1 px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleStep2Continue}
                  disabled={!canProceedStep2}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Continue to Final Step
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Final Countdown */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="text-center">
                <div className="text-red-400 text-6xl font-bold mb-2">
                  {countdown !== null ? countdown : '0'}
                </div>
                <p className="text-red-200">
                  {countdown && countdown > 0 
                    ? 'Seconds remaining to cancel...' 
                    : 'Ready to delete permanently'
                  }
                </p>
              </div>

              <div className="bg-red-900/50 border border-red-700 rounded-lg p-4 text-center">
                <p className="text-red-200 font-semibold">Final Confirmation</p>
                <p className="text-gray-300 text-sm mt-1">
                  Once you click delete, {media.filename} will be gone forever
                </p>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="final-confirm"
                  checked={finalConfirmed}
                  onChange={(e) => setFinalConfirmed(e.target.checked)}
                  className="rounded"
                />
                <label htmlFor="final-confirm" className="text-red-200 text-sm">
                  I understand this is permanent and cannot be undone
                </label>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={onClose}
                  disabled={isDeleting}
                  className="flex-1 px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 disabled:opacity-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleFinalDelete}
                  disabled={!canProceedStep3 || isDeleting}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-bold"
                >
                  {isDeleting ? 'DELETING...' : 'DELETE PERMANENTLY'}
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}