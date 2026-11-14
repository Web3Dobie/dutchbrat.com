-- Migration: Normalize service_type values in bookings table
-- Date: 2026-01-22
-- Description: Converts various service_type formats to standardized short IDs
--
-- Current formats being normalized:
--   'Solo Walk (1 hour)', 'Solo Walk (60 min)', 'Solo Walk (120 min)' -> 'solo'
--   'Quick Walk (30 min)', 'Quick Walk' -> 'quick'
--   'Meet & Greet - for new clients', 'Meet & Greet' -> 'meetgreet'
--   'Dog Sitting (Variable)', 'Dog Sitting' -> 'sitting'
--
-- Note: Duration information is preserved in the duration_minutes column

-- First, let's see what we're about to change (preview query)
SELECT
    service_type as current_value,
    CASE
        WHEN LOWER(service_type) LIKE '%solo%' THEN 'solo'
        WHEN LOWER(service_type) LIKE '%quick%' THEN 'quick'
        WHEN LOWER(service_type) LIKE '%meet%' OR LOWER(service_type) LIKE '%greet%' THEN 'meetgreet'
        WHEN LOWER(service_type) LIKE '%sitting%' THEN 'sitting'
        ELSE service_type
    END as new_value,
    COUNT(*) as record_count
FROM hunters_hounds.bookings
WHERE service_type NOT IN ('solo', 'quick', 'meetgreet', 'sitting')
GROUP BY service_type
ORDER BY record_count DESC;

-- Perform the actual migration
-- IMPORTANT: Run the SELECT above first to verify the changes!
-- Then uncomment and run the UPDATE below:

-- BEGIN;

UPDATE hunters_hounds.bookings
SET service_type = CASE
    WHEN LOWER(service_type) LIKE '%solo%' THEN 'solo'
    WHEN LOWER(service_type) LIKE '%quick%' THEN 'quick'
    WHEN LOWER(service_type) LIKE '%meet%' OR LOWER(service_type) LIKE '%greet%' THEN 'meetgreet'
    WHEN LOWER(service_type) LIKE '%sitting%' THEN 'sitting'
    ELSE service_type
END
WHERE service_type NOT IN ('solo', 'quick', 'meetgreet', 'sitting');

-- Verify the results
SELECT service_type, COUNT(*) as count
FROM hunters_hounds.bookings
GROUP BY service_type
ORDER BY count DESC;

-- COMMIT;
