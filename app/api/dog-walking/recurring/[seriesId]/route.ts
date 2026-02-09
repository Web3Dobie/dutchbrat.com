import { NextResponse, type NextRequest } from "next/server";
import { format } from "date-fns";
import { getPool } from '@/lib/database';

// --- Database Connection ---
const pool = getPool();

interface RouteParams {
    params: Promise<{
        seriesId: string;
    }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
    const { seriesId } = await params;
    const seriesIdNum = parseInt(seriesId);

    if (isNaN(seriesIdNum)) {
        return NextResponse.json(
            { error: "Invalid series ID" },
            { status: 400 }
        );
    }

    const client = await pool.connect();

    try {
        // Get series details
        const seriesResult = await client.query(
            `SELECT
                bs.*,
                o.owner_name,
                o.email,
                o.phone,
                d1.dog_name AS dog_name_1,
                d2.dog_name AS dog_name_2,
                sa.address_label,
                sa.address AS secondary_address
             FROM hunters_hounds.booking_series bs
             JOIN hunters_hounds.owners o ON bs.owner_id = o.id
             JOIN hunters_hounds.dogs d1 ON bs.dog_id_1 = d1.id
             LEFT JOIN hunters_hounds.dogs d2 ON bs.dog_id_2 = d2.id
             LEFT JOIN hunters_hounds.secondary_addresses sa ON bs.secondary_address_id = sa.id
             WHERE bs.id = $1`,
            [seriesIdNum]
        );

        if (seriesResult.rows.length === 0) {
            return NextResponse.json(
                { error: "Series not found" },
                { status: 404 }
            );
        }

        const series = seriesResult.rows[0];

        // Get all bookings in this series
        const bookingsResult = await client.query(
            `SELECT
                id,
                start_time,
                end_time,
                duration_minutes,
                price_pounds,
                status,
                series_index,
                cancellation_token,
                google_event_id,
                walk_summary
             FROM hunters_hounds.bookings
             WHERE series_id = $1
             ORDER BY series_index ASC`,
            [seriesIdNum]
        );

        // Calculate stats
        const allBookings = bookingsResult.rows;
        const confirmedBookings = allBookings.filter(b => b.status === 'confirmed');
        const completedBookings = allBookings.filter(b => b.status === 'completed');
        const cancelledBookings = allBookings.filter(b => b.status === 'cancelled');

        // Calculate total value
        const totalValue = allBookings
            .filter(b => b.status !== 'cancelled')
            .reduce((sum, b) => sum + (parseFloat(b.price_pounds) || 0), 0);

        const completedValue = completedBookings
            .reduce((sum, b) => sum + (parseFloat(b.price_pounds) || 0), 0);

        // Format response
        const response = {
            success: true,
            series: {
                id: series.id,
                status: series.status,
                recurrence_pattern: series.recurrence_pattern,
                days_of_week: series.days_of_week,
                preferred_time: series.preferred_time,
                start_date: format(new Date(series.start_date), 'yyyy-MM-dd'),
                end_date: format(new Date(series.end_date), 'yyyy-MM-dd'),
                service_type: series.service_type,
                duration_minutes: series.duration_minutes,
                notes: series.notes,
                created_at: series.created_at,
                owner: {
                    id: series.owner_id,
                    name: series.owner_name,
                    email: series.email,
                    phone: series.phone,
                },
                dogs: {
                    dog_1: series.dog_name_1,
                    dog_2: series.dog_name_2,
                },
                address: series.address_label ? {
                    label: series.address_label,
                    address: series.secondary_address,
                } : null,
            },
            stats: {
                total_requested: series.total_requested,
                total_booked: series.total_booked,
                total_skipped: series.total_skipped,
                confirmed: confirmedBookings.length,
                completed: completedBookings.length,
                cancelled: cancelledBookings.length,
                total_value: totalValue,
                completed_value: completedValue,
                remaining_value: totalValue - completedValue,
            },
            bookings: allBookings.map(b => ({
                id: b.id,
                date: format(new Date(b.start_time), 'yyyy-MM-dd'),
                display_date: format(new Date(b.start_time), 'EEE d MMM'),
                time: format(new Date(b.start_time), 'HH:mm'),
                duration_minutes: b.duration_minutes,
                price: b.price_pounds ? parseFloat(b.price_pounds) : null,
                status: b.status,
                series_index: b.series_index,
                walk_summary: b.walk_summary,
            })),
        };

        return NextResponse.json(response);

    } catch (error) {
        console.error("Error fetching series details:", error);
        return NextResponse.json(
            { error: "Failed to fetch series details" },
            { status: 500 }
        );
    } finally {
        client.release();
    }
}
