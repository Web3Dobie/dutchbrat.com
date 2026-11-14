'use client';

import { useEffect, useState, useCallback } from 'react';

type Tab = 'summary' | 'package' | 'participants' | 'animals' | 'impact' | 'logs' | 'shelters';

const TABS: { key: Tab; label: string }[] = [
    { key: 'summary', label: 'Weekly summary' },
    { key: 'package', label: 'Set package' },
    { key: 'participants', label: 'Participants' },
    { key: 'animals', label: 'Animals' },
    { key: 'impact', label: 'Impact log' },
    { key: 'logs', label: 'Step logs' },
    { key: 'shelters', label: 'Shelters' },
];

// ---------- Shared styles ----------
const cardStyle: React.CSSProperties = { backgroundColor: '#1f2937', borderRadius: '0.75rem', padding: '1.25rem', marginBottom: '1rem' };
const inputStyle: React.CSSProperties = { width: '100%', padding: '0.5rem 0.75rem', borderRadius: '0.5rem', border: '1px solid #374151', backgroundColor: '#111827', color: '#f9fafb', fontSize: '0.9rem', boxSizing: 'border-box' };
const btnPrimary: React.CSSProperties = { padding: '0.5rem 1rem', borderRadius: '0.5rem', backgroundColor: '#3b82f6', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 600 };
const btnSuccess: React.CSSProperties = { ...btnPrimary, backgroundColor: '#047857' };
const btnDanger: React.CSSProperties = { ...btnPrimary, backgroundColor: '#b91c1c' };
const labelStyle: React.CSSProperties = { display: 'block', fontSize: '0.8rem', color: '#9ca3af', marginBottom: '0.35rem' };
const thStyle: React.CSSProperties = { textAlign: 'left', padding: '0.5rem 0.75rem', fontSize: '0.8rem', color: '#9ca3af', borderBottom: '1px solid #374151', whiteSpace: 'nowrap' };
const tdStyle: React.CSSProperties = { padding: '0.5rem 0.75rem', fontSize: '0.875rem', borderBottom: '1px solid #1f2937', verticalAlign: 'middle' };

