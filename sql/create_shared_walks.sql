-- Shared walks: two dogs from two households on one walk.
--
-- Each household keeps its own ordinary booking row (own price, payment,
-- cancellation link, reminder, loyalty). The two rows are tied together by
-- pointing at the same shared_walks row. Nothing else about a booking changes,
-- so every existing report and job keeps working on shared walks unchanged.

CREATE TABLE IF NOT EXISTS hunters_hounds.shared_walks (
    id          SERIAL PRIMARY KEY,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    -- 'admin' today; 'client' once clients can invite a partner themselves.
    created_by  TEXT NOT NULL DEFAULT 'admin',
    notes       TEXT
);

ALTER TABLE hunters_hounds.bookings
    ADD COLUMN IF NOT EXISTS shared_walk_id INTEGER
        REFERENCES hunters_hounds.shared_walks(id);

CREATE INDEX IF NOT EXISTS idx_bookings_shared_walk_id
    ON hunters_hounds.bookings (shared_walk_id)
    WHERE shared_walk_id IS NOT NULL;
