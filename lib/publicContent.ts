// lib/publicContent.ts
//
// The two pieces of client-written content the public site shows: published
// reviews and sent newsletters. Both the API routes and the server-rendered
// pages read through here, so there is one definition of "public".
//
// Why the pages render on the server (2026-11-20): they used to fetch this in
// the browser, so the HTML a search engine received was a heading and
// "Loading…". /api/ is disallowed in robots.txt, so the content could never
// be indexed at all.

import { getPool } from './database';

export interface PublicReview {
    id: number;
    rating: number;
    reviewText: string;
    submittedAt: string;
    adminResponse: string | null;
    adminResponseDate: string | null;
    serviceType: string;
    serviceDate: string;
    serviceNote: string | null;
    customerFirstName: string;
    dogNames: string[];
    dogImages: string[];
}

export interface PublicReviews {
    reviews: PublicReview[];
    total: number;
    averageRating: number;
}

export interface PublicNewsletter {
    id: number;
    title: string;
    content: any;
    sent_at: string;
}

const iso = (v: unknown): any => (v instanceof Date ? v.toISOString() : v);

export async function getPublicReviews(limit = 50, offset = 0): Promise<PublicReviews> {
    const pool = getPool();
    const [reviewsResult, countResult] = await Promise.all([
        pool.query(
            `SELECT
                r.id, r.rating, r.review_text, r.submitted_at,
                r.admin_response, r.admin_response_date,
                b.service_type, b.start_time, b.walk_summary AS service_note,
                o.owner_name,
                COALESCE(d1.dog_name, '') AS dog_name_1,
                COALESCE(d2.dog_name, '') AS dog_name_2,
                COALESCE(d1.image_filename, '') AS dog_image_1,
                COALESCE(d2.image_filename, '') AS dog_image_2
             FROM hunters_hounds.reviews r
             JOIN hunters_hounds.bookings b ON r.booking_id = b.id
             JOIN hunters_hounds.owners o ON r.owner_id = o.id
             LEFT JOIN hunters_hounds.dogs d1 ON b.dog_id_1 = d1.id
             LEFT JOIN hunters_hounds.dogs d2 ON b.dog_id_2 = d2.id
             WHERE r.submitted_at IS NOT NULL
             ORDER BY r.submitted_at DESC
             LIMIT $1 OFFSET $2`,
            [limit, offset]
        ),
        pool.query(`SELECT COUNT(*) AS total FROM hunters_hounds.reviews WHERE submitted_at IS NOT NULL`),
    ]);

    const reviews: PublicReview[] = reviewsResult.rows.map((row) => ({
        id: row.id,
        rating: row.rating,
        reviewText: row.review_text,
        submittedAt: iso(row.submitted_at),
        adminResponse: row.admin_response,
        adminResponseDate: iso(row.admin_response_date),
        serviceType: row.service_type,
        serviceDate: iso(row.start_time),
        serviceNote: row.service_note,
        // First name only, for privacy.
        customerFirstName: String(row.owner_name || '').split(' ')[0],
        dogNames: [row.dog_name_1, row.dog_name_2].filter(Boolean),
        dogImages: [row.dog_image_1, row.dog_image_2].filter(Boolean),
    }));

    const avg = reviews.length > 0 ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length : 0;

    return {
        reviews,
        total: parseInt(countResult.rows[0].total, 10),
        averageRating: Math.round(avg * 10) / 10,
    };
}

/**
 * The newsletter JSON was written for the email, where "new pack members"
 * carries each owner's full name. Nothing public renders that, so it does not
 * leave the server.
 */
function publicContent(content: any): any {
    if (!content || !Array.isArray(content.newPackMembers)) return content;
    return {
        ...content,
        newPackMembers: content.newPackMembers.map(({ ownerName, ...dog }: any) => dog),
    };
}

/** Sent newsletters, newest first. */
export async function getPublicNewsletters(): Promise<PublicNewsletter[]> {
    const result = await getPool().query(
        `SELECT id, title, content_json, sent_at
         FROM hunters_hounds.newsletters
         WHERE sent_at IS NOT NULL
         ORDER BY sent_at DESC`
    );
    return result.rows.map((row) => ({
        id: row.id,
        title: String(row.title || '').trim(),
        content: publicContent(row.content_json),
        sent_at: iso(row.sent_at),
    }));
}

export async function getPublicNewsletter(id: number): Promise<PublicNewsletter | null> {
    if (!Number.isInteger(id)) return null;
    const all = await getPublicNewsletters();
    return all.find((n) => n.id === id) ?? null;
}

export const SITE_URL = 'https://hunters-hounds.london';
