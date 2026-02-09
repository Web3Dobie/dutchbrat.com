// OPTIONAL: Create API endpoint for database checking
// File: app/api/admin/check-database/route.ts

import { NextResponse } from "next/server";
import { getPool } from '@/lib/database';

const pool = getPool();

export async function GET() {
    try {
        // Quick stats check
        const statsQuery = `
            SELECT 
                (SELECT COUNT(*) FROM hunters_hounds.owners) as total_customers,
                (SELECT COUNT(*) FROM hunters_hounds.dogs) as total_dogs,
                (SELECT COUNT(*) FROM hunters_hounds.bookings WHERE status = 'confirmed') as active_bookings,
                (SELECT COUNT(*) FROM hunters_hounds.bookings WHERE status = 'cancelled') as cancelled_bookings;
        `;

        const statsResult = await pool.query(statsQuery);
        const stats = statsResult.rows[0];

        // Recent customers
        const recentCustomersQuery = `
            SELECT id, owner_name, phone, email, created_at
            FROM hunters_hounds.owners 
            ORDER BY created_at DESC 
            LIMIT 5;
        `;
        const recentCustomers = await pool.query(recentCustomersQuery);

        // Recent dogs
        const recentDogsQuery = `
            SELECT d.dog_name, d.dog_breed, d.dog_age, o.owner_name
            FROM hunters_hounds.dogs d
            JOIN hunters_hounds.owners o ON d.owner_id = o.id
            ORDER BY d.created_at DESC 
            LIMIT 5;
        `;
        const recentDogs = await pool.query(recentDogsQuery);

        // Recent bookings
        const recentBookingsQuery = `
            SELECT b.service_type, b.start_time, b.status, o.owner_name
            FROM hunters_hounds.bookings b
            JOIN hunters_hounds.owners o ON b.owner_id = o.id
            ORDER BY b.created_at DESC 
            LIMIT 5;
        `;
        const recentBookings = await pool.query(recentBookingsQuery);

        return NextResponse.json({
            stats: stats,
            recentCustomers: recentCustomers.rows,
            recentDogs: recentDogs.rows,
            recentBookings: recentBookings.rows,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error("Database check failed:", error);
        return NextResponse.json(
            { error: "Database check failed" },
            { status: 500 }
        );
    }
}

// USAGE:
// Visit: https://dutchbrat.com/api/admin/check-database
// This will return JSON with current database stats