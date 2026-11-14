'use client';

import { useEffect, useState } from 'react';
import { TIER_COLOURS, TIER_LABELS, Tier } from '@/lib/helpingPawsTiers';

interface LeaderboardRow {
    participant_id: number;
    display_name: string;
    animal_name: string | null;
    animal_photo: string | null;
    today_steps: number;
    today_tier: Tier;
    week_paws: number;
    streak: number;
    rank: number;
    prize: string | null;
}

interface LeaderboardData {
    leaderboard: LeaderboardRow[];
    weeklyPackage: {
        items_description: string;
        sponsor_name: string;
        sponsor_url: string;
        sponsor_logo_path: string | null;
    } | null;
    shelterName: string | null;
}

const RANK_EMOJI: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' };

export default function HelpingPawsLeaderboard() {
    const [data, setData] = useState<LeaderboardData | null>(null);

    useEffect(() => {
        fetch('/api/helping-paws/leaderboard')
            .then(r => r.json())
            .then(setData);
    }, []);

    if (!data) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
                <p style={{ color: '#6b7280' }}>Loading…</p>
            </div>
        );
    }

    const pkg = data.weeklyPackage;

    return (
        <div style={{ maxWidth: '720px', margin: '0 auto', padding: '1.5rem 1rem' }}>

            {/* Header */}
            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                <h1 style={{ fontSize: '1.75rem', fontWeight: 700, margin: 0 }}>🐾 Helping Paws</h1>
                <p style={{ color: '#9ca3af', marginTop: '0.25rem' }}>Weekly leaderboard</p>
            </div>

            {/* Sponsor banner */}
            {pkg ? (
                <div style={{
                    backgroundColor: '#1e3a5f', border: '1px solid #1d4ed8',
                    borderRadius: '0.75rem', padding: '1.5rem', marginBottom: '1.5rem',
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
                        <a href={pkg.sponsor_url} target="_blank" rel="noopener noreferrer"
                            style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', textDecoration: 'none', flexShrink: 0 }}>
                            {pkg.sponsor_logo_path ? (
                                <img src={pkg.sponsor_logo_path} alt={pkg.sponsor_name}
                                    style={{ height: '48px', borderRadius: '0.375rem' }} />
                            ) : (
                                <div style={{
                                    backgroundColor: '#1d4ed8', borderRadius: '0.5rem',
                                    padding: '0.5rem 1rem', color: '#fff', fontWeight: 700, fontSize: '0.9rem',
                                }}>
                                    {pkg.sponsor_name}
                                </div>
                            )}
                        </a>
                        <div>
                            <div style={{ fontWeight: 600, color: '#93c5fd', marginBottom: '0.25rem' }}>
                                This week's shelter rewards are sponsored by{' '}
                                <a href={pkg.sponsor_url} target="_blank" rel="noopener noreferrer" style={{ color: '#60a5fa' }}>
                                    {pkg.sponsor_name}
                                </a>
                            </div>
                            <div style={{ fontSize: '0.95rem', color: '#f9fafb' }}>
                                <strong>{pkg.items_description}</strong>
                                {data.shelterName ? ` heading to ${data.shelterName} this week` : ''}
                            </div>
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', fontSize: '0.875rem', color: '#bfdbfe' }}>
                        <span>🥇 Top walker earns a <strong>toy</strong> for their dog</span>
                        <span>·</span>
                        <span>🥈🥉 2nd &amp; 3rd earn a <strong>treat bag</strong></span>
                    </div>
                </div>
            ) : (
                <div style={{ backgroundColor: '#1f2937', borderRadius: '0.75rem', padding: '1.25rem', marginBottom: '1.5rem', textAlign: 'center', color: '#6b7280', fontSize: '0.875rem' }}>
                    Weekly package not yet set — check back soon.
                </div>
            )}

            {/* Leaderboard table */}
            <div style={{ backgroundColor: '#1f2937', borderRadius: '0.75rem', overflow: 'hidden' }}>
                {data.leaderboard.length === 0 ? (
                    <div style={{ padding: '2rem', textAlign: 'center', color: '#6b7280' }}>
                        No entries yet — be the first to log steps!
                    </div>
                ) : (
                    data.leaderboard.map((row, idx) => (
                        <div key={row.participant_id}
                            style={{
                                display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.875rem 1.25rem',
                                borderBottom: idx < data.leaderboard.length - 1 ? '1px solid #374151' : 'none',
                                backgroundColor: row.rank <= 3 ? 'rgba(59,130,246,0.06)' : 'transparent',
                            }}>

                            {/* Rank */}
                            <div style={{ width: '2rem', textAlign: 'center', fontSize: '1.1rem', flexShrink: 0 }}>
                                {RANK_EMOJI[row.rank] || <span style={{ color: '#6b7280', fontSize: '0.875rem' }}>{row.rank}</span>}
                            </div>

                            {/* Animal photo */}
                            {row.animal_photo ? (
                                <img src={row.animal_photo} alt={row.animal_name || ''}
                                    style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                            ) : (
                                <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#374151', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', flexShrink: 0 }}>
                                    🐕
                                </div>
                            )}

                            {/* Name + animal */}
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontWeight: 600 }}>{row.display_name}</div>
                                {row.animal_name && (
                                    <div style={{ fontSize: '0.8rem', color: '#9ca3af' }}>helping {row.animal_name}</div>
                                )}
                            </div>

                            {/* Today's tier */}
                            <div style={{ flexShrink: 0 }}>
                                {row.today_tier !== 'none' && (
                                    <span style={{
                                        backgroundColor: TIER_COLOURS[row.today_tier], color: '#fff',
                                        padding: '0.2rem 0.5rem', borderRadius: '1rem', fontSize: '0.75rem', fontWeight: 600,
                                    }}>
                                        {TIER_LABELS[row.today_tier]}
                                    </span>
                                )}
                            </div>

                            {/* Paws + streak */}
                            <div style={{ textAlign: 'right', flexShrink: 0, minWidth: '80px' }}>
                                <div style={{ fontWeight: 700, color: '#3b82f6' }}>{row.week_paws.toFixed(1)} 🐾</div>
                                {row.streak > 1 && (
                                    <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>{row.streak}d streak 🔥</div>
                                )}
                            </div>

                            {/* Prize label */}
                            {row.prize && (
                                <div style={{ flexShrink: 0 }}>
                                    <span style={{ backgroundColor: '#065f46', color: '#6ee7b7', padding: '0.2rem 0.5rem', borderRadius: '0.375rem', fontSize: '0.75rem', fontWeight: 600 }}>
                                        {row.prize}
                                    </span>
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>

            {/* CTA */}
            <div style={{ textAlign: 'center', marginTop: '2rem' }}>
                <a href="/helping-paws" style={{
                    display: 'inline-block', padding: '0.75rem 1.5rem', borderRadius: '0.5rem',
                    backgroundColor: '#3b82f6', color: '#fff', fontWeight: 600, textDecoration: 'none',
                }}>
                    Log your steps
                </a>
            </div>

            <p style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.8rem', color: '#4b5563' }}>
                Sponsored by{' '}
                <a href="https://hunters-hounds.london" target="_blank" rel="noopener noreferrer" style={{ color: '#6b7280' }}>
                    Hunter's Hounds
                </a>
            </p>
        </div>
    );
}
