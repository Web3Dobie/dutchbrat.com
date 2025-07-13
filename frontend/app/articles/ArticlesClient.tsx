'use client';

export default function ArticlesClient() {
    if (typeof window !== 'undefined') {
        console.log("✅ Minimal ArticlesClient loaded!");
    }
    return <div>✅ Minimal ArticlesClient rendered</div>;
}
