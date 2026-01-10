// lib/domainDetection.ts
import { headers } from 'next/headers'

/**
 * SERVER-SIDE ONLY: Detect if the current request is for Hunter's Hounds domain
 * Only use this in Server Components (layout.tsx, page.tsx, etc.)
 */
export function isHuntersHoundsDomain(): boolean {
  try {
    const headersList = headers()
    const host = headersList.get('host') || ''
    console.log('🔍 Server seeing host:', host)  // DEBUG LINE

    const isHunters = host.includes('hunters-hounds') ||
      host.includes('dev-hunters-hounds') ||
      host.includes('staging-hunters-hounds')

    console.log('🔍 Is hunters hounds?', isHunters)  // DEBUG LINE
    return isHunters
  } catch (error) {
    console.log('🔍 Error in domain detection:', error)  // DEBUG LINE
    return false
  }
}

/**
 * SERVER-SIDE ONLY: Detect if the current request is for Hunter Memorial domain
 * Only use this in Server Components (layout.tsx, page.tsx, etc.)
 */
export function isHunterMemorialDomain(): boolean {
  try {
    const headersList = headers()
    const host = headersList.get('host') || ''

    // Support production and development domains
    return host.includes('hunterthedobermann') ||
      host.includes('hunter-memorial') ||
      host.includes('dev-hunterthedobermann') ||
      host.includes('staging-hunterthedobermann')
  } catch (error) {
    return false
  }
}

/**
 * SERVER-SIDE ONLY: Get the current domain type for easier switching
 * Only use this in Server Components
 */
export function getDomainType(): 'hunters-hounds' | 'dutchbrat' | 'hunter-memorial' {
  if (isHuntersHoundsDomain()) return 'hunters-hounds'
  if (isHunterMemorialDomain()) return 'hunter-memorial'
  return 'dutchbrat'
}