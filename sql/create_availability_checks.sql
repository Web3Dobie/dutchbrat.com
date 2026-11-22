-- Dates a logged-in client looked at on the booking calendar, and how many
-- start times the site offered them. Feeds the "Looked but didn't book" list on
-- the admin Traffic page: a client who checks a date that is full and leaves is
-- a walk Ernesto could often have fitted in by hand, and nothing else tells him.
--
-- Written by app/api/dog-walking/availability/route.ts. Logged-in clients only
-- (anonymous browsing is not recorded), never Ernesto's own account, never
-- reschedule lookups. The list shows the last 24 hours; rows older than 7 days
-- are deleted as new ones are written, so the table stays small.

CREATE TABLE IF NOT EXISTS hunters_hounds.availability_checks (
    id           BIGSERIAL PRIMARY KEY,
    owner_id     INTEGER NOT NULL REFERENCES hunters_hounds.owners(id) ON DELETE CASCADE,
    wanted_date  DATE    NOT NULL,
    service_type TEXT,
    slots        INTEGER NOT NULL,   -- start times offered; 0 = nothing bookable
    checked_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS availability_checks_checked_idx
    ON hunters_hounds.availability_checks (checked_at);
