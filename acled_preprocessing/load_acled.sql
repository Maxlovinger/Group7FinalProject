-- ACLED data — BCNF / 3NF load (Group 7, CIS 5500)
--
-- Schema (Boyce-Codd normal form):
--   acled_country         PK(country)  — ACLED label -> World Bank `country_wdi`
--   acled_source_area     PK(source_area_id)  — geography; FK -> acled_country
--   acled_weekly_events   PK(week, source_area_id, event_type, sub_event_type); FK -> acled_source_area
--
-- Rationale: Storing country + country_wdi on every event row duplicates FD country -> country_wdi.
-- Storing geo columns on every event row duplicates FD source_area_id -> region, country, admin1, ...
--
-- Load order: country -> source_area -> weekly_events (FKs).
--
-- From project root in psql:
--   \i acled_preprocessing/load_acled.sql

CREATE TABLE IF NOT EXISTS acled_country (
  country VARCHAR(160) PRIMARY KEY,
  country_wdi VARCHAR(160) NOT NULL
);

CREATE TABLE IF NOT EXISTS acled_source_area (
  source_area_id BIGINT PRIMARY KEY,
  region VARCHAR(40) NOT NULL,
  country VARCHAR(160) NOT NULL REFERENCES acled_country (country),
  admin1 VARCHAR(200) NOT NULL,
  centroid_latitude NUMERIC(10, 6) NOT NULL,
  centroid_longitude NUMERIC(10, 6) NOT NULL,
  ddl_table_key VARCHAR(64) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_acled_source_area_country ON acled_source_area (country);
CREATE INDEX IF NOT EXISTS idx_acled_source_area_ddl ON acled_source_area (ddl_table_key);

CREATE TABLE IF NOT EXISTS acled_weekly_events (
  week DATE NOT NULL,
  source_area_id BIGINT NOT NULL REFERENCES acled_source_area (source_area_id),
  event_type VARCHAR(80) NOT NULL,
  sub_event_type VARCHAR(160) NOT NULL,
  events INT NOT NULL,
  fatalities INT NOT NULL,
  population_exposure DOUBLE PRECISION,
  disorder_type VARCHAR(200),
  PRIMARY KEY (week, source_area_id, event_type, sub_event_type)
);

CREATE INDEX IF NOT EXISTS idx_acled_weekly_events_area_week ON acled_weekly_events (source_area_id, week);
CREATE INDEX IF NOT EXISTS idx_acled_weekly_events_week ON acled_weekly_events (week);

-- Example COPY (paths relative to psql working directory = project root):
/*
\copy acled_country FROM 'acled_preprocessing/output/acled_country.csv' WITH (FORMAT csv, HEADER true, NULL '');
\copy acled_source_area FROM 'acled_preprocessing/output/acled_source_area.csv' WITH (FORMAT csv, HEADER true, NULL '');
\copy acled_weekly_events FROM 'acled_preprocessing/output/acled_weekly_events.csv' WITH (FORMAT csv, HEADER true, NULL '');
*/

-- Denormalized export for debugging only (not loaded here): acled_denormalized_joined.csv
-- Regional fact slices (same columns as acled_weekly_events): acled_preprocessing/output/by_ddl_table/*.csv
