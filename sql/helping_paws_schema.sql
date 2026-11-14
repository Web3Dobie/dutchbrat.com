CREATE SCHEMA IF NOT EXISTS helping_paws;

-- Trial participants
CREATE TABLE IF NOT EXISTS helping_paws.participants (
  id           SERIAL PRIMARY KEY,
  username     VARCHAR(50) UNIQUE NOT NULL,
  password     VARCHAR(255) NOT NULL,
  display_name VARCHAR(100) NOT NULL,
  email        VARCHAR(255),
  hh_owner_id  INTEGER,  -- soft link to hunters_hounds.owners.id for personalised dog videos
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Rescue centres
CREATE TABLE IF NOT EXISTS helping_paws.shelters (
  id               SERIAL PRIMARY KEY,
  name             VARCHAR(150) NOT NULL,
  location         VARCHAR(150),
  social_media_url TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- Individual animals (dogs and cats — V2 ready via animal_type)
CREATE TABLE IF NOT EXISTS helping_paws.animals (
  id          SERIAL PRIMARY KEY,
  shelter_id  INTEGER NOT NULL REFERENCES helping_paws.shelters(id),
  name        VARCHAR(100) NOT NULL,
  animal_type VARCHAR(10) NOT NULL DEFAULT 'dog' CHECK (animal_type IN ('dog', 'cat')),
  photo_url   TEXT,
  bio         TEXT,
  status      VARCHAR(20) NOT NULL DEFAULT 'available'
                CHECK (status IN ('available', 'adopted', 'fostered', 'unavailable', 'deceased')),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Which animal a participant has chosen (one active animal per participant)
CREATE TABLE IF NOT EXISTS helping_paws.participant_animals (
  id             SERIAL PRIMARY KEY,
  participant_id INTEGER NOT NULL REFERENCES helping_paws.participants(id),
  animal_id      INTEGER NOT NULL REFERENCES helping_paws.animals(id),
  chosen_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(participant_id)
);

-- Daily step logs (one row per participant per day; upsert on re-submit)
CREATE TABLE IF NOT EXISTS helping_paws.step_contributions (
  id             SERIAL PRIMARY KEY,
  participant_id INTEGER NOT NULL REFERENCES helping_paws.participants(id),
  shelter_id     INTEGER NOT NULL REFERENCES helping_paws.shelters(id),
  log_date       DATE NOT NULL,
  steps          INTEGER NOT NULL CHECK (steps >= 0),
  tier           VARCHAR(10) NOT NULL CHECK (tier IN ('bronze', 'silver', 'gold', 'diamond', 'none')),
  paws_earned    NUMERIC(5,2) NOT NULL DEFAULT 0,
  ads_watched    SMALLINT NOT NULL DEFAULT 0 CHECK (ads_watched IN (0, 1, 2)),
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(participant_id, log_date)
);

-- Bowl credits: Wags (dogs) / Purrs (cats) — V2 gaming/IAP, schema ready from day one
CREATE TABLE IF NOT EXISTS helping_paws.bowl_credits (
  id             SERIAL PRIMARY KEY,
  participant_id INTEGER NOT NULL REFERENCES helping_paws.participants(id),
  animal_id      INTEGER NOT NULL REFERENCES helping_paws.animals(id),
  animal_type    VARCHAR(10) NOT NULL CHECK (animal_type IN ('dog', 'cat')),
  amount         NUMERIC(8,2) NOT NULL,
  source         VARCHAR(20) NOT NULL CHECK (source IN ('gaming_ad', 'iap', 'affiliate', 'offerwall')),
  status         VARCHAR(15) NOT NULL DEFAULT 'confirmed'
                   CHECK (status IN ('confirmed', 'pending')),
  reference_id   TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- Weekly shelter package set by Hunter each week (mirrors V2 corporate sponsor model)
CREATE TABLE IF NOT EXISTS helping_paws.weekly_packages (
  id                SERIAL PRIMARY KEY,
  week_start        DATE NOT NULL UNIQUE,
  shelter_id        INTEGER NOT NULL REFERENCES helping_paws.shelters(id),
  items_description TEXT NOT NULL,
  sponsor_name      VARCHAR(150) NOT NULL DEFAULT 'Hunter''s Hounds',
  sponsor_url       TEXT NOT NULL DEFAULT 'https://hunters-hounds.london',
  sponsor_logo_path TEXT,
  dispatch_status   VARCHAR(20) NOT NULL DEFAULT 'pending'
                      CHECK (dispatch_status IN ('pending', 'ordered', 'dispatched', 'delivered')),
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

-- Individual podium prizes awarded to top 3 by weekly paws
CREATE TABLE IF NOT EXISTS helping_paws.podium_prizes (
  id              SERIAL PRIMARY KEY,
  week_start      DATE NOT NULL,
  participant_id  INTEGER NOT NULL REFERENCES helping_paws.participants(id),
  animal_id       INTEGER NOT NULL REFERENCES helping_paws.animals(id),
  rank            SMALLINT NOT NULL CHECK (rank IN (1, 2, 3)),
  prize_label     TEXT NOT NULL,
  dispatch_status VARCHAR(20) NOT NULL DEFAULT 'pending'
                    CHECK (dispatch_status IN ('pending', 'ordered', 'dispatched', 'delivered')),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(week_start, rank)
);

-- Proof-of-delivery log (publicly viewable impact page)
CREATE TABLE IF NOT EXISTS helping_paws.impact_log (
  id                 SERIAL PRIMARY KEY,
  animal_id          INTEGER NOT NULL REFERENCES helping_paws.animals(id),
  weekly_package_id  INTEGER REFERENCES helping_paws.weekly_packages(id),
  items_description  TEXT NOT NULL,
  dispatch_date      DATE NOT NULL,
  delivery_photo_url TEXT,
  social_media_url   TEXT,
  created_at         TIMESTAMPTZ DEFAULT NOW()
);