// ---------- Weekly Summary Tab ----------
function WeeklySummaryTab() {
    const [data, setData] = useState<any>(null);
    const [dispatching, setDispatching] = useState(false);
    const [msg, setMsg] = useState('');

    const load = useCallback(async () => {
        const res = await fetch('/api/helping-paws/admin/weekly-summary');
        if (res.ok) setData(await res.json());
    }, []);

    useEffect(() => { load(); }, [load]);

    async function handleDispatch() {
        if (!confirm('Mark this week as dispatched and send emails to all participants?')) return;
        setDispatching(true);
        const res = await fetch('/api/helping-paws/admin/dispatch', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ weekStart: data?.weekStart }),
        });
        const d = await res.json();
        setMsg(res.ok ? `Dispatched! ${d.emailsSent} email(s) sent.` : d.error);
        setDispatching(false);
        await load();
    }

    if (!data) return <p style={{ color: '#6b7280' }}>Loading…</p>;

    const pkg = data.weeklyPackage;
    const RANK_EMOJI: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' };

    return (
        <div>
            {pkg ? (
                <div style={{ ...cardStyle, border: '1px solid #1d4ed8' }}>
                    <div style={{ fontWeight: 600, marginBottom: '0.5rem', color: '#93c5fd' }}>Week of {data.weekStart}</div>
                    <div style={{ marginBottom: '0.25rem' }}>
                        <strong>Shelter package:</strong> {pkg.items_description} → {pkg.shelter_name}
                    </div>
                    <div style={{ fontSize: '0.85rem', color: '#9ca3af' }}>
                        Sponsor: <a href={pkg.sponsor_url} target="_blank" rel="noopener noreferrer" style={{ color: '#60a5fa' }}>{pkg.sponsor_name}</a>
                        {' · '} Status: <span style={{ color: pkg.dispatch_status === 'dispatched' ? '#34d399' : '#f59e0b' }}>{pkg.dispatch_status}</span>
                    </div>
                </div>
            ) : (
                <div style={{ ...cardStyle, color: '#f59e0b' }}>⚠️ No weekly package set yet — go to "Set package" tab.</div>
            )}

            <div style={{ overflowX: 'auto', marginBottom: '1rem' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: '#1f2937', borderRadius: '0.75rem', overflow: 'hidden' }}>
                    <thead>
                        <tr style={{ backgroundColor: '#111827' }}>
                            <th style={thStyle}>Rank</th>
                            <th style={thStyle}>Name</th>
                            <th style={thStyle}>Animal</th>
                            <th style={thStyle}>Shelter</th>
                            <th style={thStyle}>Week paws</th>
                            <th style={thStyle}>Prize</th>
                        </tr>
                    </thead>
                    <tbody>
                        {data.participants.map((p: any) => (
                            <tr key={p.participant_id}>
                                <td style={tdStyle}>{RANK_EMOJI[p.rank] || p.rank}</td>
                                <td style={tdStyle}>{p.display_name}</td>
                                <td style={tdStyle}>{p.animal_name || <span style={{ color: '#6b7280' }}>—</span>}</td>
                                <td style={tdStyle}>{p.shelter_name || <span style={{ color: '#6b7280' }}>—</span>}</td>
                                <td style={{ ...tdStyle, fontWeight: 600, color: '#3b82f6' }}>{parseFloat(p.week_paws).toFixed(1)}</td>
                                <td style={tdStyle}>
                                    {p.prize ? (
                                        <span style={{ backgroundColor: '#065f46', color: '#6ee7b7', padding: '0.15rem 0.5rem', borderRadius: '0.375rem', fontSize: '0.75rem' }}>
                                            {p.prize}
                                        </span>
                                    ) : <span style={{ color: '#4b5563' }}>—</span>}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {msg && <div style={{ marginBottom: '1rem', padding: '0.75rem', backgroundColor: '#065f46', borderRadius: '0.5rem', color: '#6ee7b7', fontSize: '0.875rem' }}>{msg}</div>}

            <button onClick={handleDispatch} disabled={dispatching} style={btnSuccess}>
                {dispatching ? 'Dispatching…' : '✓ Mark as dispatched & send emails'}
            </button>
        </div>
    );
}

// ---------- Set Package Tab ----------
function SetPackageTab() {
    const [data, setData] = useState<any>(null);
    const [form, setForm] = useState({ shelterId: '', itemsDescription: '', sponsorName: "Hunter's Hounds", sponsorUrl: 'https://hunters-hounds.london' });
    const [msg, setMsg] = useState('');

    useEffect(() => {
        fetch('/api/helping-paws/admin/weekly-package')
            .then(r => r.json())
            .then(d => {
                setData(d);
                if (d.package) {
                    setForm({
                        shelterId: String(d.package.shelter_id),
                        itemsDescription: d.package.items_description,
                        sponsorName: d.package.sponsor_name,
                        sponsorUrl: d.package.sponsor_url,
                    });
                } else if (d.shelters?.length > 0) {
                    setForm(f => ({ ...f, shelterId: String(d.shelters[0].id) }));
                }
            });
    }, []);

    async function handleSave(e: React.FormEvent) {
        e.preventDefault();
        const res = await fetch('/api/helping-paws/admin/weekly-package', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ weekStart: data?.weekStart, ...form }),
        });
        setMsg(res.ok ? 'Package saved!' : 'Failed to save');
    }

    if (!data) return <p style={{ color: '#6b7280' }}>Loading…</p>;

    return (
        <form onSubmit={handleSave} style={cardStyle}>
            <h3 style={{ marginTop: 0, marginBottom: '1rem', color: '#93c5fd' }}>Week of {data?.weekStart}</h3>
            <div style={{ marginBottom: '1rem' }}>
                <label style={labelStyle}>Rescue centre</label>
                <select value={form.shelterId} onChange={e => setForm(f => ({ ...f, shelterId: e.target.value }))} style={inputStyle} required>
                    <option value="">Select…</option>
                    {data.shelters?.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
            </div>
            <div style={{ marginBottom: '1rem' }}>
                <label style={labelStyle}>Items (e.g. "10 meals + 5 treat bags")</label>
                <input value={form.itemsDescription} onChange={e => setForm(f => ({ ...f, itemsDescription: e.target.value }))} style={inputStyle} required placeholder="10 meals + 5 treat bags" />
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: '200px' }}>
                    <label style={labelStyle}>Sponsor name</label>
                    <input value={form.sponsorName} onChange={e => setForm(f => ({ ...f, sponsorName: e.target.value }))} style={inputStyle} required />
                </div>
                <div style={{ flex: 1, minWidth: '200px' }}>
                    <label style={labelStyle}>Sponsor URL</label>
                    <input value={form.sponsorUrl} onChange={e => setForm(f => ({ ...f, sponsorUrl: e.target.value }))} style={inputStyle} required />
                </div>
            </div>
            {msg && <div style={{ marginBottom: '0.75rem', color: '#6ee7b7', fontSize: '0.875rem' }}>{msg}</div>}
            <button type="submit" style={btnPrimary}>Save package</button>
        </form>
    );
}

