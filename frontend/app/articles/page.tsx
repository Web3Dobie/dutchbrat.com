// app/articles/page.tsx

// import dynamic from 'next/dynamic';

// const ArticlesClient = dynamic(() => import('./ArticlesClient'), { ssr: false });

export const metadata = {
  title: 'Articles | Hunter the Web3Dobie',
  description: 'Market commentary, technical analysis and more from Hunter the Dobie.',
};

export default function ArticlesPage() {
  return (
    <div style={{ padding: "2rem", color: "white", background: "black" }}>
      <h2>🧪 Articles test page is rendering!</h2>
      <p>If you see this message, <b>page.tsx is working</b>.</p>
    </div>
  );
}


