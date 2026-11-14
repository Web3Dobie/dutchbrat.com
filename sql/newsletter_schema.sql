-- Newsletter Schema Migration
-- Run this against the hunters_hounds schema

-- 1. Add newsletter fields to owners table
ALTER TABLE hunters_hounds.owners
ADD COLUMN IF NOT EXISTS newsletter_subscribed BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS newsletter_unsubscribe_token UUID DEFAULT gen_random_uuid();

-- Update existing owners to have unsubscribe tokens
UPDATE hunters_hounds.owners
SET newsletter_unsubscribe_token = gen_random_uuid()
WHERE newsletter_unsubscribe_token IS NULL;

-- 2. Create newsletters table for storing draft and sent newsletters
CREATE TABLE IF NOT EXISTS hunters_hounds.newsletters (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    content_json JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    sent_at TIMESTAMP,
    recipient_count INTEGER DEFAULT 0
);

-- 3. Create newsletter_history table for tracking sent emails
CREATE TABLE IF NOT EXISTS hunters_hounds.newsletter_history (
    id SERIAL PRIMARY KEY,
    newsletter_id INTEGER REFERENCES hunters_hounds.newsletters(id) ON DELETE CASCADE,
    owner_id INTEGER REFERENCES hunters_hounds.owners(id) ON DELETE CASCADE,
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    email_status VARCHAR(50) DEFAULT 'sent'
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_newsletter_history_newsletter_id
ON hunters_hounds.newsletter_history(newsletter_id);

CREATE INDEX IF NOT EXISTS idx_newsletter_history_owner_id
ON hunters_hounds.newsletter_history(owner_id);

CREATE INDEX IF NOT EXISTS idx_owners_newsletter_subscribed
ON hunters_hounds.owners(newsletter_subscribed)
WHERE newsletter_subscribed = true;

-- Verify the changes
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_schema = 'hunters_hounds'
AND table_name = 'owners'
AND column_name IN ('newsletter_subscribed', 'newsletter_unsubscribe_token');
