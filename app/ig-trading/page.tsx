"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import { createChart, AreaSeries } from "lightweight-charts";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Account {
    equity:      number;
    available:   number;
    profit_loss: number;
    deposit:     number;
    mode:        string;
    snapshot_at: string;
}

interface Position {
    id:            number;
    epic:          string;
    symbol:        string;
    asset_type:    string;
    direction:     string;
    size:          number;
    entry_price:   number;
    stop_loss:     number | null;
    take_profit:   number | null;
    half_closed:   boolean;
    current_price: number | null;
    unrealized_pnl: number;
    margin_used:   number;
    opened_at:     string;
    mode:          string;
    deal_id:       string | null;
    strategy:      string | null;
}

interface ClosedTrade {
    id:              number;
    epic:            string;
    symbol:          string;
    asset_type:      string;
    direction:       string;
    size:            number;
    entry_price:     number;
    close_price:     number;
    realized_pnl:    number;
    close_reason:    string;
    opened_at:       string;
    closed_at:       string;
    duration_secs:   number | null;
    mode:            string;
    signal_strength: number | null;
    timeframe:       string | null;
    strategy:        string | null;
    partial?:        boolean;
}

interface BreakdownRow {
    label:    string;
    trades:   number;
    win_rate: number;
    pnl:      number;
}

interface Stats {
    summary: {
        n_trades:       number;
        win_rate:       number | null;
        profit_factor:  number | null;
        avg_r:          number | null;
        total_pnl:      number;
        equity_pnl:     number | null;
        sharpe:         number | null;
        sortino:        number | null;
    };
    breakdowns: {
        by_asset:        BreakdownRow[];
        by_instrument:   BreakdownRow[];
        by_direction:    BreakdownRow[];
        by_timeframe:    BreakdownRow[];
        by_strength:     BreakdownRow[];
        by_close_reason: BreakdownRow[];
    };
}

interface ServiceHealth {
    name:   string;
    state:  string;
    status: string;
}

// ─── Formatting helpers ────────────────────────────────────────────────────────

const fmtPnl = (v: number | null, decimals = 2): string => {
    if (v === null || isNaN(v)) return "—";
    const abs = Math.abs(v).toFixed(decimals);
    return v >= 0 ? `+£${Number(abs).toLocaleString("en-GB", { minimumFractionDigits: decimals })}` : `-£${Number(abs).toLocaleString("en-GB", { minimumFractionDigits: decimals })}`;
};
const fmtPct = (v: number | null): string => (v === null ? "—" : `${(v * 100).toFixed(1)}%`);
const fmtRatio = (v: number | null): string => (v === null ? "—" : v.toFixed(2));
const fmtR = (v: number | null): string => (v === null ? "—" : `${v >= 0 ? "+" : ""}${v.toFixed(2)}R`);
const fmtPrice = (v: number | null, dp = 4): string => (v === null ? "—" : v.toLocaleString("en-GB", { minimumFractionDigits: dp, maximumFractionDigits: dp }));

function fmtDuration(secs: number | null): string {
    if (secs === null) return "—";
    if (secs < 3600)  return `${Math.floor(secs / 60)}m`;
    if (secs < 86400) return `${Math.floor(secs / 3600)}h ${Math.floor((secs % 3600) / 60)}m`;
    return `${Math.floor(secs / 86400)}d ${Math.floor((secs % 86400) / 3600)}h`;
}

function closeReasonBadge(reason: string): React.CSSProperties {
    if (["TP_HIT", "TAKE_PROFIT"].includes(reason))          return { background: "#052e16", color: "#4ade80", border: "1px solid #166534" };
    if (reason === "PARTIAL_TP")                             return { background: "#1a2e1a", color: "#86efac", border: "1px solid #166534" };
    if (["SL_HIT", "STOPPED_OUT"].includes(reason))          return { background: "#450a0a", color: "#f87171", border: "1px solid #7f1d1d" };
    if (reason === "STOPPED_PROFIT_GUARD")                   return { background: "#0c2340", color: "#38bdf8", border: "1px solid #0369a1" };
    if (["TA_REVERSAL", "DRAWDOWN_STOP"].includes(reason))   return { background: "#431407", color: "#fb923c", border: "1px solid #7c2d12" };
    return { background: "#111827", color: "#9ca3af", border: "1px solid #374151" };
}

const pnlColour = (v: number) => (v >= 0 ? "#34d399" : "#f87171");

function strategyBadge(strategy: string | null): React.CSSProperties {
    if (strategy === "DI_CROSSOVER") return { background: "#1e1b4b", color: "#a5b4fc", border: "1px solid #4338ca" };
    if (strategy === "DI_SPREAD")    return { background: "#1e1b4b", color: "#a5b4fc", border: "1px solid #4338ca" };
    if (strategy === "ATR_TREND")    return { background: "#052e16", color: "#86efac", border: "1px solid #166534" };
    if (strategy === "EXHAUSTION")   return { background: "#431407", color: "#fb923c", border: "1px solid #7c2d12" };
    return { background: "#111827", color: "#9ca3af", border: "1px solid #374151" };
}

