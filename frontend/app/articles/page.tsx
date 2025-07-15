// app/articles/page.tsx (updated)
'use client';

import dynamic from 'next/dynamic';
import ErrorBoundary from '../components/ErrorBoundary';

const ArticlesClient = dynamic(() => import('./ArticlesClient'), {
  ssr: false,
  loading: () => <div className="text-center py-8">🟡 Loading articles...</div>
});

ArticlesClient.displayName = "ArticlesClientDynamic";

export default function ArticlesPage() {
  return (
    <div>
      <ErrorBoundary fallback={
        <div className="max-w-5xl mx-auto px-4 py-8 text-center">
          <h1 className="text-2xl font-bold mb-4">Articles</h1>
          <p className="text-gray-600">
            Articles are temporarily unavailable. Please try again later.
          </p>
        </div>
      }>
        <ArticlesClient />
      </ErrorBoundary>
    </div>
  );
}