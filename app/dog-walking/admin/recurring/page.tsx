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
    // Shared walks: the other household's dog, and how many upcoming walks are not shared yet
    shared_with?: string | null;
    upcoming_unshared?: number;
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

interface AvailAlternative {
    time: string;
    displayTime: string;
}

interface AvailDate {
    date: string;
    displayDate: string;
    time?: string;
    status: string;
    reason?: string;
    alternatives?: AvailAlternative[];
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
        available: AvailDate[];
        conflicts: AvailDate[];
        blocked: AvailDate[];
        endDate: string;
    } | null>(null);
    // "Make shared" panel: turn a series' upcoming walks into shared walks
    const [shareId, setShareId] = useState<number | null>(null);
    const [shareOwner, setShareOwner] = useState<number>(0);
    const [shareDog, setShareDog] = useState<number>(0);
    const [sharePriceFirst, setSharePriceFirst] = useState("");
    const [sharePriceSecond, setSharePriceSecond] = useState("");
    const [shareEmail, setShareEmail] = useState(false);
    // The second dog's walk can be a different length (0 = same as the series).
    const [shareMinutes, setShareMinutes] = useState<number>(0);
    const [shareAlign, setShareAlign] = useState<"start" | "end">("start");
    const [sharePreview, setSharePreview] = useState<any>(null);

    // date -> alternative time the admin picked for a clashing date
    const [rescued, setRescued] = useState<Record<string, string>>({});

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
        // The clients endpoint refuses limit > 100, and refuses it with a 400
        // rather than an exception — so this has to check r.ok, or a failed
        // fetch silently becomes an empty dropdown with no error shown.
        const PER_PAGE = 100;

        const fetchPage = async (page: number) => {
            const r = await fetch(
                `/api/dog-walking/admin/clients?limit=${PER_PAGE}&page=${page}&sort=name_asc`
            );
            const j = await r.json().catch(() => ({}));
            if (!r.ok) {
                throw new Error(j?.error ?? `Could not load clients (${r.status})`);
            }
            return j as { clients?: ClientRow[]; pagination?: { totalPages?: number } };
        };

        try {
            const first = await fetchPage(1);
            const all: ClientRow[] = [...(first.clients ?? [])];

            // Page through the rest, so this does not quietly truncate once
            // there are more than a hundred clients.
            const totalPages = first.pagination?.totalPages ?? 1;
            for (let page = 2; page <= totalPages; page++) {
                const next = await fetchPage(page);
                all.push(...(next.clients ?? []));
            }

            setClients(all);
            if (all.length === 0) {
                setError("The client list came back empty.");
            }
        } catch (e) {
            setClients([]);
            setError(e instanceof Error ? e.message : "Could not load the client list");
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

    const shareTarget = useMemo(
        () => series.find((x) => x.id === shareId) ?? null,
        [series, shareId]
    );
    const sharePartner = useMemo(
        () => clients.find((c) => c.id === shareOwner) ?? null,
        [clients, shareOwner]
    );

    const startShare = (row: SeriesRow) => {
        setShareId(row.id);
        setShareOwner(0);
        setShareDog(0);
        setSharePriceFirst("");
        setSharePriceSecond("");
        setShareEmail(false);
        setShareMinutes(0);
        setShareAlign("start");
        setSharePreview(null);
        setAmendId(null);
        setNotice(null);
        setError(null);
        if (clients.length === 0) loadClients();
    };

    // dryRun = true shows exactly what would happen; false does it.
    const runShare = async (dryRun: boolean) => {
        if (!shareId || !shareOwner || !shareDog) {
            setError("Choose the second client and their dog.");
            return;
        }
        const price = (v: string) => (v.trim() === "" ? null : Number(v));
        const p1 = price(sharePriceFirst);
        const p2 = price(sharePriceSecond);
        if ((p1 !== null && !(p1 >= 0)) || (p2 !== null && !(p2 >= 0))) {
            setError("Prices must be numbers, or left blank to use the rate card.");
            return;
        }
        setBusy(true);
        setError(null);
        setNotice(null);
        try {
            const r = await fetch("/api/dog-walking/admin/shared-walk/series", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    series_id: shareId,
                    partner: { owner_id: shareOwner, dog_id: shareDog },
                    price_first: p1,
                    price_second: p2,
                    ...(shareMinutes ? { partner_duration_minutes: shareMinutes, align: shareAlign } : {}),
                    send_email: shareEmail,
                    dry_run: dryRun,
                }),
            });
            const j = await r.json().catch(() => ({}));
            if (!r.ok) {
                setSharePreview(null);
                setError(j.error ?? `Could not share the series (${r.status})`);
                return;
            }
            if (dryRun) {
                setSharePreview(j);
                return;
            }
            const warn = (j.warnings ?? []).length ? ` Notes: ${j.warnings.join(" ")}` : "";
            setNotice(
                `Series #${shareId} is now shared: ${j.walks.length} walks for ${j.first.dog_name} and ${j.partner.dog_name}.` +
                    (j.partner_series_id ? ` ${j.partner.owner_name}'s walks are series #${j.partner_series_id}.` : "") +
                    warn
            );
            setShareId(null);
            setSharePreview(null);
            loadSeries();
        } catch (e) {
            setError(e instanceof Error ? e.message : "Could not share the series");
        } finally {
            setBusy(false);
        }
    };

    const startAmend = (row: SeriesRow) => {
        setShareId(null);
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
                // cancel_type is required by the endpoint; without it every
                // cancel from this page was refused.
                body: JSON.stringify({ cancel_type: "series", reason: "Cancelled by admin" }),
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
        setRescued({});
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
            setRescued({});
            setAvailability({
                available: j.available_dates ?? [],
                conflicts: j.conflicting_dates ?? [],
                blocked: j.blocked_dates ?? [],
                // booking_series.end_date is NOT NULL, so this has to be carried
                // through to the create call, not just used for the check.
                endDate,
            });
        } catch (e) {
            setError(e instanceof Error ? e.message : "Availability check failed");
        } finally {
            setBusy(false);
        }
    };

    /** Dates that will actually be booked: the free ones, plus any clashing
     *  date the admin has rescued onto an alternative time. */
    const datesToBook = useMemo(() => {
        if (!availability) return [];
        const fromFree = availability.available.map((d) => ({
            date: d.date,
            time: d.time ?? cTime,
        }));
        const fromRescued = Object.entries(rescued)
            .filter(([, time]) => !!time)
            .map(([date, time]) => ({ date, time }));
        return [...fromFree, ...fromRescued].sort((a, b) =>
            a.date === b.date ? a.time.localeCompare(b.time) : a.date.localeCompare(b.date)
        );
    }, [availability, rescued, cTime]);

    const stillSkipped = useMemo(() => {
        if (!availability) return [];
        return [...availability.conflicts, ...availability.blocked].filter(
            (d) => !rescued[d.date]
        );
    }, [availability, rescued]);

    const confirmCreate = async () => {
        if (!availability || datesToBook.length === 0) return;
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
                    // NOT NULL on booking_series — omitting it failed the whole
                    // create with a constraint violation.
                    end_date: availability.endDate,
                    confirmed_dates: datesToBook,
                    skipped_dates: stillSkipped.map((d) => ({
                        date: d.date,
                        displayDate: d.displayDate,
                        reason: d.reason ?? "Unavailable",
                    })),
                    notes: "Created by admin",
                }),
            });
            const j = await r.json();
            if (!r.ok) {
                setError(j.error ?? `Create failed (${r.status})`);
                return;
            }
            setNotice(
                `Series created: ${datesToBook.length} booking(s).` +
                    (stillSkipped.length ? ` ${stillSkipped.length} date(s) skipped.` : "")
            );
            setAvailability(null);
            setRescued({});
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
                                <p style={{ marginBottom: "10px" }}>
                                    <strong>{datesToBook.length}</strong> slot(s) will be booked
                                    {stillSkipped.length > 0 && (
                                        <>
                                            {" · "}
                                            <span style={{ color: "#fbbf24" }}>
                                                {stillSkipped.length} still unavailable
                                            </span>
                                        </>
                                    )}
                                </p>

                                {/* The availability check already works out which other
                                    times are free on a clashing date. Showing them here
                                    means a single awkward week can be slotted in at a
                                    different time instead of being silently dropped. */}
                                {(availability.conflicts.length > 0 ||
                                    availability.blocked.length > 0) && (
                                    <div style={{ ...s.warn, marginBottom: "14px" }}>
                                        <p style={{ marginBottom: "10px", fontWeight: 600 }}>
                                            These dates are not free at {cTime}:
                                        </p>
                                        <table style={s.table}>
                                            <thead>
                                                <tr>
                                                    <th style={s.th}>Date</th>
                                                    <th style={s.th}>Why</th>
                                                    <th style={s.th}>Book it instead at</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {availability.conflicts.map((d) => (
                                                    <tr key={d.date}>
                                                        <td style={s.td}>{d.displayDate}</td>
                                                        <td style={{ ...s.td, color: "#fde68a" }}>
                                                            {d.reason ?? "Not available"}
                                                        </td>
                                                        <td style={s.td}>
                                                            {d.alternatives && d.alternatives.length > 0 ? (
                                                                <select
                                                                    style={s.input}
                                                                    value={rescued[d.date] ?? ""}
                                                                    onChange={(e) =>
                                                                        setRescued((prev) => ({
                                                                            ...prev,
                                                                            [d.date]: e.target.value,
                                                                        }))
                                                                    }
                                                                >
                                                                    <option value="">Skip this one</option>
                                                                    {d.alternatives.slice(0, 12).map((a) => (
                                                                        <option key={a.time} value={a.time}>
                                                                            {a.displayTime}
                                                                        </option>
                                                                    ))}
                                                                </select>
                                                            ) : (
                                                                <span style={{ color: "#9ca3af" }}>
                                                                    nothing free that day
                                                                </span>
                                                            )}
                                                        </td>
                                                    </tr>
                                                ))}
                                                {availability.blocked.map((d) => (
                                                    <tr key={d.date}>
                                                        <td style={s.td}>{d.displayDate}</td>
                                                        <td style={{ ...s.td, color: "#fde68a" }}>
                                                            {d.reason ?? "Blocked"}
                                                        </td>
                                                        <td style={{ ...s.td, color: "#9ca3af" }}>
                                                            cannot be booked
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                        <p style={{ marginTop: "10px", fontSize: "0.82rem", color: "#fde68a" }}>
                                            Or change the time above and check again to move the whole series.
                                        </p>
                                    </div>
                                )}

                                <button
                                    style={{ ...s.btn, opacity: busy || !datesToBook.length ? 0.5 : 1 }}
                                    disabled={busy || !datesToBook.length}
                                    onClick={confirmCreate}
                                >
                                    {busy ? "Creating…" : `Create ${datesToBook.length} booking(s)`}
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

            {/* ---------- Make shared ---------- */}
            {shareTarget && (
                <div style={s.card}>
                    <h2 style={s.h2}>
                        Share series #{shareTarget.id}: {shareTarget.owner_name} with {shareTarget.dog_name_1}
                    </h2>
                    <p style={{ color: "#9ca3af", marginBottom: "14px", fontSize: "0.9rem" }}>
                        Every upcoming walk in this series that is not already shared ({shareTarget.upcoming_unshared ?? shareTarget.upcoming}) becomes a
                        shared walk. The second client gets a booking for each one. Past walks are not touched.
                    </p>
                    <div style={s.row}>
                        <div style={s.field}>
                            <span style={s.label}>Second client</span>
                            <select
                                style={s.input}
                                value={shareOwner}
                                onChange={(e) => {
                                    const id = Number(e.target.value);
                                    setShareOwner(id);
                                    const c = clients.find((x) => x.id === id);
                                    setShareDog(c?.dogs?.[0]?.id ?? 0);
                                    setSharePreview(null);
                                }}
                            >
                                <option value={0}>Select…</option>
                                {clients
                                    .filter((c) => c.id !== shareTarget.owner_id && (c.dogs?.length ?? 0) > 0)
                                    .map((c) => (
                                        <option key={c.id} value={c.id}>
                                            {c.owner_name}
                                        </option>
                                    ))}
                            </select>
                        </div>
                        <div style={s.field}>
                            <span style={s.label}>Their dog</span>
                            <select
                                style={s.input}
                                value={shareDog}
                                onChange={(e) => {
                                    setShareDog(Number(e.target.value));
                                    setSharePreview(null);
                                }}
                                disabled={!sharePartner}
                            >
                                {!sharePartner && <option value={0}>—</option>}
                                {(sharePartner?.dogs ?? []).map((d) => (
                                    <option key={d.id} value={d.id}>
                                        {d.dog_name}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div style={s.field}>
                            <span style={s.label}>Their walk length</span>
                            <select
                                style={s.input}
                                value={shareMinutes || shareTarget.duration_minutes || 60}
                                onChange={(e) => {
                                    const m = Number(e.target.value);
                                    setShareMinutes(m === shareTarget.duration_minutes ? 0 : m);
                                    setSharePreview(null);
                                }}
                            >
                                <option value={60}>1 hour{shareTarget.duration_minutes === 60 ? " (same)" : ""}</option>
                                <option value={120}>2 hours{shareTarget.duration_minutes === 120 ? " (same)" : ""}</option>
                            </select>
                        </div>
                        {shareMinutes !== 0 && (
                            <div style={s.field}>
                                <span style={s.label}>The two dogs</span>
                                <select
                                    style={s.input}
                                    value={shareAlign}
                                    onChange={(e) => {
                                        setShareAlign(e.target.value as "start" | "end");
                                        setSharePreview(null);
                                    }}
                                >
                                    <option value="start">set off together</option>
                                    <option value="end">come home together</option>
                                </select>
                            </div>
                        )}
                        <div style={s.field}>
                            <span style={s.label}>{shareTarget.owner_name} pays £ per walk</span>
                            <input
                                style={{ ...s.input, width: "150px" }}
                                type="number"
                                min="0"
                                step="0.50"
                                placeholder="rate card"
                                value={sharePriceFirst}
                                onChange={(e) => {
                                    setSharePriceFirst(e.target.value);
                                    setSharePreview(null);
                                }}
                            />
                        </div>
                        <div style={s.field}>
                            <span style={s.label}>{sharePartner?.owner_name ?? "Second client"} pays £ per walk</span>
                            <input
                                style={{ ...s.input, width: "150px" }}
                                type="number"
                                min="0"
                                step="0.50"
                                placeholder="rate card"
                                value={sharePriceSecond}
                                onChange={(e) => {
                                    setSharePriceSecond(e.target.value);
                                    setSharePreview(null);
                                }}
                            />
                        </div>
                    </div>
                    <p style={{ color: "#9ca3af", margin: "10px 0", fontSize: "0.85rem" }}>
                        Leave a price blank to use the rate card&apos;s shared-walk price for each walk&apos;s date and each dog&apos;s own walk length.
                    </p>
                    <label style={{ display: "flex", alignItems: "center", gap: "8px", color: "#d1d5db", marginBottom: "14px" }}>
                        <input type="checkbox" checked={shareEmail} onChange={(e) => setShareEmail(e.target.checked)} />
                        Email both clients one summary listing all the walks
                    </label>
                    <div style={{ display: "flex", gap: "10px" }}>
                        <button style={{ ...s.btn, opacity: busy ? 0.5 : 1 }} disabled={busy} onClick={() => runShare(true)}>
                            {busy && !sharePreview ? "Checking…" : "Preview"}
                        </button>
                        <button
                            style={s.btnGhost}
                            onClick={() => {
                                setShareId(null);
                                setSharePreview(null);
                            }}
                        >
                            Close
                        </button>
                    </div>

                    {sharePreview && (
                        <div style={{ marginTop: "18px" }}>
                            <p style={{ color: "#d1d5db", marginBottom: "8px" }}>
                                <strong>{sharePreview.walks.length} walks</strong> will be shared.{" "}
                                {sharePreview.first.owner_name}: £{Number(sharePreview.first.total).toFixed(2)} in total.{" "}
                                {sharePreview.partner.owner_name}: £{Number(sharePreview.partner.total).toFixed(2)} in total
                                {sharePreview.partner.converted_bookings > 0
                                    ? ` (${sharePreview.partner.converted_bookings} of their existing walks will be converted, ${sharePreview.partner.new_bookings} new)`
                                    : ` (${sharePreview.partner.new_bookings} new bookings)`}
                                .
                            </p>
                            <div style={{ overflowX: "auto" }}>
                                <table style={s.table}>
                                    <thead>
                                        <tr>
                                            <th style={s.th}>Walk</th>
                                            <th style={s.th}>
                                                {sharePreview.first.dog_name}
                                                {sharePreview.partner_duration_minutes !== sharePreview.duration_minutes &&
                                                    ` (${sharePreview.duration_minutes / 60}h)`}
                                            </th>
                                            <th style={s.th}>
                                                {sharePreview.partner.dog_name}
                                                {sharePreview.partner_duration_minutes !== sharePreview.duration_minutes &&
                                                    ` (${sharePreview.partner_duration_minutes / 60}h)`}
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {sharePreview.walks.map((w: any) => (
                                            <tr key={w.start_time}>
                                                <td style={s.td}>{fmtDateTime(w.start_time)}</td>
                                                <td style={s.td}>
                                                    £{Number(w.price_first).toFixed(2)}
                                                    {w.old_price_first !== null && Number(w.old_price_first) !== Number(w.price_first) && (
                                                        <span style={{ color: "#9ca3af" }}> (now £{Number(w.old_price_first).toFixed(2)})</span>
                                                    )}
                                                </td>
                                                <td style={s.td}>
                                                    {w.partner_start_time && w.partner_start_time !== w.start_time && (
                                                        <span>from {new Date(w.partner_start_time).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/London" })} · </span>
                                                    )}
                                                    £{Number(w.price_partner).toFixed(2)}
                                                    {w.partner_converted && <span style={{ color: "#9ca3af" }}> (existing walk)</span>}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            {(sharePreview.warnings ?? []).map((w: string) => (
                                <p key={w} style={{ color: "#fbbf24", marginTop: "8px" }}>⚠ {w}</p>
                            ))}
                            <button
                                style={{ ...s.btn, marginTop: "14px", backgroundColor: "#0d9488", opacity: busy ? 0.5 : 1 }}
                                disabled={busy}
                                onClick={() => runShare(false)}
                            >
                                {busy ? "Sharing…" : `Share these ${sharePreview.walks.length} walks`}
                            </button>
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
                                            {row.shared_with && (
                                                <span style={{ marginLeft: "6px", backgroundColor: "#0d9488", color: "#fff", fontSize: "0.65rem", fontWeight: 600, padding: "2px 5px", borderRadius: "3px" }}>
                                                    shared with {row.shared_with}
                                                </span>
                                            )}
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
                                            {row.service_type === "solo" && !row.dog_name_2 && (
                                                <button
                                                    style={{ ...s.btnGhost, padding: "6px 12px", marginRight: "8px" }}
                                                    onClick={() => startShare(row)}
                                                    disabled={busy || (row.upcoming_unshared ?? row.upcoming) === 0}
                                                >
                                                    Make shared
                                                </button>
                                            )}
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
