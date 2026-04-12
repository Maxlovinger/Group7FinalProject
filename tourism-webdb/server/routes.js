const { Pool } = require('pg');
const config = require('./config.json');

// ── DB Connection Pool ────────────────────────────────────────────────────────
const pool = new Pool({
  host:     config.host,
  user:     config.user,
  password: config.password,
  port:     config.port,
  database: config.database,
  ssl: { rejectUnauthorized: false },
});

const query = async (sql, params = []) => {
  const client = await pool.connect();
  try {
    const res = await client.query(sql, params);
    return res.rows;
  } finally {
    client.release();
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Route 1  GET /author/:type
// ─────────────────────────────────────────────────────────────────────────────
const author = (req, res) => {
  const type = req.params.type;
  if (type === 'name') {
    res.json({ data: 'Group 7 – Tourism Risk vs Reward Index' });
  } else if (type === 'members') {
    res.json({ data: 'Max Lovinger, Jackie Chen, Eric Gu, Abirami Rathina' });
  } else {
    res.status(400).json({});
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Route 2  GET /top_airports
//   Joins flights → airports to rank destinations by arrival count
//   Query params: page (int)*, page_size (int, default 20)*
// ─────────────────────────────────────────────────────────────────────────────
const topAirports = async (req, res) => {
  const pageSize = req.query.page_size ? parseInt(req.query.page_size) : 20;
  const page     = req.query.page      ? parseInt(req.query.page)      : 1;

  const sql = `
    SELECT
      a.icao_code,
      a.name         AS airport_name,
      a.municipality AS city,
      a.iso_country  AS country_code,
      COUNT(*)       AS arrival_count
    FROM flights f
    JOIN airports a ON f.estarrivalairport = a.icao_code
    WHERE a.municipality IS NOT NULL
      AND a.icao_code IS NOT NULL
    GROUP BY a.icao_code, a.name, a.municipality, a.iso_country
    ORDER BY arrival_count DESC
    LIMIT $1 OFFSET $2
  `;

  try {
    const rows = await query(sql, [pageSize, (page - 1) * pageSize]);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Route 3  GET /flight_stats
//   Aggregate stats from the flights table
// ─────────────────────────────────────────────────────────────────────────────
const flightStats = async (req, res) => {
  const sql = `
    SELECT
      COUNT(*)                              AS total_flights,
      COUNT(DISTINCT estarrivalairport)     AS unique_arrival_airports,
      COUNT(DISTINCT estdepartureairport)   AS unique_departure_airports,
      COUNT(DISTINCT icao24)                AS unique_aircraft
    FROM flights
  `;

  try {
    const rows = await query(sql);
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Route 4  GET /conflict_summary
//   Joins acled_weekly_events → acled_source_area
//   Query params: year (int)*, country (string)*
// ─────────────────────────────────────────────────────────────────────────────
const conflictSummary = async (req, res) => {
  const year    = req.query.year    ? parseInt(req.query.year) : null;
  const country = req.query.country ?? null;

  const conditions = [];
  const params = [];

  if (year) {
    params.push(year);
    conditions.push(`EXTRACT(YEAR FROM e.week) = $${params.length}`);
  }
  if (country) {
    params.push(`%${country.toLowerCase()}%`);
    conditions.push(`LOWER(s.country) ILIKE $${params.length}`);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const sql = `
    SELECT
      s.country,
      s.region,
      EXTRACT(YEAR FROM e.week)::INT  AS year,
      SUM(e.events)                   AS total_events,
      SUM(e.fatalities)               AS total_fatalities,
      SUM(e.population_exposure)      AS total_exposure
    FROM acled_weekly_events e
    JOIN acled_source_area s ON e.source_area_id = s.source_area_id
    ${whereClause}
    GROUP BY s.country, s.region, year
    ORDER BY total_fatalities DESC
    LIMIT 50
  `;

  try {
    const rows = await query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Route 5  GET /top_conflict_countries
//   Top N most conflict-affected countries all time
//   Query params: limit (int, default 20)*
// ─────────────────────────────────────────────────────────────────────────────
const topConflictCountries = async (req, res) => {
  const limit = req.query.limit ? parseInt(req.query.limit) : 20;

  const sql = `
    SELECT
      s.country,
      s.region,
      SUM(e.events)                                       AS total_events,
      SUM(e.fatalities)                                   AS total_fatalities,
      COUNT(DISTINCT EXTRACT(YEAR FROM e.week))           AS years_with_conflict
    FROM acled_weekly_events e
    JOIN acled_source_area s ON e.source_area_id = s.source_area_id
    GROUP BY s.country, s.region
    ORDER BY total_fatalities DESC
    LIMIT $1
  `;

  try {
    const rows = await query(sql, [limit]);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Route 6  GET /countries
//   Returns all countries from the countries table
// ─────────────────────────────────────────────────────────────────────────────
const countries = async (req, res) => {
  const sql = `
    SELECT iso_code, country_name
    FROM countries
    ORDER BY country_name ASC
  `;

  try {
    const rows = await query(sql);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Route 7  GET /search_airports
//   Search airports by country code or city name
//   Query params: country_code (string)*, city (string)*, page_size (int)*
// ─────────────────────────────────────────────────────────────────────────────
const searchAirports = async (req, res) => {
  const countryCode = req.query.country_code ?? '';
  const city        = req.query.city         ?? '';
  const pageSize    = req.query.page_size ? parseInt(req.query.page_size) : 20;
  const page        = req.query.page      ? parseInt(req.query.page)      : 1;

  const sql = `
    SELECT
      a.icao_code,
      a.name         AS airport_name,
      a.municipality AS city,
      a.iso_country  AS country_code,
      a.type,
      a.latitude_deg,
      a.longitude_deg
    FROM airports a
    WHERE LOWER(a.iso_country)  ILIKE $1
      AND LOWER(a.municipality) ILIKE $2
      AND a.icao_code IS NOT NULL
    ORDER BY a.name ASC
    LIMIT $3 OFFSET $4
  `;

  try {
    const rows = await query(sql, [
      `%${countryCode.toLowerCase()}%`,
      `%${city.toLowerCase()}%`,
      pageSize,
      (page - 1) * pageSize,
    ]);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Route 8  GET /conflict_by_event_type
//   Breakdown of conflict events by event type for a given country
//   Query params: country (string, required), year (int)*
// ─────────────────────────────────────────────────────────────────────────────
const conflictByEventType = async (req, res) => {
  const country = req.query.country ?? '';
  const year    = req.query.year ? parseInt(req.query.year) : null;

  const params = [`%${country.toLowerCase()}%`];
  const yearFilter = year
    ? (() => { params.push(year); return `AND EXTRACT(YEAR FROM e.week) = $${params.length}`; })()
    : '';

  const sql = `
    SELECT
      e.event_type,
      SUM(e.events)      AS total_events,
      SUM(e.fatalities)  AS total_fatalities
    FROM acled_weekly_events e
    JOIN acled_source_area s ON e.source_area_id = s.source_area_id
    WHERE LOWER(s.country) ILIKE $1
    ${yearFilter}
    GROUP BY e.event_type
    ORDER BY total_events DESC
  `;

  try {
    const rows = await query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Route 9  GET /flights_by_country
//   Counts flight arrivals grouped by destination country
//   Query params: page (int)*, page_size (int, default 20)*
// ─────────────────────────────────────────────────────────────────────────────
const flightsByCountry = async (req, res) => {
  const pageSize = req.query.page_size ? parseInt(req.query.page_size) : 20;
  const page     = req.query.page      ? parseInt(req.query.page)      : 1;

  const sql = `
    SELECT
      c.country_name,
      a.iso_country      AS iso_code,
      COUNT(*)           AS arrival_count
    FROM flights f
    JOIN airports a  ON f.estarrivalairport = a.icao_code
    LEFT JOIN countries c ON TRIM(a.iso_country) = TRIM(c.iso_code)
    WHERE a.iso_country IS NOT NULL
    GROUP BY c.country_name, a.iso_country
    ORDER BY arrival_count DESC
    LIMIT $1 OFFSET $2
  `;

  try {
    const rows = await query(sql, [pageSize, (page - 1) * pageSize]);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────

module.exports = {
  author,
  topAirports,
  flightStats,
  conflictSummary,
  topConflictCountries,
  countries,
  searchAirports,
  conflictByEventType,
  flightsByCountry,
};