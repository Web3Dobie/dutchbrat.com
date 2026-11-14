// frontend/lib/rateLimit.ts
//
// Minimal fixed-window rate limiter for credential and lookup endpoints.
//
// Added 2026-10-31. The audit found no rate limiting anywhere, which made the
// admin password (6 digits at the time) brute-forceable in minutes and let
// customer-lookup be used to harvest clients by guessing emails or phone numbers.
//
// Deliberately in-process and dependency-free: there is a single frontend
// container, so a shared store would add a Redis dependency (currently
// unauthenticated — see the audit's P2 list) for no gain. Counters reset on
// deploy, which is acceptable for slowing brute force; it is not a quota system.

interface Bucket {
    count: number;
    resetAt: number;
}

const buckets = new Map<string, Bucket>();

// Bound the map so a flood of distinct IPs can't grow it without limit.
const MAX_TRACKED_KEYS = 10_000;

/**
 * Best-effort client IP. TLS terminates at Cloudflare, so the origin sees
 * Cloudflare's address in remoteAddress; cf-connecting-ip carries the real
 * client. Only trustworthy because the origin is not directly reachable
 * (ports 80/443 are filtered from the internet) — if that ever changes, these
 * headers become attacker-controlled and this must be revisited.
 */
export function clientIp(req: Request): string {
    const cf = req.headers.get('cf-connecting-ip');
    if (cf) return cf.trim();
    const xff = req.headers.get('x-forwarded-for');
    if (xff) return xff.split(',')[0].trim();
    return 'unknown';
}

export interface RateLimitResult {
    allowed: boolean;
    /** Seconds until the window resets — suitable for a Retry-After header. */
    retryAfter: number;
}

/**
 * Count one attempt against `key`. Returns allowed:false once `limit` attempts
 * have been made inside `windowSeconds`.
 */
export function rateLimit(key: string, limit: number, windowSeconds: number): RateLimitResult {
    const now = Date.now();
    const existing = buckets.get(key);

    if (!existing || existing.resetAt <= now) {
        if (buckets.size >= MAX_TRACKED_KEYS) {
            // Drop whatever has already expired before refusing to track more.
            // Array.from, not direct Map iteration: the tsconfig target predates it.
            Array.from(buckets.keys()).forEach((k) => {
                const w = buckets.get(k);
                if (w && w.resetAt <= now) buckets.delete(k);
            });
        }
        buckets.set(key, { count: 1, resetAt: now + windowSeconds * 1000 });
        return { allowed: true, retryAfter: 0 };
    }

    existing.count += 1;
    if (existing.count > limit) {
        return { allowed: false, retryAfter: Math.ceil((existing.resetAt - now) / 1000) };
    }
    return { allowed: true, retryAfter: 0 };
}

/** 429 response with Retry-After, for a blocked attempt. */
export function tooManyRequests(retryAfter: number) {
    return new Response(
        JSON.stringify({ error: 'Too many attempts. Please wait and try again.' }),
        {
            status: 429,
            headers: { 'Content-Type': 'application/json', 'Retry-After': String(retryAfter) },
        }
    );
}
