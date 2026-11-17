-- One-time login codes for the customer login.
--
-- Until now, knowing a client's email address (or phone number) WAS the login:
-- customer-session minted a signed session for whoever matched, and
-- customer-lookup returned the full record — name, address, phone, partner
-- details, booking history, dogs — with no credentials at all. Email addresses
-- are not secret, so this table exists to turn "claims to be X" into "controls
-- X's mailbox".
--
-- Codes are stored as an HMAC, never in the clear, so a look at this table (or
-- a stolen backup) does not hand over live logins.

CREATE TABLE IF NOT EXISTS hunters_hounds.login_codes (
    id          SERIAL PRIMARY KEY,
    owner_id    INTEGER NOT NULL REFERENCES hunters_hounds.owners(id) ON DELETE CASCADE,

    -- HMAC-SHA256(code, SESSION_SECRET), base64url. Rotating SESSION_SECRET
    -- therefore invalidates every outstanding code as well as every live
    -- session, which is the intended emergency lever.
    code_hash   TEXT    NOT NULL,

    -- Which address the code went to. Needed because a partner email logs into
    -- the primary owner's account: the code must be verified against the
    -- address it was actually sent to, not just the owner.
    sent_to     TEXT    NOT NULL,

    expires_at  TIMESTAMPTZ NOT NULL,

    -- Wrong guesses against this code. At MAX_ATTEMPTS the code is burnt, so a
    -- 6-digit code cannot be walked through.
    attempts    INTEGER NOT NULL DEFAULT 0,

    -- Set on successful use. A code is single-use; a non-NULL value here means
    -- it can never be accepted again.
    used_at     TIMESTAMPTZ,

    -- For abuse investigation only.
    requested_ip TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Verification looks up the newest unused code for an owner.
CREATE INDEX IF NOT EXISTS idx_login_codes_owner_active
    ON hunters_hounds.login_codes (owner_id, created_at DESC)
    WHERE used_at IS NULL;

-- Per-address request throttling counts recent rows by address.
CREATE INDEX IF NOT EXISTS idx_login_codes_sent_to_created
    ON hunters_hounds.login_codes (LOWER(sent_to), created_at DESC);

-- Housekeeping: expired codes are dead weight, not history worth keeping.
CREATE INDEX IF NOT EXISTS idx_login_codes_expires_at
    ON hunters_hounds.login_codes (expires_at);

COMMENT ON TABLE hunters_hounds.login_codes IS
    'Single-use, short-lived codes emailed to a client to prove they control the address on file. Hashed, never stored in the clear.';
