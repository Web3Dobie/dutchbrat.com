'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function HelpingPawsLogin() {
    const router = useRouter();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const res = await fetch('/api/helping-paws/auth', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password }),
            });

            if (res.ok) {
                router.push('/helping-paws');
            } else {
                const data = await res.json();
                setError(data.error || 'Login failed');
            }
        } catch {
            setError('Network error — please try again');
        } finally {
            setLoading(false);
        }
    }

    return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', padding: '1rem' }}>
            <div style={{ width: '100%', maxWidth: '400px' }}>
                <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                    <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>🐾</div>
                    <h1 style={{ fontSize: '1.75rem', fontWeight: 700, margin: 0 }}>Helping Paws</h1>
                    <p style={{ color: '#9ca3af', marginTop: '0.5rem' }}>Walk more. Help shelter dogs.</p>
                </div>

                <form onSubmit={handleSubmit} style={{ backgroundColor: '#1f2937', borderRadius: '0.75rem', padding: '2rem' }}>
                    <div style={{ marginBottom: '1.25rem' }}>
                        <label style={{ display: 'block', fontSize: '0.875rem', color: '#d1d5db', marginBottom: '0.5rem' }}>
                            Username
                        </label>
                        <input
                            type="text"
                            value={username}
                            onChange={e => setUsername(e.target.value)}
                            required
                            autoComplete="username"
                            style={{
                                width: '100%', padding: '0.625rem 0.75rem', borderRadius: '0.5rem',
                                border: '1px solid #374151', backgroundColor: '#111827',
                                color: '#f9fafb', fontSize: '1rem', boxSizing: 'border-box',
                            }}
                        />
                    </div>

                    <div style={{ marginBottom: '1.5rem' }}>
                        <label style={{ display: 'block', fontSize: '0.875rem', color: '#d1d5db', marginBottom: '0.5rem' }}>
                            Password
                        </label>
                        <input
                            type="password"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            required
                            autoComplete="current-password"
                            style={{
                                width: '100%', padding: '0.625rem 0.75rem', borderRadius: '0.5rem',
                                border: '1px solid #374151', backgroundColor: '#111827',
                                color: '#f9fafb', fontSize: '1rem', boxSizing: 'border-box',
                            }}
                        />
                    </div>

                    {error && (
                        <div style={{ marginBottom: '1rem', padding: '0.75rem', backgroundColor: '#7f1d1d', borderRadius: '0.5rem', fontSize: '0.875rem', color: '#fca5a5' }}>
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        style={{
                            width: '100%', padding: '0.75rem', borderRadius: '0.5rem',
                            backgroundColor: loading ? '#374151' : '#3b82f6',
                            color: '#fff', fontWeight: 600, fontSize: '1rem',
                            border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
                        }}
                    >
                        {loading ? 'Logging in…' : 'Log in'}
                    </button>
                </form>

                <p style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.8rem', color: '#6b7280' }}>
                    <a href="/helping-paws/leaderboard" style={{ color: '#9ca3af' }}>View the leaderboard</a>
                </p>
            </div>
        </div>
    );
}
