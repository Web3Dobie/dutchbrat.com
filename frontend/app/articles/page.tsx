import dynamic from 'next/dynamic';

export const dynamic = 'force-dynamic';

const ArticlesClient = dynamic(() => import('./ArticlesClient'), {
  ssr: false,
  loading: () => <div>🟡 Loading ArticlesClient…</div>,
});

export default function ArticlesPage() {
  return (
    <div>
      <div>🧪 Articles test page is rendering!</div>
      <ArticlesClient />
    </div>
  );
}
