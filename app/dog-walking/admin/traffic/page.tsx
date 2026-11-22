"use client";

import React, { useEffect, useState } from "react";
import NewsletterEngagement from "./NewsletterEngagement";

interface Day { day: string; views: number; visitors: number }
interface PageRow { path: string; views: number; visitors: number; clients: number }
interface Named { visitors: number }
interface Traffic {
    days: number;
    trackingSince: string | null;
    totals: { views: number; visitors: number; clients: number };
    daily: Day[];
    pages: PageRow[];
    sources: (Named & { source: string })[];
    countries: (Named & { country: string })[];
    devices: (Named & { device: string })[];
}

const RANGES = [7, 30, 90];
const BLUE = "#3b82f6";

// Friendly names for the pages Ernesto thinks of by name; anything else shows its path.
const PAGE_NAMES: Record<string, string> = {
    "/": "Home",
    "/services": "Services & prices",
    "/book-now": "Book now",
    "/reviews": "Reviews",
    "/newsletters": "Newsletters",
    "/register": "Register",
    "/my-account": "My account",
    "/dog-walking/dashboard": "Client dashboard",
    "/guides/festive-dog-friendly-london": "Festive guide",
};

const fmtDay = (iso: string, long = false) =>
    new Date(iso + "T12:00:00").toLocaleDateString("en-GB", long
        ? { weekday: "short", day: "numeric", month: "short" }
        : { day: "numeric", month: "short" });

const plural = (n: number, one: string) => `${n} ${one}${n === 1 ? "" : "s"}`;

