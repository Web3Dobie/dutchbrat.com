import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Helping Paws',
    description: 'Walk more. Help shelter dogs.',
};

export default function HelpingPawsLayout({ children }: { children: React.ReactNode }) {
    return (
        <div style={{ minHeight: '100vh', backgroundColor: '#111827', color: '#f9fafb', fontFamily: 'system-ui, sans-serif' }}>
            {children}
        </div>
    );
}
