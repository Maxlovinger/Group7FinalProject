# Tourism Risk vs Reward Index — WebDB

**CIS 5500 · Group 7 · Spring 2026**
Max Lovinger, Jackie Chen, Eric Gu, Abirami Rathina

> GitHub Repository: https://github.com/Maxlovinger/Group7FinalProject

---

## Project Description

A full-stack web application that computes a city-level **Tourism Risk vs Reward Index**
by combining ACLED conflict event data and OpenSky flight arrival data. Users can explore
global flight traffic rankings, search airports, and analyze conflict patterns across regions.

The application is built with a **Node.js + Express** backend, a **PostgreSQL** (AWS RDS)
database, and a **React** frontend using MUI and Recharts.

---

## Screenshots

### 🏠 Home Page
> Overview dashboard with live flight statistics and top airports by arrival volume.

![Home Page](![alt text](homePage.png))

---

### 🏆 Global Rankings
> Countries ranked by total incoming flight arrivals — a proxy for tourism demand.
> Includes an interactive bar chart with Top / Bottom toggle and adjustable country count.

![Global Rankings](![alt text](rankingsPage.png))

---

### ⚔️ Conflict Intensity
> Aggregated ACLED conflict event data. Filter by country and year to explore
> fatalities, event counts, and population exposure. Includes an all-time
> horizontal bar chart of the most conflict-affected countries.

![Conflict Page](![alt text](conflictPage.png))

---

### ✈️ Flight Traffic
> Top destination airports ranked by incoming flight volume from the OpenSky dataset.
> Paginated table with airport name, city, country, ICAO code, and arrival count.

![Flight Traffic](![alt text](flightPage.png))

---

### 🔍 Search Airports
> Search airports by city name or country code. "Surprise Me!" loads the top
> airports instantly. Results displayed as cards with ICAO code, airport type, and country.

![Search Airports](![alt text](searchPage.png))
![Search Airports-Suprise ME!]![alt text](surprisePage.png)

---

### 🔍 Search Airports
> Search airports by city name or country code. "Surprise Me!" loads the top
> airports instantly. Results displayed as cards with ICAO code, airport type, and country.

![Search Airports](./screenshots/search.png)

---

## Directory Structure

```
tourism-webdb/
├── README.md
├── screenshots/              ← Add your screenshots here
│   ├── home.png
│   ├── rankings.png
│   ├── conflict.png
│   ├── flights.png
│   └── search.png
├── server/
│   ├── server.js             Entry point; registers all API routes
│   ├── routes.js             All route handler functions + SQL queries
│   ├── config.json           RDS credentials (do not commit!)
│   └── package.json
└── client/
    ├── package.json
    └── src/
        ├── App.js            MUI dark theme + layout wrapper
        ├── index.js          React Router setup + root render
        ├── config.json       Server host/port for frontend
        ├── components/
        │   ├── NavBar.js     Top navigation bar
        │   ├── LazyTable.js  Reusable paginated table component
        │   └── StatCard.js   Summary metric card
        └── pages/
            ├── HomePage.js       Landing page — flight stats + top airports table
            ├── RankingsPage.js   Flight arrivals leaderboard with bar chart
            ├── ConflictPage.js   ACLED conflict explorer with filters
            ├── FlightsPage.js    Top airports by incoming flight volume
            └── SearchPage.js     Airport search by city / country code
```

---

## Setup & Running

### 1. Configure database credentials

Edit `server/config.json` with your RDS instance details:
```json
{
  "host":        "your-rds-endpoint.rds.amazonaws.com",
  "user":        "your_username",
  "password":    "your_strong_password",
  "port":        5432,
  "database":    "your_database_name",
  "server_port": 8080,
  "server_host": "localhost"
}
```

> ⚠️ Never commit this file to GitHub. Make sure `config.json` is in your `.gitignore`.

### 2. Start the server

```bash
cd server
npm install
npm start
# → Running at http://localhost:8080
```

### 3. Start the client (new terminal)

```bash
cd client
npm install
npm start
# → Running at http://localhost:3000
```

---

## Database Schema

| Table                | Description |
|---------------------|-------------|
| `flights`            | OpenSky flight records (icao24, departure, arrival, timestamps) |
| `flight_days`        | Maps firstseen timestamps to calendar days |
| `airports`           | OurAirports data — ICAO codes, city, country, coordinates |
| `countries`          | ISO country codes mapped to country names |
| `acled_weekly_events`| Weekly aggregated conflict events (fatalities, event type, population exposure) |
| `acled_source_area`  | Geographic metadata for ACLED records (region, country, lat/lng) |
| `acled_country`      | Maps ACLED country names to WDI country codes |

