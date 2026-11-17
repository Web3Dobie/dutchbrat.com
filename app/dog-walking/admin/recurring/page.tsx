"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";

/**
 * Admin recurring bookings.
 *
 * The client dashboard could always create a series but never change one, and
 * the admin could do neither — a series booked on the wrong weekday had to be
 * put right one booking at a time. This page creates a series for any client,
 * moves a whole series (weekday, time, length) in one go, and cancels one.
 *
 * Amending always previews first: it shows every walk's old and new slot, and
 * which ones clash with something else, before anything is written.
 */

const DAYS = [
    { value: 1, label: "Mon" },
    { value: 2, label: "Tue" },
    { value: 3, label: "Wed" },
    { value: 4, label: "Thu" },
    { value: 5, label: "Fri" },
];

const TIME_SLOTS: string[] = (() => {
    const out: string[] = [];
    for (let h = 8; h < 19; h++) {
        for (const m of [0, 15, 30, 45]) {
            out.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
        }
    }
    out.push("19:00");
    return out;
})();

const DURATIONS = [
    { value: 30, label: "30 min (quick walk)" },
    { value: 60, label: "1 hour" },
    { value: 120, label: "2 hours" },
];

// The client-facing form stops at 12 weeks. Admin is not bound by that: a
// standing roster is planned a half-year at a time.
const WEEKS_OPTIONS = [4, 6, 8, 12, 16, 20, 26, 34, 39, 52];

interface SeriesRow {
    id: number;
    owner_id: number;
    owner_name: string;
    dog_name_1: string;
    dog_name_2: string | null;
    service_type: string;
    duration_minutes: number | null;
    recurrence_pattern: string;
    days_of_week: number[] | null;
    preferred_time: string | null;
    status: string;
    upcoming: number;
    confirmed_total: number;
    next_walk: string | null;
    last_walk: string | null;
}

interface PlannedMove {
    booking_id: number;
    from: string;
    to: string;
    blocked: boolean;
    blocked_by: string | null;
    warnings: string[];
    new_price: number | null;
}

interface AmendPreview {
    total: number;
    movable: number;
    blocked: number;
    moves: PlannedMove[];
    owner_name?: string;
    dog_names?: string;
}

interface ClientDog {
    id: number;
    dog_name: string;
}

interface ClientRow {
    id: number;
    owner_name: string;
    dogs: ClientDog[];
}

