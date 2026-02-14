import { NextResponse, type NextRequest } from "next/server";
import { getPool } from '@/lib/database';
import { getRewardTier } from '@/lib/pricing';

export const dynamic = 'force-dynamic';

const pool = getPool();

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const ownerId = searchParams.get("owner_id");

    if (!ownerId) {
        return NextResponse.json(
            { error: "owner_id parameter is required" },
            { status: 400 }
        );
    }

    const ownerIdNum = parseInt(ownerId);
    if (isNaN(ownerIdNum)) {
        return NextResponse.json(
            { error: "owner_id must be a valid number" },
            { status: 400 }
        );
    }

    const client = await pool.connect();

    try {
        // Get qualifying walks grouped into cards of 15
        const cardsQuery = `
            WITH qualifying_walks AS (
                SELECT b.id, b.price_pounds,
                    ROW_NUMBER() OVER (ORDER BY b.start_time, b.id) as walk_num
                FROM hunters_hounds.bookings b
                LEFT JOIN hunters_hounds.loyalty_redemptions lr
                    ON lr.booking_id = b.id
                WHERE b.owner_id = $1
                  AND b.service_type IN ('solo', 'quick')
                  AND b.status IN ('completed', 'completed & paid')
                  AND lr.id IS NULL
            ),
            cards AS (
                SELECT
                    CEIL(walk_num::numeric / 15)::int as card_index,
                    COUNT(*)::int as stamps,
                    ROUND(AVG(price_pounds)::numeric, 2) as avg_price
                FROM qualifying_walks
                GROUP BY CEIL(walk_num::numeric / 15)::int
            )
            SELECT * FROM cards ORDER BY card_index
        `;

        const redemptionsQuery = `
            SELECT card_index, max_value, booking_id, original_price, created_at
            FROM hunters_hounds.loyalty_redemptions
            WHERE owner_id = $1
            ORDER BY card_index
        `;

        const [cardsResult, redemptionsResult] = await Promise.all([
            client.query(cardsQuery, [ownerIdNum]),
            client.query(redemptionsQuery, [ownerIdNum])
        ]);

        const redeemedIndices = new Set(
            redemptionsResult.rows.map(r => r.card_index)
        );

        let totalQualifyingWalks = 0;
        let currentCard = { stamps: 0, card_index: 1, avg_price: 0 };
        const fullCards: Array<{
            card_index: number;
            avg_price: number;
            redeemed: boolean;
        }> = [];

        for (const card of cardsResult.rows) {
            totalQualifyingWalks += card.stamps;

            if (card.stamps === 15) {
                fullCards.push({
                    card_index: card.card_index,
                    avg_price: parseFloat(card.avg_price),
                    redeemed: redeemedIndices.has(card.card_index)
                });
            } else {
                // This is the current (incomplete) card
                currentCard = {
                    stamps: card.stamps,
                    card_index: card.card_index,
                    avg_price: parseFloat(card.avg_price)
                };
            }
        }

        // If no incomplete card exists but there are walks, the next card is empty
        if (cardsResult.rows.length > 0 && !cardsResult.rows.find((c: { stamps: number }) => c.stamps < 15)) {
            const maxIndex = Math.max(...cardsResult.rows.map((c: { card_index: number }) => c.card_index));
            currentCard = { stamps: 0, card_index: maxIndex + 1, avg_price: 0 };
        }

        const availableToRedeem = fullCards.filter(c => !c.redeemed).length;

        // Get redemption history for display
        const redemptionHistory = redemptionsResult.rows.map(r => ({
            card_index: r.card_index,
            max_value: parseFloat(r.max_value),
            booking_id: r.booking_id,
            original_price: parseFloat(r.original_price),
            created_at: r.created_at
        }));

        return NextResponse.json({
            success: true,
            loyalty: {
                total_qualifying_walks: totalQualifyingWalks,
                current_card: currentCard,
                full_cards: fullCards,
                total_redeemed: redeemedIndices.size,
                available_to_redeem: availableToRedeem,
                redemption_history: redemptionHistory
            }
        });

    } catch (error) {
        console.error("Loyalty fetch error:", error);
        return NextResponse.json(
            { error: "Failed to fetch loyalty status" },
            { status: 500 }
        );
    } finally {
        client.release();
    }
}