---

## API Routes

| Method | Route                      | Description |
|--------|---------------------------|-------------|
| GET    | `/`                        | Health check |
| GET    | `/author/:type`            | Returns group name or member list |
| GET    | `/top_airports`            | Airports ranked by flight arrivals (paginated) |
| GET    | `/flight_stats`            | Aggregate flight dataset stats |
| GET    | `/flights_by_country`      | Flight arrivals grouped by country (paginated) |
| GET    | `/conflict_summary`        | ACLED conflict stats, filterable by country/year |
| GET    | `/top_conflict_countries`  | Top N most conflict-affected countries all time |
| GET    | `/conflict_by_event_type`  | Conflict breakdown by event type for a country |
| GET    | `/countries`               | All countries from the countries table |
| GET    | `/search_airports`         | Search airports by city name or country code |

---

## Technologies

- **PostgreSQL** on AWS RDS — primary database
- **Node.js + Express** — REST API backend
- **React.js** — frontend with React Router for page navigation
- **MUI (Material UI)** — UI component library
- **Recharts** — data visualization (bar charts)
- **IBM Plex Mono** — monospace font for the terminal-inspired aesthetic

---

*Note: This project uses the CIS 5500 HW4a WebDB assignment as a structural template.*

---

## 📊 Feature & API Implementation Status Report

This section maps every feature and page from the Milestone 2 proposal against the current
implementation status. It serves as a living checklist for the team to track progress toward
the final submission.

---

### Legend
| Symbol | Meaning |
|--------|---------|
| ✅ | Fully implemented and working |
| 🔄 | Partially implemented — route exists but feature incomplete |
| ⏳ | Planned — not yet started |
| ❌ | Descoped — removed due to missing data or schema constraints |

---

### Pages Status

| # | Page (from Milestone 2) | Status | Notes |
|---|------------------------|--------|-------|
| 1 | Home / Landing Page | ✅ | Stat cards (total flights, unique airports), top airports table, author footer |
| 2 | City Explorer | 🔄 | Replaced by Search Airports — city-level GDP data not yet loaded into DB |
| 3 | Global Rankings | 🔄 | Leaderboard implemented using flight arrivals by country; Risk vs Reward Index pending GDP data |
| 4 | Country GDP & Economic Profile | ⏳ | Requires `world_bank_gdp` and `global_cities_gdp` tables to be populated |
| 5 | Conflict Intensity Analysis | ✅ | Country/year filter, fatalities + events + exposure, all-time bar chart |
| 6 | Flight Traffic & Tourism Popularity | ✅ | Full paginated table with ICAO, airport, city, country, arrival count |
| 7 | Risk vs Reward Index Builder | ⏳ | Requires `world_bank_gdp` for GDP per capita normalization |
| 8 | Post-Conflict Recovery Tracker | ⏳ | Requires `world_bank_gdp` joined with ACLED peak conflict years |
| 9 | Volatility & Stability Index | ⏳ | Requires multi-year Risk vs Reward scores — depends on Index Builder |
| 10 | Compare Cities | ⏳ | Depends on City Explorer and Index Builder being complete |
| 11 | Global Heatmap Visualization | ⏳ | Requires lat/lng scoring per city — infrastructure ready in airports table |

---

### Backend API Routes Status

#### ✅ Implemented & Working

| Route | Method | Powers | SQL Complexity |
|-------|--------|--------|---------------|
| `/` | GET | Health check | None |
| `/author/:type` | GET | App metadata | None |
| `/flight_stats` | GET | Home page stat cards | Simple aggregate on `flights` |
| `/top_airports` | GET | Flight Traffic page, Home table, Surprise Me | JOIN `flights` + `airports`, GROUP BY, ORDER BY, paginated |
| `/flights_by_country` | GET | Global Rankings page + chart | JOIN `flights` + `airports` + `countries`, GROUP BY country |
| `/conflict_summary` | GET | Conflict page search results | JOIN `acled_weekly_events` + `acled_source_area`, dynamic WHERE, GROUP BY country/year |
| `/top_conflict_countries` | GET | Conflict page bar chart | JOIN `acled_weekly_events` + `acled_source_area`, GROUP BY country, ORDER BY fatalities |
| `/conflict_by_event_type` | GET | Conflict breakdown (available, not yet surfaced in UI) | JOIN + GROUP BY event_type |
| `/countries` | GET | Country lookup (available, not yet used in UI) | Simple SELECT on `countries` |
| `/search_airports` | GET | Search Airports page | Filtered SELECT on `airports` with ILIKE, paginated |

