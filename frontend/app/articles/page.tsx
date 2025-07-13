'use client';

import dynamic from 'next/dynamic';
const ArticlesClient = dynamic(() => import('./ArticlesClient'), {
  ssr: false,
  loading: () => <div>🟡 Loading ArticlesClient…</div>
});
ArticlesClient.displayName = "ArticlesClientDynamic";

export default function ArticlesPage() {
  return (
    <div>
      <ArticlesClient />
    </div>
  );
}
