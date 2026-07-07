import { NextResponse, type NextRequest } from "next/server";
import { isAuthenticated, unauthorizedResponse } from "@/lib/auth";
import { getPool } from '@/lib/database';

const pool = getPool();

// GET - Fetch dogs with birthdays in the specified month
// ?month=4 (defaults to current month)
export async function GET(request: NextRequest) {
    if (!isAuthenticated(request)) {
        return unauthorizedResponse();
    }

    const { searchParams } = new URL(request.url);
    const month = searchParams.get("month") || (new Date().getMonth() + 1).toString();
    const monthInt = parseInt(month);

    if (isNaN(monthInt) || monthInt < 1 || monthInt > 12) {
        return NextResponse.json({ error: "Invalid month parameter (1–12)" }, { status: 400 });
    }

    const client = await pool.connect();

    try {
        const query = `
            SELECT
                d.id as dog_id,
                d.dog_name,
                d.dog_breed,
                d.dog_birthday,
                d.image_filename,
                o.id as owner_id,
                o.owner_name,
                o.email,
                EXTRACT(YEAR FROM AGE(d.dog_birthday))::int as age_years
            FROM hunters_hounds.dogs d
            JOIN hunters_hounds.owners o ON d.owner_id = o.id
            WHERE d.dog_birthday IS NOT NULL
              AND EXTRACT(MONTH FROM d.dog_birthday) = $1
            ORDER BY EXTRACT(DAY FROM d.dog_birthday), d.dog_name;
        `;

        const result = await client.query(query, [monthInt]);

        return NextResponse.json({
            success: true,
            birthday_dogs: result.rows.map(row => ({
                dog_id: row.dog_id,
                dog_name: row.dog_name,
                breed: row.dog_breed,
                dog_birthday: row.dog_birthday,
                image_filename: row.image_filename,
                owner_id: row.owner_id,
                owner_name: row.owner_name,
                owner_email: row.email,
                age_years: row.age_years,
            })),
            month: monthInt,
            count: result.rows.length,
        });

    } catch (error) {
        console.error("Birthday dogs fetch error:", error);
        return NextResponse.json(
            { error: "Failed to fetch birthday dogs" },
            { status: 500 }
        );
    } finally {
        client.release();
    }
}
