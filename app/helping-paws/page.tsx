'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { TIER_COLOURS, TIER_LABELS, Tier } from '@/lib/helpingPawsTiers';

interface DashboardData {
    animal: {
        animal_id: number;
        animal_name: string;
        photo_url: string | null;
        status: string;
        shelter_id: number;
        shelter_name: string;
    } | null;
    today: { steps: number; tier: Tier; paws_earned: number; ads_watched: number } | null;
    history: Array<{ log_date: string; steps: number; tier: Tier; paws_earned: number }>;
    weekPaws: number;
    rank: number | null;
    missedYesterday: boolean;
    weeklyPackage: { items_description: string; sponsor_name: string; sponsor_url: string } | null;
    videoUrl: string | null;
}

const RANK_EMOJI: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' };

// ---------- Video Ad Modal ----------
function VideoAdModal({
    videoUrl,
    animalName,
    targetAds,
    onAward,
    onClose,
}: {
    videoUrl: string;
    animalName: string;
    targetAds: 1 | 2;
    onAward: () => void;
    onClose: () => void;
}) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [readyToAward, setReadyToAward] = useState(false);

    function handleTimeUpdate() {
        if (!readyToAward && videoRef.current && videoRef.current.currentTime >= 10) {
            videoRef.current.pause();
            setReadyToAward(true);
        }
    }

    function handleEnded() {
        setReadyToAward(true);
    }

    return (
        <div style={{
            position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.92)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            zIndex: 1000, padding: '1rem',
        }}>
            <div style={{ width: '100%', maxWidth: '480px' }}>
                <div style={{ marginBottom: '0.75rem', textAlign: 'center', color: '#d1d5db', fontSize: '0.9rem' }}>
                    {readyToAward
                        ? <span style={{ color: '#6ee7b7', fontWeight: 600 }}>Boost unlocked! 🐾</span>
                        : `Watch ${animalName} for 10 seconds to boost your paws`
                    }
                </div>

                <video
                    ref={videoRef}
                    src={videoUrl}
                    autoPlay
                    playsInline
                    controls
                    onTimeUpdate={handleTimeUpdate}
                    onEnded={handleEnded}
                    style={{ width: '100%', borderRadius: '0.75rem', backgroundColor: '#000' }}
                />

                <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem', justifyContent: 'center' }}>
                    {readyToAward ? (
                        <button
                            onClick={onAward}
                            style={{
                                padding: '0.75rem 1.5rem', borderRadius: '0.5rem',
                                backgroundColor: '#047857', color: '#6ee7b7', border: 'none',
                                cursor: 'pointer', fontWeight: 700, fontSize: '1rem',
                            }}
                        >
                            Claim {targetAds === 1 ? '+25%' : '+50%'} paws
                        </button>
                    ) : (
                        <button
                            onClick={onClose}
                            style={{ padding: '0.5rem 1rem', borderRadius: '0.5rem', border: '1px solid #374151', backgroundColor: 'transparent', color: '#6b7280', cursor: 'pointer', fontSize: '0.875rem' }}
                        >
                            Cancel
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

// ---------- Dashboard ----------
export default function HelpingPawsDashboard() {
    const router = useRouter();
    const [data, setData] = useState<DashboardData | null>(null);
    const [steps, setSteps] = useState('');
    const [logState, setLogState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [logMessage, setLogMessage] = useState('');
    const [videoModal, setVideoModal] = useState<{ targetAds: 1 | 2 } | null>(null);

    const load = useCallback(async () => {
        const res = await fetch('/api/helping-paws/steps');
        if (res.status === 401) { router.replace('/helping-paws/login'); return; }
        if (res.ok) {
            const json = await res.json();
            setData(json);
            if (json.today) setSteps(String(json.today.steps));
        }
    }, [router]);

    useEffect(() => { load(); }, [load]);

    async function handleLogSteps(e: React.FormEvent) {
        e.preventDefault();
        const stepsNum = parseInt(steps);
        if (isNaN(stepsNum) || stepsNum < 0) return;
        setLogState('loading');

        const res = await fetch('/api/helping-paws/steps', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ steps: stepsNum, adsWatched: data?.today?.ads_watched || 0 }),
        });

        if (res.ok) {
            setLogState('success');
            setLogMessage('Steps logged!');
            await load();
        } else {
            setLogState('error');
            const d = await res.json();
            setLogMessage(d.error || 'Failed to log steps');
        }
        setTimeout(() => setLogState('idle'), 3000);
    }

    async function handleWatchAd(count: 1 | 2) {
        if (!data?.today) return;
        const res = await fetch('/api/helping-paws/steps', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ steps: data.today.steps, adsWatched: count }),
        });
        if (res.ok) { setVideoModal(null); await load(); }
    }

    async function handleLogout() {
        await fetch('/api/helping-paws/auth/logout', { method: 'POST' });
        router.push('/helping-paws/login');
    }

    if (!data) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
                <p style={{ color: '#6b7280' }}>Loading…</p>
            </div>
        );
    }

    const tier: Tier = data.today?.tier || 'none';
    const todayPaws = data.today?.paws_earned || 0;
    const rank = data.rank;
    const adsWatched = data.today?.ads_watched || 0;
    const animalName = data.animal?.animal_name || 'your dog';

    // Build 7-day history grid (most recent first, up to 7 days back)
    const historyMap = new Map(data.history.map(h => [h.log_date, h]));
    const days = Array.from({ length: 7 }, (_, i) => {
        const d = new Date();
        d.setUTCDate(d.getUTCDate() - i);
        return d.toISOString().split('T')[0];
    });

    return (
        <>
            {videoModal && data.videoUrl && (
                <VideoAdModal
                    videoUrl={data.videoUrl}
                    animalName={animalName}
                    targetAds={videoModal.targetAds}
                    onAward={() => handleWatchAd(videoModal.targetAds)}
                    onClose={() => setVideoModal(null)}
                />
            )}

            <div style={{ maxWidth: '640px', margin: '0 auto', padding: '1.5rem 1rem' }}>

                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>🐾 Helping Paws</h1>
                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                        <a href="/helping-paws/leaderboard" style={{ color: '#9ca3af', fontSize: '0.875rem' }}>Leaderboard</a>
                        <button onClick={handleLogout} style={{ background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer', fontSize: '0.875rem' }}>
                            Log out
                        </button>
                    </div>
                </div>

                {/* Nudge */}
                {data.missedYesterday && data.animal && (
                    <div style={{ backgroundColor: '#1e3a5f', borderRadius: '0.75rem', padding: '0.875rem 1rem', marginBottom: '1rem', fontSize: '0.875rem', color: '#93c5fd' }}>
                        🐕 {data.animal.animal_name} missed you yesterday — log today's steps!
                    </div>
                )}

                {/* Animal card */}
                <div style={{ backgroundColor: '#1f2937', borderRadius: '0.75rem', padding: '1.25rem', marginBottom: '1rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    {data.animal?.photo_url ? (
                        <img src={data.animal.photo_url} alt={data.animal.animal_name}
                            style={{ width: '72px', height: '72px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                    ) : (
                        <div style={{ width: '72px', height: '72px', borderRadius: '50%', backgroundColor: '#374151', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', flexShrink: 0 }}>
                            🐕
                        </div>
                    )}
                    {data.animal ? (
                        <div>
                            <div style={{ fontWeight: 600, fontSize: '1.125rem' }}>{data.animal.animal_name}</div>
                            <div style={{ color: '#9ca3af', fontSize: '0.875rem' }}>{data.animal.shelter_name}</div>
                            {data.animal.status === 'adopted' && (
                                <div style={{ color: '#34d399', fontSize: '0.8rem', marginTop: '0.25rem' }}>🎉 Adopted!</div>
                            )}
                        </div>
                    ) : (
                        <div style={{ color: '#9ca3af' }}>Choose a dog to sponsor from the leaderboard</div>
                    )}
                </div>

                {/* Weekly progress */}
                <div style={{ backgroundColor: '#1f2937', borderRadius: '0.75rem', padding: '1.25rem', marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.5rem' }}>
                        <span style={{ fontWeight: 600 }}>This week</span>
                        {rank && (
                            <span style={{ fontSize: '1.125rem' }}>
                                {RANK_EMOJI[rank] || ''} {rank === 1 ? '1st' : rank === 2 ? '2nd' : rank === 3 ? '3rd' : `${rank}th`} place
                            </span>
                        )}
                    </div>
                    <div style={{ fontSize: '2rem', fontWeight: 700, color: '#3b82f6' }}>
                        {data.weekPaws.toFixed(1)} paws
                    </div>
                    {rank && rank <= 3 && (
                        <div style={{ marginTop: '0.5rem', fontSize: '0.875rem', color: '#86efac' }}>
                            {rank === 1 ? '🏆 You\'re in the lead — toy on the way!' : `🎁 Keep it up — you're in the treat bag zone!`}
                        </div>
                    )}
                </div>

                {/* 7-day history strip */}
                <div style={{ backgroundColor: '#1f2937', borderRadius: '0.75rem', padding: '1.25rem', marginBottom: '1rem' }}>
                    <div style={{ fontSize: '0.875rem', color: '#9ca3af', marginBottom: '0.75rem' }}>Last 7 days</div>
                    <div style={{ display: 'flex', gap: '0.4rem' }}>
                        {days.map(date => {
                            const entry = historyMap.get(date);
                            const t: Tier = entry?.tier || 'none';
                            const isToday = date === new Date().toISOString().split('T')[0];
                            return (
                                <div key={date} title={`${date}: ${entry ? `${entry.steps.toLocaleString()} steps` : 'No log'}`}
                                    style={{
                                        flex: 1, height: '36px', borderRadius: '0.375rem',
                                        backgroundColor: TIER_COLOURS[t],
                                        border: isToday ? '2px solid #f9fafb' : '2px solid transparent',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontSize: '0.65rem', color: '#fff', fontWeight: 600,
                                    }}>
                                    {TIER_LABELS[t] !== '—' ? TIER_LABELS[t][0] : ''}
                                </div>
                            );
                        })}
                    </div>
                    <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
                        {(['diamond', 'gold', 'silver', 'bronze'] as Tier[]).map(t => (
                            <span key={t} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem', color: '#9ca3af' }}>
                                <span style={{ width: '10px', height: '10px', borderRadius: '2px', backgroundColor: TIER_COLOURS[t], display: 'inline-block' }} />
                                {TIER_LABELS[t]}
                            </span>
                        ))}
                    </div>
                </div>

                {/* Step log form */}
                <div style={{ backgroundColor: '#1f2937', borderRadius: '0.75rem', padding: '1.25rem', marginBottom: '1rem' }}>
                    <div style={{ fontWeight: 600, marginBottom: '1rem' }}>
                        Log today's steps
                        {tier !== 'none' && (
                            <span style={{ marginLeft: '0.75rem', backgroundColor: TIER_COLOURS[tier], color: '#fff', padding: '0.2rem 0.6rem', borderRadius: '1rem', fontSize: '0.8rem' }}>
                                {TIER_LABELS[tier]} · {todayPaws} paws
                            </span>
                        )}
                    </div>

                    <form onSubmit={handleLogSteps} style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                        <div style={{ flex: 1, minWidth: '160px' }}>
                            <label style={{ display: 'block', fontSize: '0.8rem', color: '#9ca3af', marginBottom: '0.4rem' }}>Steps</label>
                            <input
                                type="number"
                                min="0"
                                value={steps}
                                onChange={e => setSteps(e.target.value)}
                                placeholder="e.g. 8500"
                                style={{
                                    width: '100%', padding: '0.625rem 0.75rem', borderRadius: '0.5rem',
                                    border: '1px solid #374151', backgroundColor: '#111827',
                                    color: '#f9fafb', fontSize: '1rem', boxSizing: 'border-box',
                                }}
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={logState === 'loading'}
                            style={{
                                padding: '0.625rem 1.25rem', borderRadius: '0.5rem',
                                backgroundColor: logState === 'loading' ? '#374151' : '#3b82f6',
                                color: '#fff', fontWeight: 600, border: 'none', cursor: 'pointer',
                            }}
                        >
                            {logState === 'loading' ? '…' : 'Log steps'}
                        </button>
                    </form>

                    {logState !== 'idle' && (
                        <div style={{ marginTop: '0.75rem', fontSize: '0.875rem', color: logState === 'success' ? '#86efac' : '#fca5a5' }}>
                            {logMessage}
                        </div>
                    )}

                    {/* Boost buttons — shown after steps are logged */}
                    {data.today && adsWatched < 2 && (
                        <div style={{ marginTop: '1rem', borderTop: '1px solid #374151', paddingTop: '1rem' }}>
                            <div style={{ fontSize: '0.875rem', color: '#d1d5db', marginBottom: '0.5rem' }}>
                                {data.videoUrl
                                    ? `Boost your paws — watch ${animalName}:`
                                    : 'Boost your paws:'
                                }
                            </div>
                            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                {adsWatched < 1 && (
                                    data.videoUrl ? (
                                        <button
                                            onClick={() => setVideoModal({ targetAds: 1 })}
                                            style={{ padding: '0.5rem 1rem', borderRadius: '0.5rem', backgroundColor: '#065f46', color: '#6ee7b7', border: '1px solid #047857', cursor: 'pointer', fontSize: '0.875rem' }}
                                        >
                                            Watch {animalName} 🐕 → +25% paws
                                        </button>
                                    ) : (
                                        <button
                                            onClick={() => handleWatchAd(1)}
                                            style={{ padding: '0.5rem 1rem', borderRadius: '0.5rem', backgroundColor: '#065f46', color: '#6ee7b7', border: '1px solid #047857', cursor: 'pointer', fontSize: '0.875rem' }}
                                        >
                                            +25% paws
                                        </button>
                                    )
                                )}
                                {adsWatched < 2 && adsWatched >= 1 && (
                                    data.videoUrl ? (
                                        <button
                                            onClick={() => setVideoModal({ targetAds: 2 })}
                                            style={{ padding: '0.5rem 1rem', borderRadius: '0.5rem', backgroundColor: '#065f46', color: '#6ee7b7', border: '1px solid #047857', cursor: 'pointer', fontSize: '0.875rem' }}
                                        >
                                            Watch {animalName} again 🐕 → +50% paws
                                        </button>
                                    ) : (
                                        <button
                                            onClick={() => handleWatchAd(2)}
                                            style={{ padding: '0.5rem 1rem', borderRadius: '0.5rem', backgroundColor: '#065f46', color: '#6ee7b7', border: '1px solid #047857', cursor: 'pointer', fontSize: '0.875rem' }}
                                        >
                                            +50% paws
                                        </button>
                                    )
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Tier reference */}
                <div style={{ backgroundColor: '#1f2937', borderRadius: '0.75rem', padding: '1.25rem', marginBottom: '1rem' }}>
                    <div style={{ fontSize: '0.8rem', color: '#9ca3af', marginBottom: '0.75rem', fontWeight: 600 }}>Steps → paws</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                        {([
                            { tier: 'bronze' as Tier, range: '2,500 – 4,999', paws: 1 },
                            { tier: 'silver' as Tier, range: '5,000 – 9,999', paws: 2 },
                            { tier: 'gold' as Tier, range: '10,000 – 14,999', paws: 4 },
                            { tier: 'diamond' as Tier, range: '15,000+', paws: 8 },
                        ]).map(({ tier: t, range, paws }) => (
                            <div key={t} style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                                <span style={{ width: '10px', height: '10px', borderRadius: '2px', backgroundColor: TIER_COLOURS[t], flexShrink: 0, display: 'inline-block' }} />
                                <span style={{ fontSize: '0.8rem', color: '#9ca3af', width: '56px', flexShrink: 0 }}>{TIER_LABELS[t]}</span>
                                <span style={{ fontSize: '0.8rem', color: '#d1d5db', flex: 1 }}>{range} steps</span>
                                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: TIER_COLOURS[t] }}>{paws} {paws === 1 ? 'paw' : 'paws'}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Weekly shelter package */}
                {data.weeklyPackage && (
                    <div style={{ backgroundColor: '#1f2937', borderRadius: '0.75rem', padding: '1.25rem', marginBottom: '1rem', fontSize: '0.875rem', color: '#d1d5db' }}>
                        🎁 This week&nbsp;
                        <a href={data.weeklyPackage.sponsor_url} target="_blank" rel="noopener noreferrer" style={{ color: '#93c5fd' }}>
                            {data.weeklyPackage.sponsor_name}
                        </a>
                        &nbsp;are sending <strong style={{ color: '#f9fafb' }}>{data.weeklyPackage.items_description}</strong> to the rescue.
                    </div>
                )}
            </div>
        </>
    );
}
