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

// ── Tiny in-memory cache (TTL ms) ─────────────────────────────────────────────
// Used to demonstrate "after-optimization" timings for complex queries in the
// final report (caching is one of the optimization techniques the rubric asks
// you to discuss).
const _cache = new Map();
const cached = async (key, ttlMs, loader) => {
  const hit = _cache.get(key);
  if (hit && hit.expires > Date.now()) return hit.value;
  const value = await loader();
  _cache.set(key, { value, expires: Date.now() + ttlMs });
  return value;
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
    ORDER BY total_fatalities DESC, year ASC
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
// Route 10  GET /risk_reward_score          (COMPLEX — Query 8)
//   Min-max normalizes GDP per capita and ACLED fatalities across all
//   country-years, then computes risk_reward_score = norm_gdp - norm_fat.
//   Used by the Risk vs. Reward Index Builder page.
// ─────────────────────────────────────────────────────────────────────────────
const riskRewardScore = async (req, res) => {
  const year = req.query.year ? parseInt(req.query.year) : null;
  const country = req.query.country ?? null;
  const limit = req.query.limit ? parseInt(req.query.limit) : 100;

  const filters = [];
  const params = [];

  if (year) {
    params.push(year);
    filters.push(`m.year = $${params.length}`);
  }

  if (country) {
    params.push(country.trim());
    filters.push(`LOWER(TRIM(m.country)) = LOWER(TRIM($${params.length}))`);
  }

  const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';

  params.push(limit);
  const limitIdx = params.length;

  const cacheKey = `risk_reward:${year}:${country}:${limit}`;

  const sql = `
    WITH conflict AS (
      SELECT
        LOWER(TRIM(ac.country_wdi)) AS country_key,
        EXTRACT(YEAR FROM e.week)::INT AS year,
        SUM(e.events) AS total_events,
        SUM(e.fatalities) AS total_fatalities
      FROM acled_weekly_events e
      JOIN acled_source_area s ON e.source_area_id = s.source_area_id
      JOIN acled_country ac ON s.country = ac.country
      GROUP BY LOWER(TRIM(ac.country_wdi)), EXTRACT(YEAR FROM e.week)
    ),
    country_metrics AS (
      SELECT
        w.country,
        EXTRACT(YEAR FROM w.date)::INT AS year,
        ROUND((w."GDP_current_US" / NULLIF(w.population, 0))::NUMERIC, 2) AS gdp_per_capita,
        COALESCE(c.total_events, 0) AS total_events,
        COALESCE(c.total_fatalities, 0) AS total_fatalities
      FROM world_bank_gdp w
      LEFT JOIN conflict c
        ON LOWER(TRIM(w.country)) = c.country_key
       AND EXTRACT(YEAR FROM w.date)::INT = c.year
      WHERE w."GDP_current_US" IS NOT NULL
        AND w.population IS NOT NULL
    ),
    stats AS (
      SELECT
        MIN(gdp_per_capita) AS min_gdp_pc,
        MAX(gdp_per_capita) AS max_gdp_pc,
        MIN(total_fatalities) AS min_fat,
        MAX(total_fatalities) AS max_fat
      FROM country_metrics
    )
    SELECT
      m.country,
      m.year,
      m.gdp_per_capita,
      m.total_events,
      m.total_fatalities,
      ROUND(
        (
          (m.gdp_per_capita - s.min_gdp_pc)::NUMERIC
          / NULLIF((s.max_gdp_pc - s.min_gdp_pc)::NUMERIC, 0)
        )
        -
        (
          (m.total_fatalities - s.min_fat)::NUMERIC
          / NULLIF((s.max_fat - s.min_fat)::NUMERIC, 0)
        ),
        4
      ) AS risk_reward_score
    FROM country_metrics m
    CROSS JOIN stats s
    ${where}
    ORDER BY risk_reward_score DESC NULLS LAST
    LIMIT $${limitIdx}
  `;

  try {
    const rows = await cached(cacheKey, 60_000, () => query(sql, params));
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Route 11  GET /recovery_timeline          (COMPLEX — Query 4)
//   Identifies each country's peak conflict year and the first post-peak year
//   in which fatalities returned to a 3-year pre-conflict baseline.
//   Used by the Post-Conflict Recovery page.
// ─────────────────────────────────────────────────────────────────────────────
const recoveryTimeline = async (req, res) => {
  const country = req.query.country ?? null;

  const params = [];
  let countryClause = '';
  if (country) {
    params.push(`%${country.toLowerCase()}%`);
    countryClause = `AND LOWER(country) ILIKE $${params.length}`;
  }

  const cacheKey = `recovery:${country}`;
  const sql = `
    WITH yearly_conflict AS (
      SELECT
        s.country,
        EXTRACT(YEAR FROM e.week)::INT AS year,
        SUM(e.fatalities) AS yearly_fatalities,
        SUM(e.events)     AS yearly_events
      FROM acled_weekly_events e
      JOIN acled_source_area s ON e.source_area_id = s.source_area_id
      GROUP BY s.country, year
    ),
    peak_years AS (
      SELECT country, year AS peak_year, yearly_fatalities AS peak_fatalities
      FROM yearly_conflict yc
      WHERE yearly_fatalities = (
        SELECT MAX(yearly_fatalities) FROM yearly_conflict yc2 WHERE yc2.country = yc.country
      )
    ),
    pre_conflict_baseline AS (
      SELECT p.country, p.peak_year, p.peak_fatalities,
             AVG(yc.yearly_fatalities) AS baseline_fatalities
      FROM peak_years p
      JOIN yearly_conflict yc ON yc.country = p.country
      WHERE yc.year BETWEEN p.peak_year - 3 AND p.peak_year - 1
      GROUP BY p.country, p.peak_year, p.peak_fatalities
    ),
    recovery AS (
      SELECT b.country, b.peak_year, b.peak_fatalities, b.baseline_fatalities,
             MIN(yc.year) AS recovery_year
      FROM pre_conflict_baseline b
      JOIN yearly_conflict yc ON yc.country = b.country
      WHERE yc.year > b.peak_year
        AND yc.yearly_fatalities <= b.baseline_fatalities
      GROUP BY b.country, b.peak_year, b.peak_fatalities, b.baseline_fatalities
    )
    SELECT
      country,
      peak_year,
      ROUND(peak_fatalities::NUMERIC, 0)      AS peak_fatalities,
      ROUND(baseline_fatalities::NUMERIC, 1)  AS pre_conflict_avg_fatalities,
      recovery_year,
      recovery_year - peak_year               AS years_to_recovery
    FROM recovery
    WHERE recovery_year IS NOT NULL
      ${countryClause}
    ORDER BY years_to_recovery ASC
  `;

  try {
    const rows = await cached(cacheKey, 60_000, () => query(sql, params));
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Route 12  GET /travel_corridors           (COMPLEX — Query 5)
//   Busiest international country-to-country flight corridors with each
//   corridor's share of all international flights (window function).
// ─────────────────────────────────────────────────────────────────────────────
const travelCorridors = async (req, res) => {
  const limit = req.query.limit ? parseInt(req.query.limit) : 25;

  const cacheKey = `corridors:${limit}`;
  const sql = `
    WITH departure_countries AS (
      SELECT
        f.icao24, f.firstseen,
        f.estdepartureairport, f.estarrivalairport,
        dep.iso_country  AS departure_country,
        dep.municipality AS departure_city
      FROM flights f
      JOIN airports dep ON f.estdepartureairport = dep.icao_code
      WHERE dep.iso_country IS NOT NULL
    ),
    corridor_counts AS (
      SELECT
        dc.departure_country,
        arr.iso_country                                     AS arrival_country,
        dep_c.country_name                                  AS departure_country_name,
        arr_c.country_name                                  AS arrival_country_name,
        COUNT(*)                                            AS flight_count,
        COUNT(DISTINCT dc.estdepartureairport)              AS unique_departure_airports,
        COUNT(DISTINCT dc.estarrivalairport)                AS unique_arrival_airports
      FROM departure_countries dc
      JOIN airports arr ON dc.estarrivalairport = arr.icao_code
      LEFT JOIN countries dep_c ON TRIM(dc.departure_country) = TRIM(dep_c.iso_code)
      LEFT JOIN countries arr_c ON TRIM(arr.iso_country)      = TRIM(arr_c.iso_code)
      WHERE arr.iso_country IS NOT NULL
        AND dc.departure_country <> arr.iso_country
      GROUP BY dc.departure_country, arr.iso_country, dep_c.country_name, arr_c.country_name
    )
    SELECT
      departure_country_name AS from_country,
      arrival_country_name   AS to_country,
      departure_country      AS from_iso,
      arrival_country        AS to_iso,
      flight_count,
      unique_departure_airports,
      unique_arrival_airports,
      ROUND(flight_count * 100.0 / SUM(flight_count) OVER (), 2)
        AS pct_of_all_international_flights
    FROM corridor_counts
    ORDER BY flight_count DESC
    LIMIT $1
  `;

  try {
    const rows = await cached(cacheKey, 60_000, () => query(sql, [limit]));
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Route 13  GET /city_gdp_context           (COMPLEX — Query 6)
//   Joins city-level GDP with World Bank national GDP. Returns metro GDP,
//   national GDP, and each city's share of national GDP.
// ─────────────────────────────────────────────────────────────────────────────
const cityGdpContext = async (req, res) => {
  const country = req.query.country ?? null;
  const year = req.query.year ? parseInt(req.query.year) : null;

  const conditions = [
    `g."Official est. GDP(billion US$)" IS NOT NULL`,
    `w."GDP_current_US" IS NOT NULL`,
    `w.population IS NOT NULL`,
  ];

  const params = [];

  if (country) {
    params.push(`%${country.toLowerCase()}%`);
    conditions.push(`LOWER(TRIM(g."Country/Region")) ILIKE $${params.length}`);
  }

  if (year) {
    params.push(year);
    conditions.push(`EXTRACT(YEAR FROM w.date)::INT = $${params.length}`);
  }

  const sql = `
    SELECT
      g."Metropolitian Area/City" AS city,
      g."Country/Region" AS country,
      EXTRACT(YEAR FROM w.date)::INT AS year,
      g."Official est. GDP(billion US$)" AS metro_gdp_billion_usd,
      ROUND((w."GDP_current_US" / 1000000000.0)::NUMERIC, 2) AS national_gdp_billion_usd,
      ROUND((w."GDP_current_US" / NULLIF(w.population, 0))::NUMERIC, 2) AS country_gdp_per_capita,
      ROUND(
        (
          g."Official est. GDP(billion US$)"
          / NULLIF((w."GDP_current_US" / 1000000000.0), 0)
        ) * 100,
        2
      ) AS pct_of_national_gdp
    FROM global_cities_gdp g
    JOIN world_bank_gdp_slim w
      ON LOWER(TRIM(g."Country/Region")) = LOWER(TRIM(w.country))
    WHERE ${conditions.join(' AND ')}
    ORDER BY pct_of_national_gdp DESC
    LIMIT 200
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
// Route 14  GET /busiest_airports_by_country  (SIMPLE — Query 7)
// ─────────────────────────────────────────────────────────────────────────────
const busiestAirportsByCountry = async (req, res) => {
  const country = req.query.country ?? null;

  const params = [];
  let outerWhere = `WHERE rn = 1`;
  if (country) {
    params.push(country.toLowerCase());
    outerWhere = `WHERE rn = 1 AND LOWER(country_code) = $${params.length}`;
  }

  const sql = `
    WITH airport_traffic AS (
      SELECT
        c.country_name,
        a.iso_country  AS country_code,
        a.name         AS airport_name,
        a.municipality AS city,
        COUNT(*)       AS incoming_flights
      FROM flights f
      JOIN airports  a ON f.estarrivalairport = a.icao_code
      JOIN countries c ON a.iso_country = c.iso_code
      WHERE f.estarrivalairport IS NOT NULL
      GROUP BY c.country_name, a.iso_country, a.name, a.municipality
    ),
    ranked AS (
      SELECT country_name, country_code, airport_name, city, incoming_flights,
             ROW_NUMBER() OVER (PARTITION BY country_code ORDER BY incoming_flights DESC) AS rn
      FROM airport_traffic
    )
    SELECT country_name, country_code, airport_name, city, incoming_flights
    FROM ranked
    ${outerWhere}
    ORDER BY incoming_flights DESC
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
// Route 15  GET /high_traffic_conflict        (COMPLEX — Query 3)
// ─────────────────────────────────────────────────────────────────────────────
const highTrafficConflict = async (req, res) => {
  const minArrivals = req.query.min_arrivals ? parseInt(req.query.min_arrivals) : 100;

  const cacheKey = `high_traffic_conflict:${minArrivals}`;
  const sql = `
    WITH flight_scores AS (
      SELECT
        a.iso_country,
        c.country_name,
        COUNT(*) AS total_arrivals,
        COUNT(*) * 1.0 / MAX(COUNT(*)) OVER () AS normalized_arrivals
      FROM flights f
      JOIN airports  a ON f.estarrivalairport = a.icao_code
      LEFT JOIN countries c ON TRIM(a.iso_country) = TRIM(c.iso_code)
      WHERE a.iso_country IS NOT NULL
      GROUP BY a.iso_country, c.country_name
    ),
    conflict_scores AS (
      SELECT
        s.country,
        SUM(e.fatalities) AS total_fatalities,
        SUM(e.events)     AS total_events,
        SUM(e.fatalities) * 1.0 / NULLIF(MAX(SUM(e.fatalities)) OVER (), 0)
          AS normalized_conflict
      FROM acled_weekly_events e
      JOIN acled_source_area s ON e.source_area_id = s.source_area_id
      GROUP BY s.country
    ),
    country_mapping AS (
      SELECT ac.country_wdi, ac.country AS acled_country FROM acled_country ac
    )
    SELECT
      f.country_name, f.iso_country, f.total_arrivals,
      c.total_fatalities, c.total_events,
      ROUND(f.normalized_arrivals::NUMERIC, 4) AS flight_score,
      ROUND(c.normalized_conflict::NUMERIC, 4) AS conflict_score,
      ROUND((f.normalized_arrivals - c.normalized_conflict)::NUMERIC, 4)
        AS net_reward_score
    FROM flight_scores f
    JOIN country_mapping m ON LOWER(f.country_name) = LOWER(m.country_wdi)
    JOIN conflict_scores c ON LOWER(c.country)      = LOWER(m.acled_country)
    WHERE f.total_arrivals > $1
    ORDER BY conflict_score DESC, flight_score DESC
  `;

  try {
    const rows = await cached(cacheKey, 60_000, () => query(sql, [minArrivals]));
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Route 16  GET /high_gdp_high_conflict       (COMPLEX — Query 9)
// ─────────────────────────────────────────────────────────────────────────────
const highGdpHighConflict = async (req, res) => {
  const year    = req.query.year    ? parseInt(req.query.year) : null;
  const country = req.query.country ?? null;

  const having = [];
  const params = [];
  if (year)    { params.push(year);                         having.push(`year = $${params.length}`); }
  if (country) { params.push(`%${country.toLowerCase()}%`); having.push(`LOWER(country) ILIKE $${params.length}`); }
  const havingClause = having.length ? `AND ${having.join(' AND ')}` : '';

  const cacheKey = `high_gdp_high_conflict:${year}:${country}`;
  const sql = `
    WITH acled_joined AS (
      SELECT ac.country_wdi AS country, e.week, e.events, e.fatalities
      FROM acled_weekly_events e
      JOIN acled_source_area s ON e.source_area_id = s.source_area_id
      JOIN acled_country     ac ON s.country = ac.country
    ),
    country_metrics AS (
      SELECT
        w.country,
        EXTRACT(YEAR FROM w.date)::INT AS year,
        ROUND((w."GDP_current_US" / NULLIF(w.population, 0))::NUMERIC, 2) AS gdp_per_capita,
        COALESCE(SUM(a.events), 0)     AS total_events,
        COALESCE(SUM(a.fatalities), 0) AS total_fatalities
      FROM world_bank_gdp w
      LEFT JOIN acled_joined a
        ON LOWER(TRIM(w.country)) = LOWER(TRIM(a.country))
       AND EXTRACT(YEAR FROM a.week)::INT = EXTRACT(YEAR FROM w.date)::INT
      WHERE w."GDP_current_US" IS NOT NULL AND w.population IS NOT NULL
      GROUP BY w.country, EXTRACT(YEAR FROM w.date), w."GDP_current_US", w.population
    ),
    bucketed AS (
      SELECT country, year, gdp_per_capita, total_events, total_fatalities,
             NTILE(4) OVER (ORDER BY gdp_per_capita    DESC) AS gdp_quartile,
             NTILE(4) OVER (ORDER BY total_fatalities  DESC) AS conflict_quartile
      FROM country_metrics
    )
    SELECT country, year, gdp_per_capita, total_events, total_fatalities
    FROM bucketed
    WHERE gdp_quartile = 1 AND conflict_quartile = 1
      ${havingClause}
    ORDER BY year DESC, total_fatalities DESC, gdp_per_capita DESC
  `;

  try {
    const rows = await cached(cacheKey, 60_000, () => query(sql, params));
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Route 17  GET /country_gdp_timeline
//   Auxiliary route used by the Country GDP & Economic Profile page to draw
//   the multi-year line chart for a single country.
// ─────────────────────────────────────────────────────────────────────────────
const countryGdpTimeline = async (req, res) => {
  const country = req.query.country ?? '';
  if (!country) return res.json([]);

  const sql = `
    SELECT
      EXTRACT(YEAR FROM w.date)::INT                         AS year,
      ROUND((w."GDP_current_US" / 1000000000.0)::NUMERIC, 2) AS gdp_billion_usd,
      ROUND((w."GDP_current_US" / NULLIF(w.population, 0))::NUMERIC, 2)
                                                             AS gdp_per_capita,
      w.population                                           AS population
    FROM world_bank_gdp w
    WHERE LOWER(TRIM(w.country)) = LOWER(TRIM($1))
      AND w."GDP_current_US" IS NOT NULL
    ORDER BY year ASC
  `;

  try {
    const rows = await query(sql, [country]);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Route 18  GET /city_profile
//   Auxiliary route used by the City Explorer page. Joins flights/airports
//   for the city's tourism signal with global_cities_gdp for its economic
//   weight.
// ─────────────────────────────────────────────────────────────────────────────
const cityProfile = async (req, res) => {
  const city = req.query.city ?? '';
  if (!city) return res.json([]);

  const sql = `
    WITH city_flights AS (
      SELECT
        a.municipality AS city,
        a.iso_country,
        COUNT(*) AS arrival_count
      FROM flights f
      JOIN airports a ON f.estarrivalairport = a.icao_code
      WHERE LOWER(a.municipality) = LOWER($1)
      GROUP BY a.municipality, a.iso_country
    )
    SELECT
      cf.city,
      cf.iso_country AS country_code,
      c.country_name,
      cf.arrival_count,
      g."Official est. GDP(billion US$)" AS metro_gdp_billion_usd,
      g."Metropolitian Population" AS metro_population
    FROM city_flights cf
    LEFT JOIN countries c
      ON TRIM(cf.iso_country) = TRIM(c.iso_code)
    LEFT JOIN global_cities_gdp g
      ON LOWER(TRIM(g."Metropolitian Area/City")) = LOWER(TRIM(cf.city))
    ORDER BY cf.arrival_count DESC
    LIMIT 10;
  `;

  try {
    const rows = await query(sql, [city]);
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
  riskRewardScore,
  recoveryTimeline,
  travelCorridors,
  cityGdpContext,
  busiestAirportsByCountry,
  highTrafficConflict,
  highGdpHighConflict,
  countryGdpTimeline,
  cityProfile,
};