function ageString(opened_at: string): string {
    const ms = Date.now() - new Date(opened_at).getTime();
    const h = Math.floor(ms / 3_600_000);
    const m = Math.floor((ms % 3_600_000) / 60_000);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatCard({ label, value, colour }: { label: string; value: string; colour?: string }) {
    return (
        <div style={{ background: "#1f2937", border: "1px solid #374151", borderRadius: 8, padding: "20px 24px", minWidth: 0 }}>
            <div style={{ color: "#9ca3af", fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>{label}</div>
            <div style={{ fontSize: "1.6rem", fontWeight: 700, color: colour || "#f9fafb" }}>{value}</div>
        </div>
    );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
    return (
        <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>
            {children}
        </div>
    );
}

function BreakdownTable({ rows, title }: { rows: BreakdownRow[]; title: string }) {
    if (!rows || rows.length === 0) return null;
    return (
        <div>
            <SectionTitle>{title}</SectionTitle>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
                <thead>
                    <tr style={{ borderBottom: "1px solid #374151", color: "#6b7280" }}>
                        <th style={{ textAlign: "left",  padding: "6px 8px" }}>Label</th>
                        <th style={{ textAlign: "right", padding: "6px 8px" }}>Trades</th>
                        <th style={{ textAlign: "right", padding: "6px 8px" }}>Win%</th>
                        <th style={{ textAlign: "right", padding: "6px 8px" }}>P&L</th>
                    </tr>
                </thead>
                <tbody>
                    {rows.map(r => (
                        <tr key={r.label} style={{ borderBottom: "1px solid #1f2937" }}>
                            <td style={{ padding: "6px 8px", color: "#e5e7eb" }}>{r.label ?? "—"}</td>
                            <td style={{ padding: "6px 8px", textAlign: "right", color: "#d1d5db" }}>{r.trades}</td>
                            <td style={{ padding: "6px 8px", textAlign: "right", color: "#d1d5db" }}>{fmtPct(r.win_rate)}</td>
                            <td style={{ padding: "6px 8px", textAlign: "right", color: pnlColour(r.pnl), fontWeight: 500 }}>{fmtPnl(r.pnl)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

function HealthDot({ svc }: { svc: ServiceHealth }) {
    const colour =
        svc.state === "running"    ? "#34d399" :
        svc.state === "restarting" ? "#fbbf24" :
        svc.state === "exited"     ? "#f87171" :
        svc.state === "dead"       ? "#f87171" : "#6b7280";
    const glow = svc.state !== "unknown" && svc.state !== "missing"
        ? `0 0 5px ${colour}` : "none";
    const label = svc.name.replace("ig-", "");
    return (
        <div title={`${svc.name}: ${svc.status}`}
             style={{ display: "flex", alignItems: "center", gap: 5, cursor: "default" }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%",
                           background: colour, display: "inline-block",
                           boxShadow: glow }} />
            <span style={{ fontSize: "0.72rem", color: "#9ca3af" }}>{label}</span>
        </div>
    );
}

// ─── Main page ────────────────────────────────────────────────────────────────

const WINDOWS = [
    { label: "7d",  value: 7   },
    { label: "30d", value: 30  },
    { label: "90d", value: 90  },
    { label: "1yr", value: 365 },
    { label: "All", value: 0   },
];

const REFRESH_SECS     = 30;
const CLOSED_PAGE_SIZE = 50;

export default function IgTradingDashboard() {
    const [account,   setAccount]   = useState<Account | null>(null);
    const [positions, setPositions] = useState<Position[]>([]);
    const [totalUpnl,      setTotalUpnl]      = useState<number>(0);
    const [totalMargin,    setTotalMargin]    = useState<number>(0);
    const [todayClosedPnl, setTodayClosedPnl] = useState<number>(0);
    const [stats,     setStats]     = useState<Stats | null>(null);
    const [window_,   setWindow_]   = useState<number>(30);
    const [countdown, setCountdown] = useState<number>(REFRESH_SECS);
    const [loadingLive,   setLoadingLive]   = useState(true);
    const [loadingStats,  setLoadingStats]  = useState(true);
    const [loadingClosed, setLoadingClosed] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [closedTrades,   setClosedTrades]   = useState<ClosedTrade[]>([]);
    const [closedTotal,    setClosedTotal]    = useState(0);
    const [closedOffset,   setClosedOffset]   = useState(0);
    const [closedDays,     setClosedDays]     = useState(0);
    const [closedStrategy, setClosedStrategy] = useState("");
    const [closedSummary,  setClosedSummary]  = useState<{ total_pnl: number; winners: number; losers: number } | null>(null);
    const [health,        setHealth]        = useState<ServiceHealth[]>([]);
    const [tooltip, setTooltip] = useState<{ x: number; y: number; lines: [string, string][] } | null>(null);
    const [chartPeriod,   setChartPeriod]   = useState<"intraday"|"month"|"all">("intraday");
    const [chartPoints,   setChartPoints]   = useState<{time:string,value:number}[]>([]);

    const fetchLive = useCallback(async () => {
        try {
            const [accRes, posRes] = await Promise.all([
                fetch("/api/ig-trading/account?mode=LIVE"),
                fetch("/api/ig-trading/positions"),
            ]);
            if (!accRes.ok || !posRes.ok) throw new Error("API error");
            const [accData, posData] = await Promise.all([accRes.json(), posRes.json()]);
            setAccount(accData.account);
            setPositions(posData.positions || []);
            setTotalUpnl(posData.total_unrealized_pnl || 0);
            setTotalMargin(posData.total_margin_used   || 0);
            setTodayClosedPnl(posData.today_closed_pnl ?? 0);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoadingLive(false);
        }
    }, []);

    const fetchClosed = useCallback(async (offset: number, days: number, strategy: string) => {
        setLoadingClosed(true);
        try {
            const stratParam = strategy ? `&strategy=${encodeURIComponent(strategy)}` : "";
            const res = await fetch(`/api/ig-trading/closed-trades?limit=${CLOSED_PAGE_SIZE}&offset=${offset}&days=${days}${stratParam}`);
            if (!res.ok) throw new Error("Closed trades API error");
            const data = await res.json();
            setClosedTrades(data.trades || []);
            setClosedTotal(data.total || 0);
            setClosedSummary(data.summary ?? null);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoadingClosed(false);
        }
    }, []);

    const fetchChart = useCallback(async (period: string) => {
        try {
            const res = await fetch(`/api/ig-trading/equity-chart?period=${period}&mode=LIVE`);
            if (!res.ok) return;
            const data = await res.json();
            setChartPoints(data.points || []);
        } catch {}
    }, []);

    const fetchStats = useCallback(async (win: number) => {
        setLoadingStats(true);
        try {
            const res = await fetch(`/api/ig-trading/stats?window=${win}`);
            if (!res.ok) throw new Error("Stats API error");
            setStats(await res.json());
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoadingStats(false);
        }
    }, []);

    const fetchHealth = useCallback(async () => {
        try {
            const res = await fetch("/api/ig-trading/health");
            if (!res.ok) return;
            const data = await res.json();
            setHealth(data.services || []);
        } catch {}
    }, []);

    // Initial load
    useEffect(() => { fetchLive(); fetchStats(window_); fetchClosed(0, 0, ""); fetchHealth(); fetchChart("intraday"); }, []);

    // Re-fetch closed trades when offset or day-filter changes
    useEffect(() => { fetchClosed(closedOffset, closedDays, closedStrategy); }, [closedOffset, closedDays, closedStrategy, fetchClosed]);

    // Re-fetch chart when period changes
    useEffect(() => { fetchChart(chartPeriod); }, [chartPeriod, fetchChart]);

    // Equity chart
    const chartContainerRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        if (!chartContainerRef.current) return;
        const el = chartContainerRef.current;
        const chart = createChart(el, {
            layout: { background: { color: "#111827" }, textColor: "#6b7280" },
            grid:   { vertLines: { color: "#1f2937" }, horzLines: { color: "#1f2937" } },
            width:  el.clientWidth,
            height: 220,
            timeScale: { timeVisible: true, borderColor: "#374151" },
            rightPriceScale: { borderColor: "#374151" },
        });
        const series = chart.addSeries(AreaSeries, {
            lineColor:    "#34d399",
            topColor:     "rgba(52,211,153,0.25)",
            bottomColor:  "rgba(52,211,153,0.0)",
            lineWidth:    2,
        });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const data: any[] = chartPoints
            .map(p => ({ time: Math.floor(new Date(p.time).getTime() / 1000), value: p.value }))
            .sort((a, b) => a.time - b.time);
        if (data.length > 0) series.setData(data);
        chart.timeScale().fitContent();
        const ro = new ResizeObserver(entries => {
            if (entries[0]) chart.applyOptions({ width: entries[0].contentRect.width });
        });
        ro.observe(el);
        return () => { ro.disconnect(); chart.remove(); };
    }, [chartPoints]);

    // Auto-refresh live data every 30s with countdown
    const countdownRef = useRef(REFRESH_SECS);
    useEffect(() => {
        countdownRef.current = REFRESH_SECS;
        const tick = setInterval(() => {
            countdownRef.current -= 1;
            setCountdown(countdownRef.current);
            if (countdownRef.current <= 0) {
                countdownRef.current = REFRESH_SECS;
                setCountdown(REFRESH_SECS);
                fetchLive();
                fetchHealth();
            }
        }, 1000);
        return () => clearInterval(tick);
    }, [fetchLive]);

    // Fetch stats when window changes
    useEffect(() => { fetchStats(window_); }, [window_, fetchStats]);

    // ─── Render ──────────────────────────────────────────────────────────────

    const mode = account?.mode || "PAPER";
    const modeColour = mode === "LIVE" ? "#f87171" : "#60a5fa";

    return (
        <>
        <div style={{ minHeight: "100vh", background: "#111827", color: "#f9fafb", fontFamily: "system-ui, sans-serif" }}>
            <div style={{ maxWidth: 1200, margin: "0 auto", padding: "24px 20px" }}>

                {/* Header */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 32 }}>
                    <div>
                        <h1 style={{ fontSize: "1.75rem", fontWeight: 700, color: "#f9fafb", margin: 0 }}>
                            IG Trading Dashboard
                        </h1>
                        <div style={{ color: "#6b7280", fontSize: "0.85rem", marginTop: 4 }}>
                            {account ? `Last snapshot: ${new Date(account.snapshot_at).toLocaleTimeString("en-GB")}` : loadingLive ? "Loading…" : "No live data — streamer may be in paper mode"}
                        </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <a href="/ig-trading/investor-report" style={{ background: "#1f2937", border: "1px solid #374151", borderRadius: 6, padding: "4px 12px", fontSize: "0.8rem", fontWeight: 600, color: "#d1d5db", textDecoration: "none" }}>
                            Investor Report
                        </a>
                        {health.length > 0 && (
                            <div style={{ display: "flex", alignItems: "center", gap: 10, background: "#1f2937", border: "1px solid #374151", borderRadius: 6, padding: "4px 10px" }}>
                                {health.map(svc => <HealthDot key={svc.name} svc={svc} />)}
                            </div>
                        )}
                        <span style={{ background: modeColour + "20", color: modeColour, border: `1px solid ${modeColour}40`, borderRadius: 6, padding: "4px 10px", fontSize: "0.8rem", fontWeight: 600 }}>
                            {mode}
                        </span>
                        <span style={{ color: "#6b7280", fontSize: "0.8rem" }}>
                            ⟳ {countdown}s
                        </span>
                    </div>
                </div>

                {error && (
                    <div style={{ background: "#7f1d1d", border: "1px solid #ef4444", borderRadius: 8, padding: "12px 16px", marginBottom: 24, color: "#fca5a5" }}>
                        {error}
                    </div>
                )}

                {/* Top stat cards */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 32 }}>
                    <StatCard label="Account Equity"
                        value={account ? `£${account.equity.toLocaleString("en-GB", { minimumFractionDigits: 2 })}` : "—"} />
                    <StatCard label="Open P&L"
                        value={fmtPnl(totalUpnl)}
                        colour={pnlColour(totalUpnl)} />
                    <StatCard label="P&L Today"
                        value={fmtPnl(todayClosedPnl + totalUpnl)}
                        colour={pnlColour(todayClosedPnl + totalUpnl)} />
                    <StatCard label="Margin Used"
                        value={`£${totalMargin.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} />
                    <StatCard label="Win Rate"
                        value={stats ? fmtPct(stats.summary.win_rate) : "—"} />
                    <StatCard label="Profit Factor"
                        value={stats ? fmtRatio(stats.summary.profit_factor) : "—"} />
                </div>

                {/* Open Positions */}
                <div style={{ background: "#1f2937", border: "1px solid #374151", borderRadius: 8, padding: 24, marginBottom: 32 }}>
                    <SectionTitle>Open Positions ({positions.length})</SectionTitle>
                    {loadingLive ? (
                        <div style={{ color: "#6b7280", padding: "20px 0" }}>Loading…</div>
                    ) : positions.length === 0 ? (
                        <div style={{ color: "#6b7280", padding: "20px 0" }}>No open positions.</div>
                    ) : (
                        <div style={{ overflowX: "auto" }}>
                            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
                                <thead>
                                    <tr style={{ borderBottom: "1px solid #374151", color: "#6b7280" }}>
                                        {["Symbol", "Strategy", "Dir", "Size", "Entry", "Current", "Stop", "Target", "Margin", "Unrealized P&L", "Age"].map(h => (
                                            <th key={h} style={{ padding: "8px 10px", textAlign: h === "Symbol" || h === "Strategy" ? "left" : "right", fontWeight: 500 }}>{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {positions.map(p => {
                                        const dp = ["forex"].includes(p.asset_type) ? 4 : 1;
                                        return (
                                            <tr key={p.id} style={{ borderBottom: "1px solid #1a2332", cursor: "default" }}
                                                onMouseEnter={e => setTooltip({ x: e.clientX, y: e.clientY, lines: [
                                                    ["Opened",  new Date(p.opened_at).toLocaleString("en-GB")],
                                                    ["Deal ID", p.deal_id ?? "—"],
                                                    ["Epic",    p.epic],
                                                    ["Mode",    p.mode],
                                                    ["ID",      `#${p.id}`],
                                                ]})}
                                                onMouseMove={e => setTooltip(t => t ? { ...t, x: e.clientX, y: e.clientY } : t)}
                                                onMouseLeave={() => setTooltip(null)}
                                            >
                                                <td style={{ padding: "10px 10px", fontWeight: 600 }}>
                                                    {p.symbol}
                                                    <span style={{ marginLeft: 6, fontSize: "0.7rem", color: "#6b7280" }}>{p.asset_type}</span>
                                                </td>
                                                <td style={{ padding: "10px 10px" }}>
                                                    {p.strategy && (
                                                        <span style={{ ...strategyBadge(p.strategy), borderRadius: 4, padding: "2px 6px", fontSize: "0.72rem", fontWeight: 600, whiteSpace: "nowrap" }}>
                                                            {p.strategy}
                                                        </span>
                                                    )}
                                                </td>
                                                <td style={{ padding: "10px 10px", textAlign: "right", color: p.direction === "BUY" ? "#34d399" : "#f87171", fontWeight: 600 }}>
                                                    {p.direction}
                                                </td>
                                                <td style={{ padding: "10px 10px", textAlign: "right" }}>{p.size}</td>
                                                <td style={{ padding: "10px 10px", textAlign: "right", fontFamily: "monospace" }}>{fmtPrice(p.entry_price, dp)}</td>
                                                <td style={{ padding: "10px 10px", textAlign: "right", fontFamily: "monospace" }}>{fmtPrice(p.current_price, dp)}</td>
                                                <td style={{ padding: "10px 10px", textAlign: "right", fontFamily: "monospace", color: "#9ca3af" }}>{fmtPrice(p.stop_loss, dp)}</td>
                                                <td style={{ padding: "10px 10px", textAlign: "right", fontFamily: "monospace", color: "#9ca3af" }}>
                                                    {fmtPrice(p.take_profit, dp)}
                                                    {p.half_closed && (
                                                        <span style={{ marginLeft: 6, fontSize: "0.65rem", background: "#1e3a5f", color: "#60a5fa", border: "1px solid #2563eb", borderRadius: 3, padding: "1px 4px", verticalAlign: "middle" }}>½</span>
                                                    )}
                                                </td>
                                                <td style={{ padding: "10px 10px", textAlign: "right", fontFamily: "monospace", color: "#9ca3af" }}>£{p.margin_used.toFixed(2)}</td>
                                                <td style={{ padding: "10px 10px", textAlign: "right", fontWeight: 600, color: pnlColour(p.unrealized_pnl) }}>
                                                    {fmtPnl(p.unrealized_pnl)}
                                                </td>
                                                <td style={{ padding: "10px 10px", textAlign: "right", color: "#9ca3af", fontSize: "0.8rem" }}>{ageString(p.opened_at)}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Closed Trades */}
                <div style={{ background: "#1f2937", border: "1px solid #374151", borderRadius: 8, padding: 24, marginBottom: 32 }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
                        <SectionTitle>Closed Trades ({closedTotal})</SectionTitle>
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                            {([{ label: "Today", days: 1 }, { label: "Week", days: 7 }, { label: "Month", days: 30 }, { label: "All", days: 0 }] as const).map(f => (
                                <button key={f.label}
                                    onClick={() => { setClosedDays(f.days); setClosedOffset(0); }}
                                    style={{
                                        padding: "4px 12px", borderRadius: 6, fontSize: "0.8rem", fontWeight: 500, cursor: "pointer",
                                        border:      closedDays === f.days ? "1px solid #3b82f6" : "1px solid #374151",
                                        background:  closedDays === f.days ? "#1d4ed8"           : "#111827",
                                        color:       closedDays === f.days ? "#fff"              : "#9ca3af",
                                    }}>
                                    {f.label}
                                </button>
                            ))}
                            <div style={{ width: 1, background: "#374151", margin: "0 2px" }} />
                            {([{ label: "All Strategies", value: "" }, { label: "DI_CROSSOVER", value: "DI_CROSSOVER" }, { label: "DI_SPREAD", value: "DI_SPREAD" }, { label: "ATR_TREND", value: "ATR_TREND" }, { label: "EXHAUSTION", value: "EXHAUSTION" }]).map(f => (
                                <button key={f.value}
                                    onClick={() => { setClosedStrategy(f.value); setClosedOffset(0); }}
                                    style={{
                                        padding: "4px 12px", borderRadius: 6, fontSize: "0.8rem", fontWeight: 500, cursor: "pointer",
                                        border:     closedStrategy === f.value ? "1px solid #6366f1" : "1px solid #374151",
                                        background: closedStrategy === f.value ? "#312e81"           : "#111827",
                                        color:      closedStrategy === f.value ? "#c7d2fe"           : "#9ca3af",
                                    }}>
                                    {f.label}
                                </button>
                            ))}
                        </div>
                    </div>
                    {/* Filter P&L summary */}
                    {closedSummary !== null && (
                        <div style={{
                            display: "flex", alignItems: "center", gap: 24,
                            background: "#111827", border: "1px solid #374151",
                            borderRadius: 6, padding: "10px 16px", marginBottom: 12,
                            fontSize: "0.85rem", flexWrap: "wrap",
                        }}>
                            <div>
                                <span style={{ color: "#6b7280", marginRight: 6 }}>P&L</span>
                                <span style={{ fontWeight: 700, color: pnlColour(closedSummary.total_pnl), fontFamily: "monospace" }}>
                                    {fmtPnl(closedSummary.total_pnl)}
                                </span>
                            </div>
                            <div>
                                <span style={{ color: "#6b7280", marginRight: 6 }}>Trades</span>
                                <span style={{ fontWeight: 600, color: "#f9fafb" }}>{closedSummary.winners + closedSummary.losers}</span>
                            </div>
                            <div>
                                <span style={{ color: "#34d399", marginRight: 4 }}>W</span>
                                <span style={{ fontWeight: 600, color: "#34d399" }}>{closedSummary.winners}</span>
                                <span style={{ color: "#6b7280", margin: "0 8px" }}>·</span>
                                <span style={{ color: "#f87171", marginRight: 4 }}>L</span>
                                <span style={{ fontWeight: 600, color: "#f87171" }}>{closedSummary.losers}</span>
                            </div>
                            {(closedSummary.winners + closedSummary.losers) > 0 && (
                                <div>
                                    <span style={{ color: "#6b7280", marginRight: 6 }}>Win rate</span>
                                    <span style={{ fontWeight: 600, color: "#d1d5db" }}>
                                        {Math.round(closedSummary.winners / (closedSummary.winners + closedSummary.losers) * 100)}%
                                    </span>
                                </div>
                            )}
                        </div>
                    )}
                    {loadingClosed ? (
                        <div style={{ color: "#6b7280", padding: "20px 0" }}>Loading…</div>
                    ) : closedTrades.length === 0 ? (
                        <div style={{ color: "#6b7280", padding: "20px 0" }}>No closed trades yet.</div>
                    ) : (
                        <>
                            <div style={{ overflowX: "auto" }}>
                                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
                                    <thead>
                                        <tr style={{ borderBottom: "1px solid #374151", color: "#6b7280" }}>
                                            {["Symbol", "Strategy", "Dir", "Size", "Entry", "Close", "P&L", "Reason", "Strength", "Duration", "Closed"].map(h => (
                                                <th key={h} style={{ padding: "8px 10px", textAlign: h === "Symbol" || h === "Strategy" || h === "Reason" ? "left" : "right", fontWeight: 500, whiteSpace: "nowrap" }}>{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {closedTrades.map(t => {
                                            const dp = t.asset_type === "forex" ? 4 : 1;
                                            const badgeStyle: React.CSSProperties = {
                                                ...closeReasonBadge(t.close_reason),
                                                borderRadius: 4, padding: "2px 6px", fontSize: "0.72rem", fontWeight: 600, whiteSpace: "nowrap",
                                            };
                                            return (
                                                <tr key={t.id} style={{ borderBottom: "1px solid #1a2332", cursor: "default" }}
                                                    onMouseEnter={e => setTooltip({ x: e.clientX, y: e.clientY, lines: [
                                                        ["Opened",    new Date(t.opened_at).toLocaleString("en-GB")],
                                                        ["Epic",      t.epic],
                                                        ["Timeframe", t.timeframe ?? "—"],
                                                        ["Mode",      t.mode],
                                                        ["ID",        `#${t.id}`],
                                                    ]})}
                                                    onMouseMove={e => setTooltip(tt => tt ? { ...tt, x: e.clientX, y: e.clientY } : tt)}
                                                    onMouseLeave={() => setTooltip(null)}
                                                >
                                                    <td style={{ padding: "8px 10px", fontWeight: 600, whiteSpace: "nowrap" }}>
                                                        {t.symbol}
                                                        {t.partial && (
                                                            <span style={{ marginLeft: 4, fontSize: "0.65rem", fontWeight: 700, color: "#fbbf24", background: "rgba(251,191,36,0.15)", borderRadius: 3, padding: "1px 4px" }}>½</span>
                                                        )}
                                                        <span style={{ marginLeft: 5, fontSize: "0.7rem", color: "#6b7280" }}>{t.asset_type}</span>
                                                    </td>
                                                    <td style={{ padding: "8px 10px" }}>
                                                        {t.strategy && (
                                                            <span style={{ ...strategyBadge(t.strategy), borderRadius: 4, padding: "2px 6px", fontSize: "0.72rem", fontWeight: 600, whiteSpace: "nowrap" }}>
                                                                {t.strategy}
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td style={{ padding: "8px 10px", textAlign: "right", color: t.direction === "BUY" ? "#34d399" : "#f87171", fontWeight: 600 }}>
                                                        {t.direction}
                                                    </td>
                                                    <td style={{ padding: "8px 10px", textAlign: "right" }}>{t.size}</td>
                                                    <td style={{ padding: "8px 10px", textAlign: "right", fontFamily: "monospace" }}>{fmtPrice(t.entry_price, dp)}</td>
                                                    <td style={{ padding: "8px 10px", textAlign: "right", fontFamily: "monospace" }}>{fmtPrice(t.close_price, dp)}</td>
                                                    <td style={{ padding: "8px 10px", textAlign: "right", fontWeight: 600, color: pnlColour(t.realized_pnl) }}>{fmtPnl(t.realized_pnl)}</td>
                                                    <td style={{ padding: "8px 10px" }}><span style={badgeStyle}>{t.close_reason}</span></td>
                                                    <td style={{ padding: "8px 10px", textAlign: "right", color: "#d1d5db" }}>{t.signal_strength !== null ? t.signal_strength.toFixed(0) : "—"}</td>
                                                    <td style={{ padding: "8px 10px", textAlign: "right", color: "#9ca3af", fontSize: "0.8rem" }}>{fmtDuration(t.duration_secs)}</td>
                                                    <td style={{ padding: "8px 10px", textAlign: "right", color: "#9ca3af", fontSize: "0.8rem", whiteSpace: "nowrap" }}>
                                                        {new Date(t.closed_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}{" "}
                                                        {new Date(t.closed_at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>

                            {/* Pagination */}
                            {closedTotal > CLOSED_PAGE_SIZE && (
                                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 16, marginTop: 16, fontSize: "0.85rem", color: "#9ca3af" }}>
                                    <button
                                        disabled={closedOffset === 0}
                                        onClick={() => setClosedOffset(Math.max(0, closedOffset - CLOSED_PAGE_SIZE))}
                                        style={{ padding: "5px 14px", borderRadius: 6, border: "1px solid #374151", background: closedOffset === 0 ? "#1a2332" : "#111827", color: closedOffset === 0 ? "#4b5563" : "#d1d5db", cursor: closedOffset === 0 ? "default" : "pointer" }}>
                                        ← Prev
                                    </button>
                                    <span>
                                        Showing {closedOffset + 1}–{Math.min(closedOffset + CLOSED_PAGE_SIZE, closedTotal)} of {closedTotal}
                                    </span>
                                    <button
                                        disabled={closedOffset + CLOSED_PAGE_SIZE >= closedTotal}
                                        onClick={() => setClosedOffset(closedOffset + CLOSED_PAGE_SIZE)}
                                        style={{ padding: "5px 14px", borderRadius: 6, border: "1px solid #374151", background: closedOffset + CLOSED_PAGE_SIZE >= closedTotal ? "#1a2332" : "#111827", color: closedOffset + CLOSED_PAGE_SIZE >= closedTotal ? "#4b5563" : "#d1d5db", cursor: closedOffset + CLOSED_PAGE_SIZE >= closedTotal ? "default" : "pointer" }}>
                                        Next →
                                    </button>
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* Performance */}
                <div style={{ background: "#1f2937", border: "1px solid #374151", borderRadius: 8, padding: 24 }}>
                    {/* Window tabs */}
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
                        <SectionTitle>Performance</SectionTitle>
                        <div style={{ display: "flex", gap: 6 }}>
                            {WINDOWS.map(w => (
                                <button key={w.value}
                                    onClick={() => setWindow_(w.value)}
                                    style={{
                                        padding: "5px 12px", borderRadius: 6, fontSize: "0.8rem", fontWeight: 500, cursor: "pointer",
                                        border: window_ === w.value ? "1px solid #3b82f6" : "1px solid #374151",
                                        background: window_ === w.value ? "#1d4ed8" : "#111827",
                                        color: window_ === w.value ? "#fff" : "#9ca3af",
                                    }}>
                                    {w.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {loadingStats ? (
                        <div style={{ color: "#6b7280" }}>Loading stats…</div>
                    ) : !stats || stats.summary.n_trades === 0 ? (
                        <div style={{ color: "#6b7280", padding: "20px 0" }}>
                            No closed trades in this period — paper run in progress.
                        </div>
                    ) : (
                        <>
                            {/* Summary metrics */}
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 16, marginBottom: 32 }}>
                                {[
                                    { label: "Closed Trades", value: String(stats.summary.n_trades) },
                                    { label: "Total P&L",     value: fmtPnl(stats.summary.equity_pnl ?? stats.summary.total_pnl), colour: pnlColour(stats.summary.equity_pnl ?? stats.summary.total_pnl) },
                                    { label: "Trade P&L",     value: fmtPnl(stats.summary.total_pnl), colour: pnlColour(stats.summary.total_pnl) },
                                    { label: "Avg R",         value: fmtR(stats.summary.avg_r) },
                                    { label: "Sharpe",        value: fmtRatio(stats.summary.sharpe) },
                                    { label: "Sortino",       value: fmtRatio(stats.summary.sortino) },
                                ].map(card => (
                                    <div key={card.label} style={{ background: "#111827", borderRadius: 8, padding: "14px 16px" }}>
                                        <div style={{ color: "#6b7280", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>{card.label}</div>
                                        <div style={{ fontSize: "1.25rem", fontWeight: 700, color: (card as any).colour || "#f9fafb" }}>{card.value}</div>
                                    </div>
                                ))}
                            </div>

                            {/* Breakdown tables */}
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 32 }}>
                                <BreakdownTable rows={stats.breakdowns.by_asset}        title="By Asset Class" />
                                <BreakdownTable rows={stats.breakdowns.by_instrument}   title="By Instrument" />
                                <BreakdownTable rows={stats.breakdowns.by_direction}    title="By Direction" />
                                <BreakdownTable rows={stats.breakdowns.by_timeframe}    title="By Signal Timeframe" />
                                <BreakdownTable rows={stats.breakdowns.by_strength}     title="By Signal Strength" />
                                <BreakdownTable rows={stats.breakdowns.by_close_reason} title="By Close Reason" />
                            </div>
                        </>
                    )}
                </div>

                {/* Equity Curve */}
                <div style={{ background: "#1f2937", border: "1px solid #374151", borderRadius: 8, padding: 24, marginTop: 32 }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                        <SectionTitle>Equity Curve</SectionTitle>
                        <div style={{ display: "flex", gap: 6 }}>
                            {([{ label: "Intraday", period: "intraday" }, { label: "Month", period: "month" }, { label: "All Time", period: "all" }] as const).map(p => (
                                <button key={p.period}
                                    onClick={() => setChartPeriod(p.period)}
                                    style={{
                                        padding: "4px 12px", borderRadius: 6, fontSize: "0.8rem", fontWeight: 500, cursor: "pointer",
                                        border:     chartPeriod === p.period ? "1px solid #3b82f6" : "1px solid #374151",
                                        background: chartPeriod === p.period ? "#1d4ed8"           : "#111827",
                                        color:      chartPeriod === p.period ? "#fff"              : "#9ca3af",
                                    }}>
                                    {p.label}
                                </button>
                            ))}
                        </div>
                    </div>
                    {chartPoints.length === 0 ? (
                        <div style={{ color: "#6b7280", padding: "20px 0", textAlign: "center" }}>No equity data for this period.</div>
                    ) : (
                        <div ref={chartContainerRef} style={{ height: 220, width: "100%" }} />
                    )}
                </div>

            </div>
        </div>

        {/* Row tooltip overlay */}
        {tooltip && (
            <div style={{
                position: "fixed",
                left: Math.min(tooltip.x + 14, (typeof window !== "undefined" ? window.innerWidth  : 1200) - 250),
                top:  Math.min(tooltip.y - 10, (typeof window !== "undefined" ? window.innerHeight : 800)  - 160),
                background: "#0f172a",
                border: "1px solid #374151",
                borderRadius: 6,
                padding: "8px 12px",
                zIndex: 9999,
                pointerEvents: "none",
                fontSize: "0.78rem",
                color: "#d1d5db",
                boxShadow: "0 4px 16px rgba(0,0,0,0.6)",
                minWidth: 230,
                lineHeight: "1.9",
            }}>
                {tooltip.lines.map(([label, value]) => (
                    <div key={label} style={{ display: "flex", gap: 10 }}>
                        <span style={{ color: "#6b7280", minWidth: 80, flexShrink: 0 }}>{label}</span>
                        <span style={{ color: "#f9fafb", fontFamily: "monospace", wordBreak: "break-all" }}>{value}</span>
                    </div>
                ))}
            </div>
        )}
        </>
    );
}
