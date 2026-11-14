-- Hunter's Hounds Review System
-- Run this SQL to create the reviews table

CREATE TABLE hunters_hounds.reviews (
    id SERIAL PRIMARY KEY,
    booking_id INT REFERENCES hunters_hounds.bookings(id) NOT NULL UNIQUE,
    owner_id INT REFERENCES hunters_hounds.owners(id) NOT NULL,
    review_token UUID DEFAULT gen_random_uuid() NOT NULL UNIQUE,
    rating INT CHECK (rating >= 1 AND rating <= 5),
    review_text TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    submitted_at TIMESTAMP  -- NULL until customer submits
);

-- Indexes for performance
CREATE INDEX idx_reviews_token ON hunters_hounds.reviews(review_token);
CREATE INDEX idx_reviews_submitted ON hunters_hounds.reviews(submitted_at) WHERE submitted_at IS NOT NULL;
CREATE INDEX idx_reviews_booking_id ON hunters_hounds.reviews(booking_id);

-- Grant permissions (adjust as needed for your setup)
GRANT SELECT, INSERT, UPDATE ON hunters_hounds.reviews TO hunter_admin;
GRANT USAGE, SELECT ON SEQUENCE hunters_hounds.reviews_id_seq TO hunter_admin;