export default function TrafficPage() {
    const [days, setDays] = useState(7);
    const [data, setData] = useState<Traffic | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [hover, setHover] = useState<number | null>(null);

    useEffect(() => {
        let cancelled = false;
        setError(null);
        fetch(`/api/dog-walking/admin/traffic?days=${days}`)
            .then(async (r) => {
                const j = await r.json();
                if (!r.ok) throw new Error(j.error || "Failed to load traffic");
                if (!cancelled) setData(j);
            })
            .catch((e) => !cancelled && setError(e.message));
        return () => { cancelled = true; };
    }, [days]);

    const s = {
        container: { maxWidth: "1200px", margin: "0 auto", padding: "24px" } as React.CSSProperties,
        title: { fontSize: "2rem", fontWeight: "bold", color: BLUE, marginBottom: "4px" } as React.CSSProperties,
        subtitle: { color: "#9ca3af", marginBottom: "20px", maxWidth: "70ch", lineHeight: 1.5 } as React.CSSProperties,
        card: { backgroundColor: "#1f2937", border: "1px solid #333", borderRadius: "8px", padding: "20px", marginBottom: "24px" } as React.CSSProperties,
        cardTitle: { fontSize: "1.1rem", fontWeight: "bold", color: "#d1d5db", marginBottom: "12px" } as React.CSSProperties,
        tiles: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px", marginBottom: "24px" } as React.CSSProperties,
        tile: { backgroundColor: "#1f2937", border: "1px solid #333", borderRadius: "8px", padding: "20px" } as React.CSSProperties,
        tileNumber: { fontSize: "2.2rem", fontWeight: "bold", color: "#f3f4f6", lineHeight: 1.1 } as React.CSSProperties,
        tileLabel: { color: "#9ca3af", fontSize: "0.9rem", marginTop: "4px" } as React.CSSProperties,
        rangeBtn: (active: boolean) => ({
            padding: "8px 16px", borderRadius: "6px", border: "1px solid #374151", cursor: "pointer",
            backgroundColor: active ? BLUE : "#1f2937", color: active ? "#fff" : "#d1d5db", fontWeight: 600,
        }) as React.CSSProperties,
        th: { textAlign: "left", color: "#9ca3af", fontWeight: 500, fontSize: "0.85rem", padding: "6px 8px", borderBottom: "1px solid #374151" } as React.CSSProperties,
        thNum: { textAlign: "right", color: "#9ca3af", fontWeight: 500, fontSize: "0.85rem", padding: "6px 8px", borderBottom: "1px solid #374151", whiteSpace: "nowrap" } as React.CSSProperties,
        td: { padding: "8px", borderBottom: "1px solid #283040", color: "#e5e7eb" } as React.CSSProperties,
        tdNum: { padding: "8px", borderBottom: "1px solid #283040", color: "#e5e7eb", textAlign: "right", fontVariantNumeric: "tabular-nums" } as React.CSSProperties,
        muted: { color: "#9ca3af", fontSize: "0.85rem" } as React.CSSProperties,
        twoCol: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "24px" } as React.CSSProperties,
    };

    if (error) return <div style={s.container}><div style={{ ...s.card, color: "#ef4444" }}>Error: {error}</div></div>;
    if (!data) return <div style={s.container}><div style={s.muted}>Loading traffic…</div></div>;

    const maxDay = Math.max(1, ...data.daily.map((d) => d.visitors));
    const maxPage = Math.max(1, ...data.pages.map((p) => p.visitors));
    const shown = hover !== null ? data.daily[hover] : null;
    const labelEvery = Math.ceil(data.daily.length / 8);
    const festive = data.pages.find((p) => p.path === "/guides/festive-dog-friendly-london");

    const simpleList = (title: string, rows: { name: string; visitors: number }[], empty: string) => (
        <div style={{ ...s.card, marginBottom: 0 }}>
            <div style={s.cardTitle}>{title}</div>
            {rows.length === 0 ? <div style={s.muted}>{empty}</div> : (
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <tbody>
                        {rows.map((r) => (
                            <tr key={r.name}>
                                <td style={s.td}>{r.name}</td>
                                <td style={s.tdNum}>{r.visitors}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
    );

    return (
        <div style={s.container}>
            <h1 style={s.title}>Traffic</h1>
            <p style={s.subtitle}>
                Real people only: a view is counted when a visitor&apos;s own browser reports it, which
                crawlers and scanners don&apos;t do. Your own browsing is left out.
                {data.trackingSince && <> Counting started {new Date(data.trackingSince).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}.</>}
            </p>

            <div style={{ display: "flex", gap: "8px", marginBottom: "20px", flexWrap: "wrap" }}>
                {RANGES.map((r) => (
                    <button key={r} style={s.rangeBtn(r === days)} onClick={() => { setHover(null); setDays(r); }}>
                        Last {r} days
                    </button>
                ))}
            </div>

            <div style={s.tiles}>
                <div style={s.tile}>
                    <div style={s.tileNumber}>{data.totals.visitors}</div>
                    <div style={s.tileLabel}>Visitors (each person counted once per day)</div>
                </div>
                <div style={s.tile}>
                    <div style={s.tileNumber}>{data.totals.views}</div>
                    <div style={s.tileLabel}>Pages viewed (a repeat of the same page that day counts once)</div>
                </div>
                <div style={s.tile}>
                    <div style={s.tileNumber}>{data.totals.clients}</div>
                    <div style={s.tileLabel}>Logged-in clients who visited</div>
                </div>
                <div style={s.tile}>
                    <div style={s.tileNumber}>{festive ? festive.visitors : 0}</div>
                    <div style={s.tileLabel}>Visitors to the festive guide</div>
                </div>
            </div>

            <div style={s.card}>
                <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "8px" }}>
                    <div style={s.cardTitle}>Visitors per day</div>
                    <div style={{ ...s.muted, minHeight: "1.3em" }}>
                        {shown
                            ? `${fmtDay(shown.day, true)}: ${plural(shown.visitors, "visitor")}, ${plural(shown.views, "page")} viewed`
                            : "Hover or tap a bar for the day's figures"}
                    </div>
                </div>
                <div style={{ display: "flex", alignItems: "flex-end", gap: "2px", height: "180px", borderBottom: "1px solid #4b5563" }}
                    onMouseLeave={() => setHover(null)}>
                    {data.daily.map((d, i) => (
                        <div key={d.day}
                            onMouseEnter={() => setHover(i)} onClick={() => setHover(i)}
                            title={`${fmtDay(d.day, true)}: ${plural(d.visitors, "visitor")}`}
                            style={{ flex: 1, height: "100%", display: "flex", alignItems: "flex-end", justifyContent: "center", cursor: "default" }}>
                            <div style={{
                                width: "100%", maxWidth: "36px",
                                height: d.visitors === 0 ? "0" : `${Math.max(2, (d.visitors / maxDay) * 100)}%`,
                                backgroundColor: BLUE, opacity: hover === null || hover === i ? 1 : 0.45,
                                borderRadius: "4px 4px 0 0",
                            }} />
                        </div>
                    ))}
                </div>
                <div style={{ display: "flex", gap: "2px", marginTop: "6px" }}>
                    {data.daily.map((d, i) => (
                        <div key={d.day} style={{ flex: 1, textAlign: "center", fontSize: "0.72rem", color: "#9ca3af", whiteSpace: "nowrap", overflow: "visible" }}>
                            {i % labelEvery === 0 ? fmtDay(d.day) : ""}
                        </div>
                    ))}
                </div>
                <div style={{ ...s.muted, marginTop: "8px" }}>Busiest day: {plural(maxDay === 1 && data.totals.visitors === 0 ? 0 : maxDay, "visitor")}</div>
            </div>

            <div style={s.card}>
                <div style={s.cardTitle}>What people look at</div>
                {data.pages.length === 0 ? (
                    <div style={s.muted}>Nothing recorded in this period yet.</div>
                ) : (
                    <div style={{ overflowX: "auto" }}>
                        <table style={{ width: "100%", borderCollapse: "collapse" }}>
                            <thead>
                                <tr>
                                    <th style={s.th}>Page</th>
                                    <th style={{ ...s.th, width: "30%" }}></th>
                                    <th style={s.thNum}>Visitors</th>
                                    <th style={s.thNum}>Views</th>
                                    <th style={s.thNum}>Logged-in clients</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.pages.map((p) => (
                                    <tr key={p.path}>
                                        <td style={s.td}>
                                            {PAGE_NAMES[p.path] ?? p.path}
                                            {PAGE_NAMES[p.path] && <div style={{ ...s.muted, fontSize: "0.75rem" }}>{p.path}</div>}
                                        </td>
                                        <td style={s.td}>
                                            <div style={{ height: "10px", width: `${Math.max(1, (p.visitors / maxPage) * 100)}%`, backgroundColor: BLUE, borderRadius: "0 4px 4px 0" }} />
                                        </td>
                                        <td style={s.tdNum}>{p.visitors}</td>
                                        <td style={s.tdNum}>{p.views}</td>
                                        <td style={s.tdNum}>{p.clients}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <div style={s.twoCol}>
                {simpleList("Where visitors came from", data.sources.map((x) => ({ name: x.source, visitors: x.visitors })),
                    "No outside links recorded yet. Typed addresses, bookmarks and most email apps send no source.")}
                {simpleList("Country", data.countries.map((x) => ({ name: x.country, visitors: x.visitors })), "Nothing yet.")}
                {simpleList("Device", data.devices.map((x) => ({ name: x.device === "mobile" ? "Phone or tablet" : x.device === "desktop" ? "Computer" : x.device, visitors: x.visitors })), "Nothing yet.")}
            </div>

            <NewsletterEngagement />
        </div>
    );
}
