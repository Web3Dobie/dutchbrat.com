import { NextResponse, type NextRequest } from "next/server";
import { getIgTradingPool } from "@/lib/igTradingDatabase";
import { isAuthenticated, unauthorizedResponse } from "@/lib/auth";

const pool = getIgTradingPool();

function dayFilter(col: string, days: number): string {
    if (days === 1) return `AND ${col} >= date_trunc('day', NOW() AT TIME ZONE 'UTC')`;
    if (days > 1)  return `AND ${col} >= NOW() - INTERVAL '${days} days'`;
    return "";
}

export async function GET(request: NextRequest) {
    if (!isAuthenticated(request)) {
        return unauthorizedResponse();
    }

    const { searchParams } = new URL(request.url);
    const limit    = Math.min(parseInt(searchParams.get("limit")    || "50"), 200);
    const offset   = Math.max(parseInt(searchParams.get("offset")   || "0"),  0);
    const mode     = searchParams.get("mode")     || "LIVE";
    const days     = Math.max(parseInt(searchParams.get("days")     || "0"),  0);
    const strategy = searchParams.get("strategy") || "";

    const client = await pool.connect();
    try {
        const [tradesResult, countResult] = await Promise.all([
            client.query(`
                SELECT
                    p.id,
                    p.epic,
                    p.direction,
                    p.size::float,
                    p.entry_price::float,
                    p.current_price::float,
                    p.realized_pnl::float,
                    p.close_reason,
                    p.opened_at,
                    p.closed_at,
                    p.mode,
                    p.strategy,
                    i.symbol,
                    i.asset_type,
                    s.signal_strength::float,
                    s.timeframe
                FROM ig_trading.positions p
                LEFT JOIN ig_trading.instruments i ON i.epic = p.epic
                LEFT JOIN ig_trading.signals s     ON s.id  = p.signal_id
                WHERE p.status = 'CLOSED'
                  AND p.realized_pnl IS NOT NULL
                  AND p.strategy IS NOT NULL
                  AND p.mode = $3
                  ${strategy ? `AND p.strategy = $4` : ""}
                  ${dayFilter("p.closed_at", days)}
                ORDER BY p.closed_at DESC
                LIMIT $1 OFFSET $2
            `, strategy ? [limit, offset, mode, strategy] : [limit, offset, mode]),
            client.query(`
                SELECT COUNT(*)::int AS total
                FROM ig_trading.positions
                WHERE status = 'CLOSED' AND realized_pnl IS NOT NULL
                  AND strategy IS NOT NULL AND mode = $1
                  ${strategy ? `AND strategy = $2` : ""}
                  ${dayFilter("closed_at", days)}
            `, strategy ? [mode, strategy] : [mode]),
        ]);

        const trades = tradesResult.rows.map(row => {
            const entry        = row.entry_price;
            const pnl          = row.realized_pnl;
            const size         = row.size;
            const close_price  = row.current_price ?? null;

            const duration_secs = row.closed_at && row.opened_at
                ? Math.round((new Date(row.closed_at).getTime() - new Date(row.opened_at).getTime()) / 1000)
                : null;

            return {
                id:              row.id,
                epic:            row.epic || "—",
                symbol:          row.symbol || "—",
                asset_type:      row.asset_type || "—",
                direction:       row.direction,
                size,
                entry_price:     entry,
                close_price,
                realized_pnl:    pnl,
                close_reason:    row.close_reason || "—",
                opened_at:       row.opened_at,
                closed_at:       row.closed_at,
                duration_secs,
                mode:            row.mode,
                signal_strength: row.signal_strength ?? null,
                timeframe:       row.timeframe ?? null,
                strategy:        row.strategy ?? null,
            };
        });

        return NextResponse.json({
            trades,
            total:  countResult.rows[0].total,
            limit,
            offset,
        });
    } catch (error) {
        console.error("IG closed-trades fetch error:", error);
        return NextResponse.json({ error: "Failed to fetch closed trades" }, { status: 500 });
    } finally {
        client.release();
    }
}
