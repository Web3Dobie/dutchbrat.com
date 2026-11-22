"use client";

import React, { useEffect, useState } from "react";

interface DateRow { date: string; times: number; service: string | null }
interface Client { owner_id: number; owner_name: string; last_checked: string; full: DateRow[]; open: DateRow[] }

const fmtDate = (iso: string) =>
    new Date(`${iso}T12:00:00`).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
const fmtWhen = (iso: string) =>
    new Date(iso).toLocaleString("en-GB", { weekday: "short", hour: "2-digit", minute: "2-digit" });
const list = (rows: DateRow[]) =>
    rows.map((r) => `${fmtDate(r.date)}${r.times > 1 ? ` (looked ${r.times} times)` : ""}`).join(", ");

/** Clients who checked dates on the booking calendar in the last 24 hours and did not book them. */
export default function UnmetDemand() {
    const [clients, setClients] = useState<Client[] | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetch("/api/dog-walking/admin/unmet-demand").then(async (r) => {
            const j = await r.json();
            if (!r.ok) throw new Error(j.error || "Failed to load");
            setClients(j.clients);
        }).catch((e) => setError(e.message));
    }, []);

    const s = {
        card: { backgroundColor: "#1f2937", border: "1px solid #333", borderRadius: "8px", padding: "20px", marginTop: "24px" } as React.CSSProperties,
        title: { fontSize: "1.1rem", fontWeight: "bold", color: "#d1d5db", marginBottom: "6px" } as React.CSSProperties,
        muted: { color: "#9ca3af", fontSize: "0.85rem", lineHeight: 1.5 } as React.CSSProperties,
        row: { padding: "12px 0", borderTop: "1px solid #283040" } as React.CSSProperties,
        name: { color: "#e5e7eb", fontWeight: 600 } as React.CSSProperties,
        label: { color: "#9ca3af", fontSize: "0.85rem", marginRight: "6px" } as React.CSSProperties,
        full: { color: "#fca5a5", marginTop: "4px", lineHeight: 1.5 } as React.CSSProperties,
        open: { color: "#d1d5db", marginTop: "4px", lineHeight: 1.5 } as React.CSSProperties,
    };

    return (
        <div style={s.card}>
            <div style={s.title}>Looked but didn&apos;t book (last 24 hours)</div>
            <p style={{ ...s.muted, maxWidth: "75ch", marginBottom: "12px" }}>
                Logged-in clients who checked dates on the booking calendar and have no booking on them.
                A date disappears once the client has a booking that day, or 24 hours after they looked.
            </p>
            {error && <p style={{ color: "#fca5a5" }}>{error}</p>}
            {clients && clients.length === 0 && <p style={s.muted}>Nobody in the last 24 hours.</p>}
            {clients && clients.map((c) => (
                <div key={c.owner_id} style={s.row}>
                    <span style={s.name}>{c.owner_name}</span>
                    <span style={{ ...s.muted, marginLeft: "10px" }}>last looked {fmtWhen(c.last_checked)}</span>
                    {c.full.length > 0 && (
                        <div style={s.full}><span style={s.label}>Nothing available:</span>{list(c.full)}</div>
                    )}
                    {c.open.length > 0 && (
                        <div style={s.open}><span style={s.label}>Had times free, not booked:</span>{list(c.open)}</div>
                    )}
                </div>
            ))}
        </div>
    );
}
