-- Add admin response columns to reviews table
-- Run this after create_reviews_table.sql

ALTER TABLE hunters_hounds.reviews
ADD COLUMN IF NOT EXISTS admin_response TEXT,
ADD COLUMN IF NOT EXISTS admin_response_date TIMESTAMP;
