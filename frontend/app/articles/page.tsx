import nextDynamic from 'next/dynamic';

export const dynamic = 'force-dynamic';

const ArticlesClient = nextDynamic(() => import('./ArticlesClient'), {
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

