// frontend/app/briefings/page.tsx
'use client';

import dynamic from 'next/dynamic';
import ErrorBoundary from '../components/ErrorBoundary';

const BriefingsClient = dynamic(() => import('./BriefingsClient'), {
  ssr: false,
  loading: () => <div className="text-center py-8">📊 Loading briefings...</div>
});

BriefingsClient.displayName = "BriefingsClientDynamic";

export default function BriefingsPage() {
  return (
    <div>
      <ErrorBoundary fallback={
        <div className="max-w-5xl mx-auto px-4 py-8 text-center">
          <h1 className="text-2xl font-bold mb-4">Market Briefings</h1>
          <p className="text-gray-600">
            Briefings are temporarily unavailable. Please try again later.
          </p>
        </div>
      }>
        <BriefingsClient />
      </ErrorBoundary>
    </div>
  );
}