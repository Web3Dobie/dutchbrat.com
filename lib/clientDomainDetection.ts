// lib/clientDomainDetection.ts
/**
 * CLIENT-SIDE ONLY: Domain detection for client components
 * Use this in components with 'use client'
 */
export function useClientDomainDetection(): 'hunters-hounds' | 'dutchbrat' | 'hunter-memorial' {
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname
    console.log('🔍 CLIENT seeing hostname:', hostname)  // DEBUG LINE

    if (hostname.includes('hunters-hounds')) {
      console.log('🔍 CLIENT detected: hunters-hounds')  // DEBUG LINE
      return 'hunters-hounds'
    }
    if (hostname.includes('hunterthedobermann') || hostname.includes('hunter-memorial')) {
      console.log('🔍 CLIENT detected: hunter-memorial')  // DEBUG LINE
      return 'hunter-memorial'
    }
    console.log('🔍 CLIENT detected: dutchbrat')  // DEBUG LINE
    return 'dutchbrat'
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

/**
 * CLIENT-SIDE ONLY: Check if current domain is Hunter Memorial
 */
export function isHunterMemorialClient(): boolean {
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname
    return hostname.includes('hunterthedobermann') || hostname.includes('hunter-memorial')
  }
  return false
}