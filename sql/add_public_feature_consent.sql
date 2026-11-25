-- Consent for a dog to be FEATURED publicly: the talking-dog videos on social
-- media and a profile page on the website.
--
-- Separate from photo_sharing_consent on purpose. That answer was given for
-- ordinary photos; putting an invented voice on someone's dog, or giving the dog
-- a public page of its own, is a different thing to agree to.
--
-- NULL means the client has never answered. No default and no backfill: only the
-- client can set this, from their own dashboard, so every non-NULL value is a
-- real answer (see add_photo_consent_source.sql for why that matters).

ALTER TABLE hunters_hounds.owners
    ADD COLUMN IF NOT EXISTS public_feature_consent BOOLEAN,
    ADD COLUMN IF NOT EXISTS public_feature_consent_recorded_at TIMESTAMPTZ;

COMMENT ON COLUMN hunters_hounds.owners.public_feature_consent IS
    'Client''s own answer to: may your dog appear in our public videos (including AI-voiced ones) and have a profile page on the website? NULL = never answered. Only meaningful when photo_sharing_consent is also true.';