const s = {
    page: { maxWidth: "1200px", margin: "0 auto", padding: "24px" } as React.CSSProperties,
    h1: { fontSize: "1.75rem", fontWeight: "bold", marginBottom: "8px" } as React.CSSProperties,
    sub: { color: "#9ca3af", marginBottom: "24px" } as React.CSSProperties,
    card: {
        backgroundColor: "#1f2937",
        border: "1px solid #374151",
        borderRadius: "12px",
        padding: "20px",
        marginBottom: "20px",
    } as React.CSSProperties,
    h2: { fontSize: "1.2rem", fontWeight: 600, marginBottom: "14px" } as React.CSSProperties,
    row: { display: "flex", gap: "12px", flexWrap: "wrap", alignItems: "flex-end" } as React.CSSProperties,
    field: { display: "flex", flexDirection: "column", gap: "4px" } as React.CSSProperties,
    label: { fontSize: "0.75rem", color: "#9ca3af", textTransform: "uppercase" } as React.CSSProperties,
    input: {
        backgroundColor: "#111827",
        color: "#fff",
        border: "1px solid #4b5563",
        borderRadius: "6px",
        padding: "8px 10px",
        fontSize: "0.9rem",
    } as React.CSSProperties,
    btn: {
        backgroundColor: "#3b82f6",
        color: "#fff",
        border: "none",
        borderRadius: "6px",
        padding: "9px 16px",
        fontSize: "0.9rem",
        fontWeight: 600,
        cursor: "pointer",
    } as React.CSSProperties,
    btnGhost: {
        backgroundColor: "transparent",
        color: "#9ca3af",
        border: "1px solid #4b5563",
        borderRadius: "6px",
        padding: "9px 16px",
        fontSize: "0.9rem",
        cursor: "pointer",
    } as React.CSSProperties,
    btnDanger: {
        backgroundColor: "#991b1b",
        color: "#fff",
        border: "none",
        borderRadius: "6px",
        padding: "9px 16px",
        fontSize: "0.9rem",
        fontWeight: 600,
        cursor: "pointer",
    } as React.CSSProperties,
    table: { width: "100%", borderCollapse: "collapse", fontSize: "0.9rem" } as React.CSSProperties,
    th: {
        textAlign: "left",
        padding: "8px",
        color: "#9ca3af",
        fontSize: "0.7rem",
        textTransform: "uppercase",
        borderBottom: "1px solid #374151",
    } as React.CSSProperties,
    td: { padding: "8px", borderBottom: "1px solid #374151" } as React.CSSProperties,
    pill: {
        display: "inline-block",
        padding: "2px 8px",
        borderRadius: "999px",
        fontSize: "0.72rem",
        fontWeight: 600,
    } as React.CSSProperties,
    err: {
        backgroundColor: "#7f1d1d",
        border: "1px solid #b91c1c",
        borderRadius: "8px",
        padding: "12px",
        marginBottom: "16px",
    } as React.CSSProperties,
    ok: {
        backgroundColor: "#065f46",
        border: "1px solid #059669",
        borderRadius: "8px",
        padding: "12px",
        marginBottom: "16px",
    } as React.CSSProperties,
    warn: {
        backgroundColor: "#78350f",
        border: "1px solid #b45309",
        borderRadius: "8px",
        padding: "12px",
        marginBottom: "16px",
    } as React.CSSProperties,
};

const dayLabel = (days: number[] | null, fallback?: string | null) => {
    if (days && days.length) {
        return days
            .slice()
            .sort((a, b) => a - b)
            .map((d) => DAYS.find((x) => x.value === d)?.label ?? d)
            .join(", ");
    }
    // Weekly series store {} and keep the weekday only in their bookings.
    if (fallback) {
        const d = new Date(fallback);
        if (!isNaN(d.getTime())) {
            return d.toLocaleDateString("en-GB", { weekday: "short", timeZone: "Europe/London" });
        }
    }
    return "—";
};

const fmtDateTime = (iso: string | null) =>
    iso
        ? new Date(iso).toLocaleString("en-GB", {
              weekday: "short",
              day: "numeric",
              month: "short",
              hour: "2-digit",
              minute: "2-digit",
              timeZone: "Europe/London",
          })
        : "—";

