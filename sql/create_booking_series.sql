-- Migration: Create booking_series table and modify bookings table for recurring bookings
-- Run this migration to enable recurring booking functionality

-- ============================================================================
-- 1. Create the booking_series table
-- ============================================================================
CREATE TABLE IF NOT EXISTS hunters_hounds.booking_series (
    id SERIAL PRIMARY KEY,
    owner_id INTEGER NOT NULL REFERENCES hunters_hounds.owners(id),
    dog_id_1 INTEGER NOT NULL REFERENCES hunters_hounds.dogs(id),
    dog_id_2 INTEGER REFERENCES hunters_hounds.dogs(id),
    service_type VARCHAR(100) NOT NULL,
    duration_minutes INTEGER,
    secondary_address_id INTEGER REFERENCES hunters_hounds.secondary_addresses(id),

    -- Recurrence pattern configuration
    recurrence_pattern VARCHAR(20) NOT NULL, -- 'weekly', 'biweekly', 'custom'
    days_of_week INTEGER[], -- For custom: [1,3,5] = Mon,Wed,Fri (ISO weekday: 1=Mon, 7=Sun)
    preferred_time TIME NOT NULL,

    -- Series date range and stats
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    total_requested INTEGER NOT NULL DEFAULT 0,
    total_booked INTEGER NOT NULL DEFAULT 0,
    total_skipped INTEGER NOT NULL DEFAULT 0,

    -- Series status management
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'paused', 'cancelled', 'completed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    notes TEXT
);

-- Add comments for documentation
COMMENT ON TABLE hunters_hounds.booking_series IS 'Stores recurring booking series configurations';
COMMENT ON COLUMN hunters_hounds.booking_series.recurrence_pattern IS 'weekly = every week, biweekly = every 2 weeks, custom = specific days';
COMMENT ON COLUMN hunters_hounds.booking_series.days_of_week IS 'ISO weekday numbers: 1=Monday through 7=Sunday. Used for custom patterns.';
COMMENT ON COLUMN hunters_hounds.booking_series.status IS 'active = ongoing series, paused = temporarily stopped, cancelled = all remaining cancelled, completed = series ended';

-- ============================================================================
-- 2. Modify the bookings table to link to series
-- ============================================================================
-- Add series_id column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'hunters_hounds'
        AND table_name = 'bookings'
        AND column_name = 'series_id'
    ) THEN
        ALTER TABLE hunters_hounds.bookings
        ADD COLUMN series_id INTEGER REFERENCES hunters_hounds.booking_series(id);
    END IF;
END $$;

-- Add series_index column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'hunters_hounds'
        AND table_name = 'bookings'
        AND column_name = 'series_index'
    ) THEN
        ALTER TABLE hunters_hounds.bookings
        ADD COLUMN series_index INTEGER;
    END IF;
END $$;

-- ============================================================================
-- 3. Create indexes for efficient queries
-- ============================================================================
-- Index for finding all bookings in a series
CREATE INDEX IF NOT EXISTS idx_bookings_series_id ON hunters_hounds.bookings(series_id);

-- Index for finding series by owner
CREATE INDEX IF NOT EXISTS idx_booking_series_owner_id ON hunters_hounds.booking_series(owner_id);

-- Index for finding active series
CREATE INDEX IF NOT EXISTS idx_booking_series_status ON hunters_hounds.booking_series(status);

-- Composite index for finding active series by owner
CREATE INDEX IF NOT EXISTS idx_booking_series_owner_status ON hunters_hounds.booking_series(owner_id, status);

-- ============================================================================
-- 4. Add comments for the new columns
-- ============================================================================
COMMENT ON COLUMN hunters_hounds.bookings.series_id IS 'Links to booking_series if this is part of a recurring booking';
COMMENT ON COLUMN hunters_hounds.bookings.series_index IS 'Position of this booking within the series (1, 2, 3, etc.)';

-- ============================================================================
-- Verification query (optional - run to verify migration)
-- ============================================================================
-- SELECT
--     table_name,
--     column_name,
--     data_type
-- FROM information_schema.columns
-- WHERE table_schema = 'hunters_hounds'
-- AND table_name IN ('booking_series', 'bookings')
-- AND column_name IN ('series_id', 'series_index', 'recurrence_pattern', 'days_of_week')
-- ORDER BY table_name, ordinal_position;
