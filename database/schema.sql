-- =============================================================================
-- Jai Bhole Nath — Temple Database Schema
-- MySQL 8.0+
--
-- Design notes:
--   • temples         — core record, one row per temple
--   • temple_details  — 1:1 extension for long text fields (keeps temples lean)
--   • states          — lookup table; 19 states currently in dataset
--   • traditions      — lookup table (Shaiva, Shakti, …)
--   • tags            — deduplicated tag vocabulary; carries optional Hindi name
--   • rituals         — deduplicated ritual vocabulary
--   • festivals       — deduplicated festival vocabulary
--   • temple_tags / temple_rituals / temple_festivals — many-to-many junctions
--   • temple_sources  — one-to-many; each row = one source citation
-- =============================================================================

CREATE DATABASE IF NOT EXISTS jbn_temples
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE jbn_temples;

-- ---------------------------------------------------------------------------
-- 1. Lookup: states
-- ---------------------------------------------------------------------------
CREATE TABLE states (
  id       TINYINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name     VARCHAR(100)     NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_state_name (name)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------------
-- 2. Lookup: traditions  (Shaiva, Shakti, Vaishnava, …)
-- ---------------------------------------------------------------------------
CREATE TABLE traditions (
  id       TINYINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name     VARCHAR(100)     NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_tradition_name (name)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------------
-- 3. Core: temples
-- ---------------------------------------------------------------------------
CREATE TABLE temples (
  -- identity
  id                VARCHAR(120)             NOT NULL,
  mode              ENUM('shiva','shakti')   NOT NULL,

  -- names (en + optional hi for bilingual UI)
  name              VARCHAR(255)             NOT NULL,
  name_hi           VARCHAR(255)             DEFAULT NULL,

  -- location
  state_id          TINYINT UNSIGNED         NOT NULL,
  city              VARCHAR(100)             NOT NULL,
  region            VARCHAR(200)             DEFAULT NULL,

  -- classification
  deity             VARCHAR(200)             NOT NULL,
  tradition_id      TINYINT UNSIGNED         NOT NULL,

  -- narrative
  story             TEXT                     DEFAULT NULL,
  story_hi          TEXT                     DEFAULT NULL,
  highlight         VARCHAR(600)             DEFAULT NULL,
  highlight_hi      VARCHAR(600)             DEFAULT NULL,

  -- media
  image             VARCHAR(500)             DEFAULT NULL,
  image_credit      VARCHAR(200)             DEFAULT NULL,
  image_credit_url  VARCHAR(500)             DEFAULT NULL,

  -- visitor info
  best_time         VARCHAR(200)             DEFAULT NULL,
  timings           VARCHAR(200)             DEFAULT NULL,
  dress_code        VARCHAR(200)             DEFAULT NULL,
  entry_notes       TEXT                     DEFAULT NULL,

  -- provenance / audit
  source_type       VARCHAR(50)              DEFAULT NULL,   -- 'seed', 'api', …
  source_url        VARCHAR(500)             DEFAULT NULL,
  confidence_score  DECIMAL(3,2)             NOT NULL DEFAULT 1.00,
  added_at          DATETIME                 DEFAULT NULL,
  last_verified_at  DATETIME                 DEFAULT NULL,

  -- row timestamps
  created_at        TIMESTAMP                NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        TIMESTAMP                NOT NULL DEFAULT CURRENT_TIMESTAMP
                                             ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),

  -- foreign keys
  CONSTRAINT fk_temple_state
    FOREIGN KEY (state_id)     REFERENCES states(id),
  CONSTRAINT fk_temple_tradition
    FOREIGN KEY (tradition_id) REFERENCES traditions(id),

  -- common filter patterns
  INDEX idx_mode              (mode),
  INDEX idx_state             (state_id),
  INDEX idx_mode_state        (mode, state_id),
  INDEX idx_city              (city),
  INDEX idx_tradition         (tradition_id),
  INDEX idx_confidence        (confidence_score),
  INDEX idx_added_at          (added_at),

  -- full-text search on the fields users search against
  FULLTEXT INDEX ft_name_story (name, story, highlight, deity)

) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- 4. Extension: temple_details  (1:1 with temples; long / sparse text)
-- ---------------------------------------------------------------------------
CREATE TABLE temple_details (
  temple_id         VARCHAR(120)  NOT NULL,

  -- historical & architectural context
  history           TEXT          DEFAULT NULL,
  architecture      TEXT          DEFAULT NULL,
  visitor_notes     TEXT          DEFAULT NULL,

  -- moreDetails.festivals is a free-text narrative, distinct from the
  -- structured festivals array in temple_festivals
  festivals_note    TEXT          DEFAULT NULL,

  -- additional narrative sections (sparse — present in ~30 % of records)
  darshan_info      TEXT          DEFAULT NULL,   -- moreDetails.darshan
  seasonal_info     TEXT          DEFAULT NULL,   -- moreDetails.seasonal
  puranic_view      TEXT          DEFAULT NULL,   -- moreDetails.puranicView
  puranic_sources   TEXT          DEFAULT NULL,   -- moreDetails.puranicSources
  folklore          TEXT          DEFAULT NULL,   -- moreDetails.folklore
  folklore_sources  TEXT          DEFAULT NULL,   -- moreDetails.folkloreSources

  PRIMARY KEY (temple_id),
  CONSTRAINT fk_details_temple
    FOREIGN KEY (temple_id) REFERENCES temples(id) ON DELETE CASCADE

) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- 5. Vocabulary: tags
--    Deduplicated; each unique tag string is one row.
--    Hindi variant stored here so a JOIN is enough for bilingual rendering.
-- ---------------------------------------------------------------------------
CREATE TABLE tags (
  id       SMALLINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name     VARCHAR(150)      NOT NULL,
  name_hi  VARCHAR(150)      DEFAULT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_tag_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- 6. Junction: temple_tags
-- ---------------------------------------------------------------------------
CREATE TABLE temple_tags (
  temple_id   VARCHAR(120)      NOT NULL,
  tag_id      SMALLINT UNSIGNED NOT NULL,
  sort_order  TINYINT UNSIGNED  NOT NULL DEFAULT 0,

  PRIMARY KEY (temple_id, tag_id),
  INDEX idx_tt_tag (tag_id),

  CONSTRAINT fk_tt_temple FOREIGN KEY (temple_id) REFERENCES temples(id) ON DELETE CASCADE,
  CONSTRAINT fk_tt_tag    FOREIGN KEY (tag_id)    REFERENCES tags(id)    ON DELETE CASCADE

) ENGINE=InnoDB;

-- ---------------------------------------------------------------------------
-- 7. Vocabulary: rituals
-- ---------------------------------------------------------------------------
CREATE TABLE rituals (
  id       SMALLINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name     VARCHAR(200)      NOT NULL,
  name_hi  VARCHAR(200)      DEFAULT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_ritual_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- 8. Junction: temple_rituals
-- ---------------------------------------------------------------------------
CREATE TABLE temple_rituals (
  temple_id   VARCHAR(120)      NOT NULL,
  ritual_id   SMALLINT UNSIGNED NOT NULL,
  sort_order  TINYINT UNSIGNED  NOT NULL DEFAULT 0,

  PRIMARY KEY (temple_id, ritual_id),
  INDEX idx_tr_ritual (ritual_id),

  CONSTRAINT fk_tr_temple FOREIGN KEY (temple_id) REFERENCES temples(id) ON DELETE CASCADE,
  CONSTRAINT fk_tr_ritual FOREIGN KEY (ritual_id) REFERENCES rituals(id) ON DELETE CASCADE

) ENGINE=InnoDB;

-- ---------------------------------------------------------------------------
-- 9. Vocabulary: festivals
-- ---------------------------------------------------------------------------
CREATE TABLE festivals (
  id       SMALLINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name     VARCHAR(200)      NOT NULL,
  name_hi  VARCHAR(200)      DEFAULT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_festival_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- 10. Junction: temple_festivals
-- ---------------------------------------------------------------------------
CREATE TABLE temple_festivals (
  temple_id   VARCHAR(120)      NOT NULL,
  festival_id SMALLINT UNSIGNED NOT NULL,
  sort_order  TINYINT UNSIGNED  NOT NULL DEFAULT 0,

  PRIMARY KEY (temple_id, festival_id),
  INDEX idx_tf_festival (festival_id),

  CONSTRAINT fk_tf_temple   FOREIGN KEY (temple_id)   REFERENCES temples(id)   ON DELETE CASCADE,
  CONSTRAINT fk_tf_festival FOREIGN KEY (festival_id) REFERENCES festivals(id) ON DELETE CASCADE

) ENGINE=InnoDB;

-- ---------------------------------------------------------------------------
-- 11. Sources  (moreDetails.sources — array of citation objects)
--    One row per citation; temples can have multiple sources.
-- ---------------------------------------------------------------------------
CREATE TABLE temple_sources (
  id          INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  temple_id   VARCHAR(120)  NOT NULL,
  label       VARCHAR(300)  NOT NULL,
  url         VARCHAR(500)  NOT NULL,
  source_type VARCHAR(50)   DEFAULT NULL,   -- 'Encyclopedia', 'Official', 'Research', …
  sort_order  TINYINT UNSIGNED NOT NULL DEFAULT 0,

  PRIMARY KEY (id),
  INDEX idx_ts_temple (temple_id),

  CONSTRAINT fk_ts_temple FOREIGN KEY (temple_id) REFERENCES temples(id) ON DELETE CASCADE

) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- =============================================================================
-- USEFUL VIEWS
-- =============================================================================

-- Flat view joining most-used columns — handy for reports and exports
CREATE OR REPLACE VIEW v_temples_flat AS
SELECT
  t.id,
  t.mode,
  t.name,
  t.name_hi,
  s.name        AS state,
  t.city,
  t.region,
  t.deity,
  tr.name       AS tradition,
  t.story,
  t.highlight,
  t.image,
  t.best_time,
  t.timings,
  t.dress_code,
  t.entry_notes,
  t.confidence_score,
  t.added_at,
  t.last_verified_at
FROM temples t
JOIN states     s  ON s.id  = t.state_id
JOIN traditions tr ON tr.id = t.tradition_id;


-- =============================================================================
-- EXAMPLE QUERIES
-- =============================================================================

/*
-- All Shiva temples in Madhya Pradesh
SELECT id, name, city, deity
FROM v_temples_flat
WHERE mode = 'shiva' AND state = 'Madhya Pradesh'
ORDER BY city;

-- Full-text search
SELECT id, name, city, state,
       MATCH(name, story, highlight, deity) AGAINST ('Jyotirlinga' IN NATURAL LANGUAGE MODE) AS score
FROM temples
WHERE MATCH(name, story, highlight, deity) AGAINST ('Jyotirlinga' IN NATURAL LANGUAGE MODE)
ORDER BY score DESC
LIMIT 20;

-- Temples with a specific tag
SELECT t.id, t.name, t.city, s.name AS state
FROM temples t
JOIN states       s   ON s.id   = t.state_id
JOIN temple_tags  tt  ON tt.temple_id = t.id
JOIN tags         tg  ON tg.id  = tt.tag_id
WHERE tg.name = 'Jyotirlinga';

-- Most common tags across all temples
SELECT tg.name, COUNT(*) AS usage_count
FROM tags tg
JOIN temple_tags tt ON tt.tag_id = tg.id
GROUP BY tg.id, tg.name
ORDER BY usage_count DESC
LIMIT 20;

-- Temple with all its sources
SELECT t.name, ts.label, ts.url, ts.source_type
FROM temples t
JOIN temple_sources ts ON ts.temple_id = t.id
WHERE t.id = 'shiva-andhra-pradesh-alampur-sangameshwara-temple';
*/