#### ⏳ Pending Implementation

| Route (planned) | Powers | Blocking Dependency |
|----------------|--------|-------------------|
| `/top_cities` | City Explorer, Home GDP table | `global_cities_gdp` table needs to be populated |
| `/city/:city` | City Explorer detail view | `global_cities_gdp` + `world_bank_gdp` tables |
| `/gdp_profile/:country` | Country GDP & Economic Profile page | `world_bank_gdp` table |
| `/risk_reward` | Risk vs Reward Index Builder, Global Rankings | `world_bank_gdp` + `global_cities_gdp` + flights + conflict all joined |
| `/post_conflict_recovery` | Post-Conflict Recovery Tracker | `world_bank_gdp` joined with ACLED peak years (complex CTE) |
| `/volatility_index` | Volatility & Stability Index | Multi-year Risk vs Reward scores |
| `/compare_cities` | Compare Cities page | City Explorer + Index Builder both complete |

---

### Data Population Status

| Dataset | Table(s) | Loaded? | Notes |
|---------|----------|---------|-------|
| OpenSky Flights | `flights`, `flight_days` | ✅ | ~150,000 sampled records |
| OurAirports | `airports` | ✅ | 85,000+ airports, filtered to ICAO-assigned |
| ISO Countries | `countries` | ✅ | ISO 2-letter codes mapped to country names |
| ACLED Conflict | `acled_weekly_events`, `acled_source_area`, `acled_country` | ✅ | All 6 regions consolidated into unified schema |
| World Bank WDI | `world_bank_gdp` | ⏳ | Cleaning script written in Milestone 2; needs bulk insert |
| Global Cities GDP | `global_cities_gdp` | ⏳ | Small dataset (903 rows); needs bulk insert |

---

### Frontend Components Status

| Component | Status | Notes |
|-----------|--------|-------|
| `NavBar.js` | ✅ | Active route highlighting, links to all 5 pages |
| `LazyTable.js` | ✅ | Paginated, fetches on page/size change, safe array handling |
| `StatCard.js` | ✅ | Used on Home page for flight aggregate stats |
| `HomePage.js` | ✅ | Stat cards + top airports table + author footer |
| `FlightsPage.js` | ✅ | Full paginated airport table with inline arrival bar |
| `ConflictPage.js` | ✅ | Search filters + results list + all-time bar chart |
| `RankingsPage.js` | 🔄 | Working with flight arrivals; needs Risk vs Reward Index when GDP data loaded |
| `SearchPage.js` | ✅ | Airport search by city/country + Surprise Me button |
| `CityExplorerPage.js` | ⏳ | Not yet created — blocked on GDP data |
| `GDPProfilePage.js` | ⏳ | Not yet created — blocked on GDP data |
| `IndexBuilderPage.js` | ⏳ | Not yet created — blocked on GDP data |
| `RecoveryTrackerPage.js` | ⏳ | Not yet created — complex query dependency |
| `HeatmapPage.js` | ⏳ | Not yet created — needs scoring data + mapping library |
| `CompareCitiesPage.js` | ⏳ | Not yet created — depends on Index Builder |

---

### Immediate Next Steps (Priority Order)

1. **Load `world_bank_gdp`** — run the Python cleaning + psycopg2 bulk insert script (Jackie)
2. **Load `global_cities_gdp`** — small dataset, should be fast (Jackie)
3. **Implement `/top_cities` and `/city/:city` routes** — unblocks City Explorer and GDP Profile pages
4. **Implement `/risk_reward` route** — unblocks Rankings page full index + Index Builder page
5. **Build City Explorer page** — search + filter cities with index breakdown
6. **Build GDP Profile page** — country-level WDI trends with city drill-down
7. **Build Index Builder page** — dynamic year selector with normalized component scores
8. **Implement `/post_conflict_recovery` route** — complex CTE query, plan for >15s pre-optimization runtime
9. **Build Recovery Tracker and Volatility pages** — "might implement" features from Milestone 2
10. **Add heatmap visualization** — consider `react-leaflet` or `deck.gl` for the globe layer