// ---------- Participants Tab ----------
function ParticipantsTab() {
    const [data, setData] = useState<any>(null);
    const [owners, setOwners] = useState<{ id: number; owner_name: string }[]>([]);
    const [form, setForm] = useState({ displayName: '', username: '', password: '', email: '', hhOwnerId: '' });
    const [msg, setMsg] = useState('');
    const [editingOwner, setEditingOwner] = useState<{ id: number; hhOwnerId: string } | null>(null);

    const load = useCallback(async () => {
        const [pRes, oRes] = await Promise.all([
            fetch('/api/helping-paws/admin/participants'),
            fetch('/api/helping-paws/admin/hh-owners'),
        ]);
        if (pRes.ok) setData(await pRes.json());
        if (oRes.ok) setOwners((await oRes.json()).owners);
    }, []);

    useEffect(() => { load(); }, [load]);

    async function handleAdd(e: React.FormEvent) {
        e.preventDefault();
        const res = await fetch('/api/helping-paws/admin/participants', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...form, hhOwnerId: form.hhOwnerId ? parseInt(form.hhOwnerId) : null }),
        });
        const d = await res.json();
        setMsg(res.ok ? `Added ${form.displayName}` : d.error);
        if (res.ok) { setForm({ displayName: '', username: '', password: '', email: '', hhOwnerId: '' }); await load(); }
    }

    async function handleSaveOwner(participantId: number, hhOwnerId: string) {
        await fetch('/api/helping-paws/admin/participants', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: participantId, hhOwnerId: hhOwnerId ? parseInt(hhOwnerId) : null }),
        });
        setEditingOwner(null);
        await load();
    }

    return (
        <div>
            <form onSubmit={handleAdd} style={cardStyle}>
                <h3 style={{ marginTop: 0, marginBottom: '1rem' }}>Add participant</h3>
                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
                    <div style={{ flex: 1, minWidth: '160px' }}>
                        <label style={labelStyle}>Display name</label>
                        <input value={form.displayName} onChange={e => setForm(f => ({ ...f, displayName: e.target.value }))} style={inputStyle} required placeholder="Jane" />
                    </div>
                    <div style={{ flex: 1, minWidth: '140px' }}>
                        <label style={labelStyle}>Username</label>
                        <input value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))} style={inputStyle} required placeholder="jane" />
                    </div>
                    <div style={{ flex: 1, minWidth: '140px' }}>
                        <label style={labelStyle}>Password</label>
                        <input type="text" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} style={inputStyle} required placeholder="set a password" />
                    </div>
                    <div style={{ flex: 1, minWidth: '200px' }}>
                        <label style={labelStyle}>Email (optional)</label>
                        <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} style={inputStyle} placeholder="jane@example.com" />
                    </div>
                    <div style={{ flex: 1, minWidth: '200px' }}>
                        <label style={labelStyle}>HH client (for dog video)</label>
                        <select value={form.hhOwnerId} onChange={e => setForm(f => ({ ...f, hhOwnerId: e.target.value }))} style={inputStyle}>
                            <option value="">— none —</option>
                            {owners.map(o => <option key={o.id} value={o.id}>{o.owner_name}</option>)}
                        </select>
                    </div>
                </div>
                {msg && <div style={{ marginBottom: '0.5rem', color: '#6ee7b7', fontSize: '0.875rem' }}>{msg}</div>}
                <button type="submit" style={btnPrimary}>Add</button>
            </form>

            {data?.participants?.length > 0 && (
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: '#1f2937', borderRadius: '0.75rem', overflow: 'hidden' }}>
                        <thead>
                            <tr style={{ backgroundColor: '#111827' }}>
                                <th style={thStyle}>Name</th>
                                <th style={thStyle}>Username</th>
                                <th style={thStyle}>Email</th>
                                <th style={thStyle}>Animal</th>
                                <th style={thStyle}>HH client (dog video)</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.participants.map((p: any) => {
                                const isEditing = editingOwner?.id === p.id;
                                const currentEdit = isEditing ? editingOwner! : null;
                                return (
                                <tr key={p.id}>
                                    <td style={tdStyle}>{p.display_name}</td>
                                    <td style={{ ...tdStyle, color: '#9ca3af' }}>{p.username}</td>
                                    <td style={{ ...tdStyle, color: '#9ca3af' }}>{p.email || '—'}</td>
                                    <td style={tdStyle}>{p.animal_name || <span style={{ color: '#6b7280' }}>none chosen</span>}</td>
                                    <td style={tdStyle}>
                                        {isEditing && currentEdit ? (
                                            <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                                                <select
                                                    value={currentEdit.hhOwnerId}
                                                    onChange={e => setEditingOwner(ev => ev ? { ...ev, hhOwnerId: e.target.value } : null)}
                                                    style={{ ...inputStyle, padding: '0.25rem 0.5rem', fontSize: '0.8rem' }}
                                                >
                                                    <option value="">— none —</option>
                                                    {owners.map(o => <option key={o.id} value={o.id}>{o.owner_name}</option>)}
                                                </select>
                                                <button onClick={() => handleSaveOwner(p.id, currentEdit.hhOwnerId)} style={{ ...btnSuccess, padding: '0.25rem 0.6rem', fontSize: '0.8rem' }}>Save</button>
                                                <button onClick={() => setEditingOwner(null)} style={{ padding: '0.25rem 0.6rem', borderRadius: '0.375rem', border: 'none', backgroundColor: '#374151', color: '#9ca3af', cursor: 'pointer', fontSize: '0.8rem' }}>✕</button>
                                            </div>
                                        ) : (
                                            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                                <span style={{ color: p.hh_owner_name ? '#f9fafb' : '#4b5563' }}>
                                                    {p.hh_owner_name || '— unlinked —'}
                                                </span>
                                                <button
                                                    onClick={() => setEditingOwner({ id: p.id, hhOwnerId: p.hh_owner_id ? String(p.hh_owner_id) : '' })}
                                                    style={{ padding: '0.15rem 0.5rem', borderRadius: '0.375rem', border: '1px solid #374151', backgroundColor: 'transparent', color: '#9ca3af', cursor: 'pointer', fontSize: '0.75rem' }}
                                                >
                                                    {p.hh_owner_name ? 'Change' : 'Link'}
                                                </button>
                                            </div>
                                        )}
                                    </td>
                                </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

// ---------- Animals Tab ----------
function AnimalsTab() {
    const [data, setData] = useState<any>(null);
    const [form, setForm] = useState({ name: '', animalType: 'dog', shelterId: '', photoUrl: '', bio: '' });
    const [msg, setMsg] = useState('');

    const load = useCallback(async () => {
        const res = await fetch('/api/helping-paws/admin/animals');
        if (res.ok) {
            const d = await res.json();
            setData(d);
            if (!form.shelterId && d.shelters?.length > 0) setForm(f => ({ ...f, shelterId: String(d.shelters[0].id) }));
        }
    }, [form.shelterId]);

    useEffect(() => { load(); }, []); // eslint-disable-line

    async function handleAdd(e: React.FormEvent) {
        e.preventDefault();
        const res = await fetch('/api/helping-paws/admin/animals', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(form),
        });
        const d = await res.json();
        setMsg(res.ok ? `Added ${form.name}` : d.error);
        if (res.ok) { setForm(f => ({ ...f, name: '', photoUrl: '', bio: '' })); await load(); }
    }

    async function handleStatusChange(id: number, status: string) {
        await fetch('/api/helping-paws/admin/animals', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, status }),
        });
        await load();
    }

    async function handleDeleteAnimal(id: number, name: string) {
        if (!confirm(`Remove ${name} permanently? This cannot be undone.`)) return;
        const res = await fetch('/api/helping-paws/admin/animals', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id }),
        });
        const d = await res.json();
        if (!res.ok) { setMsg(d.error); return; }
        await load();
    }

    const STATUS_COLOUR: Record<string, string> = { available: '#34d399', adopted: '#a78bfa', fostered: '#f59e0b', unavailable: '#6b7280', deceased: '#4b5563' };

    return (
        <div>
            <form onSubmit={handleAdd} style={cardStyle}>
                <h3 style={{ marginTop: 0, marginBottom: '1rem' }}>Add animal</h3>
                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
                    <div style={{ flex: 1, minWidth: '160px' }}>
                        <label style={labelStyle}>Name</label>
                        <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} style={inputStyle} required placeholder="Bruno" />
                    </div>
                    <div style={{ minWidth: '120px' }}>
                        <label style={labelStyle}>Type</label>
                        <select value={form.animalType} onChange={e => setForm(f => ({ ...f, animalType: e.target.value }))} style={inputStyle}>
                            <option value="dog">Dog 🐕</option>
                            <option value="cat">Cat 🐈</option>
                        </select>
                    </div>
                    <div style={{ flex: 1, minWidth: '160px' }}>
                        <label style={labelStyle}>Rescue centre</label>
                        <select value={form.shelterId} onChange={e => setForm(f => ({ ...f, shelterId: e.target.value }))} style={inputStyle} required>
                            {data?.shelters?.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                    </div>
                </div>
                <div style={{ marginBottom: '0.75rem' }}>
                    <label style={labelStyle}>Photo URL</label>
                    <input value={form.photoUrl} onChange={e => setForm(f => ({ ...f, photoUrl: e.target.value }))} style={inputStyle} placeholder="https://…" />
                </div>
                <div style={{ marginBottom: '0.75rem' }}>
                    <label style={labelStyle}>Bio</label>
                    <textarea value={form.bio} onChange={e => setForm(f => ({ ...f, bio: e.target.value }))} style={{ ...inputStyle, height: '80px', resize: 'vertical' }} placeholder="Tell Bruno's story…" />
                </div>
                {msg && <div style={{ marginBottom: '0.5rem', color: '#6ee7b7', fontSize: '0.875rem' }}>{msg}</div>}
                <button type="submit" style={btnPrimary}>Add animal</button>
            </form>

            {data?.animals?.length > 0 && (
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: '#1f2937', borderRadius: '0.75rem', overflow: 'hidden' }}>
                        <thead>
                            <tr style={{ backgroundColor: '#111827' }}>
                                <th style={thStyle}>Name</th>
                                <th style={thStyle}>Type</th>
                                <th style={thStyle}>Shelter</th>
                                <th style={thStyle}>Status</th>
                                <th style={thStyle}>Action</th>
                                <th style={thStyle}></th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.animals.map((a: any) => (
                                <tr key={a.id}>
                                    <td style={tdStyle}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            {a.photo_url && <img src={a.photo_url} alt={a.name} style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }} />}
                                            {a.name}
                                        </div>
                                    </td>
                                    <td style={tdStyle}>{a.animal_type === 'dog' ? '🐕' : '🐈'}</td>
                                    <td style={{ ...tdStyle, color: '#9ca3af' }}>{a.shelter_name}</td>
                                    <td style={tdStyle}>
                                        <span style={{ color: STATUS_COLOUR[a.status] || '#9ca3af' }}>{a.status}</span>
                                    </td>
                                    <td style={tdStyle}>
                                        <select
                                            value={a.status}
                                            onChange={e => handleStatusChange(a.id, e.target.value)}
                                            style={{ ...inputStyle, padding: '0.25rem 0.5rem', fontSize: '0.8rem' }}
                                        >
                                            <option value="available">available</option>
                                            <option value="adopted">adopted</option>
                                            <option value="fostered">fostered</option>
                                            <option value="unavailable">unavailable</option>
                                            <option value="deceased">passed away</option>
                                        </select>
                                    </td>
                                    <td style={tdStyle}>
                                        <button
                                            onClick={() => handleDeleteAnimal(a.id, a.name)}
                                            style={{ padding: '0.15rem 0.5rem', borderRadius: '0.375rem', border: '1px solid #7f1d1d', backgroundColor: 'transparent', color: '#f87171', cursor: 'pointer', fontSize: '0.75rem' }}
                                        >
                                            Delete
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

// ---------- Impact Log Tab ----------
function ImpactLogTab() {
    const [data, setData] = useState<any>(null);
    const [form, setForm] = useState({ animalId: '', itemsDescription: '', dispatchDate: new Date().toISOString().split('T')[0], deliveryPhotoUrl: '', socialMediaUrl: '' });
    const [msg, setMsg] = useState('');

    const load = useCallback(async () => {
        const res = await fetch('/api/helping-paws/admin/impact-log');
        if (res.ok) {
            const d = await res.json();
            setData(d);
            if (!form.animalId && d.animals?.length > 0) setForm(f => ({ ...f, animalId: String(d.animals[0].id) }));
        }
    }, [form.animalId]);

    useEffect(() => { load(); }, []); // eslint-disable-line

    async function handleAdd(e: React.FormEvent) {
        e.preventDefault();
        const res = await fetch('/api/helping-paws/admin/impact-log', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(form),
        });
        const d = await res.json();
        setMsg(res.ok ? 'Entry added!' : d.error);
        if (res.ok) { setForm(f => ({ ...f, itemsDescription: '', deliveryPhotoUrl: '', socialMediaUrl: '' })); await load(); }
    }

    return (
        <div>
            <form onSubmit={handleAdd} style={cardStyle}>
                <h3 style={{ marginTop: 0, marginBottom: '1rem' }}>Add delivery proof</h3>
                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
                    <div style={{ flex: 1, minWidth: '160px' }}>
                        <label style={labelStyle}>Animal</label>
                        <select value={form.animalId} onChange={e => setForm(f => ({ ...f, animalId: e.target.value }))} style={inputStyle} required>
                            {data?.animals?.map((a: any) => <option key={a.id} value={a.id}>{a.name} ({a.shelter_name})</option>)}
                        </select>
                    </div>
                    <div style={{ minWidth: '160px' }}>
                        <label style={labelStyle}>Dispatch date</label>
                        <input type="date" value={form.dispatchDate} onChange={e => setForm(f => ({ ...f, dispatchDate: e.target.value }))} style={inputStyle} required />
                    </div>
                </div>
                <div style={{ marginBottom: '0.75rem' }}>
                    <label style={labelStyle}>Items sent</label>
                    <input value={form.itemsDescription} onChange={e => setForm(f => ({ ...f, itemsDescription: e.target.value }))} style={inputStyle} required placeholder="5 treat bags + 2 meals" />
                </div>
                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
                    <div style={{ flex: 1, minWidth: '200px' }}>
                        <label style={labelStyle}>Delivery photo URL</label>
                        <input value={form.deliveryPhotoUrl} onChange={e => setForm(f => ({ ...f, deliveryPhotoUrl: e.target.value }))} style={inputStyle} placeholder="https://…" />
                    </div>
                    <div style={{ flex: 1, minWidth: '200px' }}>
                        <label style={labelStyle}>Social media post URL</label>
                        <input value={form.socialMediaUrl} onChange={e => setForm(f => ({ ...f, socialMediaUrl: e.target.value }))} style={inputStyle} placeholder="https://instagram.com/…" />
                    </div>
                </div>
                {msg && <div style={{ marginBottom: '0.5rem', color: '#6ee7b7', fontSize: '0.875rem' }}>{msg}</div>}
                <button type="submit" style={btnPrimary}>Add entry</button>
            </form>

            {data?.entries?.length > 0 && (
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: '#1f2937', borderRadius: '0.75rem', overflow: 'hidden' }}>
                        <thead>
                            <tr style={{ backgroundColor: '#111827' }}>
                                <th style={thStyle}>Date</th>
                                <th style={thStyle}>Animal</th>
                                <th style={thStyle}>Shelter</th>
                                <th style={thStyle}>Items</th>
                                <th style={thStyle}>Proof</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.entries.map((e: any) => (
                                <tr key={e.id}>
                                    <td style={tdStyle}>{e.dispatch_date}</td>
                                    <td style={tdStyle}>{e.animal_name}</td>
                                    <td style={{ ...tdStyle, color: '#9ca3af' }}>{e.shelter_name}</td>
                                    <td style={tdStyle}>{e.items_description}</td>
                                    <td style={tdStyle}>
                                        {e.delivery_photo_url && <a href={e.delivery_photo_url} target="_blank" rel="noopener noreferrer" style={{ color: '#60a5fa', marginRight: '0.5rem' }}>Photo</a>}
                                        {e.social_media_url && <a href={e.social_media_url} target="_blank" rel="noopener noreferrer" style={{ color: '#60a5fa' }}>Social</a>}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

// ---------- Step Logs Tab ----------
function StepLogsTab() {
    const [logs, setLogs] = useState<any[]>([]);

    useEffect(() => {
        // Reuse weekly-summary which includes step data
        fetch('/api/helping-paws/admin/weekly-summary')
            .then(r => r.json())
            .then(d => setLogs(d.participants || []));
    }, []);

    return (
        <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: '#1f2937', borderRadius: '0.75rem', overflow: 'hidden' }}>
                <thead>
                    <tr style={{ backgroundColor: '#111827' }}>
                        <th style={thStyle}>Rank</th>
                        <th style={thStyle}>Name</th>
                        <th style={thStyle}>Week paws</th>
                        <th style={thStyle}>Animal</th>
                        <th style={thStyle}>Prize</th>
                    </tr>
                </thead>
                <tbody>
                    {logs.map((p: any) => (
                        <tr key={p.participant_id}>
                            <td style={tdStyle}>{p.rank}</td>
                            <td style={tdStyle}>{p.display_name}</td>
                            <td style={{ ...tdStyle, color: '#3b82f6', fontWeight: 600 }}>{parseFloat(p.week_paws).toFixed(1)}</td>
                            <td style={tdStyle}>{p.animal_name || '—'}</td>
                            <td style={tdStyle}>{p.prize || '—'}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

// ---------- Shelters Tab ----------
function SheltersTab() {
    const [shelters, setShelters] = useState<any[]>([]);
    const [form, setForm] = useState({ name: '', location: '', socialMediaUrl: '' });
    const [msg, setMsg] = useState('');
    const [editing, setEditing] = useState<{ id: number; name: string; location: string; socialMediaUrl: string } | null>(null);

    const load = useCallback(async () => {
        const res = await fetch('/api/helping-paws/admin/shelters');
        if (res.ok) setShelters((await res.json()).shelters);
    }, []);

    useEffect(() => { load(); }, [load]);

    async function handleAdd(e: React.FormEvent) {
        e.preventDefault();
        const res = await fetch('/api/helping-paws/admin/shelters', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(form),
        });
        const d = await res.json();
        setMsg(res.ok ? `Added ${form.name}` : d.error);
        if (res.ok) { setForm({ name: '', location: '', socialMediaUrl: '' }); await load(); }
    }

    async function handleSaveEdit() {
        if (!editing) return;
        await fetch('/api/helping-paws/admin/shelters', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(editing),
        });
        setEditing(null);
        await load();
    }

    async function handleDelete(id: number, name: string) {
        if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
        const res = await fetch('/api/helping-paws/admin/shelters', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id }),
        });
        const d = await res.json();
        if (!res.ok) { setMsg(d.error); return; }
        await load();
    }

    return (
        <div>
            <form onSubmit={handleAdd} style={cardStyle}>
                <h3 style={{ marginTop: 0, marginBottom: '1rem' }}>Add rescue centre</h3>
                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
                    <div style={{ flex: 1, minWidth: '180px' }}>
                        <label style={labelStyle}>Name</label>
                        <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} style={inputStyle} required placeholder="Dobermann Rescue UK" />
                    </div>
                    <div style={{ flex: 1, minWidth: '180px' }}>
                        <label style={labelStyle}>Location (optional)</label>
                        <input value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} style={inputStyle} placeholder="London, UK" />
                    </div>
                    <div style={{ flex: 1, minWidth: '220px' }}>
                        <label style={labelStyle}>Social media URL (optional)</label>
                        <input value={form.socialMediaUrl} onChange={e => setForm(f => ({ ...f, socialMediaUrl: e.target.value }))} style={inputStyle} placeholder="https://instagram.com/…" />
                    </div>
                </div>
                {msg && <div style={{ marginBottom: '0.5rem', color: '#6ee7b7', fontSize: '0.875rem' }}>{msg}</div>}
                <button type="submit" style={btnPrimary}>Add</button>
            </form>

            {shelters.length > 0 && (
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: '#1f2937', borderRadius: '0.75rem', overflow: 'hidden' }}>
                        <thead>
                            <tr style={{ backgroundColor: '#111827' }}>
                                <th style={thStyle}>Name</th>
                                <th style={thStyle}>Location</th>
                                <th style={thStyle}>Social media</th>
                                <th style={thStyle}>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {shelters.map((s: any) => {
                                const isEditing = editing?.id === s.id;
                                const e0 = isEditing ? editing! : null;
                                return (
                                    <tr key={s.id}>
                                        <td style={tdStyle}>
                                            {e0
                                                ? <input value={e0.name} onChange={e => setEditing(v => v ? { ...v, name: e.target.value } : v)} style={{ ...inputStyle, padding: '0.25rem 0.5rem', fontSize: '0.8rem' }} />
                                                : s.name}
                                        </td>
                                        <td style={{ ...tdStyle, color: '#9ca3af' }}>
                                            {e0
                                                ? <input value={e0.location} onChange={e => setEditing(v => v ? { ...v, location: e.target.value } : v)} style={{ ...inputStyle, padding: '0.25rem 0.5rem', fontSize: '0.8rem' }} placeholder="e.g. London, UK" />
                                                : s.location || <span style={{ color: '#4b5563' }}>—</span>}
                                        </td>
                                        <td style={{ ...tdStyle, color: '#9ca3af' }}>
                                            {e0
                                                ? <input value={e0.socialMediaUrl} onChange={e => setEditing(v => v ? { ...v, socialMediaUrl: e.target.value } : v)} style={{ ...inputStyle, padding: '0.25rem 0.5rem', fontSize: '0.8rem' }} placeholder="https://instagram.com/…" />
                                                : s.social_media_url
                                                    ? <a href={s.social_media_url} target="_blank" rel="noopener noreferrer" style={{ color: '#60a5fa' }}>Link</a>
                                                    : <span style={{ color: '#4b5563' }}>—</span>}
                                        </td>
                                        <td style={tdStyle}>
                                            {isEditing ? (
                                                <div style={{ display: 'flex', gap: '0.4rem' }}>
                                                    <button onClick={handleSaveEdit} style={{ ...btnSuccess, padding: '0.25rem 0.6rem', fontSize: '0.8rem' }}>Save</button>
                                                    <button onClick={() => setEditing(null)} style={{ padding: '0.25rem 0.6rem', borderRadius: '0.375rem', border: 'none', backgroundColor: '#374151', color: '#9ca3af', cursor: 'pointer', fontSize: '0.8rem' }}>✕</button>
                                                </div>
                                            ) : (
                                                <div style={{ display: 'flex', gap: '0.4rem' }}>
                                                    <button
                                                        onClick={() => setEditing({ id: s.id, name: s.name, location: s.location || '', socialMediaUrl: s.social_media_url || '' })}
                                                        style={{ padding: '0.15rem 0.5rem', borderRadius: '0.375rem', border: '1px solid #374151', backgroundColor: 'transparent', color: '#9ca3af', cursor: 'pointer', fontSize: '0.75rem' }}
                                                    >
                                                        Edit
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(s.id, s.name)}
                                                        style={{ padding: '0.15rem 0.5rem', borderRadius: '0.375rem', border: '1px solid #7f1d1d', backgroundColor: 'transparent', color: '#f87171', cursor: 'pointer', fontSize: '0.75rem' }}
                                                    >
                                                        Delete
                                                    </button>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

// ---------- Main page ----------
export default function HelpingPawsAdmin() {
    const [tab, setTab] = useState<Tab>('summary');
    const [authed, setAuthed] = useState<boolean | null>(null);

    useEffect(() => {
        // Quick auth check via weekly-summary (requires admin cookie)
        fetch('/api/helping-paws/admin/weekly-summary')
            .then(r => { setAuthed(r.status !== 401); })
            .catch(() => setAuthed(false));
    }, []);

    if (authed === null) return <div style={{ padding: '2rem', color: '#6b7280' }}>Checking access…</div>;
    if (!authed) return (
        <div style={{ padding: '2rem', textAlign: 'center' }}>
            <p style={{ color: '#fca5a5' }}>Admin access required.</p>
            <a href="/dog-walking/admin" style={{ color: '#60a5fa' }}>Go to admin login</a>
        </div>
    );

    return (
        <div style={{ maxWidth: '960px', margin: '0 auto', padding: '1.5rem 1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700 }}>🐾 Helping Paws Admin</h1>
                <a href="/helping-paws/leaderboard" style={{ color: '#9ca3af', fontSize: '0.875rem' }}>View leaderboard →</a>
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: '0.25rem', marginBottom: '1.5rem', flexWrap: 'wrap', backgroundColor: '#1f2937', borderRadius: '0.75rem', padding: '0.35rem' }}>
                {TABS.map(t => (
                    <button key={t.key} onClick={() => setTab(t.key)}
                        style={{
                            padding: '0.4rem 0.75rem', borderRadius: '0.5rem', border: 'none', cursor: 'pointer', fontSize: '0.85rem',
                            backgroundColor: tab === t.key ? '#3b82f6' : 'transparent',
                            color: tab === t.key ? '#fff' : '#9ca3af', fontWeight: tab === t.key ? 600 : 400,
                        }}>
                        {t.label}
                    </button>
                ))}
            </div>

            {tab === 'summary' && <WeeklySummaryTab />}
            {tab === 'package' && <SetPackageTab />}
            {tab === 'participants' && <ParticipantsTab />}
            {tab === 'animals' && <AnimalsTab />}
            {tab === 'impact' && <ImpactLogTab />}
            {tab === 'logs' && <StepLogsTab />}
            {tab === 'shelters' && <SheltersTab />}
        </div>
    );
}
