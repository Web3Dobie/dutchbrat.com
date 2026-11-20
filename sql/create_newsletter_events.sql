-- Opens and link clicks for newsletter emails (lib/newsletterTracking.ts).
--
-- One row per event. Who it was is known from a signed token in the email, so
-- nothing here depends on cookies or IP addresses, and none are stored.
--
-- Read the numbers with care:
--   * An "open" is the email app fetching a 1x1 image. Apple Mail fetches it
--     for every message whether or not it is read, and apps that block images
--     never fetch it. Opens are a rough signal, not a register.
--   * A "click" is reliable, apart from the odd corporate mail scanner that
--     follows every link before delivery.

CREATE TABLE IF NOT EXISTS hunters_hounds.newsletter_events (
    id            BIGSERIAL PRIMARY KEY,
    newsletter_id INTEGER NOT NULL REFERENCES hunters_hounds.newsletters(id) ON DELETE CASCADE,
    owner_id      INTEGER NOT NULL REFERENCES hunters_hounds.owners(id) ON DELETE CASCADE,
    -- The copy sent to the partner's address rather than the owner's.
    is_partner    BOOLEAN NOT NULL DEFAULT false,
    kind          TEXT    NOT NULL CHECK (kind IN ('open', 'click')),
    url           TEXT,            -- clicks only: where the link went
    user_agent    TEXT,
    occurred_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS newsletter_events_newsletter_idx
    ON hunters_hounds.newsletter_events (newsletter_id, owner_id);

-- Set when a newsletter is sent with tracking, so the admin can tell
-- "nobody opened it" from "sent before tracking existed".
ALTER TABLE hunters_hounds.newsletters ADD COLUMN IF NOT EXISTS tracked BOOLEAN NOT NULL DEFAULT false;
