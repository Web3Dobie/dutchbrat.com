import dynamic from 'next/dynamic';

const ArticlesClient = dynamic(() => import('./ArticlesClient'), { ssr: false });

export const metadata = {
  title: 'Articles | Hunter the Web3Dobie',
  description: 'Market commentary, technical analysis and more from Hunter the Dobie.',
};

export default function ArticlesPage() {
  return <ArticlesClient />;
}

