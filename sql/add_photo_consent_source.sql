-- Where each photo-sharing answer came from.
--
-- Added 2026-11-17 after an evening that turned on exactly this gap. The
-- boolean on its own could not distinguish:
--
--   * a client who ticked "yes"
--   * a client who ticked "no"
--   * a client who never saw the question (the column was added 2025-12-30
--     with DEFAULT false and backfilled)
--   * a client whose answer was silently overwritten by the admin editor bug
--     that shipped with it
--
-- All four read as the same `false`, which is why 17 clients appeared to have
-- refused when most had not been asked a question they understood. Recording
-- the provenance means a future reader can tell a decision from an assumption
-- without excavating Telegram history.

ALTER TABLE hunters_hounds.owners
    ADD COLUMN IF NOT EXISTS photo_consent_source TEXT,
    ADD COLUMN IF NOT EXISTS photo_consent_recorded_at TIMESTAMPTZ;

COMMENT ON COLUMN hunters_hounds.owners.photo_consent_source IS
    'How photo_sharing_consent was arrived at: registration (the client answered the form), client (the client set it in their dashboard), admin_assumed (Ernesto recorded it on their behalf, no answer from the client on record), unknown (predates this column).';

COMMENT ON COLUMN hunters_hounds.owners.photo_consent_recorded_at IS
    'When photo_sharing_consent last changed, as far as is known.';
