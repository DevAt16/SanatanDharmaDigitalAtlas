-- =============================================================================
-- Jai Bhole Nath — Temple Database Schema (v3)
-- MySQL 8.0+ / MariaDB 10.6+
--
-- Single-table design:
--   • one row per temple
--   • multi-value fields stored as JSON arrays/objects
-- =============================================================================

CREATE DATABASE IF NOT EXISTS jbn_temples
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE jbn_temples;

CREATE TABLE IF NOT EXISTS temples (
  -- identity
  id                   BIGINT UNSIGNED          NOT NULL AUTO_INCREMENT,
  slug                 VARCHAR(255)             NOT NULL,
  mode                 ENUM('shiva', 'shakti')  NOT NULL,

  -- names
  name                 VARCHAR(255)             NOT NULL,
  name_hi              VARCHAR(255)             DEFAULT NULL,

  -- location
  state                VARCHAR(100)             NOT NULL,
  city                 VARCHAR(150)             NOT NULL,
  region               VARCHAR(255)             DEFAULT NULL,

  -- classification
  deity                VARCHAR(255)             NOT NULL,
  tradition            VARCHAR(100)             DEFAULT NULL,

  -- narrative
  story                TEXT                     DEFAULT NULL,
  story_hi             TEXT                     DEFAULT NULL,
  highlight            VARCHAR(700)             DEFAULT NULL,
  highlight_hi         VARCHAR(700)             DEFAULT NULL,

  -- media
  image                VARCHAR(500)             DEFAULT NULL,
  image_credit         VARCHAR(200)             DEFAULT NULL,
  image_credit_url     VARCHAR(500)             DEFAULT NULL,

  -- visitor info
  best_time            VARCHAR(255)             DEFAULT NULL,
  timings              VARCHAR(255)             DEFAULT NULL,
  dress_code           VARCHAR(255)             DEFAULT NULL,
  entry_notes          TEXT                     DEFAULT NULL,

  -- list-like fields
  tags_json            JSON                     DEFAULT NULL,
  rituals_json         JSON                     DEFAULT NULL,
  festivals_json       JSON                     DEFAULT NULL,

  -- long/sparse details
  history              TEXT                     DEFAULT NULL,
  architecture         TEXT                     DEFAULT NULL,
  visitor_notes        TEXT                     DEFAULT NULL,
  festivals_note       TEXT                     DEFAULT NULL,
  darshan_info         TEXT                     DEFAULT NULL,
  seasonal_info        TEXT                     DEFAULT NULL,
  puranic_view         TEXT                     DEFAULT NULL,
  folklore             TEXT                     DEFAULT NULL,
  puranic_sources_json JSON                     DEFAULT NULL,
  folklore_sources_json JSON                    DEFAULT NULL,
  sources_json         JSON                     DEFAULT NULL,

  -- provenance / audit
  schema_version       SMALLINT UNSIGNED        NOT NULL DEFAULT 3,
  source_type          VARCHAR(100)             DEFAULT NULL,
  source_title         VARCHAR(300)             DEFAULT NULL,
  source_url           VARCHAR(500)             DEFAULT NULL,
  verification_status  ENUM('verified', 'sourced', 'candidate')
                                               NOT NULL DEFAULT 'candidate',
  confidence           ENUM('high', 'medium', 'low')
                                               NOT NULL DEFAULT 'low',
  confidence_score     DECIMAL(4,3)             NOT NULL DEFAULT 0.500,
  added_at             TIMESTAMP                NULL DEFAULT NULL,
  last_verified_at     TIMESTAMP                NULL DEFAULT NULL,
  is_new               BOOLEAN                  NOT NULL DEFAULT FALSE,

  -- row timestamps
  created_at           TIMESTAMP                NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at           TIMESTAMP                NOT NULL DEFAULT CURRENT_TIMESTAMP
                                                ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  UNIQUE KEY uq_temple_slug (slug),
  UNIQUE KEY uq_temple_exact (mode, state, city, name),

  INDEX idx_mode                 (mode),
  INDEX idx_state                (state),
  INDEX idx_mode_state           (mode, state),
  INDEX idx_mode_state_city      (mode, state, city),
  INDEX idx_city                 (city),
  INDEX idx_tradition            (tradition),
  INDEX idx_mode_added_id        (mode, added_at, id),
  INDEX idx_verification         (verification_status, confidence),
  INDEX idx_confidence_score     (confidence_score),
  INDEX idx_last_verified        (last_verified_at),

  FULLTEXT INDEX ft_temple_search (
    name,
    story,
    highlight,
    deity,
    city,
    region,
    tradition
  ),

  CONSTRAINT chk_confidence_score_range
    CHECK (confidence_score >= 0.000 AND confidence_score <= 1.000)

) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
