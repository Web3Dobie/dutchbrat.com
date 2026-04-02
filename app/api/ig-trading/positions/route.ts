import { NextResponse, type NextRequest } from "next/server";
import { getIgTradingPool } from "@/lib/igTradingDatabase";
import { isAuthenticated, unauthorizedResponse } from "@/lib/auth";

const pool = getIgTradingPool();

export async function GET(request: NextRequest) {
    if (!isAuthenticated(request)) {
        return unauthorizedResponse();
    }

    const { searchParams } = new URL(request.url);
    const mode = searchParams.get("mode") || "LIVE";

    const client = await pool.connect();
    try {
        const result = await client.query(`
            SELECT
                p.id,
                p.epic,
                p.direction,
                p.size,
                p.entry_price,
                p.stop_loss,
                p.take_profit,
                p.half_closed,
                p.unrealized_pnl,
                p.current_price,
                p.opened_at,
                p.mode,
                p.deal_id,
                p.strategy,
                i.symbol,
                i.asset_type,
                i.pip_size::float,
                i.margin_rate::float
            FROM ig_trading.positions p
            LEFT JOIN ig_trading.instruments i ON i.epic = p.epic
            WHERE p.status = 'OPEN'
            ORDER BY p.opened_at DESC
        `);

        const todayResult = await client.query(`
            SELECT COALESCE(SUM(realized_pnl), 0)::float AS today_closed_pnl
            FROM ig_trading.positions
            WHERE status = 'CLOSED'
              AND mode = $1
              AND strategy IS NOT NULL
              AND closed_at >= date_trunc('day', NOW() AT TIME ZONE 'UTC')
        `, [mode]);

        const positions = result.rows.map(row => ({
            id:            row.id,
            epic:          row.epic,
            symbol:        row.symbol || row.epic,
            asset_type:    row.asset_type,
            direction:     row.direction,
            size:          parseFloat(row.size),
            entry_price:   parseFloat(row.entry_price),
            stop_loss:     row.stop_loss    ? parseFloat(row.stop_loss)    : null,
            take_profit:   row.take_profit  ? parseFloat(row.take_profit)  : null,
            half_closed:   row.half_closed === true || row.half_closed === 't',
            current_price: row.current_price ? parseFloat(row.current_price) : null,
            unrealized_pnl: parseFloat(row.unrealized_pnl) || 0,
            opened_at:     row.opened_at,
            mode:          row.mode,
            deal_id:       row.deal_id,
            strategy:      row.strategy ?? null,
            margin_used:   (() => {
                const pip  = parseFloat(row.pip_size)    || 1.0;
                const rate = parseFloat(row.margin_rate) || 0.05;
                const size = parseFloat(row.size);
                const ep   = parseFloat(row.entry_price);
                return Math.round(size * (ep / pip) * rate * 100) / 100;
            })(),
        }));

        const total_unrealized_pnl = positions.reduce((sum, p) => sum + p.unrealized_pnl, 0);
        const total_margin_used    = positions.reduce((sum, p) => sum + p.margin_used,    0);

        return NextResponse.json({
            positions,
            total_unrealized_pnl,
            total_margin_used,
            today_closed_pnl: todayResult.rows[0].today_closed_pnl,
        });
    } catch (error) {
        console.error("IG positions fetch error:", error);
        return NextResponse.json({ error: "Failed to fetch positions" }, { status: 500 });
    } finally {
        client.release();
    }
}
