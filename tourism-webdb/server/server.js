const express = require('express');
const cors = require('cors');
const config = require('./config.json');
const routes = require('./routes');

const app = express();
app.use(cors({ origin: '*' }));
app.use(express.json());

// ── Route Registrations ──────────────────────────────────────────────────────
app.get('/',                        (req, res) => res.json({ message: 'Tourism WebDB API is running!' }));
app.get('/author/:type',            routes.author);
app.get('/top_airports',            routes.topAirports);
app.get('/flight_stats',            routes.flightStats);
app.get('/flights_by_country',      routes.flightsByCountry);
app.get('/conflict_summary',        routes.conflictSummary);
app.get('/top_conflict_countries',  routes.topConflictCountries);
app.get('/conflict_by_event_type',  routes.conflictByEventType);
app.get('/countries',               routes.countries);
app.get('/search_airports',         routes.searchAirports);

// ── Start Server ─────────────────────────────────────────────────────────────
app.listen(config.server_port, () => {
  console.log(`\n🌍 Tourism WebDB API running at http://${config.server_host}:${config.server_port}/\n`);
});

module.exports = app;