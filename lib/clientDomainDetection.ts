// lib/clientDomainDetection.ts
/**
 * CLIENT-SIDE ONLY: Domain detection for client components
 * Use this in components with 'use client'
 */
export function useClientDomainDetection(): 'hunters-hounds' | 'dutchbrat' {
  if (typeof window !== 'undefined') {
    return window.location.hostname.includes('hunters-hounds') ? 'hunters-hounds' : 'dutchbrat'
  }
  return 'dutchbrat'
}

/**
 * CLIENT-SIDE ONLY: Check if current domain is Hunter's Hounds
 */
export function isHuntersHoundsClient(): boolean {
  if (typeof window !== 'undefined') {
    return window.location.hostname.includes('hunters-hounds')
  }
  return false
}