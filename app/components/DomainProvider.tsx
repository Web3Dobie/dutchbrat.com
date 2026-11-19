'use client'

import type { ReactNode } from 'react'
import { DomainContext, type DomainType } from '@/lib/clientDomainDetection'

/** Makes the server-detected domain available to client components. See DomainContext. */
export default function DomainProvider({ domainType, children }: { domainType: DomainType; children: ReactNode }) {
    return <DomainContext.Provider value={domainType}>{children}</DomainContext.Provider>
}
