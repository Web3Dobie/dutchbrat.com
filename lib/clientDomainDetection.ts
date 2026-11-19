// lib/clientDomainDetection.ts
'use client'

import { createContext, useContext } from 'react'

export type DomainType = 'hunters-hounds' | 'dutchbrat' | 'hunter-memorial'

/**
 * The domain the SERVER saw on this request, handed down by the root layout
 * through <DomainProvider>.
 *
 * Client components are rendered on the server first, where there is no
 * `window`. Without this, every one of them rendered as 'dutchbrat' in the
 * HTML that goes over the wire, and only corrected itself in the browser —
 * so hunters-hounds.london arrived wearing the DutchBrat navbar, flashed it at
 * visitors on a cold load, and showed it to search engines permanently.
 */
export const DomainContext = createContext<DomainType | null>(null)

/**
 * Domain detection for client components ('use client').
 * Prefers the server's answer so the first paint is already correct; falls
 * back to the browser's hostname for anything rendered outside the provider.
 */
export function useClientDomainDetection(): DomainType {
  const fromServer = useContext(DomainContext)
  if (fromServer) return fromServer

  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname
    if (hostname.includes('hunters-hounds')) return 'hunters-hounds'
    if (hostname.includes('hunterthedobermann') || hostname.includes('hunter-memorial')) return 'hunter-memorial'
    return 'dutchbrat'
  }
  return 'dutchbrat'
}

/**
 * CLIENT-SIDE ONLY: Check if current domain is Hunter's Hounds.
 * Not a hook, so it cannot read the context: call it from effects and event
 * handlers only, never during render.
 */
export function isHuntersHoundsClient(): boolean {
  if (typeof window !== 'undefined') {
    return window.location.hostname.includes('hunters-hounds')
  }
  return false
}

/**
 * CLIENT-SIDE ONLY: Check if current domain is Hunter Memorial.
 * Same rule as above: effects and handlers only.
 */
export function isHunterMemorialClient(): boolean {
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname
    return hostname.includes('hunterthedobermann') || hostname.includes('hunter-memorial')
  }
  return false
}
