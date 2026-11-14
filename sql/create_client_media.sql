-- Create client_media table for storing walk photos/videos
-- Photos are uploaded via FTP, then assigned to clients via admin panel

CREATE TABLE IF NOT EXISTS hunters_hounds.client_media (
    id SERIAL PRIMARY KEY,
    owner_id INTEGER NOT NULL REFERENCES hunters_hounds.owners(id) ON DELETE CASCADE,
    filename VARCHAR(255) NOT NULL UNIQUE,
    file_path VARCHAR(500) NOT NULL,
    media_type VARCHAR(20) NOT NULL CHECK (media_type IN ('image', 'video')),
    file_size BIGINT,
    taken_at TIMESTAMP WITH TIME ZONE,  -- From EXIF or manual entry
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    description TEXT,
    thumbnail_path VARCHAR(500)
);

-- Index for fast lookups by owner
CREATE INDEX IF NOT EXISTS idx_client_media_owner ON hunters_hounds.client_media(owner_id);

-- Index for date-based queries (monthly grouping)
CREATE INDEX IF NOT EXISTS idx_client_media_taken_at ON hunters_hounds.client_media(taken_at);

-- Comment for documentation
COMMENT ON TABLE hunters_hounds.client_media IS 'Stores walk photos and videos for customer viewing in their dashboard';
COMMENT ON COLUMN hunters_hounds.client_media.taken_at IS 'Date photo/video was taken, extracted from EXIF or set manually';
COMMENT ON COLUMN hunters_hounds.client_media.thumbnail_path IS 'Path to generated thumbnail for faster gallery loading';
