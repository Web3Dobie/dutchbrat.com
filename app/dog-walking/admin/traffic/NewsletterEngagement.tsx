"use client";

import React, { useEffect, useState } from "react";

interface NewsletterRow {
    id: number; title: string; sent_at: string; recipient_count: number;
    tracked: boolean; opened: number; clicked: number; clicks: number;
}
interface Recipient {
    owner_id: number; owner_name: string; email_status: string;
    opens: number; clicks: number; partner_too: boolean | null; first_open: string | null;
}
interface LinkRow { url: string; clicks: number; people: number; who: string[] }
interface Detail { id: number; recipients: Recipient[]; links: LinkRow[] }

const API = "/api/dog-walking/admin/newsletter/engagement";
const day = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
const dayTime = (iso: string) => new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
const shortUrl = (u: string) => u.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "");

/** Who opened each newsletter email and which links they followed. Admin Traffic page. */
export default function NewsletterEngagement() {
    const [rows, setRows] = useState<NewsletterRow[] | null>(null);
    const [detail, setDetail] = useState<Detail | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetch(API).then(async (r) => {
            const j = await r.json();
            if (!r.ok) throw new Error(j.error || "Failed to load");
            setRows(j.newsletters);
        }).catch((e) => setError(e.message));
    }, []);

    const open = (id: number) => {
        if (detail?.id === id) { setDetail(null); return; }
        fetch(`${API}?id=${id}`).then(async (r) => {
            const j = await r.json();
            if (!r.ok) throw new Error(j.error || "Failed to load");
            setDetail({ id, recipients: j.recipients, links: j.links });
        }).catch((e) => setError(e.message));
    };

    const s = {
        card: { backgroundColor: "#1f2937", border: "1px solid #333", borderRadius: "8px", padding: "20px", marginTop: "24px" } as React.CSSProperties,
        title: { fontSize: "1.1rem", fontWeight: "bold", color: "#d1d5db", marginBottom: "6px" } as React.CSSProperties,
        muted: { color: "#9ca3af", fontSize: "0.85rem", lineHeight: 1.5 } as React.CSSProperties,
        th: { textAlign: "left", color: "#9ca3af", fontWeight: 500, fontSize: "0.85rem", padding: "6px 8px", borderBottom: "1px solid #374151" } as React.CSSProperties,
        thNum: { textAlign: "right", color: "#9ca3af", fontWeight: 500, fontSize: "0.85rem", padding: "6px 8px", borderBottom: "1px solid #374151", whiteSpace: "nowrap" } as React.CSSProperties,
        td: { padding: "8px", borderBottom: "1px solid #283040", color: "#e5e7eb" } as React.CSSProperties,
        tdNum: { padding: "8px", borderBottom: "1px solid #283040", color: "#e5e7eb", textAlign: "right", fontVariantNumeric: "tabular-nums" } as React.CSSProperties,
        sub: { backgroundColor: "#111827", borderRadius: "6px", padding: "16px", margin: "4px 0 12px" } as React.CSSProperties,
        subTitle: { color: "#d1d5db", fontWeight: 600, margin: "0 0 8px" } as React.CSSProperties,
    };

    return (
        <div style={s.card}>
            <div style={s.title}>Newsletter emails</div>
            <p style={{ ...s.muted, maxWidth: "75ch", marginBottom: "12px" }}>
                Clicks are dependable. Opens are a rough guide only: Apple Mail reports every email as opened
                whether or not it was read, and some apps never report one. Click a newsletter to see who.
            </p>
            {error && <div style={{ color: "#ef4444" }}>Error: {error}</div>}
            {!rows && !error && <div style={s.muted}>Loading…</div>}
            {rows && (
                <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                        <thead>
                            <tr>
                                <th style={s.th}>Newsletter</th>
                                <th style={s.th}>Sent</th>
                                <th style={s.thNum}>Recipients</th>
                                <th style={s.thNum}>Opened</th>
                                <th style={s.thNum}>Clicked a link</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((n) => (
                                <React.Fragment key={n.id}>
                                    <tr onClick={() => n.tracked && open(n.id)} style={{ cursor: n.tracked ? "pointer" : "default" }}>
                                        <td style={s.td}>{n.tracked ? (detail?.id === n.id ? "▾ " : "▸ ") : ""}{n.title}</td>
                                        <td style={s.td}>{day(n.sent_at)}</td>
                                        <td style={s.tdNum}>{n.recipient_count}</td>
                                        {n.tracked ? (
                                            <>
                                                <td style={s.tdNum}>{n.opened}</td>
                                                <td style={s.tdNum}>{n.clicked}</td>
                                            </>
                                        ) : (
                                            <td style={{ ...s.td, ...s.muted, textAlign: "right" }} colSpan={2}>sent before tracking</td>
                                        )}
                                    </tr>
                                    {detail?.id === n.id && (
                                        <tr>
                                            <td colSpan={5} style={{ padding: 0 }}>
                                                <div style={s.sub}>
                                                    <p style={s.subTitle}>Links</p>
                                                    {detail.links.length === 0 ? <div style={s.muted}>No link clicked yet.</div> : (
                                                        <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "16px" }}>
                                                            <tbody>
                                                                {detail.links.map((l) => (
                                                                    <tr key={l.url}>
                                                                        <td style={{ ...s.td, wordBreak: "break-all" }}>
                                                                            {shortUrl(l.url)}
                                                                            <div style={s.muted}>{l.who.join(", ")}</div>
                                                                        </td>
                                                                        <td style={{ ...s.tdNum, whiteSpace: "nowrap" }}>{l.people} {l.people === 1 ? "person" : "people"}</td>
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    )}
                                                    <p style={{ ...s.subTitle, marginTop: "12px" }}>Recipients</p>
                                                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                                                        <thead>
                                                            <tr>
                                                                <th style={s.th}>Client</th>
                                                                <th style={s.th}>First opened</th>
                                                                <th style={s.thNum}>Opens</th>
                                                                <th style={s.thNum}>Clicks</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {detail.recipients.map((r) => (
                                                                <tr key={r.owner_id}>
                                                                    <td style={s.td}>
                                                                        {r.owner_name}
                                                                        {r.partner_too && <span style={s.muted}> (incl. partner&apos;s copy)</span>}
                                                                        {r.email_status !== "sent" && <span style={{ color: "#f59e0b" }}> — send failed</span>}
                                                                    </td>
                                                                    <td style={s.td}>{r.first_open ? dayTime(r.first_open) : <span style={s.muted}>not seen</span>}</td>
                                                                    <td style={s.tdNum}>{r.opens}</td>
                                                                    <td style={s.tdNum}>{r.clicks}</td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </React.Fragment>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
