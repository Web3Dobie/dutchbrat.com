-- Add extended_travel_time column to owners table
-- Clients outside the normal catchment area need 30 minutes travel time instead of 15 minutes

ALTER TABLE hunters_hounds.owners
ADD COLUMN extended_travel_time BOOLEAN DEFAULT false;

-- Add a comment to explain the column
COMMENT ON COLUMN hunters_hounds.owners.extended_travel_time IS
    'If true, 30 min travel buffer is used instead of standard 15 min. For clients outside catchment area.';
