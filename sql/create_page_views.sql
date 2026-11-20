-- First-party page-view log for the admin Traffic page.
--
-- Why not the nginx log or Cloudflare's "unique visitors": both count every
-- IP that makes any request, and on this site ~95% of those are crawlers and
-- WordPress-exploit scanners. Rows here are written only by a beacon that the
-- page's own JavaScript sends (app/components/PageViewTracker.tsx), which
-- crawlers and scanners do not run.
--
-- Privacy: no cookie is set and no IP address is stored. visitor_hash is
-- HMAC(SESSION_SECRET, London date | IP | user agent), so it can tell two
-- visitors apart within one day and cannot be linked across days or reversed.

CREATE TABLE IF NOT EXISTS hunters_hounds.page_views (
    id            BIGSERIAL PRIMARY KEY,
    viewed_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    path          TEXT        NOT NULL,

    -- Daily-rotating pseudonym; see header.
    visitor_hash  TEXT        NOT NULL,

    -- Set when the browser carries a valid client login. No FK cascade games:
    -- if a client is deleted their views simply become anonymous.
    owner_id      INTEGER REFERENCES hunters_hounds.owners(id) ON DELETE SET NULL,

    -- Ernesto himself (admin cookie, or his own client account). Recorded but
    -- excluded from every figure so his own browsing does not inflate them.
    is_admin      BOOLEAN     NOT NULL DEFAULT false,

    -- External site that sent the visitor, first page of a visit only.
    referrer_host TEXT,
    utm_source    TEXT,
    country       TEXT,        -- Cloudflare's cf-ipcountry, two letters
    device        TEXT         -- 'mobile' | 'desktop'
);

CREATE INDEX IF NOT EXISTS page_views_viewed_at_idx ON hunters_hounds.page_views (viewed_at);