export async function POST(request: NextRequest) {
    const body = await request.json();
    const { owner_id, booking_id } = body;

    if (!owner_id || !booking_id) {
        return NextResponse.json(
            { error: "owner_id and booking_id are required" },
            { status: 400 }
        );
    }

    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // 1. Compute qualifying walks and cards
        const cardsQuery = `
            WITH qualifying_walks AS (
                SELECT b.id, b.price_pounds,
                    ROW_NUMBER() OVER (ORDER BY b.start_time, b.id) as walk_num
                FROM hunters_hounds.bookings b
                LEFT JOIN hunters_hounds.loyalty_redemptions lr
                    ON lr.booking_id = b.id
                WHERE b.owner_id = $1
                  AND b.service_type IN ('solo', 'quick')
                  AND b.status IN ('completed', 'completed & paid')
                  AND lr.id IS NULL
            ),
            cards AS (
                SELECT
                    CEIL(walk_num::numeric / 15)::int as card_index,
                    COUNT(*)::int as stamps,
                    ROUND(AVG(price_pounds)::numeric, 2) as avg_price
                FROM qualifying_walks
                GROUP BY CEIL(walk_num::numeric / 15)::int
            )
            SELECT * FROM cards WHERE stamps = 15 ORDER BY card_index
        `;

        const cardsResult = await client.query(cardsQuery, [owner_id]);

        // Get already-redeemed card indices
        const redeemedResult = await client.query(
            `SELECT card_index FROM hunters_hounds.loyalty_redemptions WHERE owner_id = $1`,
            [owner_id]
        );
        const redeemedIndices = new Set(redeemedResult.rows.map(r => r.card_index));

        // Find oldest unredeemed full card
        const unredeemedCard = cardsResult.rows.find(
            (c: { card_index: number }) => !redeemedIndices.has(c.card_index)
        );

        if (!unredeemedCard) {
            await client.query('ROLLBACK');
            return NextResponse.json(
                { error: "No full loyalty cards available to redeem" },
                { status: 400 }
            );
        }

        const avgPrice = parseFloat(unredeemedCard.avg_price);

        // 2. Validate the target booking
        const bookingCheck = await client.query(
            `SELECT id, owner_id, service_type, status, price_pounds
             FROM hunters_hounds.bookings
             WHERE id = $1
             FOR UPDATE`,
            [booking_id]
        );

        if (bookingCheck.rows.length === 0) {
            await client.query('ROLLBACK');
            return NextResponse.json(
                { error: "Booking not found" },
                { status: 404 }
            );
        }

        const booking = bookingCheck.rows[0];

        if (booking.owner_id !== owner_id) {
            await client.query('ROLLBACK');
            return NextResponse.json(
                { error: "Booking does not belong to this customer" },
                { status: 403 }
            );
        }

        if (booking.status !== 'confirmed') {
            await client.query('ROLLBACK');
            return NextResponse.json(
                { error: "Can only redeem against confirmed bookings" },
                { status: 400 }
            );
        }

        if (!['solo', 'quick'].includes(booking.service_type)) {
            await client.query('ROLLBACK');
            return NextResponse.json(
                { error: "Can only redeem for Solo Walk or Quick Walk bookings" },
                { status: 400 }
            );
        }

        const bookingPrice = parseFloat(booking.price_pounds || 0);
        const rewardTier = getRewardTier(avgPrice);

        if (bookingPrice > rewardTier) {
            await client.query('ROLLBACK');
            return NextResponse.json(
                { error: `Booking price (£${bookingPrice.toFixed(2)}) exceeds your reward value (£${rewardTier.toFixed(2)}). Choose a walk within your reward value.` },
                { status: 400 }
            );
        }

        // 3. Apply the redemption: update booking price to 0
        await client.query(
            `UPDATE hunters_hounds.bookings SET price_pounds = 0, updated_at = NOW() WHERE id = $1`,
            [booking_id]
        );

        // 4. Create the redemption record
        await client.query(
            `INSERT INTO hunters_hounds.loyalty_redemptions
                (owner_id, card_index, max_value, booking_id, original_price)
             VALUES ($1, $2, $3, $4, $5)`,
            [owner_id, unredeemedCard.card_index, avgPrice, booking_id, bookingPrice]
        );

        await client.query('COMMIT');

        return NextResponse.json({
            success: true,
            message: `Loyalty reward applied! Your ${booking.service_type === 'solo' ? 'Solo Walk' : 'Quick Walk'} is now FREE.`,
            redemption: {
                card_index: unredeemedCard.card_index,
                max_value: avgPrice,
                original_price: bookingPrice,
                booking_id: booking_id
            }
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error("Loyalty redemption error:", error);
        return NextResponse.json(
            { error: "Failed to redeem loyalty card" },
            { status: 500 }
        );
    } finally {
        client.release();
    }
}