export default function AdminRecurringPage() {
    const [series, setSeries] = useState<SeriesRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [notice, setNotice] = useState<string | null>(null);

    // amend state
    const [amendId, setAmendId] = useState<number | null>(null);
    const [amendDays, setAmendDays] = useState<number[]>([]);
    const [amendTime, setAmendTime] = useState<string>("");
    const [amendDuration, setAmendDuration] = useState<string>("");
    const [notifyClient, setNotifyClient] = useState(true);
    const [preview, setPreview] = useState<AmendPreview | null>(null);
    const [busy, setBusy] = useState(false);

    // create state
    const [showCreate, setShowCreate] = useState(false);
    const [clients, setClients] = useState<ClientRow[]>([]);
    const [cOwner, setCOwner] = useState<number | 0>(0);
    const [cDog1, setCDog1] = useState<number | 0>(0);
    const [cDog2, setCDog2] = useState<number | 0>(0);
    const [cDuration, setCDuration] = useState(60);
    const [cDays, setCDays] = useState<number[]>([]);
    const [cTime, setCTime] = useState("09:00");
    const [cStart, setCStart] = useState("");
    const [cWeeks, setCWeeks] = useState(12);
    const [availability, setAvailability] = useState<{
        confirmed: { date: string; time: string }[];
        skipped: { date: string; reason?: string }[];
    } | null>(null);

    const loadSeries = useCallback(async () => {
        setLoading(true);
        try {
            const r = await fetch("/api/dog-walking/admin/recurring");
            if (!r.ok) throw new Error(`Could not load series (${r.status})`);
            const j = await r.json();
            setSeries(j.series ?? []);
            setError(null);
        } catch (e) {
            setError(e instanceof Error ? e.message : "Could not load series");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadSeries();
    }, [loadSeries]);

    const loadClients = useCallback(async () => {
        try {
            const r = await fetch("/api/dog-walking/admin/clients?limit=500&sort=name_asc");
            const j = await r.json();
            setClients(j.clients ?? []);
        } catch {
            setError("Could not load the client list");
        }
    }, []);

    const openCreate = () => {
        setShowCreate((v) => !v);
        if (clients.length === 0) loadClients();
    };

    const selectedClient = useMemo(
        () => clients.find((c) => c.id === cOwner) ?? null,
        [clients, cOwner]
    );

    const amendTarget = useMemo(
        () => series.find((x) => x.id === amendId) ?? null,
        [series, amendId]
    );

    const startAmend = (row: SeriesRow) => {
        setAmendId(row.id);
        setPreview(null);
        setNotice(null);
        setError(null);
        setAmendDays(row.days_of_week && row.days_of_week.length ? row.days_of_week : []);
        setAmendTime(row.preferred_time ? row.preferred_time.slice(0, 5) : "");
        setAmendDuration(row.duration_minutes ? String(row.duration_minutes) : "");
        setNotifyClient(true);
    };

    const runAmend = async (dryRun: boolean) => {
        if (amendId == null) return;
        setBusy(true);
        setError(null);
        setNotice(null);
        try {
            const r = await fetch(`/api/dog-walking/admin/recurring/${amendId}/amend`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    days_of_week: amendDays.length ? amendDays : null,
                    preferred_time: amendTime || null,
                    duration_minutes: amendDuration ? Number(amendDuration) : null,
                    dry_run: dryRun,
                    notify_client: notifyClient,
                }),
            });
            const j = await r.json();
            if (!r.ok) {
                setError(j.error ?? `Amend failed (${r.status})`);
                if (j.moves) setPreview({ total: j.moves.length, movable: 0, blocked: j.moves.length, moves: j.moves });
                return;
            }
            if (dryRun) {
                setPreview(j);
            } else {
                setNotice(
                    `Moved ${j.moved} booking(s).` +
                        (j.left_alone ? ` ${j.left_alone} left alone because of a clash.` : "") +
                        (j.client_emailed ? " Client emailed." : " Client not emailed.") +
                        (j.calendar_failures?.length
                            ? ` Calendar update failed for ${j.calendar_failures.length} — check the diary.`
                            : "")
                );
                setPreview(null);
                setAmendId(null);
                loadSeries();
            }
        } catch (e) {
            setError(e instanceof Error ? e.message : "Amend failed");
        } finally {
            setBusy(false);
        }
    };

    const cancelSeries = async (row: SeriesRow) => {
        const msg =
            `Cancel the whole series for ${row.owner_name} / ${row.dog_name_1}?\n\n` +
            `${row.upcoming} upcoming booking(s) will be cancelled and removed from the calendar. ` +
            `Past walks are not touched.`;
        if (!window.confirm(msg)) return;
        setBusy(true);
        setError(null);
        setNotice(null);
        try {
            const r = await fetch(`/api/dog-walking/recurring/${row.id}/cancel`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ reason: "Cancelled by admin" }),
            });
            const j = await r.json();
            if (!r.ok) {
                setError(j.error ?? `Cancel failed (${r.status})`);
                return;
            }
            setNotice(`Series #${row.id} cancelled.`);
            loadSeries();
        } catch (e) {
            setError(e instanceof Error ? e.message : "Cancel failed");
        } finally {
            setBusy(false);
        }
    };

    const checkCreate = async () => {
        setBusy(true);
        setError(null);
        setAvailability(null);
        try {
            const endDate = (() => {
                const d = new Date(`${cStart}T12:00:00Z`);
                d.setUTCDate(d.getUTCDate() + cWeeks * 7);
                return d.toISOString().slice(0, 10);
            })();

            const r = await fetch("/api/dog-walking/recurring/check-availability", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    owner_id: cOwner,
                    service_type: cDuration === 30 ? "Quick Walk (30 min)" : "Solo Walk",
                    duration_minutes: cDuration,
                    recurrence_pattern: cDays.length > 1 ? "custom" : "weekly",
                    days_of_week: cDays,
                    preferred_time: cTime,
                    start_date: cStart,
                    end_date: endDate,
                }),
            });
            const j = await r.json();
            if (!r.ok) {
                setError(j.error ?? `Availability check failed (${r.status})`);
                return;
            }
            setAvailability({
                confirmed: (j.available_dates ?? []).map(
                    (d: { date: string; time: string }) => ({ date: d.date, time: d.time })
                ),
                skipped: [...(j.conflicting_dates ?? []), ...(j.blocked_dates ?? [])],
            });
        } catch (e) {
            setError(e instanceof Error ? e.message : "Availability check failed");
        } finally {
            setBusy(false);
        }
    };

    const confirmCreate = async () => {
        if (!availability || availability.confirmed.length === 0) return;
        setBusy(true);
        setError(null);
        try {
            const r = await fetch("/api/dog-walking/recurring/book", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    owner_id: cOwner,
                    dog_id_1: cDog1,
                    dog_id_2: cDog2 || null,
                    service_type: cDuration === 30 ? "Quick Walk (30 min)" : "Solo Walk",
                    duration_minutes: cDuration,
                    recurrence_pattern: cDays.length > 1 ? "custom" : "weekly",
                    days_of_week: cDays,
                    preferred_time: cTime,
                    start_date: cStart,
                    confirmed_dates: availability.confirmed,
                    skipped_dates: availability.skipped,
                    notes: "Created by admin",
                }),
            });
            const j = await r.json();
            if (!r.ok) {
                setError(j.error ?? `Create failed (${r.status})`);
                return;
            }
            setNotice(`Series created: ${availability.confirmed.length} booking(s).`);
            setAvailability(null);
            setShowCreate(false);
            loadSeries();
        } catch (e) {
            setError(e instanceof Error ? e.message : "Create failed");
        } finally {
            setBusy(false);
        }
    };

    const toggle = (list: number[], v: number, set: (n: number[]) => void) =>
        set(list.includes(v) ? list.filter((x) => x !== v) : [...list, v].sort((a, b) => a - b));

    return (
        <div style={s.page}>
            <h1 style={s.h1}>Recurring Bookings</h1>
            <p style={s.sub}>
                Create a series for any client, move a whole series at once, or cancel one. Amending
                always shows you what will happen before it writes anything.
            </p>

            {error && <div style={s.err}>{error}</div>}
            {notice && <div style={s.ok}>{notice}</div>}

            {/* ---------- Create ---------- */}
            <div style={s.card}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <h2 style={{ ...s.h2, marginBottom: 0 }}>New series</h2>
                    <button style={s.btnGhost} onClick={openCreate}>
                        {showCreate ? "Close" : "Create a series"}
                    </button>
                </div>

                {showCreate && (
                    <div style={{ marginTop: "16px" }}>
                        <div style={s.row}>
                            <div style={s.field}>
                                <label style={s.label}>Client</label>
                                <select
                                    style={{ ...s.input, minWidth: "200px" }}
                                    value={cOwner}
                                    onChange={(e) => {
                                        setCOwner(Number(e.target.value));
                                        setCDog1(0);
                                        setCDog2(0);
                                        setAvailability(null);
                                    }}
                                >
                                    <option value={0}>Select…</option>
                                    {clients.map((c) => (
                                        <option key={c.id} value={c.id}>
                                            {c.owner_name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div style={s.field}>
                                <label style={s.label}>Dog</label>
                                <select
                                    style={s.input}
                                    value={cDog1}
                                    onChange={(e) => setCDog1(Number(e.target.value))}
                                    disabled={!selectedClient}
                                >
                                    <option value={0}>Select…</option>
                                    {selectedClient?.dogs?.map((d) => (
                                        <option key={d.id} value={d.id}>
                                            {d.dog_name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div style={s.field}>
                                <label style={s.label}>Second dog</label>
                                <select
                                    style={s.input}
                                    value={cDog2}
                                    onChange={(e) => setCDog2(Number(e.target.value))}
                                    disabled={!selectedClient}
                                >
                                    <option value={0}>None</option>
                                    {selectedClient?.dogs
                                        ?.filter((d) => d.id !== cDog1)
                                        .map((d) => (
                                            <option key={d.id} value={d.id}>
                                                {d.dog_name}
                                            </option>
                                        ))}
                                </select>
                            </div>

                            <div style={s.field}>
                                <label style={s.label}>Length</label>
                                <select
                                    style={s.input}
                                    value={cDuration}
                                    onChange={(e) => setCDuration(Number(e.target.value))}
                                >
                                    {DURATIONS.map((d) => (
                                        <option key={d.value} value={d.value}>
                                            {d.label}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div style={s.field}>
                                <label style={s.label}>Time</label>
                                <select style={s.input} value={cTime} onChange={(e) => setCTime(e.target.value)}>
                                    {TIME_SLOTS.map((t) => (
                                        <option key={t} value={t}>
                                            {t}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div style={s.field}>
                                <label style={s.label}>First walk</label>
                                <input
                                    type="date"
                                    style={s.input}
                                    value={cStart}
                                    onChange={(e) => setCStart(e.target.value)}
                                />
                            </div>

                            <div style={s.field}>
                                <label style={s.label}>Run for</label>
                                <select
                                    style={s.input}
                                    value={cWeeks}
                                    onChange={(e) => setCWeeks(Number(e.target.value))}
                                >
                                    {WEEKS_OPTIONS.map((w) => (
                                        <option key={w} value={w}>
                                            {w} weeks
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div style={{ ...s.row, marginTop: "12px" }}>
                            <div style={s.field}>
                                <label style={s.label}>Day(s) of the week</label>
                                <div style={{ display: "flex", gap: "6px" }}>
                                    {DAYS.map((d) => (
                                        <button
                                            key={d.value}
                                            onClick={() => toggle(cDays, d.value, setCDays)}
                                            style={{
                                                ...s.btnGhost,
                                                padding: "7px 12px",
                                                backgroundColor: cDays.includes(d.value) ? "#3b82f6" : "transparent",
                                                color: cDays.includes(d.value) ? "#fff" : "#9ca3af",
                                            }}
                                        >
                                            {d.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <button
                                style={{ ...s.btn, opacity: busy || !cOwner || !cDog1 || !cStart || !cDays.length ? 0.5 : 1 }}
                                disabled={busy || !cOwner || !cDog1 || !cStart || !cDays.length}
                                onClick={checkCreate}
                            >
                                {busy ? "Checking…" : "Check availability"}
                            </button>
                        </div>

                        {availability && (
                            <div style={{ marginTop: "16px" }}>
                                <p style={{ marginBottom: "8px" }}>
                                    <strong>{availability.confirmed.length}</strong> slot(s) free
                                    {availability.skipped.length > 0 && (
                                        <>
                                            {" · "}
                                            <span style={{ color: "#fbbf24" }}>
                                                {availability.skipped.length} unavailable and will be skipped
                                            </span>
                                        </>
                                    )}
                                </p>
                                <button
                                    style={{ ...s.btn, opacity: busy || !availability.confirmed.length ? 0.5 : 1 }}
                                    disabled={busy || !availability.confirmed.length}
                                    onClick={confirmCreate}
                                >
                                    {busy ? "Creating…" : `Create ${availability.confirmed.length} booking(s)`}
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* ---------- Amend ---------- */}
            {amendTarget && (
                <div style={{ ...s.card, borderColor: "#3b82f6" }}>
                    <h2 style={s.h2}>
                        Amend series #{amendTarget.id} — {amendTarget.owner_name} /{" "}
                        {amendTarget.dog_name_2
                            ? `${amendTarget.dog_name_1} & ${amendTarget.dog_name_2}`
                            : amendTarget.dog_name_1}
                    </h2>
                    <p style={{ color: "#9ca3af", marginBottom: "14px", fontSize: "0.85rem" }}>
                        Currently {dayLabel(amendTarget.days_of_week, amendTarget.next_walk)} at{" "}
                        {amendTarget.preferred_time?.slice(0, 5) ?? "—"} · {amendTarget.upcoming} upcoming.
                        Only future bookings move; past walks are left alone.
                    </p>

                    <div style={s.row}>
                        <div style={s.field}>
                            <label style={s.label}>Move to day(s)</label>
                            <div style={{ display: "flex", gap: "6px" }}>
                                {DAYS.map((d) => (
                                    <button
                                        key={d.value}
                                        onClick={() => {
                                            toggle(amendDays, d.value, setAmendDays);
                                            setPreview(null);
                                        }}
                                        style={{
                                            ...s.btnGhost,
                                            padding: "7px 12px",
                                            backgroundColor: amendDays.includes(d.value) ? "#3b82f6" : "transparent",
                                            color: amendDays.includes(d.value) ? "#fff" : "#9ca3af",
                                        }}
                                    >
                                        {d.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div style={s.field}>
                            <label style={s.label}>New time</label>
                            <select
                                style={s.input}
                                value={amendTime}
                                onChange={(e) => {
                                    setAmendTime(e.target.value);
                                    setPreview(null);
                                }}
                            >
                                <option value="">(unchanged)</option>
                                {TIME_SLOTS.map((t) => (
                                    <option key={t} value={t}>
                                        {t}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div style={s.field}>
                            <label style={s.label}>New length</label>
                            <select
                                style={s.input}
                                value={amendDuration}
                                onChange={(e) => {
                                    setAmendDuration(e.target.value);
                                    setPreview(null);
                                }}
                            >
                                <option value="">(unchanged)</option>
                                {DURATIONS.map((d) => (
                                    <option key={d.value} value={d.value}>
                                        {d.label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div style={s.field}>
                            <label style={s.label}>Tell the client</label>
                            <label style={{ display: "flex", alignItems: "center", gap: "8px", padding: "8px 0" }}>
                                <input
                                    type="checkbox"
                                    checked={notifyClient}
                                    onChange={(e) => setNotifyClient(e.target.checked)}
                                />
                                <span style={{ fontSize: "0.85rem" }}>Email a summary</span>
                            </label>
                        </div>

                        <button style={{ ...s.btn, opacity: busy ? 0.5 : 1 }} disabled={busy} onClick={() => runAmend(true)}>
                            {busy ? "Working…" : "Preview"}
                        </button>
                        <button
                            style={s.btnGhost}
                            onClick={() => {
                                setAmendId(null);
                                setPreview(null);
                            }}
                        >
                            Close
                        </button>
                    </div>

                    {preview && (
                        <div style={{ marginTop: "18px" }}>
                            {preview.blocked > 0 && (
                                <div style={s.warn}>
                                    {preview.movable} of {preview.total} can move. {preview.blocked} clash with
                                    something else and will be left exactly as they are for you to sort out
                                    individually.
                                </div>
                            )}
                            <table style={s.table}>
                                <thead>
                                    <tr>
                                        <th style={s.th}>From</th>
                                        <th style={s.th}>To</th>
                                        <th style={s.th}>Price</th>
                                        <th style={s.th}>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {preview.moves.map((m) => (
                                        <tr key={m.booking_id}>
                                            <td style={{ ...s.td, color: "#9ca3af" }}>{m.from}</td>
                                            <td style={s.td}>{m.blocked ? "—" : m.to}</td>
                                            <td style={s.td}>
                                                {m.new_price != null ? `£${Number(m.new_price).toFixed(2)}` : "—"}
                                            </td>
                                            <td style={s.td}>
                                                {m.blocked ? (
                                                    <span style={{ ...s.pill, backgroundColor: "#7f1d1d", color: "#fecaca" }}>
                                                        clash: {m.blocked_by}
                                                    </span>
                                                ) : m.warnings.length ? (
                                                    <span style={{ ...s.pill, backgroundColor: "#78350f", color: "#fde68a" }}>
                                                        tight: {m.warnings.join("; ")}
                                                    </span>
                                                ) : (
                                                    <span style={{ ...s.pill, backgroundColor: "#064e3b", color: "#a7f3d0" }}>
                                                        ok
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>

                            {preview.movable > 0 && (
                                <button
                                    style={{ ...s.btn, marginTop: "14px", opacity: busy ? 0.5 : 1 }}
                                    disabled={busy}
                                    onClick={() => runAmend(false)}
                                >
                                    {busy ? "Moving…" : `Move ${preview.movable} booking(s)`}
                                </button>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* ---------- List ---------- */}
            <div style={s.card}>
                <h2 style={s.h2}>All series</h2>
                {loading ? (
                    <p style={{ color: "#9ca3af" }}>Loading…</p>
                ) : series.length === 0 ? (
                    <p style={{ color: "#9ca3af" }}>No recurring series yet.</p>
                ) : (
                    <div style={{ overflowX: "auto" }}>
                        <table style={s.table}>
                            <thead>
                                <tr>
                                    <th style={s.th}>#</th>
                                    <th style={s.th}>Client</th>
                                    <th style={s.th}>Dog(s)</th>
                                    <th style={s.th}>Day</th>
                                    <th style={s.th}>Time</th>
                                    <th style={s.th}>Length</th>
                                    <th style={s.th}>Upcoming</th>
                                    <th style={s.th}>Next</th>
                                    <th style={s.th}></th>
                                </tr>
                            </thead>
                            <tbody>
                                {series.map((row) => (
                                    <tr key={row.id}>
                                        <td style={{ ...s.td, color: "#9ca3af" }}>{row.id}</td>
                                        <td style={s.td}>{row.owner_name}</td>
                                        <td style={s.td}>
                                            {row.dog_name_2 ? `${row.dog_name_1} & ${row.dog_name_2}` : row.dog_name_1}
                                        </td>
                                        <td style={s.td}>{dayLabel(row.days_of_week, row.next_walk)}</td>
                                        <td style={s.td}>{row.preferred_time?.slice(0, 5) ?? "—"}</td>
                                        <td style={s.td}>{row.duration_minutes ? `${row.duration_minutes} min` : "—"}</td>
                                        <td style={s.td}>{row.upcoming}</td>
                                        <td style={{ ...s.td, color: "#9ca3af" }}>{fmtDateTime(row.next_walk)}</td>
                                        <td style={{ ...s.td, whiteSpace: "nowrap" }}>
                                            <button
                                                style={{ ...s.btnGhost, padding: "6px 12px", marginRight: "8px" }}
                                                onClick={() => startAmend(row)}
                                                disabled={row.upcoming === 0}
                                            >
                                                Amend
                                            </button>
                                            <button
                                                style={{ ...s.btnDanger, padding: "6px 12px" }}
                                                onClick={() => cancelSeries(row)}
                                                disabled={busy || row.upcoming === 0}
                                            >
                                                Cancel series
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
